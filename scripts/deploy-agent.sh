#!/usr/bin/env bash
# scripts/deploy-agent.sh — Agent DevOps : TNR + Déploiement VPS
# Usage : ./scripts/deploy-agent.sh [--skip-migrations] [--skip-caddy]
#
# Flux :
#   1. TNR (Tests de Non-Régression)
#   2. Si TNR ✅ → déploiement VPS
#   3. Si TNR ❌ → arrêt + rapport d'erreur

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "========================================"
echo -e "${BLUE}  🤖 AGENT DEVOPS — perform-learn.fr${NC}"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================"
echo ""

# ── Phase 1 : TNR ─────────────────────────────────────────────
echo -e "${YELLOW}▶ PHASE 1 — Tests de Non-Régression (TNR)${NC}"
if bash "$SCRIPT_DIR/tnr.sh"; then
  echo ""
  echo -e "${GREEN}TNR ✅ — Prêt pour déploiement${NC}"
else
  echo ""
  echo -e "${RED}TNR ❌ — Déploiement ANNULÉ${NC}"
  echo ""
  echo "Corriger les erreurs ci-dessus, puis relancer :"
  echo "  ./scripts/deploy-agent.sh"
  exit 1
fi

# ── Phase 2 : Déploiement VPS ───────────────────────────────
echo ""
echo -e "${YELLOW}▶ PHASE 2 — Déploiement VPS${NC}"
bash "$SCRIPT_DIR/deploy-vps.sh" "$@"

# ── Phase 3 : Vérification post-déploiement ───────────────────
echo ""
echo -e "${YELLOW}▶ PHASE 3 — Vérification post-déploiement${NC}"
sleep 2

HEALTH_URL="https://api.perform-learn.fr/health"
PORTAL_URL="https://portal.perform-learn.fr"

if curl -sf "$HEALTH_URL" > /dev/null 2>&1; then
  echo -e "${GREEN}  ✓ API health OK ($HEALTH_URL)${NC}"
else
  echo -e "${RED}  ✗ API health FAIL ($HEALTH_URL)${NC}"
fi

if curl -sf "$PORTAL_URL" > /dev/null 2>&1; then
  echo -e "${GREEN}  ✓ Portal OK ($PORTAL_URL)${NC}"
else
  echo -e "${RED}  ✗ Portal FAIL ($PORTAL_URL)${NC}"
fi

# ── Résumé final ──────────────────────────────────────────────
echo ""
echo "========================================"
echo -e "${GREEN}  🚀 DÉPLOIEMENT TERMINÉ AVEC SUCCÈS${NC}"
echo "========================================"
echo ""
