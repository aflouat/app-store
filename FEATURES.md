# FEATURES.md — perform-learn.fr · Règles de gestion

> Référentiel des fonctionnalités métier et règles de gestion (RG) de la plateforme.
> Pour le setup technique et le workflow dev, voir `DEV.md`.

## Maintenir ce fichier

Mettre à jour une RG uniquement quand le comportement change en production. Chaque modification doit être dans la même PR que le code qui l'implémente. Ne pas y ajouter de tâches ni de scénarios de test.

---

## RG-01 — Anonymat consultant jusqu'au paiement

Le client ne voit jamais le nom, l'email, le bio ni le LinkedIn d'un consultant avant paiement.

- `bookings.revealed_at` est `NULL` jusqu'à la capture du paiement
- L'API `/matching` retourne uniquement : compétence, score, rating, tarif — aucun identifiant
- À la capture : `revealed_at = NOW()` → consultant révélé dans l'étape "done" du BookingModal
- Toute query qui expose `name`, `email`, `bio`, `linkedin_url` doit vérifier `revealed_at IS NOT NULL`

---

## RG-02 — Tarification

- Le consultant fixe son THM dans son profil (`consultants.daily_rate`, en €)
- 1 consultation = 1 heure = `daily_rate` HT
- Structure : `HT × 1,20 = TTC` · `HT × 0,15 = commission` · `HT × 0,85 = honoraire consultant`
- Le montant est calculé **côté serveur uniquement** — le `PaymentIntent` est créé depuis `bookings.amount_ht` en DB
- Fallback si `daily_rate` non renseigné : 85 €/h

---

## RG-03 — Commission plateforme

- Commission : **15 %** du montant HT
- `commission_amount = amount_ht × 0.15`
- `consultant_amount = amount_ht × 0.85`
- Les 3 montants sont stockés dans `bookings` à la création de la réservation

---

## RG-04 — Séquestre et libération des fonds

Cycle `payments.status` :

```
pending → authorized → captured → transferred → (refunded)
```

- `captured` : paiement confirmé Stripe, mission réservée
- `transferred` : fonds libérés — déclenché automatiquement quand les 2 évaluations (client + consultant) sont soumises
- Si une seule évaluation : fonds restent en `captured`
- Libération manuelle possible par admin

---

## RG-05 — Contrôle d'accès (RBAC)

| Rôle | Accès |
|---|---|
| `client` | Recherche, booking, paiement, évaluation |
| `consultant` | Profil, agenda, réservations reçues, gains, évaluation |
| `admin` | Tout + gestion utilisateurs, override statuts, export CSV |

- Le middleware Next.js vérifie le rôle JWT à chaque requête sur `/freelancehub/(auth)/*`
- Un consultant accédant à `/freelancehub/client` est redirigé vers `/freelancehub/consultant`
- L'admin n'accède pas aux interfaces client/consultant (RBAC strict)

---

## RG-06 — Algorithme de matching

Score composite sur 100 points :

```
score = 0.55 × skill_match         (expert=100, senior=80, intermédiaire=60, junior=40)
      + 0.35 × rating_score        (rating / 5 × 100)
      + 0.05 × availability_score  (< 7j → 100, linéaire jusqu'à 30j → 0)
      + 0.05 × price_score         (1 - tarif_TTC / budget_client) × 100
```

- Top 5 consultants retournés, triés par score décroissant
- Consultants dont tarif TTC > budget client : filtrés avant calcul
- Si `client_budget` est null : `price_score = 100`
- Seuls les consultants `is_available = true` avec au moins 1 slot futur disponible sont candidats

---

## RG-07 — Notifications in-app

| Type | Déclencheur | Destinataire |
|---|---|---|
| `booking_confirmed` | Paiement capturé | Client |
| `new_booking` | Paiement capturé | Consultant |
| `review_request` | 1re évaluation soumise | L'autre partie |
| `fund_released` | 2e évaluation soumise | Consultant |
| `reminder` | Cron J-1 (08:00 UTC) | Client + Consultant |

- Badge rouge sur la cloche si notifications non lues
- `PATCH /api/freelancehub/notifications` : `{ all: true }` ou `{ id: "uuid" }`

---

## RG-08 — Cron rappels J-1

- Déclenchement : chaque jour à **08:00 UTC** (Vercel Cron)
- Cible : réservations `slot_date = CURRENT_DATE + 1` et `status IN ('confirmed', 'in_progress')`
- Actions : email Resend + notification in-app (client + consultant)
- Sécurisé par `Authorization: Bearer <CRON_SECRET>`

---

## RG-09 — Inscription utilisateur

- Page `/freelancehub/register` : choix du rôle (consultant ou client)
- Mot de passe stocké en bcrypt dans `freelancehub.users`
- Auto-login après inscription → redirection dashboard du rôle
- Consultant : `is_available = false` par défaut jusqu'à validation KYC admin

---

## RG-10 — SSO Google

- GoogleProvider via NextAuth v5 — côté Node.js uniquement (`auth.ts`)
- Nouveau compte : rôle `consultant` par défaut, `is_active = true`
- Compte existant (même email) : OAuth lié, avatar conservé si déjà présent
- Colonnes : `oauth_provider`, `oauth_provider_id` sur `freelancehub.users` (migration 017)
- Variables requises : `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

---

## RG-11 — Numéro de réservation

- `booking_number` : SERIAL, entier auto-incrémenté, unique
- Affiché `#N°` dans toutes les vues (consultant, client, admin)
- Permet d'identifier une réservation sans exposer l'UUID interne

---

## RG-12 — Autonomie consultant (cycle de consultation)

| Statut actuel | Action | Nouveau statut |
|---|---|---|
| `confirmed` | Bouton "Démarrer" | `in_progress` |
| `in_progress` | Bouton "Terminer" | `completed` |

- Aucun retour arrière possible depuis `in_progress` ou `completed`
- L'admin garde la possibilité de toutes les transitions
- Route : `PATCH /api/freelancehub/consultant/bookings/[id]/status`

---

## RG-13 — Agenda visuel consultant

- Grille semaine (lundi → dimanche, 08h–20h, pas de 1h)
- Vert : créneau disponible (clic = suppression)
- Terracotta + "PRIS" : créneau réservé (non modifiable)
- Grisé : date passée (non cliquable)
- Bouton "Dupliquer →" : copie créneaux disponibles vers la semaine suivante

---

## RG-14 — Tableau comptable admin

Filtres sur `/freelancehub/admin/bookings` : statut, plage de dates, consultant (texte), client (texte), montant HT min/max.

Totaux filtrés : Σ HT, Σ TTC estimé, Σ commission. Export CSV via `GET /api/freelancehub/admin/export-csv`.
