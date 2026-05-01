#!/usr/bin/env bash
# scripts/orchestrator.sh — Software Factory · perform-learn.fr
#
# Usage :
#   ./scripts/orchestrator.sh              → sélectionne automatiquement les prochaines US
#   ./scripts/orchestrator.sh "US-42"      → force une US précise
#
# Prérequis :
#   - claude CLI (Claude Code) dans le PATH
#   - gh CLI authentifié (pour CI watch + GitHub Release)
#   - git configuré, remote origin accessible
#   - npm disponible dans portal/

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$SCRIPT_DIR/.."
FORCE_US="${1:-}"

step() { echo -e "\n${BLUE}━━━ $1 ━━━${NC}"; }
ok()   { echo -e "${GREEN}  ✅ $1${NC}"; }
fail() { echo -e "${RED}  ❌ $1${NC}"; exit 1; }
warn() { echo -e "${YELLOW}  ⚠️  $1${NC}"; }
info() { echo -e "${CYAN}  ℹ  $1${NC}"; }

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Software Factory — Orchestrateur      ║${NC}"
echo -e "${BLUE}║   perform-learn.fr · $(date '+%Y-%m-%d %H:%M')     ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════╝${NC}"

cd "$REPO_ROOT"

# ── Vérifications préalables ────────────────────────────────────────────────
step "Vérifications préalables"

command -v claude &>/dev/null || fail "claude CLI non trouvé (installer Claude Code)"
command -v gh &>/dev/null || fail "gh CLI non trouvé (installer GitHub CLI)"
command -v npm &>/dev/null || fail "npm non trouvé"

# Être sur main et à jour
CURRENT_BRANCH=$(git branch --show-current)
[ "$CURRENT_BRANCH" = "main" ] || fail "Partir de main (branche courante : $CURRENT_BRANCH)"
git pull origin main --quiet
ok "Prérequis OK · branche : main"

# ── ÉTAPE 1 : Agent DG ──────────────────────────────────────────────────────
step "Étape 1 — Agent DG (priorisation)"

DG_PROMPT="Tu es Agent DG pour perform-learn.fr.

Contexte : lis ROADMAP.md et DECISIONS.md dans le répertoire courant.

Mission :
1. Choisir 1 à 3 US/bugs prioritaires pour la prochaine release (critère : business_value décroissant, items non cochés [x])
2. Si une US n'est pas au format SMART/Gherkin (template §2 de CLAUDE.md), la reformater avant de la sélectionner
3. Mettre à jour ROADMAP.md : marquer les US sélectionnées avec [→ EN COURS]
4. Écrire la décision dans DECISIONS.md (format existant : date · décision · contexte · statut)

${FORCE_US:+US forcée par l'orchestrateur : $FORCE_US — sélectionner uniquement celle-ci.}

Réponds avec :
SELECTED_US: [liste des IDs, ex: US-42, BUG-03]
BRANCH_NAME: feat/US-42-titre-court
SCOPE_SUMMARY: [2 lignes résumant ce qui sera implémenté]"

info "Lancement Agent DG..."
DG_OUTPUT=$(claude -p "$DG_PROMPT")
echo "$DG_OUTPUT"

# Extraire le nom de branche depuis la réponse du DG
FEATURE_BRANCH=$(echo "$DG_OUTPUT" | grep "^BRANCH_NAME:" | sed 's/BRANCH_NAME: //' | tr -d ' \r')
SELECTED_US=$(echo "$DG_OUTPUT" | grep "^SELECTED_US:" | sed 's/SELECTED_US: //')

if [ -z "$FEATURE_BRANCH" ]; then
  warn "Agent DG n'a pas fourni de BRANCH_NAME — utilisation de feat/auto-$(date '+%Y%m%d%H%M')"
  FEATURE_BRANCH="feat/auto-$(date '+%Y%m%d%H%M')"
fi

ok "US sélectionnées : $SELECTED_US"
ok "Branche cible : $FEATURE_BRANCH"

# ── ÉTAPE 2 : Agent DEV ─────────────────────────────────────────────────────
step "Étape 2 — Agent DEV (implémentation)"

# Créer la branche feature
git checkout -b "$FEATURE_BRANCH"
info "Branche créée : $FEATURE_BRANCH"

DEV_PROMPT="Tu es Agent DEV pour perform-learn.fr.

OBLIGATOIRE avant de coder :
1. Lire CLAUDE.md (règles sécurité §7, RG métier §8, Edge Runtime §7)
2. Lire DONE.md §1 (régressions connues à éviter)
3. Lire les fichiers ciblés par l'US

US à implémenter : $SELECTED_US
Résumé scope : $(echo "$DG_OUTPUT" | grep "^SCOPE_SUMMARY:" | sed 's/SCOPE_SUMMARY: //')

Règles strictes :
- Travailler sur la branche $FEATURE_BRANCH (déjà créée)
- Ne modifier QUE les fichiers dans le scope de l'US
- INTERDITS : ROADMAP.md, DECISIONS.md, DONE.md, HOWTO.md
- INTERDITS : git add -A, git add .
- Après implémentation : npm run build && npm test (les deux doivent passer)
- Commiter avec : git add [fichiers spécifiques] && git commit -m 'feat(scope): US-XX description'

Réponds avec :
IMPLEMENTATION_DONE: yes/no
FILES_MODIFIED: [liste des fichiers modifiés]
BUILD_STATUS: pass/fail
TEST_STATUS: pass/fail
NOTES: [observations importantes]"

info "Lancement Agent DEV..."
DEV_OUTPUT=$(claude -p "$DEV_PROMPT")
echo "$DEV_OUTPUT"

BUILD_STATUS=$(echo "$DEV_OUTPUT" | grep "^BUILD_STATUS:" | sed 's/BUILD_STATUS: //')
TEST_STATUS=$(echo "$DEV_OUTPUT" | grep "^TEST_STATUS:" | sed 's/TEST_STATUS: //')

[ "$BUILD_STATUS" = "pass" ] || fail "Build KO — corrige les erreurs TypeScript avant de continuer"
[ "$TEST_STATUS" = "pass" ] || fail "Tests KO — corrige les tests Vitest avant de continuer"
ok "DEV terminé · Build ✅ · Tests ✅"

# ── ÉTAPE 3 : Agent Reviewer (Option B — session fraîche) ───────────────────
step "Étape 3 — Agent Reviewer (session fraîche)"

# Capturer le diff complet AVANT tout checkout (Option B)
DIFF=$(git diff main..."$FEATURE_BRANCH" 2>/dev/null || git diff HEAD~1..HEAD)
CHANGED_FILES=$(git diff --name-only main..."$FEATURE_BRANCH" 2>/dev/null || git diff --name-only HEAD~1..HEAD)
COMMITS=$(git log main.."$FEATURE_BRANCH" --pretty=format:"- %s" 2>/dev/null || git log -3 --pretty=format:"- %s")

REVIEWER_PROMPT="Tu es Agent Reviewer indépendant pour perform-learn.fr.
Tu n'as aucun contexte de la session précédente — tu pars de zéro.

Référentiel de règles obligatoire :

RÈGLES DE SÉCURITÉ (violation = CHANGES_REQUIRED automatique) :
- Ne jamais calculer le montant Stripe côté client (toujours depuis la DB)
- Ne jamais exposer name/email/bio/linkedin_url sans vérifier revealed_at IS NOT NULL
- Ne jamais importer bcryptjs dans auth.config.ts (Edge Runtime incompatible)
- Ne jamais importer pg dans auth.config.ts ou middleware.ts
- Ne jamais utiliser git add -A ou git add .
- Aucun secret sk_live_/re_live_/whsec_live_ hardcodé
- Pas de console.log dans les routes API (seulement console.error/warn)

RÈGLES MÉTIER (RG) :
- RG-01 : revealed_at IS NOT NULL requis avant d'exposer l'identité consultant
- RG-02 : montant calculé côté serveur depuis bookings.amount_ht uniquement
- RG-04 : transitions payment : pending→authorized→captured→transferred uniquement
- RG-05 : RBAC — vérifier le rôle JWT dans chaque route protégée
- RG-08 : CRON_SECRET vérifié par header Authorization: Bearer

Fichiers modifiés :
$CHANGED_FILES

Commits :
$COMMITS

Diff complet :
$DIFF

Réponds UNIQUEMENT par l'une de ces deux formes :
APPROVED
ou
CHANGES_REQUIRED:
1. [description précise du problème + fichier:ligne si possible]
2. ..."

info "Lancement Agent Reviewer (session fraîche avec diff injecté)..."
REVIEW_OUTPUT=$(claude -p "$REVIEWER_PROMPT")
echo "$REVIEW_OUTPUT"

if echo "$REVIEW_OUTPUT" | grep -q "^APPROVED"; then
  ok "Review approuvée"
else
  # Retour sur main et suppression de la branche si review KO
  git checkout main
  git branch -D "$FEATURE_BRANCH" 2>/dev/null || true
  fail "Review KO — corrections requises avant merge. Branche $FEATURE_BRANCH supprimée."
fi

# ── ÉTAPE 4 : Merge sur main ────────────────────────────────────────────────
step "Étape 4 — Merge sur main"

FEATURE_BRANCH_SAVED="$FEATURE_BRANCH"

git checkout main
git merge --no-ff "$FEATURE_BRANCH_SAVED" -m "merge: $FEATURE_BRANCH_SAVED"
git branch -d "$FEATURE_BRANCH_SAVED"
ok "Merge effectué · branche $FEATURE_BRANCH_SAVED supprimée"

# ── ÉTAPE 5 : Push → CI GitHub ──────────────────────────────────────────────
step "Étape 5 — Push + attente CI"

git push origin main
info "Push effectué — attente CI GitHub Actions..."

# Attendre que le CI démarre (délai GitHub)
sleep 15

# Attendre la fin du CI
if ! gh run watch --exit-status 2>/dev/null; then
  fail "CI GitHub KO — vérifier https://github.com/aflouat/app-store/actions"
fi
ok "CI GitHub vert"

# ── ÉTAPE 6 : Attente déploiement Vercel ────────────────────────────────────
step "Étape 6 — Attente déploiement Vercel (2 min)"
sleep 120

# Récupérer l'URL de preview
PREVIEW_URL=$(curl -sf \
  -H "Authorization: Bearer ${VERCEL_TOKEN:-}" \
  "https://api.vercel.com/v6/deployments?limit=1" \
  | python3 -c "import sys,json; d=json.load(sys.stdin)['deployments'][0]; print(d.get('url',''))" 2>/dev/null || echo "")

if [ -z "$PREVIEW_URL" ]; then
  warn "URL preview Vercel non récupérée — utilisation de portal.perform-learn.fr"
  E2E_BASE_URL="https://portal.perform-learn.fr"
else
  E2E_BASE_URL="https://$PREVIEW_URL"
fi
info "E2E URL : $E2E_BASE_URL"

# ── ÉTAPE 7 : Agent TESTEUR ─────────────────────────────────────────────────
step "Étape 7 — Agent TESTEUR (E2E Playwright)"

TESTEUR_PROMPT="Tu es Agent TESTEUR pour perform-learn.fr.

Mission : exécuter les tests E2E Playwright sur $E2E_BASE_URL
Commande : cd portal && E2E_BASE_URL=$E2E_BASE_URL npx playwright test

Si des tests échouent :
1. Identifier si c'est une régression (bug introduit par cette release) ou un bug existant
2. Pour chaque régression : ajouter dans ROADMAP.md au format :
   - [ ] **[BUG-XX] Description** — [symptôme] · business_value: 90 · value_type: ux_improvement
3. Répondre avec le statut

Réponds avec :
E2E_STATUS: pass/fail
REGRESSIONS_FOUND: yes/no
REGRESSIONS_ADDED_TO_ROADMAP: [liste ou 'aucune']"

info "Lancement Agent TESTEUR..."
TESTEUR_OUTPUT=$(claude -p "$TESTEUR_PROMPT")
echo "$TESTEUR_OUTPUT"

E2E_STATUS=$(echo "$TESTEUR_OUTPUT" | grep "^E2E_STATUS:" | sed 's/E2E_STATUS: //')

if [ "$E2E_STATUS" != "pass" ]; then
  warn "E2E KO — des régressions ont été ajoutées dans ROADMAP.md"
  warn "La release est bloquée. Corriger les régressions avant de retenter."
  exit 1
fi
ok "E2E vert — aucune régression"

# ── ÉTAPE 8 : Agent RELEASE ─────────────────────────────────────────────────
step "Étape 8 — Agent RELEASE"

# Déterminer la nouvelle version (incrémenter le patch par défaut)
LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0")
MAJOR=$(echo "$LAST_TAG" | cut -d. -f1 | tr -d 'v')
MINOR=$(echo "$LAST_TAG" | cut -d. -f2)
PATCH=$(echo "$LAST_TAG" | cut -d. -f3)
NEW_VERSION="v${MAJOR}.${MINOR}.$((PATCH + 1))"

info "Dernière version : $LAST_TAG → Nouvelle : $NEW_VERSION"

./scripts/release-notes.sh "$NEW_VERSION" "$LAST_TAG"
ok "Release $NEW_VERSION créée"

# ── Résumé ────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✅ RELEASE $NEW_VERSION TERMINÉE            ║${NC}"
echo -e "${GREEN}║   US : $SELECTED_US${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
echo ""
echo "Surveillance J0 :"
echo "  Vercel  : https://vercel.com/aflouat/portal"
echo "  Umami   : https://analytics.perform-learn.fr"
echo "  Netdata : https://monitor.perform-learn.fr"
echo ""
