# CLAUDE.md — perform-learn.fr App Store POC

## Contexte projet

**perform-learn.fr** est une plateforme digitale qui connecte freelances et entreprises (consulting, formation, outils métiers). Le projet est en phase pré-lancement avec une date cible : **30 avril 2026**.

L'objectif est de monter un **App Store interne** hébergeant plusieurs applications métiers (meteo-projet, gestion de stock, etc.) avec mesure de l'utilisation pour pouvoir scaler.

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
│(front)│    │ (front) │   │ (front) │
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
| `api.perform-learn.fr` | API Node.js backend | ⏳ Container `app` à builder/déployer |
| `s3.perform-learn.fr` | MinIO API (S3-compatible) | ✅ Cert SSL OK |
| `minio.perform-learn.fr` | MinIO Console | ✅ Opérationnel |
| `analytics.perform-learn.fr` | Umami (métriques) | ✅ Opérationnel |
| `monitor.perform-learn.fr` | Netdata (monitoring serveur) | ✅ Opérationnel |

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
| `meteo` | Meteo-projet dashboard | ⏳ À venir |
| `stock` | Gestion de stock | ⏳ À venir |
| `shared` | Tables partagées (users) | ✅ Table créée |

### Migrations appliquées sur le VPS :

| Fichier | Contenu | Status VPS |
|---|---|---|
| `init-db.sql` | Schémas + tables store/shared | ✅ Appliqué |
| `migration_governance_v1.sql` | Schema governance, tables artifacts/metrics/logs | ✅ Appliqué |
| `migration_governance_v1_1.sql` | Ajout `sort_order` dans la vue | ✅ Appliqué |
| `migration_governance_v1_2.sql` | Ajout `business_value`, `value_type`, `value_note` (ALTER TABLE OK, vue KO) | ⚠️ Partiel |
| `migration_governance_v1_2_fix.sql` | **Patch** : `DROP VIEW CASCADE + CREATE VIEW` avec toutes les colonnes | ⏳ **À appliquer** |
| `seed_governance_v1.sql` | Seed Vision + Cycles + Epics initiaux | ✅ Appliqué |
| `govern/seed_business_value_v1.sql` | Backfill business_value sur 17 artefacts (Epics + US) | ✅ Appliqué |

### Table `governance.artifacts` — colonnes clés :

```sql
business_value  INTEGER CHECK (0-100)   -- score valeur business
value_type      VARCHAR(50)             -- user_acquisition | cost_reduction | strategic_positioning | ...
value_note      TEXT                    -- justification
sort_order      INTEGER                 -- ordre dans l'arbre
```

### Vue `governance.v_artifact_context` :
Jointure artifacts + parent + assignee. Inclut toutes les colonnes ci-dessus.
**Attention** : toujours utiliser `DROP VIEW IF EXISTS ... CASCADE; CREATE VIEW` (pas `CREATE OR REPLACE VIEW`) pour éviter l'erreur de réordonnancement de colonnes PostgreSQL.

---

## Structure du repo

```
/home/user/app-store/  (mirrored sur VPS /appli/app-store/)
├── CLAUDE.md
├── README.md
├── docker-compose.yml          # Caddy, Postgres, MinIO, Umami, Netdata (app à ajouter)
├── caddy/Caddyfile             # Config active Caddy
├── .env                        # Secrets (non committé)
├── init-db.sql                 # Init schémas store/shared
├── migration_governance_v1.sql
├── migration_governance_v1_1.sql
├── migration_governance_v1_2.sql
├── migration_governance_v1_2_fix.sql  # ← à appliquer sur le VPS
├── seed_governance_v1.sql
├── govern/
│   ├── seed_business_value_v1.sql     # 17 artefacts scorés
│   ├── seed_epic_govern.sql
│   ├── seed_tasks_govern_setup.sql
│   ├── seed_us_cta_waitlist.sql
│   ├── GOVERN_SETUP.md
│   └── TASK_cta_waitlist_v2.md
├── api/                        # API Node.js waitlist (code prêt, non déployé)
│   ├── Dockerfile
│   ├── package.json
│   └── server.js
├── landing.html                # Landing page servie sur perform-learn.fr
├── front.html                  # Prototype UI
└── portal/                     # Next.js 14 App Router — déployé sur Vercel
    ├── app/govern/             # Framework gouvernance
    │   ├── page.tsx            # Dashboard (Vision + Cycles en cours)
    │   ├── plan/page.tsx       # Plan d'action priorisé par business_value
    │   ├── artifacts/[id]/page.tsx  # Détail artefact + form édition
    │   ├── roadmap/page.tsx    # Vue roadmap
    │   ├── logs/page.tsx       # Journal des décisions
    │   └── agent/page.tsx      # Interface agent IA
    ├── components/govern/
    │   ├── BusinessValueBadge.tsx  # Badge couleur Haute/Moyenne/Faible/Très faible
    │   ├── ArtifactCard.tsx
    │   ├── ArtifactForm.tsx        # Formulaire avec slider business_value 0-100
    │   ├── GovernSidebar.tsx       # Nav : Plan d'action, Artefacts, Roadmap, Logs, Agent
    │   └── ...
    └── lib/govern/
        ├── db.ts               # Connexion PostgreSQL VPS (via DATABASE_URL)
        ├── queries.ts          # getActionPlan(), updateBusinessValue(), ...
        └── types.ts            # Artifact, ValueType, ...
```

---

## Caddyfile actuel (fonctionnel)

```caddyfile
api.perform-learn.fr {
	reverse_proxy app:3000
	header {
		Access-Control-Allow-Origin https://perform-learn.fr https://*.vercel.app
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

## Service `app` à ajouter dans docker-compose.yml

```yaml
  app:
    build: ./api
    container_name: app
    restart: unless-stopped
    environment:
      PG_USER: ${PG_USER:-appstore}
      PG_PASSWORD: ${PG_PASSWORD}
    networks:
      - app-network
    depends_on:
      postgres:
        condition: service_healthy
```

Volume Caddy à ajouter : `- ./landing.html:/srv/index.html:ro`

---

## Variables d'environnement

```
# VPS .env (non committé)
PG_USER=appstore
PG_PASSWORD=<secret>
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=<secret>
UMAMI_SECRET=<secret>

# Vercel (portal) — env vars à configurer
DATABASE_URL=postgresql://appstore:<secret>@37.59.125.159:5432/appstore
```

---

## Tâches restantes — par priorité

### Phase 1-B : Finaliser l'infra VPS (URGENT)

1. **⏳ Appliquer le patch SQL sur le VPS** :
   ```bash
   ssh -p 2222 abdel@37.59.125.159 'cd /appli/app-store && git pull origin main && docker exec -i postgres psql -U appstore -d appstore < migration_governance_v1_2_fix.sql'
   ```
   → La vue `v_artifact_context` sera corrigée → `/govern/plan` affichera les 17 artefacts scorés.

2. **⏳ Déployer le container `app` (API waitlist)** :
   ```bash
   ssh -p 2222 abdel@37.59.125.159 'cd /appli/app-store && docker compose up -d --build app'
   ```
   Puis vérifier : `curl https://api.perform-learn.fr/health`

3. **⏳ Créer la table `store.waitlist`** (si pas encore fait) :
   ```sql
   CREATE TABLE IF NOT EXISTS store.waitlist (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       email VARCHAR(255) NOT NULL,
       user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('client', 'freelance')),
       created_at TIMESTAMPTZ DEFAULT NOW(),
       UNIQUE(email)
   );
   ```

### Phase 2 : Enrichir le portail gouvernance (NEXT)

Le portail Next.js existe et tourne sur Vercel. Prochaines fonctionnalités à implémenter :

| Priorité | Feature | Valeur business |
|---|---|---|
| 🔴 Haute | Édition inline business_value depuis `/govern/plan` (PATCH API) | 85 |
| 🔴 Haute | Filtres sur `/govern/plan` : par cycle, par statut, par valeur | 80 |
| 🟠 Moyenne | Graphe burndown par cycle (métriques) | 65 |
| 🟠 Moyenne | Page `/govern/agent` : prompt → création d'artefact via LLM | 60 |
| 🟡 Faible | Export CSV du plan d'action | 40 |

### Phase 3 : Apps métiers individuelles

- `meteo-projet` : dashboard météo de projet (schéma `meteo` déjà créé)
- `stock` : gestion de stock (schéma `stock` déjà créé)
- Chaque app = repo Next.js séparé déployé sur Vercel
- Tracking Umami par app

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

# PostgreSQL
docker exec -i postgres psql -U appstore -d appstore -c "SELECT * FROM store.waitlist;"
docker exec -i postgres psql -U appstore -d appstore -c "SELECT type, COUNT(*), AVG(business_value) FROM governance.artifacts WHERE business_value IS NOT NULL GROUP BY type;"

# Vérifier la vue governance
docker exec -i postgres psql -U appstore -d appstore -c "\d governance.v_artifact_context"

# Backup
docker exec postgres pg_dumpall -U appstore > backup_$(date +%Y%m%d).sql

# Git sur VPS
git pull origin main
git log --oneline -5
```
