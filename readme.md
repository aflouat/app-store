# App Store POC — perform-learn.fr

Infrastructure backend auto-hébergée sur VPS OVH pour héberger plusieurs applications métiers.

## Architecture

```
┌─────────────────────────────────────────────────┐
│              VPS OVH (perform-learn.fr)          │
│                                                  │
│  Caddy ──► PostgreSQL (multi-schéma)             │
│    │   ──► MinIO (stockage S3)                   │
│    │   ──► Umami (analytics)                     │
│    │   ──► Netdata (monitoring)                  │
└────┼────────────────────────────────────────────┘
     │
     ├── api.perform-learn.fr        → Backend API
     ├── s3.perform-learn.fr         → MinIO S3
     ├── minio.perform-learn.fr      → MinIO Console
     ├── analytics.perform-learn.fr  → Umami
     └── monitor.perform-learn.fr    → Netdata
```

## Prérequis DNS

Ajouter ces enregistrements DNS (type A) chez OVH :

| Type | Nom         | Valeur          |
|------|-------------|-----------------|
| A    | api         | 37.59.125.159   |
| A    | s3          | 37.59.125.159   |
| A    | minio       | 37.59.125.159   |
| A    | analytics   | 37.59.125.159   |
| A    | monitor     | 37.59.125.159   |

## Déploiement

```bash
# 1. Cloner sur le VPS
git clone <repo> app-store && cd app-store

# 2. Configurer les mots de passe
cp .env.example .env
nano .env

# 3. Lancer
chmod +x deploy.sh
./deploy.sh
```

## Commandes utiles

```bash
# Voir les logs
docker compose logs -f

# Redémarrer un service
docker compose restart postgres

# Voir l'utilisation ressources
docker stats

# Backup PostgreSQL
docker exec postgres pg_dumpall -U appstore > backup_$(date +%Y%m%d).sql
```

## Schémas PostgreSQL

| Schéma   | Application          |
|----------|----------------------|
| store    | App Store (portail)  |
| meteo    | Meteo-projet         |
| stock    | Gestion de stock     |
| shared   | Users, données communes |

Chaque nouvelle app métier = un nouveau schéma.
