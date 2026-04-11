# CLAUDE.md — perform-learn.fr App Store POC

## Contexte projet

**perform-learn.fr** est une plateforme digitale qui connecte freelances et entreprises (consulting, formation, outils métiers). Le projet est en phase pré-lancement avec une date cible : **30 avril 2026**.

L'objectif est de monter un **App Store interne** hébergeant plusieurs applications métiers (meteo-projet, gestion de stock, FreelanceHub, etc.) avec mesure de l'utilisation pour pouvoir scaler.

**Propriétaire** : Abdel — PMP-certified, spécialiste D365 F&O, side business PMFlow.

---

## Architecture choisie : Option A — Hybride VPS + Vercel

```
┌─────────────────────────────────────────────────┐
│              VPS OVH (37.59.125.159)             │
│              Ubuntu 24.04 LTS                    │
│              4 vCores / 8 Go RAM / 75 Go         │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐      │
│  │PostgreSQL │  │  MinIO   │  │  Umami    │      │
│  │  16-alp  │  │(S3 files)│  │(analytics)│      │
│  │multi-schm│  │          │  │           │      │
│  └──────────┘  └──────────┘  └───────────┘      │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐      │
│  │  Caddy   │  │ Netdata  │  │  API Node │      │
│  │(reverse  │  │(monitor) │  │ (waitlist)│      │
│  │ proxy)   │  │          │  │           │      │
│  └──────────┘  └──────────┘  └───────────┘      │
└──────────────────┬──────────────────────────────┘
                   │
    ┌──────────────┼──────────────┐
    │              │              │
┌───▼───┐    ┌────▼────┐   ┌────▼────┐
│Vercel │    │ Vercel  │   │ Vercel  │
│Portal │    │ Meteo   │   │ Stock   │
│Govern │    │ Projet  │   │ App     │
│FreeHub│    │ (front) │   │ (front) │
└───────┘    └─────────┘   └─────────┘
```

**Principe** : Le VPS est le backend central (données, fichiers, analytics). Les fronts Next.js sont déployés sur Vercel (tier gratuit). Les données restent sous contrôle sur le VPS.

---

## Domaine & DNS

- **Domaine** : `perform-learn.fr` (acheté sur Hostinger)
- **DNS** : Enregistrements A pointant vers `37.59.125.159`

| Sous-domaine | Service | Status |
|---|---|---|
| `perform-learn.fr` | Landing page (HTML statique via Caddy) | ✅ Opérationnel |
| `portal.perform-learn.fr` | Portail Next.js (Vercel) | ⏳ CNAME à créer sur Hostinger |
| `api.perform-learn.fr` | API Node.js backend | ⏳ Container `app` à builder/déployer |
| `s3.perform-learn.fr` | MinIO API (S3-compatible) | ✅ Cert SSL OK |
| `minio.perform-learn.fr` | MinIO Console | ✅ Opérationnel |
| `analytics.perform-learn.fr` | Umami (métriques) | ✅ Opérationnel |
| `monitor.perform-learn.fr` | Netdata (monitoring serveur) | ✅ Opérationnel |

### CNAME à créer sur Hostinger pour portal.perform-learn.fr

| Type | Nom | Valeur | TTL |
|---|---|---|---|
| CNAME | `portal` | `cname.vercel-dns.com.` | 3600 |

Le domaine est déjà déclaré et vérifié côté Vercel (`verified: true`). Dès propagation DNS, `https://portal.perform-learn.fr` sera actif avec SSL auto.

---

## État actuel sur le VPS

**Chemin projet** : `/appli/app-store/`

**Conteneurs Docker qui tournent** :
- `postgres` (PostgreSQL 16 Alpine) — ✅ Healthy, port 5432 exposé sur IP publique (Vercel)
- `minio` (MinIO latest) — ✅ Healthy
- `umami` (ghcr.io/umami-software/umami:postgresql-latest) — ✅ Running
- `netdata` (netdata/netdata:stable) — ✅ Healthy
- `caddy` (caddy:2-alpine) — ✅ Running, SSL certs obtenus

**Conteneur manquant** :
- `app` (API Node.js) — ⏳ Code prêt dans `api/`, pas encore buildé

**User système** : `abdel` (sudoer, port SSH : **2222**)

---

## PostgreSQL — Schémas et tables

**Base** : `appstore` | **Base séparée** : `umami` (Umami analytics)

### Schémas dans `appstore` :

| Schéma | Usage | Status |
|---|---|---|
| `store` | App Store (portail, apps, installations, waitlist) | ✅ Tables créées |
| `governance` | Framework gouvernance (Vision→Cycle→Epic→US→Task) | ✅ Opérationnel |
| `freelancehub` | Marketplace B2B consulting (8 tables) | ✅ Migration appliquée |
| `meteo` | Meteo-projet dashboard | ⏳ À venir |
| `stock` | Gestion de stock | ⏳ À venir |
| `shared` | Tables partagées (users) | ✅ Table créée |

### Migrations appliquées sur le VPS :

| Fichier | Contenu | Status VPS |
|---|---|---|
| `init-db.sql` | Schémas + tables store/shared | ✅ Appliqué |
| `migration_governance_v1.sql` | Schema governance, tables artifacts/metrics/logs | ✅ Appliqué |
| `migration_governance_v1_1.sql` | Ajout `sort_order` dans la vue | ✅ Appliqué |
| `migration_governance_v1_2.sql` | Ajout `business_value`, `value_type`, `value_note` | ✅ Appliqué |
| `migration_governance_v1_2_fix.sql` | Patch `DROP VIEW CASCADE + CREATE VIEW` | ✅ Appliqué |
| `seed_governance_v1.sql` | Seed Vision + Cycles + Epics initiaux | ✅ Appliqué |
| `govern/seed_business_value_v1.sql` | Backfill business_value sur 17 artefacts | ✅ Appliqué |
| `migrations/006_freelancehub_v1.sql` | Schema freelancehub, 8 tables + 12 skills seeds + 3 comptes demo | ✅ Appliqué |

### Vue `governance.v_artifact_context` :
Jointure artifacts + parent + assignee. Inclut toutes les colonnes.
**Attention** : toujours utiliser `DROP VIEW IF EXISTS ... CASCADE; CREATE VIEW` (pas `CREATE OR REPLACE VIEW`) pour éviter l'erreur de réordonnancement de colonnes PostgreSQL.

---

## FreelanceHub — Marketplace B2B Consulting

### Concept

Place de marché B2B anonyme jusqu'au paiement : le client cherche une compétence, obtient des cartes consultants sans nom ni email, réserve et paie. L'identité du consultant n'est révélée qu'après capture du paiement (escrow 15% commission).

### Architecture applicative

```
portal/
├── app/freelancehub/
│   ├── login/page.tsx                      # Page login commune (3 rôles)
│   ├── (auth)/layout.tsx                   # Layout protégé : FHNav + FHSidebar
│   ├── (auth)/consultant/
│   │   ├── page.tsx                        # Dashboard consultant
│   │   ├── bookings/page.tsx               # Mes réservations
│   │   ├── bookings/[id]/review/page.tsx   # Évaluer une mission
│   │   ├── slots/page.tsx                  # Gérer mes disponibilités
│   │   └── earnings/page.tsx               # Mes gains
│   ├── (auth)/client/
│   │   ├── page.tsx                        # Dashboard client
│   │   ├── search/page.tsx                 # Recherche + matching
│   │   ├── bookings/page.tsx               # Mes réservations
│   │   └── reviews/[id]/page.tsx           # Évaluer une mission
│   └── (auth)/admin/
│       ├── page.tsx                        # Dashboard admin
│       ├── users/page.tsx                  # Gestion utilisateurs
│       └── bookings/page.tsx               # Toutes les réservations
├── app/api/freelancehub/
│   ├── matching/route.ts                   # POST : algo scoring 4 critères
│   ├── client/bookings/route.ts            # POST : créer réservation
│   ├── client/bookings/[id]/pay/route.ts   # POST : simuler paiement Stripe
│   ├── consultant/slots/route.ts           # GET/POST : créneaux dispo
│   └── reviews/route.ts                   # POST : soumettre évaluation
├── components/freelancehub/
│   ├── FHNav.tsx                           # Nav sticky, badge rôle, signOut
│   ├── FHSidebar.tsx                       # 5 items par rôle
│   ├── client/SearchClient.tsx             # Formulaire recherche + cartes anonymes
│   ├── client/BookingModal.tsx             # 3 étapes : confirm → pay → reveal
│   └── consultant/SlotManager.tsx          # Calendrier disponibilités
├── lib/freelancehub/
│   ├── matching.ts                         # findMatches() — score composite
│   ├── auth-queries.ts                     # getUserWithPasswordHash()
│   ├── email.ts                            # Resend : 4 templates email
│   └── types.ts                            # UserRole, Booking, Consultant...
├── auth.config.ts                          # Config JWT Edge-safe (middleware)
├── auth.ts                                 # NextAuth v5 + Credentials + bcrypt
└── middleware.ts                           # Protection routes + RBAC
```

### Schema PostgreSQL `freelancehub`

```
skills            → 12 compétences seedées (ERP, Management, Data, Tech, Finance)
users             → 3 rôles : client | consultant | admin
consultants       → profil, tarif, rating (lié à users)
consultant_skills → pivot compétences ↔ consultants
slots             → créneaux disponibles par consultant
bookings          → réservations (revealed_at = NULL jusqu'au paiement)
payments          → escrow : pending → authorized → captured → transferred
reviews           → évaluations mutuelles (déclenche libération fonds si les 2 soumises)
```

### Algorithme de matching

```
score = 0.40 × skill_match
      + 0.30 × rating_score       (rating / 5)
      + 0.20 × availability_score (slot dispo à la date demandée)
      + 0.10 × price_score        (1 - tarif_norm / budget_max)
```
Top 5 consultants retournés, **identité masquée** (pas de nom ni email).

### Comptes de démonstration (mot de passe : `demo1234`)

| Rôle | Email |
|---|---|
| Admin | `admin@perform-learn.fr` |
| Consultant | `consultant1@perform-learn.fr` |
| Client | `client1@perform-learn.fr` |

### Emails transactionnels (Resend)

| Déclencheur | Destinataires |
|---|---|
| Paiement capturé | Client (confirmation) + Consultant (nouvelle mission) |
| J-1 avant mission | Client + Consultant (rappel) |
| Mission terminée | Client + Consultant (demande d'évaluation) |
| 2e évaluation soumise | Consultant (libération des fonds) |

### Point technique important — Edge Runtime

Le middleware Next.js tourne sur Edge Runtime (pas Node.js). `bcryptjs` et `pg` sont incompatibles Edge. Pattern utilisé :
- `auth.config.ts` : config JWT/callbacks **sans** providers → importé par le middleware
- `auth.ts` : étend `authConfig` + Credentials provider avec bcrypt → Node.js uniquement
- `middleware.ts` : instancie `NextAuth(authConfig)` (pas d'import de `auth.ts`)

---

## Déploiement Vercel — Status production

**URL** : `https://app-store-sandy.vercel.app` (alias : `portal.perform-learn.fr` une fois CNAME propagé)
**Projet Vercel** : `prj_9rs20IFlEJaEwQDwsmtBTplbucwl` | Team : `team_0hYXNWFdzAbTf8FOBmaI5hPC`
**Dernier commit déployé** : `376b119` (fix Edge Runtime middleware)

### Variables d'environnement Vercel (toutes configurées)

| Variable | Status |
|---|---|
| `DATABASE_URL` | ✅ `postgresql://appstore:***@37.59.125.159:5432/appstore` |
| `NEXTAUTH_SECRET` | ✅ configuré |
| `NEXTAUTH_URL` | ✅ `https://portal.perform-learn.fr` |
| `RESEND_API_KEY` | ✅ configuré |
| `NEXT_PUBLIC_API_URL` | ✅ `https://api.perform-learn.fr` |

---

## Tests E2E — Scénarios de validation

### Pré-requis
- Accès sur `https://portal.perform-learn.fr` (ou `https://app-store-sandy.vercel.app` tant que le CNAME n'est pas propagé)
- Comptes demo actifs avec bcrypt hashes (`demo1234`)

### Scénario 1 — Login et RBAC

```
1. Aller sur /freelancehub/login
2. Login admin@perform-learn.fr / demo1234
   → Doit rediriger vers /freelancehub/admin
3. Logout
4. Login consultant1@perform-learn.fr / demo1234
   → Doit rediriger vers /freelancehub/consultant
5. Tenter d'accéder à /freelancehub/client
   → Doit rediriger vers /freelancehub/consultant (mauvais rôle)
6. Login client1@perform-learn.fr / demo1234
   → Doit rediriger vers /freelancehub/client
```

### Scénario 2 — Recherche et matching consultant

```
1. Login client1
2. Aller sur /freelancehub/client/search
3. Sélectionner une compétence (ex: "ERP / D365 F&O"), une date, une heure
4. Cliquer "Rechercher"
   → Doit afficher ≤5 cartes anonymes (sans nom ni email)
   → Chaque carte affiche : compétence, score composite, rating, tarif HT, barres de score
5. Cliquer sur une carte → BookingModal s'ouvre
```

### Scénario 3 — Booking et paiement (flow complet)

```
1. Dans BookingModal (étape confirm) : vérifier récapitulatif
2. Cliquer "Procéder au paiement"
   → Étape payment : formulaire carte mock (4242 4242 4242 4242)
3. Remplir la carte et valider
   → API POST /api/freelancehub/client/bookings crée la réservation
   → API POST /api/freelancehub/client/bookings/[id]/pay capture le paiement
   → Email confirmation envoyé au client ET au consultant (Resend)
   → Étape done : NOM et EMAIL du consultant révélés
4. Vérifier dans /freelancehub/client/bookings que la réservation apparaît (status: confirmed)
```

### Scénario 4 — Vue consultant

```
1. Login consultant1
2. Aller sur /freelancehub/consultant/bookings
   → La réservation créée en scénario 3 doit apparaître
3. Aller sur /freelancehub/consultant/slots
   → Possibilité d'ajouter/supprimer des créneaux
```

### Scénario 5 — Évaluations et libération des fonds

```
1. (Admin ou trigger manuel) Passer booking en status 'completed'
2. Login client1 → /freelancehub/client/reviews/[bookingId]
   → Soumettre note + commentaire
   → Email envoyé au consultant pour demande d'évaluation
3. Login consultant1 → /freelancehub/consultant/bookings/[bookingId]/review
   → Soumettre note + commentaire
   → Déclenchement automatique : payments.status → 'transferred'
   → Email de libération des fonds envoyé au consultant
4. Vérifier /freelancehub/consultant/earnings que le montant net apparaît
```

### Scénario 6 — Admin

```
1. Login admin
2. /freelancehub/admin/users → liste tous les utilisateurs avec rôles
3. /freelancehub/admin/bookings → toutes les réservations (client + consultant visibles)
```

### Commandes de diagnostic rapide (VPS)

```bash
# Vérifier les 8 tables freelancehub
ssh -p 2222 abdel@37.59.125.159 'docker exec postgres psql -U appstore -d appstore -c "\dt freelancehub.*"'

# Voir les réservations en cours
ssh -p 2222 abdel@37.59.125.159 'docker exec postgres psql -U appstore -d appstore -c "SELECT b.id, u_client.email as client, u_cons.email as consultant, b.status, b.revealed_at FROM freelancehub.bookings b JOIN freelancehub.users u_client ON b.client_id = u_client.id JOIN freelancehub.consultants c ON b.consultant_id = c.id JOIN freelancehub.users u_cons ON c.user_id = u_cons.id ORDER BY b.created_at DESC LIMIT 10;"'

# Voir les paiements
ssh -p 2222 abdel@37.59.125.159 'docker exec postgres psql -U appstore -d appstore -c "SELECT booking_id, status, amount_ht, commission FROM freelancehub.payments ORDER BY created_at DESC LIMIT 10;"'
```

---

## Structure du repo

```
/home/user/app-store/  (mirrored sur VPS /appli/app-store/)
├── CLAUDE.md
├── README.md
├── docker-compose.yml
├── caddy/Caddyfile
├── .env                                    # Secrets (non committé)
├── init-db.sql
├── migration_governance_v*.sql
├── migrations/
│   └── 006_freelancehub_v1.sql             # Schema freelancehub complet
├── seed_governance_v1.sql
├── govern/                                 # Seeds et docs gouvernance
├── api/                                    # API Node.js waitlist (⏳ non déployé)
├── landing.html
└── portal/                                 # Next.js App Router — Vercel
    ├── auth.config.ts                      # Config Edge-safe (middleware)
    ├── auth.ts                             # NextAuth v5 + Credentials
    ├── middleware.ts                       # RBAC protection routes
    ├── app/
    │   ├── govern/                         # Framework gouvernance
    │   └── freelancehub/                   # Marketplace B2B
    ├── components/
    │   ├── govern/
    │   └── freelancehub/
    └── lib/
        ├── govern/
        └── freelancehub/
```

---

## Caddyfile actuel (fonctionnel)

```caddyfile
api.perform-learn.fr {
	reverse_proxy app:3000
	header {
		Access-Control-Allow-Origin https://perform-learn.fr https://*.vercel.app https://portal.perform-learn.fr
		Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
		Access-Control-Allow-Headers "Content-Type, Authorization"
	}
}

s3.perform-learn.fr    { reverse_proxy minio:9000 }
minio.perform-learn.fr { reverse_proxy minio:9001 }
analytics.perform-learn.fr { reverse_proxy umami:3000 }
monitor.perform-learn.fr   { reverse_proxy netdata:19999 }

perform-learn.fr, www.perform-learn.fr {
	root * /srv
	file_server
}
```

---

## Variables d'environnement

```
# VPS .env (non committé)
PG_USER=appstore
PG_PASSWORD=<secret>
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=<secret>
UMAMI_SECRET=<secret>

# Vercel (portal) — toutes configurées
DATABASE_URL=postgresql://appstore:<secret>@37.59.125.159:5432/appstore
NEXTAUTH_SECRET=<secret>
NEXTAUTH_URL=https://portal.perform-learn.fr
RESEND_API_KEY=<secret>
NEXT_PUBLIC_API_URL=https://api.perform-learn.fr
```

---

## Tâches restantes — par priorité

### Infra VPS

1. **⏳ DNS** : créer CNAME `portal` → `cname.vercel-dns.com.` sur Hostinger
2. **⏳ Déployer le container `app` (API waitlist)** :
   ```bash
   ssh -p 2222 abdel@37.59.125.159 'cd /appli/app-store && docker compose up -d --build app'
   ```
3. **⏳ Mettre à jour le Caddyfile** pour ajouter `https://portal.perform-learn.fr` dans les CORS du bloc `api.perform-learn.fr`

### FreelanceHub — évolutions post-MVP

| Priorité | Feature |
|---|---|
| 🔴 | Intégration Stripe réelle (remplacer le mock) |
| 🔴 | Cron J-1 : envoi automatique des rappels (`sendBookingReminder`) |
| 🟠 | Notifications in-app (badge sur la cloche) |
| 🟠 | Page profil consultant éditable |
| 🟡 | Export CSV des réservations (admin) |

### Gouvernance — évolutions

| Priorité | Feature | Valeur business |
|---|---|---|
| 🔴 Haute | Édition inline business_value depuis `/govern/plan` | 85 |
| 🔴 Haute | Filtres sur `/govern/plan` : cycle, statut, valeur | 80 |
| 🟠 Moyenne | Graphe burndown par cycle | 65 |
| 🟠 Moyenne | Page `/govern/agent` : prompt → artefact via LLM | 60 |
| 🟡 Faible | Export CSV du plan d'action | 40 |

### Apps métiers futures

- `meteo-projet` : dashboard météo de projet (schéma `meteo` prêt)
- `stock` : gestion de stock (schéma `stock` prêt)
- Chaque app = repo Next.js séparé déployé sur Vercel + tracking Umami

---

## Framework gouvernance — rappel hiérarchie

```
Vision
└── Cycle (trimestre/sprint)
    └── Epic (fonctionnalité majeure, business_value 0-100)
        └── User Story (besoin utilisateur, business_value 0-100)
            └── Task (technique, pas de business_value)
```

**Scoring business_value** :
- `≥75` → Haute (badge sauge)
- `50–74` → Moyenne (badge terracotta)
- `25–49` → Faible (badge gris)
- `<25` → Très faible (badge kaki)

**value_type** : `user_acquisition` | `cost_reduction` | `strategic_positioning` | `ux_improvement` | `technical_debt`

---

## Conventions

- **Formatting** : Scannable — headings, tables, bullet points
- **LaTeX** : uniquement pour formules mathématiques complexes
- **Langue** : Français pour les échanges, anglais pour le code
- **Git** : GitHub repo `aflouat/app-store` (privé), branche `main`
- **Approche** : POC fonctionnel, étapes par étapes, résultats concrets
- **PostgreSQL views** : toujours `DROP VIEW IF EXISTS ... CASCADE; CREATE VIEW` (jamais `CREATE OR REPLACE VIEW` si les colonnes changent d'ordre)
- **Next.js middleware** : toujours séparer `auth.config.ts` (Edge-safe) de `auth.ts` (Node.js) pour éviter l'incompatibilité bcrypt/Edge Runtime

---

## Connexion VPS

```bash
ssh -p 2222 abdel@37.59.125.159
cd /appli/app-store
```

---

## Commandes utiles

```bash
# Conteneurs
docker compose ps
docker compose logs app --tail 20
docker compose up -d --build

# PostgreSQL — gouvernance
docker exec -i postgres psql -U appstore -d appstore -c "SELECT type, COUNT(*), AVG(business_value) FROM governance.artifacts WHERE business_value IS NOT NULL GROUP BY type;"
docker exec -i postgres psql -U appstore -d appstore -c "\d governance.v_artifact_context"

# PostgreSQL — freelancehub
docker exec postgres psql -U appstore -d appstore -c "\dt freelancehub.*"
docker exec postgres psql -U appstore -d appstore -c "SELECT email, role FROM freelancehub.users;"
docker exec postgres psql -U appstore -d appstore -c "SELECT b.id, b.status, b.revealed_at, p.status as pay_status FROM freelancehub.bookings b LEFT JOIN freelancehub.payments p ON p.booking_id = b.id ORDER BY b.created_at DESC LIMIT 5;"

# Backup
docker exec postgres pg_dumpall -U appstore > backup_$(date +%Y%m%d).sql

# Git sur VPS
git pull origin main
git log --oneline -5
```
