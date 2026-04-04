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
│App    │    │ Meteo   │   │ Stock   │
│Store  │    │ Projet  │   │ App     │
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
| `api.perform-learn.fr` | API Node.js backend | ⏳ À déployer (conteneur `app`) |
| `s3.perform-learn.fr` | MinIO API (S3-compatible) | ✅ Cert SSL OK |
| `minio.perform-learn.fr` | MinIO Console | ✅ Opérationnel |
| `analytics.perform-learn.fr` | Umami (métriques) | ✅ Opérationnel |
| `monitor.perform-learn.fr` | Netdata (monitoring serveur) | ✅ Opérationnel |

---

## État actuel sur le VPS

**Chemin projet** : `/appli/app-store/`

**Conteneurs Docker qui tournent** :
- `postgres` (PostgreSQL 16 Alpine) — port 5432 local uniquement — ✅ Healthy
- `minio` (MinIO latest) — ✅ Healthy
- `umami` (ghcr.io/umami-software/umami:postgresql-latest) — ✅ Running
- `netdata` (netdata/netdata:stable) — ✅ Healthy
- `caddy` (caddy:2-alpine) — ✅ Running, SSL certs obtenus

**Conteneur manquant** :
- `app` (API Node.js) — ⏳ Pas encore buildé/déployé

**User système** : `abdel` (sudoer, clé SSH)

---

## Structure de fichiers actuelle sur le VPS

```
/appli/app-store/
├── .env                    # Variables (PG_PASSWORD, MINIO_ROOT_PASSWORD, UMAMI_SECRET)
├── .git/
├── .gitignore
├── Caddyfile               # (copie racine, pas utilisée)
├── README.md
├── caddy/
│   └── Caddyfile           # Config active — montée dans le conteneur Caddy
├── deploy.sh
├── docker-compose.yml
├── front.html              # Lprototype de la solutation
├── landing.html              # Landing page actuelle — servie sur perform-learn.fr

├── init-db.sql             # Script init PostgreSQL (schémas + tables store.apps, shared.users, etc.)
├── logo.png
└── minio/
    └── data/
```

---

## PostgreSQL — Schémas et tables

**Base** : `appstore`
**Base séparée** : `umami` (pour Umami analytics)

### Schémas dans `appstore` :

| Schéma | Usage |
|---|---|
| `store` | App Store (portail, apps, installations) |
| `meteo` | Meteo-projet dashboard |
| `stock` | Gestion de stock |
| `shared` | Tables partagées (users) |

### Tables existantes (créées via init-db.sql) :

```sql
-- shared.users
CREATE TABLE shared.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- store.apps
CREATE TABLE store.apps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon_url TEXT,
    version VARCHAR(50) DEFAULT '0.1.0',
    status VARCHAR(20) DEFAULT 'draft',  -- draft, published, archived
    url TEXT,                             -- URL Vercel du front
    api_base TEXT,                        -- endpoint API sur le VPS
    owner_id UUID REFERENCES shared.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- store.installations
CREATE TABLE store.installations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id UUID REFERENCES store.apps(id) ON DELETE CASCADE,
    user_id UUID REFERENCES shared.users(id) ON DELETE CASCADE,
    installed_at TIMESTAMPTZ DEFAULT NOW(),
    last_opened_at TIMESTAMPTZ,
    UNIQUE(app_id, user_id)
);
```

### Table à créer (waitlist) :

```sql
CREATE TABLE IF NOT EXISTS store.waitlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('client', 'freelance')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(email)
);
CREATE INDEX idx_waitlist_type ON store.waitlist(user_type);
CREATE INDEX idx_waitlist_date ON store.waitlist(created_at);
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

s3.perform-learn.fr {
	reverse_proxy minio:9000
}

minio.perform-learn.fr {
	reverse_proxy minio:9001
}

analytics.perform-learn.fr {
	reverse_proxy umami:3000
}

monitor.perform-learn.fr {
	reverse_proxy netdata:19999
}

perform-learn.fr, www.perform-learn.fr {
	root * /srv
	file_server
}
```

---

## docker-compose.yml actuel

Le fichier inclut les services : caddy, postgres, minio, umami, netdata.

**Service `app` à ajouter** :

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

Le volume Caddy doit aussi inclure :
```yaml
      - ./front.html:/srv/index.html:ro
```

**Note** : supprimer la ligne `version: "3.8"` du docker-compose.yml (obsolète, génère un warning).

---

## .env (structure — valeurs à ne pas committer)

```
PG_USER=appstore
PG_PASSWORD=<secret>
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=<secret>
UMAMI_SECRET=<secret>
```

---

## API waitlist — fichiers à créer dans `/appli/app-store/api/`

### api/Dockerfile
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json .
RUN npm install --production
COPY server.js .
EXPOSE 3000
CMD ["node", "server.js"]
```

### api/package.json
```json
{
  "name": "perform-learn-api",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": { "start": "node server.js" },
  "dependencies": { "pg": "^8.13.0" }
}
```

### api/server.js
Micro serveur Node.js avec endpoints :
- `GET /health` — healthcheck
- `POST /waitlist` — inscription (email + user_type client|freelance)
- `GET /waitlist/stats` — compteurs par type
- CORS configuré pour perform-learn.fr et *.vercel.app

---

## Landing page (front.html)

Fichier HTML unique servi par Caddy sur `perform-learn.fr`. Contient :
- Countdown vers 30/04/2026 09:00 CET
- Formulaire waitlist (email + type client/freelance)
- Appel POST vers `https://api.perform-learn.fr/waitlist`
- Palette : Fraunces + DM Sans, couleurs terracotta/sauge (--c1 à --c4)
- Responsive, animations CSS

La fonction `submitWaitlist()` doit faire un fetch POST vers l'API (pas un console.log).

---

## Tâches restantes — par priorité

### Phase 1 : Finaliser l'infra (MAINTENANT)

1. **Créer la table `store.waitlist`** dans PostgreSQL
2. **Créer le dossier `api/`** avec Dockerfile, package.json, server.js
3. **Ajouter le service `app`** dans docker-compose.yml
4. **Ajouter le volume `front.html:/srv/index.html:ro`** dans caddy
5. **Supprimer `version: "3.8"`** du docker-compose.yml
6. **Mettre à jour front.html** : remplacer le console.log par le fetch vers l'API
7. **Rebuild et test** : `docker compose up -d --build`
8. **Vérifier** : `curl https://api.perform-learn.fr/health`

### Phase 2 : Portail App Store (Next.js sur Vercel)

Architecture Option A :
- Créer un projet Next.js 14+ (App Router)
- Connecter au PostgreSQL du VPS via API
- Page catalogue avec cards des apps (lecture de store.apps)
- Déployer sur Vercel
- Configurer un domaine custom si souhaité (ex: apps.perform-learn.fr)

### Phase 3 : Apps métiers individuelles

- Chaque app = un repo Next.js déployé sur Vercel
- Chaque app a son propre schéma PostgreSQL sur le VPS
- Umami tracking par app pour mesurer l'utilisation

---

## Conventions

- **Formatting** : Scannable — headings, tables, bullet points
- **LaTeX** : uniquement pour formules mathématiques complexes
- **Langue** : Français pour les échanges, anglais pour le code
- **Git** : GitHub repo `aflouat/app-store` (privé)
- **Approche** : POC fonctionnel, étapes par étapes, résultats concrets

---

## Connexion VPS

```bash
ssh abdel@37.59.125.159
cd /appli/app-store
```

---

## Commandes utiles

```bash
# Voir les conteneurs
docker compose ps

# Logs d'un service
docker compose logs caddy --tail 20
docker compose logs app --tail 20

# Rebuild après changement
docker compose up -d --build

# Requête PostgreSQL
docker exec -i postgres psql -U appstore -d appstore -c "SELECT * FROM store.waitlist;"

# Backup
docker exec postgres pg_dumpall -U appstore > backup_$(date +%Y%m%d).sql
```
