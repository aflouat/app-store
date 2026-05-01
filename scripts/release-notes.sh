#!/usr/bin/env bash
# scripts/release-notes.sh — Génère les release notes et crée le GitHub Release
#
# Usage :
#   ./scripts/release-notes.sh v1.4.0 v1.3.0
#
# Prérequis :
#   - `gh` (GitHub CLI) authentifié
#   - `claude` (Claude Code CLI) disponible dans le PATH
#   - Être sur la branche main, tous commits poussés

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

VERSION="${1:-}"
FROM_TAG="${2:-}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$SCRIPT_DIR/.."

# ── Validation des arguments ──────────────────────────────────
if [ -z "$VERSION" ]; then
  echo -e "${RED}Usage : $0 <version> [<from-tag>]${NC}"
  echo -e "Exemple : $0 v1.4.0 v1.3.0"
  exit 1
fi

if [ -z "$FROM_TAG" ]; then
  FROM_TAG=$(git describe --tags --abbrev=0 HEAD^ 2>/dev/null || echo "")
  if [ -z "$FROM_TAG" ]; then
    echo -e "${YELLOW}Aucun tag précédent trouvé — utilisation du premier commit${NC}"
    FROM_TAG=$(git rev-list --max-parents=0 HEAD)
  fi
fi

echo ""
echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  Release Notes — $VERSION (depuis $FROM_TAG)${NC}"
echo -e "${BLUE}================================================${NC}"

# ── Collecte des commits ──────────────────────────────────────
cd "$REPO_ROOT"
COMMITS=$(git log "${FROM_TAG}..HEAD" --pretty=format:"- %s (%h)" --no-merges 2>/dev/null || echo "")

if [ -z "$COMMITS" ]; then
  echo -e "${YELLOW}Aucun commit depuis $FROM_TAG${NC}"
  exit 1
fi

echo ""
echo -e "${YELLOW}Commits inclus dans $VERSION :${NC}"
echo "$COMMITS"

# ── Items ROADMAP livrés ──────────────────────────────────────
ROADMAP_DONE=$(grep -E '^\s*- \[x\]' ROADMAP.md 2>/dev/null | tail -20 || echo "")

# ── Génération des release notes via Claude CLI ───────────────
echo ""
echo -e "${YELLOW}Génération des release notes avec Claude...${NC}"

PROMPT="Tu es un rédacteur technique senior pour une startup B2B française (perform-learn.fr).
Génère des release notes professionnelles en français pour la version $VERSION.

FORMAT STRICT (Markdown) :
## $VERSION — [Titre court du cycle en 5 mots max]
**Date** : $(date '+%d %B %Y')

### Nouveautés
- [liste bullet des nouvelles features, orientée valeur utilisateur]

### Corrections
- [liste bullet des bugs corrigés]

### Sécurité
- [liste bullet des fixes sécurité — IMPORTANT : toujours inclure si présent dans les commits]

### Infrastructure & Performance
- [liste bullet des changements techniques — garder court]

### Migrations SQL
- [liste des migrations appliquées, ou 'Aucune' si vide]

RÈGLES :
- Chaque bullet en 1 ligne, orienté bénéfice utilisateur (pas jargon technique)
- Ne pas mentionner les noms de fichiers sauf si vraiment utile
- Sections vides : omettre complètement (ne pas écrire 'Aucun')
- Ton : professionnel, concis, pas de marketing

DONNÉES :
Commits depuis $FROM_TAG :
$COMMITS

Items ROADMAP livrés :
$ROADMAP_DONE"

NOTES_FILE="/tmp/release-notes-${VERSION}.md"

if command -v claude &> /dev/null; then
  claude --print "$PROMPT" > "$NOTES_FILE"
  echo -e "${GREEN}Release notes générées : $NOTES_FILE${NC}"
else
  echo -e "${YELLOW}claude CLI non disponible — génération manuelle${NC}"
  cat > "$NOTES_FILE" << EOF
## $VERSION — Release du $(date '+%d %B %Y')
**Date** : $(date '+%d %B %Y')

### Commits inclus
$COMMITS

> *Notes générées manuellement — claude CLI non disponible.*
> *Compléter les sections Nouveautés / Corrections / Sécurité manuellement.*
EOF
fi

echo ""
echo -e "${BLUE}=== Release Notes Générées ===${NC}"
cat "$NOTES_FILE"
echo -e "${BLUE}==============================${NC}"

# ── Mise à jour DONE.md §1 ────────────────────────────────────
echo ""
echo -e "${YELLOW}Mise à jour de DONE.md §1 (dernière release)...${NC}"

NOTES_CONTENT=$(cat "$NOTES_FILE")
DONE_FILE="$REPO_ROOT/DONE.md"

# Remplacer la section entre ## 1. et ## 2.
python3 - << PYEOF
import re

with open('$DONE_FILE', 'r', encoding='utf-8') as f:
    content = f.read()

new_section = """## 1. Dernière release — $VERSION ($(date '+%d %B %Y'))

> *Section mise à jour automatiquement par \`scripts/release-notes.sh $VERSION\`. Ne pas éditer manuellement.*

$NOTES_CONTENT

"""

# Remplacer entre ## 1. et ## 2.
updated = re.sub(
    r'## 1\. Dernière release.*?(?=## 2\.)',
    new_section,
    content,
    flags=re.DOTALL
)

with open('$DONE_FILE', 'w', encoding='utf-8') as f:
    f.write(updated)

print('DONE.md §1 mis à jour.')
PYEOF

# ── Mise à jour HOWTO.md changelog ───────────────────────────
echo -e "${YELLOW}Ajout dans HOWTO.md §Changelog...${NC}"

CHANGELOG_ENTRY="### $VERSION — $(date '+%d %B %Y')"

# Vérifier si la version est déjà dans HOWTO.md
if ! grep -q "$VERSION" "$REPO_ROOT/HOWTO.md"; then
  # Insérer après "## Changelog utilisateur"
  python3 - << PYEOF2
import re

with open('$REPO_ROOT/HOWTO.md', 'r', encoding='utf-8') as f:
    content = f.read()

entry = """### $VERSION — $(date '+%d %B %Y')
- *Voir release notes complètes dans DONE.md §1*

"""

updated = content.replace(
    '## Changelog utilisateur\n',
    '## Changelog utilisateur\n\n' + entry
)

with open('$REPO_ROOT/HOWTO.md', 'w', encoding='utf-8') as f:
    f.write(updated)

print('HOWTO.md changelog mis à jour.')
PYEOF2
else
  echo -e "${YELLOW}  $VERSION déjà dans HOWTO.md — skip${NC}"
fi

# ── Commit docs ───────────────────────────────────────────────
echo ""
echo -e "${YELLOW}Commit des mises à jour de documentation...${NC}"
cd "$REPO_ROOT"
git add DONE.md HOWTO.md
if git diff --cached --quiet; then
  echo "  Pas de changements à commiter."
else
  git commit -m "docs(portal): release notes $VERSION"
  git push origin main
  echo -e "${GREEN}  Documentation commitée et poussée.${NC}"
fi

# ── Tag Git ───────────────────────────────────────────────────
echo ""
echo -e "${YELLOW}Création du tag $VERSION...${NC}"

if git tag -l | grep -q "^${VERSION}$"; then
  echo -e "${YELLOW}  Tag $VERSION existe déjà — skip${NC}"
else
  git tag -a "$VERSION" -m "Release $VERSION — $(date '+%Y-%m-%d')"
  git push origin "$VERSION"
  echo -e "${GREEN}  Tag $VERSION créé et poussé.${NC}"
fi

# ── GitHub Release ────────────────────────────────────────────
echo ""
echo -e "${YELLOW}Création du GitHub Release...${NC}"

if command -v gh &> /dev/null; then
  gh release create "$VERSION" \
    --title "$VERSION — $(date '+%d/%m/%Y')" \
    --notes-file "$NOTES_FILE" \
    --latest
  echo -e "${GREEN}  GitHub Release $VERSION créé.${NC}"
  echo -e "${GREEN}  URL : $(gh release view $VERSION --json url -q .url)${NC}"
else
  echo -e "${YELLOW}  gh CLI non disponible — créer manuellement sur GitHub.${NC}"
  echo -e "${YELLOW}  Notes sauvegardées dans : $NOTES_FILE${NC}"
fi

# ── Résumé ────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}  ✅ Release $VERSION terminée${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "Étapes suivantes :"
echo "  1. ./scripts/deploy-agent.sh          — déploiement VPS"
echo "  2. Vérifier smoke tests Vercel         — portal.perform-learn.fr"
echo "  3. Activer monitoring J0               — Umami + Netdata + Vercel logs"
echo ""
