# DEV.md — perform-learn.fr · Guide développeur

> Setup, workflow de développement, déploiement, contraintes techniques.
> Pour les règles métier et fonctionnalités, voir `FEATURES.md`.

## Maintenir ce fichier

Mettre à jour uniquement quand une procédure technique change : nouvelle variable d'env, nouveau script, contrainte infra. Ne pas y ajouter de règles métier (→ `FEATURES.md`) ni de tâches (→ ROADMAP).

---

## Comptes de démonstration (mot de passe : `demo1234`)

| Rôle | Email | Dashboard |
|---|---|---|
| Admin | `admin@perform-learn.fr` | `/freelancehub/admin` |
| Consultant | `consultant1@perform-learn.fr` | `/freelancehub/consultant` |
| Client | `client1@perform-learn.fr` | `/freelancehub/client` |

---

## 1. Installation

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
1. Lire les fichiers concernés
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

## 3. Contraintes techniques

### Edge Runtime (middleware Next.js)

Le middleware s'exécute sur Edge Runtime — incompatible avec certains modules Node.js :

| Module | Compat Edge | Usage |
|---|---|---|
| `bcryptjs` | ❌ | `auth.ts` uniquement (Node.js) |
| `pg` | ❌ | Routes API uniquement (Node.js) |
| `next-auth/jwt` | ✅ | `auth.config.ts` |

Pattern obligatoire :
- `auth.config.ts` → config JWT/callbacks, sans providers → importé par `middleware.ts`
- `auth.ts` → étend authConfig + Credentials + Google + bcrypt → jamais importé dans le middleware

### Conventions base de données

- **Migrations** : numérotées `00X_nom.sql` — une migration = un changement cohérent — jamais modifier une migration déjà appliquée en prod
- **Vue `governance`** : toujours `DROP VIEW IF EXISTS ... CASCADE; CREATE VIEW` — jamais `CREATE OR REPLACE VIEW`
- **UUIDs** : `gen_random_uuid()` — ne jamais forcer des IDs sauf seeds de démo
- **updated_at** : géré par trigger automatique (`set_updated_at`) sur `users`, `consultants`, `bookings`, `payments`

---

## 4. Diagnostic rapide

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

-- Utilisateurs OAuth
SELECT email, oauth_provider, oauth_provider_id FROM freelancehub.users
WHERE oauth_provider IS NOT NULL;
```

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
