# HOWTO.md — perform-learn.fr · Guide opérationnel

> Ce fichier couvre : setup de l'environnement de dev, workflow quotidien, scénarios de test E2E, et règles de gestion (RG) de la plateforme.

## Comptes de démonstration (mot de passe : `demo1234`)

| Rôle | Email |
|---|---|
| Admin | `admin@perform-learn.fr` |
| Consultant | `consultant1@perform-learn.fr` |
| Client | `client1@perform-learn.fr` |
---

## 0. Mode opératoire — test en local

### 0.1 Pre-flight (avant de tester quoi que ce soit)

```bash
# 1. Vérifier que .env.local existe
ls portal/.env.local

# 2. Installer les dépendances si besoin
cd portal && npm install

# 3. Vérifier la connectivité DB (VPS accessible)
# Le VPS doit être joignable depuis votre machine — tester :
ssh -p 2222 abdel@37.59.125.159 'echo OK'

# 4. Lancer le serveur de dev
cd portal && npm run dev
# → http://localhost:3000
```

> Si `DATABASE_URL` pointe sur `37.59.125.159`, le serveur local lit la DB de prod — toute réservation créée est réelle. C'est acceptable en POC avec les comptes demo.

---

### 0.2 Smoke test rapide (5 min)

Objectif : valider que l'environnement local fonctionne end-to-end.

```
[ ] http://localhost:3000 → page d'accueil charge (pas d'erreur 500)
[ ] /freelancehub/login → formulaire visible
[ ] Login admin@perform-learn.fr / demo1234 → redirige /freelancehub/admin
[ ] /freelancehub/admin/bookings → liste des réservations charge (pas d'erreur DB)
[ ] Déconnexion → retour /freelancehub/login
[ ] Login client1@perform-learn.fr / demo1234
[ ] /freelancehub/client/search → recherche "ERP" → ≤ 5 cartes anonymes
[ ] Cloche nav → badge ou liste notifications visible
```

Si une étape échoue → voir 0.5 Diagnostic.

---

### 0.3 Tester le paiement Stripe en local

Les clés `sk_test_` / `pk_test_` suffisent pour créer de vrais PaymentIntents Stripe en mode test.

**Cartes de test Stripe :**

| Carte | Comportement |
|---|---|
| `4242 4242 4242 4242` | Paiement réussi |
| `4000 0000 0000 0002` | Déclin (generic) |
| `4000 0025 0000 3155` | Authentification 3DS requise |

- Date d'expiration : n'importe quelle date future
- CVC : n'importe quel nombre à 3 chiffres

**Forwarding webhooks Stripe (optionnel, si webhooks configurés) :**

```bash
# Installer Stripe CLI si pas déjà fait
# https://stripe.com/docs/stripe-cli

stripe login
stripe listen --forward-to http://localhost:3000/api/freelancehub/stripe/webhook
# → Copier le whsec_... affiché dans .env.local STRIPE_WEBHOOK_SECRET
```

> En POC actuel, les webhooks Stripe ne sont pas implémentés — le paiement est vérifié via l'API Stripe directement. Le forwarding n'est donc pas nécessaire pour l'instant.

---

### 0.4 Raccourcis SQL pour forcer les états (tests avancés)

Se connecter à la DB depuis le terminal local (la DB est sur le VPS) :

```bash
# Connexion rapide
ssh -p 2222 abdel@37.59.125.159 'docker exec -it postgres psql -U appstore -d appstore'
```

**Forcer une réservation en `completed` (pour tester les évaluations) :**

```sql
-- Remplacer <uuid> par l'ID de la réservation (visible dans l'URL ou /admin/bookings)
UPDATE freelancehub.bookings
SET status = 'completed'
WHERE id = '<uuid>';
```

**Forcer la libération des fonds sans évaluation (debug) :**

```sql
UPDATE freelancehub.payments
SET status = 'transferred', transferred_at = NOW()
WHERE booking_id = '<uuid>';
```

**Réinitialiser une réservation de test :**

```sql
-- Supprimer reviews + payment + booking (cascade si FK)
DELETE FROM freelancehub.reviews WHERE booking_id = '<uuid>';
DELETE FROM freelancehub.payments WHERE booking_id = '<uuid>';
DELETE FROM freelancehub.notifications WHERE booking_id = '<uuid>';
DELETE FROM freelancehub.bookings WHERE id = '<uuid>';
```

**Voir les bookings récents avec emails :**

```sql
SELECT b.id, uc.email AS client, uc2.email AS consultant,
       b.status, b.amount_ht/100.0 AS ht_eur, b.revealed_at
FROM freelancehub.bookings b
JOIN freelancehub.users uc ON uc.id = b.client_id
JOIN freelancehub.consultants c ON c.id = b.consultant_id
JOIN freelancehub.users uc2 ON uc2.id = c.user_id
ORDER BY b.created_at DESC LIMIT 10;
```

---

### 0.5 Tester le cron J-1 en local

```bash
# Déclencher manuellement le cron depuis votre machine (remplacer <CRON_SECRET>)
curl -X POST http://localhost:3000/api/freelancehub/cron/reminders \
  -H "Authorization: Bearer <CRON_SECRET>"

# Réponse attendue : {"sent": N} avec N = nombre de rappels envoyés
# Si 0 : aucune réservation avec slot_date = demain et status confirmed/in_progress
```

Pour créer un slot de test à J+1 :

```sql
-- Insérer un slot demain pour consultant1 (récupérer consultant_id d'abord)
INSERT INTO freelancehub.slots (consultant_id, slot_date, slot_time, is_available)
SELECT id, CURRENT_DATE + 1, '10:00', true
FROM freelancehub.consultants
WHERE user_id = (SELECT id FROM freelancehub.users WHERE email = 'consultant1@perform-learn.fr');
```

---

### 0.5 Diagnostic — erreurs courantes

| Symptôme | Cause probable | Solution |
|---|---|---|
| `ECONNREFUSED` sur DB | VPS inaccessible ou mauvais `DATABASE_URL` | Vérifier SSH VPS + `.env.local` |
| `NEXTAUTH_SECRET` error | Variable manquante dans `.env.local` | Ajouter une valeur quelconque (32 chars) |
| Stripe "No such payment_intent" | Mélange clés test/prod | Vérifier `sk_test_` dans `.env.local` |
| Page blanche après login | Erreur middleware Edge | `npm run build` pour voir les erreurs TypeScript |
| Notifications absentes | `createNotification` non appelé | Vérifier les logs terminal `npm run dev` |
| Build échoue | Erreur TypeScript | Lire l'output complet de `npm run build` |

---

## 1. Installation de l'environnement de développement

### Prérequis

| Outil | Version min | Vérification |
|---|---|---|
| Node.js | 18+ | `node -v` |
| npm | 9+ | `npm -v` |
| Git | — | `git --version` |
| Accès SSH VPS | port 2222 | `ssh -p 2222 abdel@37.59.125.159` |

### Clone et installation

```bash
git clone https://github.com/aflouat/app-store.git
cd app-store/portal
npm install
```

### Variables d'environnement locales

Créer `portal/.env.local` (ne jamais commiter) :

```env
DATABASE_URL=postgresql://appstore:<password>@37.59.125.159:5432/appstore
NEXTAUTH_SECRET=<secret_local_quelconque>
NEXTAUTH_URL=http://localhost:3000
RESEND_API_KEY=<ta_clé_resend>
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_API_URL=https://api.perform-learn.fr
CRON_SECRET=<valeur_locale>
```

> En dev, utiliser les clés Stripe **test** (sk_test_ / pk_test_). Carte de test : `4242 4242 4242 4242`, exp future, CVC quelconque.

### Lancer en développement

```bash
cd portal
npm run dev       # http://localhost:3000
npm run build     # vérifier le build avant commit
npm run lint      # vérifier le code
```

### Comptes de démonstration (mot de passe : `demo1234`)

| Rôle | Email | Accès |
|---|---|---|
| Admin | `admin@perform-learn.fr` | `/freelancehub/admin` |
| Consultant | `consultant1@perform-learn.fr` | `/freelancehub/consultant` |
| Client | `client1@perform-learn.fr` | `/freelancehub/client` |

---

## 2. Workflow de développement

### Cycle complet

```
1. Lire les fichiers concernés
2. Modifier le code localement
3. Tester en dev : npm run dev
4. Valider le build : npm run build  ← obligatoire avant commit
5. Commiter (fichiers spécifiques, jamais git add -A) :
   git add portal/app/... portal/components/...
   git commit -m "feat(freelancehub): description"
6. Pusher :
   git push origin main
   → Vercel redéploie automatiquement (2-3 min)
7. Si migration SQL : appliquer sur le VPS (voir ci-dessous)
```

### Appliquer une migration SQL sur le VPS

```bash
# Appliquer
ssh -p 2222 abdel@37.59.125.159 \
  'docker exec -i postgres psql -U appstore -d appstore' \
  < migrations/00X_nom.sql

# Vérifier
ssh -p 2222 abdel@37.59.125.159 \
  'docker exec postgres psql -U appstore -d appstore -c "\dt freelancehub.*"'
```

> **Ordre** : appliquer la migration SQL **avant** de pusher le code si la migration ajoute des tables/colonnes que le code attend. Appliquer **après** si la migration supprime des colonnes que l'ancien code utilise encore.

### Modifier la config VPS (Caddyfile, docker-compose)

```bash
# Après modification et push
ssh -p 2222 abdel@37.59.125.159 'cd /appli/app-store && git pull origin main'

# Recharger Caddy sans downtime
ssh -p 2222 abdel@37.59.125.159 \
  'docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile'

# Redémarrer les containers si docker-compose modifié
ssh -p 2222 abdel@37.59.125.159 'cd /appli/app-store && docker compose up -d --build'
```

### Vérifier un déploiement Vercel

```bash
# Voir le statut du dernier déploiement
# → https://vercel.com/aflouats-projects/app-store
# URL de prod : https://app-store-sandy.vercel.app
# Alias : https://portal.perform-learn.fr
```

---

## 3. Scénarios de test E2E

> URL de test : `https://portal.perform-learn.fr` (ou `http://localhost:3000` en local)

### Scénario 1 — Login et RBAC

```
1. /freelancehub/login → login admin@perform-learn.fr / demo1234
   ✓ Redirige vers /freelancehub/admin
2. Déconnexion
3. Login consultant1@perform-learn.fr / demo1234
   ✓ Redirige vers /freelancehub/consultant
4. Tenter d'accéder à /freelancehub/client
   ✓ Redirige vers /freelancehub/consultant (mauvais rôle)
5. Login client1@perform-learn.fr / demo1234
   ✓ Redirige vers /freelancehub/client
```

### Scénario 2 — Recherche et matching

```
1. Login client1 → /freelancehub/client/search
2. Sélectionner une compétence (ex: "ERP / D365 F&O") + budget max
3. Cliquer "Rechercher"
   ✓ ≤ 5 cartes anonymes (sans nom ni email)
   ✓ Chaque carte : compétence, score composite, rating, tarif HT, barres de score
4. Cliquer une carte
   ✓ BookingModal s'ouvre à l'étape "confirm"
```

### Scénario 3 — Booking et paiement (flow complet)

```
1. Dans BookingModal étape confirm : vérifier le récapitulatif prix
2. Cliquer "Procéder au paiement"
   ✓ Stripe Elements s'affiche (formulaire carte)
3. Remplir : 4242 4242 4242 4242 / exp future / CVC 123
4. Valider
   ✓ POST /api/freelancehub/client/bookings → réservation créée
   ✓ POST /api/freelancehub/client/bookings/[id]/payment-intent → PaymentIntent Stripe
   ✓ POST /api/freelancehub/client/bookings/[id]/pay → paiement vérifié
   ✓ Email confirmation envoyé (client + consultant)
   ✓ Étape "done" : NOM et EMAIL du consultant révélés
   ✓ Notification in-app créée (cloche avec badge)
5. /freelancehub/client/bookings
   ✓ Réservation apparaît (status: confirmed)
```

### Scénario 4 — Vue consultant

```
1. Login consultant1 → /freelancehub/consultant/bookings
   ✓ La réservation du scénario 3 apparaît
   ✓ Notification "Nouvelle mission" visible dans /freelancehub/notifications
2. /freelancehub/consultant/agenda
   ✓ Ajout/suppression de créneaux fonctionne
3. /freelancehub/consultant/profile
   ✓ Modification bio/tarif sauvegarde correctement
```

### Scénario 5 — Évaluations et libération des fonds

```
Prérequis : passer booking en status 'completed' (admin ou SQL direct)
  → SSH: docker exec postgres psql -U appstore -d appstore
         -c "UPDATE freelancehub.bookings SET status='completed' WHERE id='<uuid>';"

1. Login client1 → /freelancehub/client/reviews/[bookingId]
   → Soumettre note (1-5) + commentaire
   ✓ Email "Évaluez votre mission" envoyé au consultant
   ✓ Notification review_request créée pour le consultant

2. Login consultant1 → /freelancehub/consultant/bookings/[bookingId]/review
   → Soumettre note (1-5) + commentaire
   ✓ payments.status → 'transferred'
   ✓ Email libération des fonds envoyé au consultant
   ✓ Notification fund_released créée

3. /freelancehub/consultant/earnings
   ✓ Montant net apparaît dans les gains
```

### Scénario 6 — Administration

```
1. Login admin → /freelancehub/admin/users
   ✓ Liste tous les utilisateurs avec rôles
2. /freelancehub/admin/bookings
   ✓ Toutes les réservations (client + consultant visibles)
   ✓ Bouton "↓ Export CSV" télécharge le fichier
3. /freelancehub/admin/payments
   ✓ Paiements avec statuts
4. Changer le statut d'une réservation via BookingStatusAction
   ✓ Statut mis à jour en base
```

### Scénario 7 — Notifications in-app

```
1. Login client1 → cloche dans le nav
   ✓ Badge rouge avec compteur si notifications non lues
2. Cliquer la cloche → /freelancehub/notifications
   ✓ Liste des notifications avec point rouge pour les non lues
3. Cliquer une notification non lue
   ✓ Passe en "lu", point rouge disparaît
4. Bouton "Tout marquer comme lu"
   ✓ Badge cloche disparaît
```

### Commandes de diagnostic rapide

```bash
# Réservations récentes
ssh -p 2222 abdel@37.59.125.159 \
  'docker exec postgres psql -U appstore -d appstore -c "
    SELECT b.id, uc.email AS client, uc2.email AS consultant, b.status, b.revealed_at
    FROM freelancehub.bookings b
    JOIN freelancehub.users uc ON uc.id = b.client_id
    JOIN freelancehub.consultants c ON c.id = b.consultant_id
    JOIN freelancehub.users uc2 ON uc2.id = c.user_id
    ORDER BY b.created_at DESC LIMIT 5;"'

# Paiements
ssh -p 2222 abdel@37.59.125.159 \
  'docker exec postgres psql -U appstore -d appstore -c "
    SELECT booking_id, status, amount/100.0 AS montant_eur, captured_at
    FROM freelancehub.payments ORDER BY created_at DESC LIMIT 5;"'

# Notifications non lues par type
ssh -p 2222 abdel@37.59.125.159 \
  'docker exec postgres psql -U appstore -d appstore -c "
    SELECT type, COUNT(*) FROM freelancehub.notifications
    WHERE is_read = false GROUP BY type ORDER BY count DESC;"'

# Tester le cron J-1 manuellement
curl -X POST https://portal.perform-learn.fr/api/freelancehub/cron/reminders \
  -H "Authorization: Bearer <CRON_SECRET>"
```

---

## 4. Règles de gestion (RG)

### RG-01 — Anonymat consultant jusqu'au paiement

Le client ne voit jamais le nom, l'email, le bio ni le lien LinkedIn d'un consultant avant que le paiement soit capturé.

- `bookings.revealed_at` est `NULL` tant que le paiement n'est pas confirmé
- L'API `/matching` retourne uniquement : compétence, score, rating, tarif — aucun identifiant
- À la capture du paiement : `revealed_at = NOW()` → le consultant est révélé dans l'étape "done" du BookingModal
- **Côté code** : toute query qui expose `name`, `email`, `bio`, `linkedin_url` d'un consultant doit vérifier `revealed_at IS NOT NULL`

### RG-02 — Tarification

- Prix de la consultation : plage **40 €–100 €** selon la mission (pas de prix fixe unique)
- Structure : montant HT + TVA 20 % = montant TTC
- Le montant est calculé **côté serveur** uniquement — jamais côté client
- Le PaymentIntent Stripe est créé avec le montant recalculé depuis la DB (`bookings.amount_ht`)

### RG-03 — Commission plateforme

- Commission : **15 %** du montant HT
- `commission_amount = amount_ht × 0.15`
- `consultant_amount = amount_ht × 0.85`
- Ces 3 montants sont stockés dans `bookings` à la création de la réservation

### RG-04 — Séquestre et libération des fonds

Le paiement suit ce cycle dans `payments.status` :

```
pending → authorized → captured → transferred → (refunded)
```

- `captured` : paiement confirmé par Stripe, mission réservée
- `transferred` : fonds libérés vers le consultant — se déclenche **automatiquement** quand les 2 évaluations (client + consultant) sont soumises
- Si une seule évaluation : les fonds restent en `captured`
- Libération manuelle possible par admin en passant directement à `transferred`

### RG-05 — Contrôle d'accès (RBAC)

3 rôles distincts, sans chevauchement :

| Rôle | Accès |
|---|---|
| `client` | Recherche, booking, paiement, évaluation de la mission |
| `consultant` | Profil, agenda (slots), réservations reçues, gains, évaluation de la mission |
| `admin` | Tout + gestion des utilisateurs, override statuts, export CSV |

- Le middleware Next.js (`middleware.ts`) vérifie le rôle JWT à chaque requête sur `/freelancehub/(auth)/*`
- Un consultant qui tente d'accéder à `/freelancehub/client` est redirigé vers `/freelancehub/consultant`
- L'`admin` peut accéder à toutes les routes admin mais **pas** aux interfaces client/consultant (RBAC strict)

### RG-06 — Algorithme de matching

Score composite sur 100 points :

```
score = 0.40 × skill_match        (compétence exacte = 1, sinon 0)
      + 0.30 × rating_score       (rating du consultant / 5)
      + 0.20 × availability_score (prochain slot dispo dans < 7j = 1.0, linéaire jusqu'à 30j)
      + 0.10 × price_score        (1 - tarif_normalisé / budget_max)
```

- Top **5 consultants** retournés, triés par score décroissant
- Si `price_score` ne peut pas être calculé (budget non renseigné) : score basé sur les 3 autres critères renormalisés
- Un consultant sans slot disponible peut apparaître mais avec `availability_score = 0`

### RG-07 — Notifications in-app

Les notifications sont créées automatiquement aux événements suivants :

| Type | Déclencheur | Destinataire |
|---|---|---|
| `booking_confirmed` | Paiement capturé | Client |
| `new_booking` | Paiement capturé | Consultant |
| `review_request` | 1re évaluation soumise | L'autre partie |
| `fund_released` | 2e évaluation soumise | Consultant |
| `reminder` | Cron J-1 (08:00 UTC) | Client + Consultant |

- Une notification non lue affiche un badge rouge sur la cloche dans la nav
- Cliquer une notification non lue la marque comme lue
- L'API `PATCH /api/freelancehub/notifications` accepte `{ all: true }` ou `{ id: "uuid" }`

### RG-08 — Cron rappels J-1

- Déclenchement : chaque jour à **08:00 UTC** (Vercel Cron)
- Cible : toutes les réservations avec `slot_date = CURRENT_DATE + 1` et `status IN ('confirmed', 'in_progress')`
- Actions : email Resend (client + consultant) + notification in-app (client + consultant)
- Sécurisé par `Authorization: Bearer <CRON_SECRET>`
- Idempotent : peut être déclenché plusieurs fois le même jour sans doublon (pas de contrainte unique, acceptable en POC)

### RG-09 — Conventions base de données

- **Vue `governance.v_artifact_context`** : toujours `DROP VIEW IF EXISTS ... CASCADE; CREATE VIEW` — jamais `CREATE OR REPLACE VIEW` (bug PostgreSQL si les colonnes changent d'ordre)
- **UUIDs** : générés par `gen_random_uuid()` — ne jamais forcer des IDs sauf pour les seeds de démo
- **Migrations** : numérotées séquentiellement `00X_nom.sql` — une migration = un changement cohérent — jamais modifier une migration déjà appliquée en prod
- **updated_at** : géré par trigger automatique (`set_updated_at`) sur `users`, `consultants`, `bookings`, `payments`

### RG-10 — Edge Runtime (Next.js middleware)

Le middleware s'exécute sur Edge Runtime — incompatible avec certains modules Node.js :

| Module | Compat Edge | Usage |
|---|---|---|
| `bcryptjs` | ❌ | `auth.ts` uniquement (Node.js) |
| `pg` (postgres) | ❌ | Routes API uniquement (Node.js) |
| `next-auth/jwt` | ✅ | Utilisable dans `auth.config.ts` |

Pattern obligatoire :
- `auth.config.ts` → config JWT/callbacks, sans providers → importé par `middleware.ts`
- `auth.ts` → étend authConfig + Credentials + bcrypt → jamais importé dans le middleware
