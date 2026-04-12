# CLAUDE.md — perform-learn.fr · Instructions pour Claude

## Contexte & propriétaire
Ce fichier ne contient aucune info liée aux règles de gestion actuelle ou futur, il se focalisé sur l'architecture high level et comment claude delivre avec qualité en conformité avec les priorités de la roadmap tout en analysant, planifiant avant de choisir la meilleur solution technique par rapport au contexte complet.
le fichier ROADMAP.md contient une liste priorisé des fonctionnalités futures organisées par release cohérente pour le client. les releases  n'ont plus besoin de date mais les releases passées peuvent recevoir une date histo. elles ont juste besoin d'un numéro.

**perform-learn.fr** — Digital Service Hub B2B : connecte freelances experts (DEV,ERP, D365, Data…) avec consultation horaire et entreprises via une marketplace avec matching algorithmique, paiement séquestre et anonymat jusqu'au paiement.

**Propriétaire** : Abdel — développeur fullstack, PMP-certified, chef de projet.

**Version courante** : voir le ROADMAP.MD


---

## Architecture globale

```
┌──────────────────────────────────────────────────┐
│               VPS OVH (37.59.125.159)            │
│               Ubuntu 24.04 · 4 vCores/8Go        │
│                                                  │
│  PostgreSQL 16  │  MinIO (S3)  │  Umami          │
│  Caddy (proxy)  │  Netdata     │  API Node.js    │
└──────────────────┬───────────────────────────────┘
                   │ HTTPS
        ┌──────────┴──────────┐
        │                     │
   ┌────▼────┐           ┌────▼────┐
   │ Vercel  │           │ Vercel  │
   │ Portal  │           │ Apps    │
   │ Next.js │           │ (futur) │
   └─────────┘           └─────────┘
```

**Principe** : VPS = backend central (données, fichiers, analytics). Fronts Next.js sur Vercel (tier gratuit). Données sous contrôle local.

---

## Infra VPS

| Élément | Valeur |
|---|---|
| IP | `37.59.125.159` |
| SSH | `ssh -p 2222 abdel@37.59.125.159` |
| Chemin projet | `/appli/app-store/` |
| User | `abdel` (sudoer) |

**Conteneurs Docker actifs** : `postgres`, `minio`, `umami`, `netdata`, `caddy`

**Sous-domaines opérationnels** :

| URL | Service |
|---|---|
| `perform-learn.fr` | Landing page statique |
| `portal.perform-learn.fr` | Portail Next.js (Vercel) → CNAME Hostinger |
| `api.perform-learn.fr` | API Node.js backend |
| `s3.perform-learn.fr` | MinIO API |
| `analytics.perform-learn.fr` | Umami |
| `monitor.perform-learn.fr` | Netdata |

---

## PostgreSQL — Schémas `appstore`

| Schéma | Usage | Status |
|---|---|---|
| `store` | App Store (portail, apps, waitlist) | ✅ |
| `governance` | Framework Vision→Cycle→Epic→US→Task | ✅ |
| `freelancehub` | Marketplace B2B consulting | ✅ Migration 007 |
| `shared` | Users partagés | ✅ |
| `meteo` / `stock` | Apps métiers futures | ⏳ |

### FreelanceHub — Tables principales

```
skills            → 12 compétences (ERP, Data, Tech, Finance, Management)
users             → 3 rôles : client | consultant | admin
consultants       → profil, tarif, rating (lié à users)
consultant_skills → pivot compétences ↔ consultants
slots             → créneaux disponibles par consultant
bookings          → réservations (revealed_at = NULL jusqu'au paiement)
payments          → escrow : pending → authorized → captured → transferred
reviews           → évaluations mutuelles (libération fonds si 2 soumises)
notifications     → in-app : booking_confirmed | new_booking | review_request | fund_released | reminder
```

---

## Structure repo (éléments clés)

```
app-store/
├── CLAUDE.md                           ← ce fichier
├── ROADMAP.md                          ← roadmap + release notes
├── docker-compose.yml
├── caddy/Caddyfile
├── migrations/
│   ├── 006_freelancehub_v1.sql         ← schema freelancehub
│   └── 007_freelancehub_v2.sql         ← notifications + index
└── portal/                             ← Next.js App Router (Vercel)
    ├── auth.config.ts                  ← Edge-safe (middleware)
    ├── auth.ts                         ← NextAuth v5 + bcrypt (Node only)
    ├── middleware.ts                   ← RBAC
    ├── vercel.json                     ← rewrites + crons
    ├── app/
    │   ├── freelancehub/               ← Marketplace B2B
    │   │   ├── login/page.tsx
    │   │   ├── (auth)/layout.tsx       ← injecte unreadCount notifications
    │   │   ├── (auth)/consultant/      ← dashboard, profil, agenda, bookings, earnings
    │   │   ├── (auth)/client/          ← dashboard, search, bookings, payments, reviews
    │   │   ├── (auth)/admin/           ← dashboard, consultants, bookings, payments, matching
    │   │   └── (auth)/notifications/   ← page notifications in-app
    │   └── api/freelancehub/
    │       ├── matching/route.ts
    │       ├── notifications/route.ts  ← GET list · PATCH mark read
    │       ├── cron/reminders/route.ts ← cron J-1 (08:00 UTC daily)
    │       ├── admin/export-csv/       ← export CSV réservations
    │       ├── client/bookings/        ← création + paiement Stripe
    │       ├── consultant/             ← profil + slots
    │       └── reviews/route.ts
    ├── components/freelancehub/
    │   ├── FHNav.tsx                   ← nav + cloche notifications
    │   ├── FHSidebar.tsx
    │   ├── client/SearchClient.tsx
    │   ├── client/BookingModal.tsx     ← confirm → Stripe → reveal
    │   └── consultant/
    └── lib/freelancehub/
        ├── types.ts
        ├── db.ts
        ├── auth-queries.ts
        ├── email.ts                    ← Resend (4 templates)
        ├── matching.ts                 ← algo scoring 4 critères
        └── notifications.ts           ← createNotification, getUnreadCount…
```

---

## Algorithme de matching

```
score = 0.40 × skill_match
      + 0.30 × rating_score       (rating / 5)
      + 0.20 × availability_score (slot dispo à la date)
      + 0.10 × price_score        (1 - tarif_norm / budget_max)
```

Prix fixe : **85 € TTC** (70,83 € HT). Commission plateforme : **15 %**. Net consultant : **72,12 €** (85 % HT).

---

## Variables d'environnement Vercel

| Variable | Statut |
|---|---|
| `DATABASE_URL` | ✅ `postgresql://appstore:***@37.59.125.159:5432/appstore` |
| `NEXTAUTH_SECRET` | ✅ |
| `NEXTAUTH_URL` | ✅ `https://portal.perform-learn.fr` |
| `RESEND_API_KEY` | ✅ |
| `STRIPE_SECRET_KEY` | ✅ |
| `STRIPE_PUBLISHABLE_KEY` | ✅ |
| `NEXT_PUBLIC_API_URL` | ✅ `https://api.perform-learn.fr` |
| `CRON_SECRET` | ✅ (secret pour `/api/freelancehub/cron/reminders`) |

---

## Comptes de démonstration (mot de passe : `demo1234`)

| Rôle | Email |
|---|---|
| Admin | `admin@perform-learn.fr` |
| Consultant | `consultant1@perform-learn.fr` |
| Client | `client1@perform-learn.fr` |

---

## Workflow Claude — Comment travailler sur ce projet

### Règle fondamentale : planifier avant de coder

**Avant toute modification :**

1. **Lire les fichiers concernés** (ne jamais modifier à l'aveugle)
2. **Annoncer le plan** : lister les fichiers à toucher, décrire les changements attendus
3. **Valider avec Abdel** si le plan impacte : la DB, le middleware Edge, le flow de paiement Stripe, ou plusieurs modules à la fois
4. **Travailler phase par phase** : une phase cohérente = un ensemble de fichiers liés = un commit

### Cycle de développement

```
1. Lire les fichiers concernés (Read tool)
2. Annoncer le plan (liste fichiers + changements)
3. Obtenir validation si besoin
4. Modifier les fichiers (Edit/Write tools)
5. Tester le build :
   cd portal && npm run build
6. Commiter en local :
   git add <fichiers spécifiques — jamais git add -A>
   git commit -m "feat(scope): description courte"
7. Pusher sur GitHub :
   git push origin main
   → Vercel redéploie automatiquement
8. Appliquer migration SQL si besoin (voir ci-dessous)
```

### Appliquer une migration SQL sur le VPS

```bash
# Envoyer et exécuter
ssh -p 2222 abdel@37.59.125.159 \
  'docker exec -i postgres psql -U appstore -d appstore' \
  < migrations/007_freelancehub_v2.sql

# Vérifier
ssh -p 2222 abdel@37.59.125.159 \
  'docker exec postgres psql -U appstore -d appstore -c "\dt freelancehub.*"'
```

### Pull sur le VPS (si fichiers VPS modifiés)

```bash
# Fichiers docker-compose ou Caddyfile
ssh -p 2222 abdel@37.59.125.159 'cd /appli/app-store && git pull origin main'

# Rechargement Caddy
ssh -p 2222 abdel@37.59.125.159 \
  'cd /appli/app-store && docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile'

# Rebuild containers
ssh -p 2222 abdel@37.59.125.159 'cd /appli/app-store && docker compose up -d --build'
```

### Conventions de commit

```
feat(scope):     nouvelle fonctionnalité
fix(scope):      correction de bug
refactor(scope): refactoring sans changement de comportement
chore(scope):    migration SQL, config, CI
test(scope):     tests E2E ou unitaires

Scopes : freelancehub | govern | infra | portal | db
```

---

## Règles de sécurité immuables

| Règle | Raison |
|---|---|
| Ne jamais calculer le montant Stripe côté client | Toujours recalculer depuis la DB |
| Ne jamais exposer `name`, `email`, `bio`, `linkedin_url` avant `revealed_at IS NOT NULL` | Anonymat jusqu'au paiement |
| Ne jamais importer `bcryptjs` dans `auth.config.ts` | Edge Runtime incompatible |
| Ne jamais utiliser `CREATE OR REPLACE VIEW` si les colonnes changent d'ordre | Bug PostgreSQL silencieux |
| Ne jamais utiliser `git add -A` ou `git add .` | Risque de commit de fichiers sensibles (.env) |

---

## Point technique — Edge Runtime

Le middleware Next.js tourne sur Edge Runtime (pas Node.js). Pattern obligatoire :

- `auth.config.ts` → config JWT/callbacks **sans** providers → importé par middleware
- `auth.ts` → étend authConfig + Credentials + bcrypt → Node.js uniquement
- `middleware.ts` → instancie `NextAuth(authConfig)` (jamais `auth.ts`)

---

## Gouvernance — rappel hiérarchie

```
Vision
└── Cycle (trimestre/sprint)
    └── Epic (fonctionnalité majeure, business_value 0-100)
        └── User Story (besoin utilisateur, business_value 0-100)
            └── Task (technique, pas de business_value)
```

**Scoring business_value** :

| Score | Label | Badge |
|---|---|---|
| ≥ 75 | Haute | sauge |
| 50–74 | Moyenne | terracotta |
| 25–49 | Faible | gris |
| < 25 | Très faible | kaki |

**value_type** : `user_acquisition` \| `cost_reduction` \| `strategic_positioning` \| `ux_improvement` \| `technical_debt`

**Règle critique views** : toujours `DROP VIEW IF EXISTS ... CASCADE; CREATE VIEW` (jamais `CREATE OR REPLACE VIEW`)

---

## Commandes de diagnostic rapide

```bash
# Conteneurs VPS
ssh -p 2222 abdel@37.59.125.159 'cd /appli/app-store && docker compose ps'

# Tables FreelanceHub
ssh -p 2222 abdel@37.59.125.159 \
  'docker exec postgres psql -U appstore -d appstore -c "\dt freelancehub.*"'

# Réservations récentes
ssh -p 2222 abdel@37.59.125.159 \
  'docker exec postgres psql -U appstore -d appstore -c "
    SELECT b.id, uc.email AS client, uc2.email AS consultant,
           b.status, b.revealed_at
    FROM freelancehub.bookings b
    JOIN freelancehub.users uc ON uc.id = b.client_id
    JOIN freelancehub.consultants c ON c.id = b.consultant_id
    JOIN freelancehub.users uc2 ON uc2.id = c.user_id
    ORDER BY b.created_at DESC LIMIT 5;"'

# Notifications non lues
ssh -p 2222 abdel@37.59.125.159 \
  'docker exec postgres psql -U appstore -d appstore -c "
    SELECT type, COUNT(*) FROM freelancehub.notifications
    WHERE is_read = false GROUP BY type;"'

# Build portal local
cd portal && npm run build
```

---

## Conventions générales

- **Langue** : français pour les échanges, anglais pour le code
- **Formatting** : scannable — headings, tables, bullet points
- **LaTeX** : uniquement pour formules mathématiques complexes
- **Git** : repo GitHub `aflouat/app-store` (privé), branche `main`
- **Approche** : POC fonctionnel, étapes par étapes, résultats concrets
