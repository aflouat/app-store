#!/usr/bin/env bash
# scripts/tnr.sh — Tests de Non-Régression (TNR)
# Usage : ./scripts/tnr.sh
# Référence : DONE.md §1 §5 §6

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ERRORS=0
STEP=0
TOTAL=7

function step() {
  STEP=$((STEP + 1))
  echo ""
  echo -e "${YELLOW}[$STEP/$TOTAL] $1${NC}"
}

function ok()   { echo -e "${GREEN}  ✓ $1${NC}"; }
function warn() { echo -e "${YELLOW}  ⚠ $1${NC}"; }
function ko()   { echo -e "${RED}  ✗ $1${NC}"; ERRORS=$((ERRORS + 1)); }

echo "========================================"
echo "  TNR — Tests de Non-Régression"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================"

# Chemin repo
if [ -f "$SCRIPT_DIR/../portal/package.json" ]; then
  REPO_ROOT="$SCRIPT_DIR/.."
else
  REPO_ROOT="$SCRIPT_DIR"
fi
cd "$REPO_ROOT/portal"

# ── 1. Git — working tree propre ──────────────────────────────
step "Git — état du dépôt"
cd "$REPO_ROOT"
if git diff --quiet && git diff --cached --quiet; then
  ok "Working tree propre (pas de changements non commités)"
else
  warn "Changements non commités détectés — poursuivi quand même"
  git status --short | sed 's/^/    /'
fi

STASH_COUNT=$(git stash list | wc -l | tr -d ' ')
if [ "$STASH_COUNT" -gt 0 ]; then
  warn "$STASH_COUNT entrée(s) dans git stash — vérifier avant release"
else
  ok "git stash vide"
fi

BRANCH=$(git rev-parse --abbrev-ref HEAD)
ok "Branche courante : $BRANCH"
cd "$REPO_ROOT/portal"

# ── 2. Secrets hardcodés ──────────────────────────────────────
step "Vérification secrets hardcodés"
cd "$REPO_ROOT"
SECRETS=$(grep -rn "sk_live_\|re_live_\|whsec_live_\|xai-live\|RESEND_API_KEY=re_[^t]" \
  portal/app portal/lib portal/components 2>/dev/null \
  --include="*.ts" --include="*.tsx" || true)
if [ -n "$SECRETS" ]; then
  ko "Secret(s) potentiel(s) détecté(s) :"
  echo "$SECRETS" | sed 's/^/    /'
else
  ok "Aucun secret *_live* dans le code"
fi
cd "$REPO_ROOT/portal"

# ── 3. TypeScript strict ──────────────────────────────────────
step "TypeScript (tsc --noEmit)"
if npx tsc --noEmit > /tmp/tnr-tsc.log 2>&1; then
  ok "TypeScript : 0 erreur"
else
  ko "TypeScript : erreurs détectées"
  cat /tmp/tnr-tsc.log | head -30
fi

# ── 4. Tests unitaires Vitest ─────────────────────────────────
step "Tests unitaires Vitest"
if npm test > /tmp/tnr-test.log 2>&1; then
  ok "Tests passent"
  grep -E "Test Files|Tests" /tmp/tnr-test.log | sed 's/^/    /'
else
  ko "Tests échoués"
  tail -n 30 /tmp/tnr-test.log
fi

# ── 5. Build Next.js ──────────────────────────────────────────
step "Build Next.js"
if npm run build > /tmp/tnr-build.log 2>&1; then
  ok "Build réussi"
  grep -E "Route \(app\)|compiled|Generating" /tmp/tnr-build.log | tail -n 5 | sed 's/^/    /'
else
  ko "Build échoué"
  tail -n 20 /tmp/tnr-build.log
fi

# ── 6. Routes API critiques ───────────────────────────────────
step "Comptage routes API"
cd "$REPO_ROOT"
COUNT=$(find portal/app/api -name "route.ts" | wc -l | tr -d ' ')
ok "$COUNT routes API présentes"
echo "  Routes clés attendues :"
for route in \
  "portal/app/api/freelancehub/auth/register/route.ts" \
  "portal/app/api/freelancehub/client/bookings/route.ts" \
  "portal/app/api/freelancehub/matching/route.ts" \
  "portal/app/api/freelancehub/reviews/route.ts" \
  "portal/app/api/webhooks/stripe/route.ts" \
  "portal/app/api/freelancehub/cron/reminders/route.ts"; do
  if [ -f "$route" ]; then
    ok "  $route"
  else
    ko "  MANQUANTE : $route"
  fi
done
cd "$REPO_ROOT/portal"

# ── 7. Migrations SQL ─────────────────────────────────────────
step "Vérification migrations SQL"
cd "$REPO_ROOT"
MIGRATIONS=$(ls -1 migrations/*.sql 2>/dev/null | wc -l | tr -d ' ')
if [ "$MIGRATIONS" -gt 0 ]; then
  ok "$MIGRATIONS migrations SQL trouvées"
  ls -1 migrations/*.sql | tail -n 5 | sed 's/^/    /'
  # Vérifier la numérotation séquentielle
  LAST=$(ls -1 migrations/*.sql | sort | tail -n 1 | grep -o '[0-9]\+' | head -n 1)
  ok "Dernière migration : $LAST"
else
  ko "Aucune migration SQL trouvée"
fi

# ── Résumé ────────────────────────────────────────────────────
echo ""
echo "========================================"
if [ "$ERRORS" -eq 0 ]; then
  echo -e "${GREEN}TNR ✅ PASS — $STEP/$STEP étapes OK${NC}"
  echo -e "${GREEN}Prêt pour : ./scripts/deploy-agent.sh${NC}"
  echo "========================================"
  exit 0
else
  echo -e "${RED}TNR ❌ FAIL — $ERRORS erreur(s) sur $STEP étapes${NC}"
  echo "Corriger les erreurs ci-dessus avant de déployer."
  echo "========================================"
  exit 1
fi
