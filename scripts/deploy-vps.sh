#!/usr/bin/env bash
# scripts/deploy-vps.sh — Déploiement VPS perform-learn.fr
# Prérequis : SSH key-based auth configuré pour abdel@37.59.125.159:2222
# Usage : ./scripts/deploy-vps.sh [--skip-migrations] [--skip-caddy]

set -euo pipefail

VPS_HOST="37.59.125.159"
VPS_PORT="2222"
VPS_USER="abdel"
VPS_PATH="/appli/app-store"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SKIP_MIGRATIONS=false
SKIP_CADDY=false

for arg in "$@"; do
  case $arg in
    --skip-migrations) SKIP_MIGRATIONS=true ;;
    --skip-caddy) SKIP_CADDY=true ;;
  esac
done

function step() {
  echo ""
  echo -e "${YELLOW}[DEPLOY] $1${NC}"
}

function ok() { echo -e "${GREEN}  ✓ $1${NC}"; }
function ko() { echo -e "${RED}  ✗ $1${NC}"; exit 1; }

echo "========================================"
echo "  Déploiement VPS — perform-learn.fr"
echo "  $VPS_USER@$VPS_HOST:$VPS_PORT"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================"

# ── 1. Vérifier connectivité SSH ──────────────────────────────
step "Vérification SSH"
if ssh -p "$VPS_PORT" -o ConnectTimeout=5 -o BatchMode=yes "$VPS_USER@$VPS_HOST" 'echo OK' > /dev/null 2>&1; then
  ok "SSH OK (key-based auth)"
else
  ko "SSH échoué — vérifiez : ssh -p $VPS_PORT $VPS_USER@$VPS_HOST"
fi

# ── 2. Git pull sur le VPS ────────────────────────────────────
step "Git pull sur VPS"
if ssh -p "$VPS_PORT" "$VPS_USER@$VPS_HOST" "cd $VPS_PATH && git pull origin main" > /tmp/deploy-git.log 2>&1; then
  ok "Git pull OK"
  tail -n 3 /tmp/deploy-git.log | sed 's/^/    /'
else
  ko "Git pull échoué — voir /tmp/deploy-git.log"
fi

# ── 3. Rebuild containers Docker ──────────────────────────────
step "Rebuild containers Docker"
if ssh -p "$VPS_PORT" "$VPS_USER@$VPS_HOST" "cd $VPS_PATH && docker compose up -d --build" > /tmp/deploy-docker.log 2>&1; then
  ok "Containers rebuild OK"
else
  ko "Docker rebuild échoué — voir /tmp/deploy-docker.log"
fi

# ── 4. Reload Caddy (si Caddyfile modifié) ────────────────────
if [ "$SKIP_CADDY" = false ]; then
  step "Reload Caddy"
  if ssh -p "$VPS_PORT" "$VPS_USER@$VPS_HOST" "cd $VPS_PATH && docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile" > /tmp/deploy-caddy.log 2>&1; then
    ok "Caddy reload OK"
  else
    echo "    ⚠ Caddy reload échoué (peut être normal si pas de changement)"
  fi
fi

# ── 5. Appliquer migrations SQL ───────────────────────────────
if [ "$SKIP_MIGRATIONS" = false ]; then
  step "Vérification migrations SQL"
  # Lister les migrations non appliquées (heuristique : fichier .sql non lu dans le répertoire)
  # Pour un POC, on affiche les migrations disponibles et on laisse l'opérateur décider
  MIGRATIONS=$(ls -1 migrations/*.sql 2>/dev/null | sort)
  if [ -n "$MIGRATIONS" ]; then
    echo "    Migrations disponibles :"
    echo "$MIGRATIONS" | sed 's/^/      /'
    echo "    ⚠ Appliquer manuellement si nécessaire :"
    echo "      ssh -p $VPS_PORT $VPS_USER@$VPS_HOST 'docker exec -i postgres psql -U appstore -d appstore' < migrations/00X.sql"
  else
    ok "Aucune migration à appliquer"
  fi
fi

# ── 6. Health checks ──────────────────────────────────────────
step "Health checks VPS"
sleep 3

# Check API
if ssh -p "$VPS_PORT" "$VPS_USER@$VPS_HOST" "curl -sf http://localhost:3001/health > /dev/null" 2>/dev/null; then
  ok "API health OK"
else
  echo "    ⚠ API health non joignable (peut être normal si port interne)"
fi

# Check containers
if ssh -p "$VPS_PORT" "$VPS_USER@$VPS_HOST" "cd $VPS_PATH && docker compose ps" > /tmp/deploy-ps.log 2>&1; then
  ok "Containers actifs"
  ssh -p "$VPS_PORT" "$VPS_USER@$VPS_HOST" "cd $VPS_PATH && docker compose ps" 2>/dev/null | tail -n +2 | sed 's/^/    /'
else
  echo "    ⚠ docker compose ps échoué"
fi

# ── Résumé ────────────────────────────────────────────────────
echo ""
echo "========================================"
echo -e "${GREEN}Déploiement VPS ✅ TERMINÉ${NC}"
echo "========================================"
echo ""
echo "URLs :"
echo "  https://portal.perform-learn.fr"
echo "  https://api.perform-learn.fr"
echo "  https://analytics.perform-learn.fr"
echo ""
