# scripts/release-notes.ps1 — Génère les release notes et crée le GitHub Release
#
# Usage :
#   .\scripts\release-notes.ps1 -Version v1.4.0 -PreviousTag v1.3.0
#
# Prérequis :
#   - gh (GitHub CLI) authentifié
#   - claude (Claude Code CLI) dans le PATH
#   - Être sur main, tous commits poussés

param(
    [Parameter(Mandatory=$true)]  [string]$Version,
    [Parameter(Mandatory=$false)] [string]$PreviousTag = ""
)

$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path -Parent $PSScriptRoot

function Info { param($msg) Write-Host "  ... $msg" -ForegroundColor Cyan }
function Ok   { param($msg) Write-Host "  OK  $msg" -ForegroundColor Green }
function Warn { param($msg) Write-Host "  WARN $msg" -ForegroundColor Yellow }

Write-Host ""
Write-Host "================================================" -ForegroundColor Blue
Write-Host "  Release Notes — $Version" -ForegroundColor Blue
Write-Host "================================================" -ForegroundColor Blue

Set-Location $RepoRoot

# ── Tag précédent ────────────────────────────────────────────────────────────
if (-not $PreviousTag) {
    $PreviousTag = git describe --tags --abbrev=0 "HEAD^" 2>$null
    if (-not $PreviousTag) {
        $PreviousTag = git rev-list --max-parents=0 HEAD
        Warn "Aucun tag précédent — utilisation du premier commit"
    }
}

# ── Commits ──────────────────────────────────────────────────────────────────
$Commits = git log "${PreviousTag}..HEAD" --pretty=format:"- %s (%h)" --no-merges 2>$null
if (-not $Commits) { Write-Host "Aucun commit depuis $PreviousTag"; exit 1 }

Write-Host "`nCommits inclus dans $Version :" -ForegroundColor Yellow
Write-Host $Commits

# ── Génération via Claude ─────────────────────────────────────────────────────
$Today = Get-Date -Format "dd MMMM yyyy"

$Prompt = @"
Tu es un rédacteur technique senior pour une startup B2B française (perform-learn.fr).
Génère des release notes professionnelles en français pour la version $Version.

FORMAT STRICT (Markdown) :
## $Version — [Titre court du cycle en 5 mots max]
**Date** : $Today

### Nouveautés
- [liste bullet des nouvelles features, orientée valeur utilisateur]

### Corrections
- [liste bullet des bugs corrigés]

### Sécurité
- [liste bullet des fixes sécurité]

### Infrastructure & Performance
- [liste bullet des changements techniques]

### Migrations SQL
- [liste des migrations appliquées, ou omettre si vide]

RÈGLES :
- Chaque bullet en 1 ligne, orienté bénéfice utilisateur
- Sections vides : omettre complètement
- Ton : professionnel, concis

DONNÉES :
Commits depuis $PreviousTag :
$Commits
"@

Info "Génération des release notes avec Claude..."
$NotesContent = claude -p $Prompt

Write-Host "`n=== Release Notes ===" -ForegroundColor Blue
Write-Host $NotesContent
Write-Host "=====================" -ForegroundColor Blue

# ── Mise à jour DONE.md §1 ────────────────────────────────────────────────────
Info "Mise à jour de DONE.md §1..."

$DonePath = Join-Path $RepoRoot "DONE.md"
$DoneContent = Get-Content $DonePath -Raw -Encoding UTF8

$NewSection = @"
## 1. Dernière release — $Version ($Today)

> *Section mise à jour automatiquement par ``scripts/release-notes.ps1 $Version``. Ne pas éditer manuellement.*

$NotesContent

"@

$DoneUpdated = $DoneContent -replace '(?s)## 1\. Dernière release.*?(?=## 2\.)', $NewSection
Set-Content $DonePath $DoneUpdated -Encoding UTF8
Ok "DONE.md §1 mis à jour"

# ── Mise à jour HOWTO.md changelog ───────────────────────────────────────────
Info "Ajout dans HOWTO.md §Changelog..."

$HowtoPath = Join-Path $RepoRoot "HOWTO.md"
$HowtoContent = Get-Content $HowtoPath -Raw -Encoding UTF8

if ($HowtoContent -notmatch [regex]::Escape($Version)) {
    $Entry = "### $Version — $Today`n- *Voir release notes complètes dans DONE.md §1*`n`n"
    $HowtoUpdated = $HowtoContent -replace '(## Changelog utilisateur\r?\n)', "`$1`n$Entry"
    Set-Content $HowtoPath $HowtoUpdated -Encoding UTF8
    Ok "HOWTO.md changelog mis à jour"
} else {
    Warn "$Version déjà dans HOWTO.md — skip"
}

# ── Commit docs ───────────────────────────────────────────────────────────────
Info "Commit de la documentation..."
git add DONE.md HOWTO.md
$Staged = git diff --cached --name-only
if ($Staged) {
    git commit -m "docs(portal): release notes $Version"
    git push origin main
    Ok "Documentation commitée et poussée"
} else {
    Warn "Pas de changements à commiter"
}

# ── Tag Git ───────────────────────────────────────────────────────────────────
Info "Création du tag $Version..."
$ExistingTags = git tag -l
if ($ExistingTags -contains $Version) {
    Warn "Tag $Version existe déjà — skip"
} else {
    $TagDate = Get-Date -Format "yyyy-MM-dd"
    git tag -a $Version -m "Release $Version — $TagDate"
    git push origin $Version
    Ok "Tag $Version créé et poussé"
}

# ── GitHub Release ────────────────────────────────────────────────────────────
Info "Création du GitHub Release..."

$TempFile = Join-Path $env:TEMP "release-notes-$Version.md"
Set-Content $TempFile $NotesContent -Encoding UTF8

$ReleaseDate = Get-Date -Format "dd/MM/yyyy"
gh release create $Version --title "$Version — $ReleaseDate" --notes-file $TempFile --latest
Ok "GitHub Release $Version créé"

$ReleaseUrl = gh release view $Version --json url -q ".url" 2>$null
if ($ReleaseUrl) { Write-Host "  URL : $ReleaseUrl" -ForegroundColor Green }

# ── Résumé ────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  Release $Version terminée" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Surveillance J0 :"
Write-Host "  Vercel  : https://vercel.com/aflouat/portal"
Write-Host "  Umami   : https://analytics.perform-learn.fr"
Write-Host "  Netdata : https://monitor.perform-learn.fr"
