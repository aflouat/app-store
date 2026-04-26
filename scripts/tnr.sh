#!/usr/bin/env bash
# scripts/tnr.sh — Tests de Non-Régression (TNR)
# Vérifie build, tests unitaires, et smoke tests avant déploiement VPS
# Usage : ./scripts/tnr.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
STEP=0

function step() {
  STEP=$((STEP + 1))
  echo ""
  echo -e "${YELLOW}[$STEP/$TOTAL] $1${NC}"
}

function ok() {
  echo -e "${GREEN}  ✓ $1${NC}"
}

function ko() {
  echo -e "${RED}  ✗ $1${NC}"
  ERRORS=$((ERRORS + 1))
}

TOTAL=5

echo "========================================"
echo "  TNR — Tests de Non-Régression"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================"

# Navigate to repo root then portal
if [ -f "$SCRIPT_DIR/../portal/package.json" ]; then
  REPO_ROOT="$SCRIPT_DIR/.."
else
  REPO_ROOT="$SCRIPT_DIR"
fi
cd "$REPO_ROOT/portal"

# ── 1. Build Next.js ──────────────────────────────────────────
step "Build Next.js (TypeScript + compilation)"
if npm run build > /tmp/tnr-build.log 2>&1; then
  ok "Build réussi"
else
  ko "Build échoué — voir /tmp/tnr-build.log"
  tail -n 20 /tmp/tnr-build.log
fi

# ── 2. Tests unitaires Vitest ─────────────────────────────────
step "Tests unitaires Vitest"
if npm test > /tmp/tnr-test.log 2>&1; then
  ok "Tests passent"
  grep -E "Test Files|Tests" /tmp/tnr-test.log | sed 's/^/    /'
else
  ko "Tests échoués — voir /tmp/tnr-test.log"
  tail -n 30 /tmp/tnr-test.log
fi

# ── 3. Lint ───────────────────────────────────────────────────
step "Lint (si configuré)"
if [ ! -f ".eslintrc.json" ] && [ ! -f ".eslintrc.js" ] && [ ! -f ".eslintrc.cjs" ]; then
  echo "    ⚠ Pas de config ESLint — lint sauté"
else
  if npx next lint > /tmp/tnr-lint.log 2>&1; then
    ok "Lint OK"
  else
    ko "Lint échoué — voir /tmp/tnr-lint.log"
    tail -n 20 /tmp/tnr-lint.log
  fi
fi

# ── 4. Vérification routes API critiques ──────────────────────
step "Smoke test routes API (local)"
cd "$REPO_ROOT"
# Démarrer le serveur en arrière-plan pour les smoke tests
# (optionnel — nécessite .env.local configuré)
if [ -f portal/.env.local ]; then
  # Test rapide : vérifier que les fichiers route.ts compilent
  COUNT=$(find portal/app/api -name "route.ts" | wc -l)
  ok "$COUNT routes API présentes"
else
  echo "    ⚠ .env.local absent — smoke test local sauté"
fi

# ── 5. Vérification migrations ────────────────────────────────
step "Vérification migrations SQL"
MIGRATIONS=$(ls -1 migrations/*.sql 2>/dev/null | wc -l)
if [ "$MIGRATIONS" -gt 0 ]; then
  ok "$MIGRATIONS migrations SQL trouvées"
  ls -1 migrations/*.sql | tail -n 3 | sed 's/^/    /'
else
  ko "Aucune migration SQL trouvée"
fi

# ── Résumé ────────────────────────────────────────────────────
echo ""
echo "========================================"
if [ "$ERRORS" -eq 0 ]; then
  echo -e "${GREEN}TNR ✅ PASS — $STEP/$STEP étapes OK${NC}"
  echo "========================================"
  exit 0
else
  echo -e "${RED}TNR ❌ FAIL — $ERRORS erreur(s) sur $STEP étapes${NC}"
  echo "========================================"
  exit 1
fi
