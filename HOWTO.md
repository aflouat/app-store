# HOWTO.md — perform-learn.fr · Guide opérationnel

> Ce fichier décrit le fonctionnement de la plateforme : setup, workflow de développement, règles de gestion (RG) et déploiement. Il ne contient pas de scénarios de test ni de liste de tâches.

---

## Maintenir ce fichier

Ce fichier doit rester un **référentiel de fonctionnement**, pas un journal de bord. Mettre à jour une section uniquement quand la règle ou le comportement change en production. Ne jamais y ajouter de tâches ou de checklists — celles-ci appartiennent à la ROADMAP ou aux sessions de travail. Si une règle métier évolue (tarification, statuts, RBAC), mettre à jour la RG correspondante dans la même PR que le code.

---

## Comptes de démonstration (mot de passe : `demo1234`)

| Rôle | Email | Dashboard |
|---|---|---|
| Admin | `admin@perform-learn.fr` | `/freelancehub/admin` |
| Consultant | `consultant1@perform-learn.fr` | `/freelancehub/consultant` |
| Client | `client1@perform-learn.fr` | `/freelancehub/client` |

---

## 1. Installation de l'environnement de développement

### Prérequis

| Outil | Version min | Vérification |
|---|---|---|
| Node.js | 18+ | `node -v` |
| npm | 9+ | `npm -v` |
| Accès SSH VPS | port 2222 | `ssh -p 2222 abdel@37.59.125.159 'echo OK'` |

### Clone et installation

```bash
git clone https://github.com/aflouat/app-store.git
cd app-store/portal && npm install
```

### Variables d'environnement locales — `portal/.env.local`

```env
DATABASE_URL=postgresql://appstore:<password>@37.59.125.159:5432/appstore
NEXTAUTH_SECRET=<secret_local_quelconque_32_chars>
NEXTAUTH_URL=http://localhost:3000
RESEND_API_KEY=<clé_resend>
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_API_URL=https://api.perform-learn.fr
CRON_SECRET=<valeur_locale>
GOOGLE_CLIENT_ID=<oauth_google>
GOOGLE_CLIENT_SECRET=<oauth_google>
```

> `DATABASE_URL` pointe sur le VPS de prod. Toute réservation créée en local est réelle — utiliser les comptes démo.

### Commandes

```bash
npm run dev    # http://localhost:3000
npm run build  # vérifier avant commit — obligatoire
npm test       # Vitest
```

### Cartes Stripe de test

| Carte | Comportement |
|---|---|
| `4242 4242 4242 4242` | Paiement réussi |
| `4000 0000 0000 0002` | Déclin |
| `4000 0025 0000 3155` | 3DS requis |

Date et CVC : n'importe quelle valeur valide.

---

## 2. Workflow de développement

```
1. Lire les fichiers concernés (Read)
2. Modifier le code localement
3. Tester en dev : npm run dev
4. Valider le build : npm run build  ← obligatoire avant commit
5. Commiter (fichiers spécifiques — jamais git add -A) :
   git add portal/app/... portal/components/...
   git commit -m "feat(freelancehub): description"
6. Pusher :
   git push origin main
   → Vercel redéploie automatiquement (2-3 min)
7. Si migration SQL : appliquer sur le VPS avant ou après selon le cas
```

### Ordre migration vs déploiement

- **Avant push** si la migration ajoute des tables/colonnes que le nouveau code attend
- **Après push** si la migration supprime des colonnes que l'ancien code utilise encore

### Appliquer une migration SQL

```bash
ssh -p 2222 abdel@37.59.125.159 \
  'docker exec -i postgres psql -U appstore -d appstore' \
  < migrations/00X_nom.sql
```

### Modifier la config VPS (Caddyfile, docker-compose)

```bash
ssh -p 2222 abdel@37.59.125.159 'cd /appli/app-store && git pull origin main'

# Recharger Caddy sans downtime
ssh -p 2222 abdel@37.59.125.159 \
  'docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile'
```

---

## 3. Diagnostic rapide

| Symptôme | Cause probable | Solution |
|---|---|---|
| `ECONNREFUSED` sur DB | VPS inaccessible | Vérifier SSH + `.env.local` |
| `NEXTAUTH_SECRET` error | Variable manquante | Ajouter dans `.env.local` |
| Stripe "No such payment_intent" | Mélange clés test/prod | Vérifier `sk_test_` dans `.env.local` |
| Page blanche après login | Erreur middleware Edge | `npm run build` pour voir l'erreur TypeScript |
| Build échoue | Erreur TypeScript | Lire l'output complet de `npm run build` |

### Queries SQL de diagnostic

```bash
# Connexion DB
ssh -p 2222 abdel@37.59.125.159 'docker exec -it postgres psql -U appstore -d appstore'
```

```sql
-- Réservations récentes
SELECT b.booking_number, uc.email AS client, uc2.email AS consultant,
       b.status, b.amount_ht/100.0 AS ht_eur, b.revealed_at
FROM freelancehub.bookings b
JOIN freelancehub.users uc ON uc.id = b.client_id
JOIN freelancehub.consultants c ON c.id = b.consultant_id
JOIN freelancehub.users uc2 ON uc2.id = c.user_id
ORDER BY b.created_at DESC LIMIT 10;

-- Paiements récents
SELECT booking_id, status, amount/100.0 AS montant_eur, captured_at
FROM freelancehub.payments ORDER BY created_at DESC LIMIT 5;

-- Notifications non lues par type
SELECT type, COUNT(*) FROM freelancehub.notifications
WHERE is_read = false GROUP BY type ORDER BY count DESC;

-- Colonnes OAuth (migration 017)
SELECT email, oauth_provider, oauth_provider_id FROM freelancehub.users
WHERE oauth_provider IS NOT NULL;
```

---

## 4. Règles de gestion (RG)

### RG-01 — Anonymat consultant jusqu'au paiement

Le client ne voit jamais le nom, l'email, le bio ni le LinkedIn d'un consultant avant paiement.

- `bookings.revealed_at` est `NULL` jusqu'à la capture du paiement
- L'API `/matching` retourne uniquement : compétence, score, rating, tarif — aucun identifiant
- À la capture : `revealed_at = NOW()` → consultant révélé dans l'étape "done" du BookingModal
- Toute query qui expose `name`, `email`, `bio`, `linkedin_url` doit vérifier `revealed_at IS NOT NULL`

### RG-02 — Tarification

- Le consultant fixe son THM dans son profil (`consultants.daily_rate`, en €)
- 1 consultation = 1 heure = `daily_rate` HT
- Structure : `HT × 1,20 = TTC` · `HT × 0,15 = commission` · `HT × 0,85 = honoraire consultant`
- Le montant est calculé **côté serveur uniquement** — le `PaymentIntent` est créé depuis `bookings.amount_ht` en DB
- Fallback si `daily_rate` non renseigné : 85 €/h

### RG-03 — Commission plateforme

- Commission : **15 %** du montant HT
- `commission_amount = amount_ht × 0.15`
- `consultant_amount = amount_ht × 0.85`
- Les 3 montants sont stockés dans `bookings` à la création de la réservation

### RG-04 — Séquestre et libération des fonds

Cycle `payments.status` :

```
pending → authorized → captured → transferred → (refunded)
```

- `captured` : paiement confirmé Stripe, mission réservée
- `transferred` : fonds libérés — déclenché automatiquement quand les 2 évaluations (client + consultant) sont soumises
- Si une seule évaluation : fonds en `captured`
- Libération manuelle possible par admin

### RG-05 — Contrôle d'accès (RBAC)

| Rôle | Accès |
|---|---|
| `client` | Recherche, booking, paiement, évaluation |
| `consultant` | Profil, agenda, réservations reçues, gains, évaluation |
| `admin` | Tout + gestion utilisateurs, override statuts, export CSV |

- Le middleware Next.js vérifie le rôle JWT à chaque requête sur `/freelancehub/(auth)/*`
- Un consultant accédant à `/freelancehub/client` est redirigé vers `/freelancehub/consultant`
- L'admin n'accède pas aux interfaces client/consultant (RBAC strict)

### RG-06 — Algorithme de matching

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
- Seuls les consultants `is_available = true` avec au moins 1 slot futur sont candidats

### RG-07 — Notifications in-app

| Type | Déclencheur | Destinataire |
|---|---|---|
| `booking_confirmed` | Paiement capturé | Client |
| `new_booking` | Paiement capturé | Consultant |
| `review_request` | 1re évaluation soumise | L'autre partie |
| `fund_released` | 2e évaluation soumise | Consultant |
| `reminder` | Cron J-1 (08:00 UTC) | Client + Consultant |

- Badge rouge sur la cloche si notifications non lues
- `PATCH /api/freelancehub/notifications` : `{ all: true }` ou `{ id: "uuid" }`

### RG-08 — Cron rappels J-1

- Déclenchement : chaque jour à **08:00 UTC** (Vercel Cron)
- Cible : réservations `slot_date = CURRENT_DATE + 1` et `status IN ('confirmed', 'in_progress')`
- Actions : email Resend + notification in-app (client + consultant)
- Sécurisé par `Authorization: Bearer <CRON_SECRET>`

### RG-09 — Conventions base de données

- **Migrations** : numérotées `00X_nom.sql` — une migration = un changement cohérent — jamais modifier une migration déjà appliquée en prod
- **Vue `governance`** : toujours `DROP VIEW IF EXISTS ... CASCADE; CREATE VIEW` — jamais `CREATE OR REPLACE VIEW`
- **UUIDs** : `gen_random_uuid()` — ne jamais forcer des IDs sauf seeds de démo
- **updated_at** : géré par trigger automatique (`set_updated_at`) sur `users`, `consultants`, `bookings`, `payments`

### RG-10 — Edge Runtime (middleware Next.js)

| Module | Compat Edge | Usage |
|---|---|---|
| `bcryptjs` | ❌ | `auth.ts` uniquement (Node.js) |
| `pg` | ❌ | Routes API uniquement (Node.js) |
| `next-auth/jwt` | ✅ | `auth.config.ts` |

- `auth.config.ts` → config JWT/callbacks, sans providers → importé par `middleware.ts`
- `auth.ts` → étend authConfig + Credentials + Google + bcrypt → jamais importé dans le middleware

### RG-11 — Numéro de réservation

- `booking_number` : SERIAL, entier auto-incrémenté, unique
- Affiché `#N°` dans toutes les vues (consultant, client, admin)
- Permet d'identifier une réservation sans exposer l'UUID interne

### RG-12 — Autonomie consultant (cycle de consultation)

| Statut actuel | Action | Nouveau statut |
|---|---|---|
| `confirmed` | Bouton "Démarrer" | `in_progress` |
| `in_progress` | Bouton "Terminer" | `completed` |

- Aucun retour arrière possible depuis `in_progress` ou `completed`
- L'admin garde la possibilité de toutes les transitions
- Route : `PATCH /api/freelancehub/consultant/bookings/[id]/status`

### RG-13 — Inscription utilisateur

- Page `/freelancehub/register` : choix du rôle (consultant ou client)
- Mot de passe stocké en bcrypt dans `freelancehub.users`
- Auto-login après inscription → redirection dashboard du rôle
- Consultant : `is_available = false` par défaut jusqu'à validation KYC admin

### RG-14 — SSO Google

- GoogleProvider via NextAuth v5 — côté Node.js uniquement (`auth.ts`)
- Nouveau compte : rôle `consultant` par défaut, `is_active = true`
- Compte existant (même email) : OAuth lié, avatar conservé si déjà présent
- Colonnes : `oauth_provider`, `oauth_provider_id` sur `freelancehub.users` (migration 017)
- Variables requises : `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

### RG-15 — Agenda visuel consultant

- Grille semaine (lundi → dimanche, 08h–20h, pas de 1h)
- Vert : créneau disponible (clic = suppression)
- Terracotta + "PRIS" : créneau réservé (non modifiable)
- Grisé : date passée (non cliquable)
- Bouton "Dupliquer →" : copie créneaux disponibles vers la semaine suivante

### RG-16 — Tableau comptable admin

Filtres sur `/freelancehub/admin/bookings` : statut, plage de dates, consultant (texte), client (texte), montant HT min/max. Totaux filtrés : Σ HT, Σ TTC estimé, Σ commission. Export CSV via `GET /api/freelancehub/admin/export-csv`.

---

## 5. Déploiement

### Scripts

| Script | Rôle | Usage |
|---|---|---|
| `scripts/tnr.sh` | Tests de Non-Régression | `./scripts/tnr.sh` |
| `scripts/deploy-vps.sh` | Déploiement VPS | `./scripts/deploy-vps.sh [--skip-migrations] [--skip-caddy]` |
| `scripts/deploy-agent.sh` | Orchestrateur complet (TNR → Deploy) | `./scripts/deploy-agent.sh` |

### Ce que vérifie le TNR

1. Build Next.js (`npm run build`)
2. Tests Vitest
3. Lint (`next lint`)
4. Comptage routes API
5. Présence des migrations SQL

### Ce que fait le déploiement VPS

1. `git pull` sur `/appli/app-store`
2. `docker compose up -d --build`
3. Reload Caddy si Caddyfile modifié
4. Health checks : `api.perform-learn.fr/health` + `portal.perform-learn.fr`

### Fallback manuel

```bash
ssh -p 2222 abdel@37.59.125.159
cd /appli/app-store
git pull origin main
docker compose up -d --build
docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile
```
