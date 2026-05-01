# scripts/orchestrator.ps1 — Software Factory · perform-learn.fr
#
# Usage :
#   .\scripts\orchestrator.ps1              -> sélectionne automatiquement les prochaines US
#   .\scripts\orchestrator.ps1 "BUG-01"    -> force un item précis
#
# Prérequis :
#   - claude CLI (Claude Code) dans le PATH
#   - gh CLI authentifié (pour CI watch + GitHub Release)
#   - git configuré, remote origin accessible
#   - npm disponible dans portal/

param(
    [string]$ForceUS = ""
)

$ErrorActionPreference = 'Stop'

$RepoRoot = Split-Path -Parent $PSScriptRoot

function Step  { param($msg) Write-Host "`n━━━ $msg ━━━" -ForegroundColor Blue }
function Ok    { param($msg) Write-Host "  OK  $msg" -ForegroundColor Green }
function Fail  { param($msg) Write-Host "  ERR $msg" -ForegroundColor Red; exit 1 }
function Warn  { param($msg) Write-Host "  WARN $msg" -ForegroundColor Yellow }
function Info  { param($msg) Write-Host "  ... $msg" -ForegroundColor Cyan }

Write-Host ""
Write-Host "╔══════════════════════════════════════════╗" -ForegroundColor Blue
Write-Host "║   Software Factory — Orchestrateur      ║" -ForegroundColor Blue
Write-Host "║   perform-learn.fr · $(Get-Date -Format 'yyyy-MM-dd HH:mm')     ║" -ForegroundColor Blue
Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor Blue

Set-Location $RepoRoot

# ── Vérifications préalables ────────────────────────────────────────────────
Step "Vérifications préalables"

if (-not (Get-Command claude -ErrorAction SilentlyContinue)) { Fail "claude CLI non trouvé (installer Claude Code)" }
if (-not (Get-Command npm   -ErrorAction SilentlyContinue)) { Fail "npm non trouvé" }

$GhAvailable = [bool](Get-Command gh -ErrorAction SilentlyContinue)
if (-not $GhAvailable) {
    Warn "gh CLI non trouvé — étapes CI watch et GitHub Release seront skippées"
    Warn "Pour l'installer : winget install --id GitHub.cli"
}

$CurrentBranch = git branch --show-current
if ($CurrentBranch -ne "main") { Fail "Partir de main (branche courante : $CurrentBranch)" }

# Vérifier que le working directory est propre (sinon le diff du Reviewer sera pollué)
$DirtyFiles = git status --porcelain
if ($DirtyFiles) {
    Write-Host "`n  Fichiers non commités détectés :" -ForegroundColor Red
    Write-Host $DirtyFiles -ForegroundColor Yellow
    Fail "Working directory non propre — commiter ou stasher ces changements avant de lancer l'orchestrateur"
}

git pull origin main --quiet
Ok "Prérequis OK · branche : main · working directory propre"

# ── ÉTAPE 1 : Agent DG ──────────────────────────────────────────────────────
Step "Étape 1 — Agent DG (priorisation)"

$ForceUSLine = if ($ForceUS) { "US forcée par l'orchestrateur : $ForceUS — sélectionner uniquement celle-ci." } else { "" }

$DGPrompt = @"
Tu es Agent DG pour perform-learn.fr.

Contexte : lis ROADMAP.md et DECISIONS.md dans le répertoire courant.

Mission :
1. Choisir 1 à 3 US/bugs prioritaires pour la prochaine release (critère : business_value décroissant, items non cochés)
2. Si une US n'est pas au format SMART/Gherkin (template CLAUDE.md §4), la reformater avant de la sélectionner
3. Mettre à jour ROADMAP.md : marquer les US sélectionnées avec [-> EN COURS]
4. Ecrire la décision dans DECISIONS.md (format existant : date · décision · contexte · statut)

$ForceUSLine

Réponds avec exactement ces 3 lignes (rien d'autre) :
SELECTED_US: [liste des IDs, ex: BUG-01, SEC-01]
BRANCH_NAME: feat/BUG-01-titre-court
SCOPE_SUMMARY: [2 lignes résumant ce qui sera implémenté]
"@

Info "Lancement Agent DG..."
$DGOutput = claude -p $DGPrompt
Write-Host $DGOutput

$FeatureBranch = ($DGOutput -split "`n" | Where-Object { $_ -match "^BRANCH_NAME:" }) -replace "BRANCH_NAME:\s*", "" -replace "\s", ""
$SelectedUS    = ($DGOutput -split "`n" | Where-Object { $_ -match "^SELECTED_US:" })  -replace "SELECTED_US:\s*", ""
$ScopeSummary  = ($DGOutput -split "`n" | Where-Object { $_ -match "^SCOPE_SUMMARY:" }) -replace "SCOPE_SUMMARY:\s*", ""

if (-not $FeatureBranch) {
    $Stamp = Get-Date -Format "yyyyMMddHHmm"
    $FeatureBranch = "feat/auto-$Stamp"
    Warn "Agent DG n'a pas fourni de BRANCH_NAME — utilisation de $FeatureBranch"
}

Ok "US sélectionnées : $SelectedUS"
Ok "Branche cible    : $FeatureBranch"

# ── ÉTAPE 2 : Agent DEV ─────────────────────────────────────────────────────
Step "Étape 2 — Agent DEV (implémentation)"

git checkout -b $FeatureBranch
Info "Branche créée : $FeatureBranch"

$DEVPrompt = @"
Tu es Agent DEV pour perform-learn.fr.

OBLIGATOIRE avant de coder :
1. Lire CLAUDE.md (règles sécurité §8, RG métier §9, Edge Runtime §8)
2. Lire DONE.md §1 (régressions connues à éviter)
3. Lire les fichiers ciblés par l'US

US à implémenter : $SelectedUS
Résumé scope : $ScopeSummary

Règles strictes :
- Travailler sur la branche $FeatureBranch (déjà créée)
- Ne modifier QUE les fichiers dans le scope de l'US
- INTERDITS : ROADMAP.md, DECISIONS.md, DONE.md, HOWTO.md
- INTERDITS : git add -A, git add .
- Après implémentation : npm run build && npm test (les deux doivent passer)
- Commiter avec : git add [fichiers spécifiques] && git commit -m 'feat(scope): description'

Réponds avec exactement ces lignes :
IMPLEMENTATION_DONE: yes/no
FILES_MODIFIED: [liste]
BUILD_STATUS: pass/fail
TEST_STATUS: pass/fail
NOTES: [observations importantes]
"@

Info "Lancement Agent DEV..."
$DEVOutput = claude -p $DEVPrompt
Write-Host $DEVOutput

$BuildStatus = ($DEVOutput -split "`n" | Where-Object { $_ -match "^BUILD_STATUS:" }) -replace "BUILD_STATUS:\s*", ""
$TestStatus  = ($DEVOutput -split "`n" | Where-Object { $_ -match "^TEST_STATUS:" })  -replace "TEST_STATUS:\s*", ""

if ($BuildStatus -ne "pass") { Fail "Build KO — corrige les erreurs TypeScript avant de continuer" }
if ($TestStatus  -ne "pass") { Fail "Tests KO — corrige les tests Vitest avant de continuer" }
Ok "DEV terminé · Build OK · Tests OK"

# ── ÉTAPE 3 : Agent Reviewer (Option B — session fraîche) ───────────────────
Step "Étape 3 — Agent Reviewer (session fraîche)"

$Diff         = git diff "main...$FeatureBranch" 2>$null
$ChangedFiles = git diff --name-only "main...$FeatureBranch" 2>$null
$Commits      = git log "main..$FeatureBranch" --pretty=format:"- %s" 2>$null

$ReviewerPrompt = @"
Tu es Agent Reviewer indépendant pour perform-learn.fr.
Tu n'as aucun contexte de la session précédente — tu pars de zéro.

RÈGLES DE SÉCURITÉ (violation = CHANGES_REQUIRED automatique) :
- Ne jamais calculer le montant Stripe côté client (toujours depuis la DB)
- Ne jamais exposer name/email/bio/linkedin_url sans vérifier revealed_at IS NOT NULL
- Ne jamais importer bcryptjs dans auth.config.ts (Edge Runtime incompatible)
- Ne jamais importer pg dans auth.config.ts ou middleware.ts
- Ne jamais utiliser git add -A ou git add .
- Aucun secret sk_live_/re_live_/whsec_live_ hardcodé
- Pas de console.log dans les routes API (seulement console.error/warn)

RÈGLES MÉTIER :
- RG-01 : revealed_at IS NOT NULL requis avant d'exposer l'identité consultant
- RG-02 : montant calculé côté serveur depuis bookings.amount_ht uniquement
- RG-04 : transitions payment : pending->authorized->captured->transferred uniquement
- RG-05 : RBAC — vérifier le rôle JWT dans chaque route protégée
- RG-08 : CRON_SECRET vérifié par header Authorization: Bearer

Fichiers modifiés :
$ChangedFiles

Commits :
$Commits

Diff complet :
$Diff

Réponds UNIQUEMENT par l'une de ces deux formes :
APPROVED
ou
CHANGES_REQUIRED:
1. [description précise + fichier:ligne]
2. ...
"@

Info "Lancement Agent Reviewer (session fraîche avec diff injecté)..."
$ReviewOutput = claude -p $ReviewerPrompt
Write-Host $ReviewOutput

if ($ReviewOutput -notmatch "^APPROVED") {
    git checkout main
    git branch -D $FeatureBranch 2>$null
    Fail "Review KO — corrections requises. Branche $FeatureBranch supprimée."
}
Ok "Review approuvée"

# ── ÉTAPE 4 : Merge sur main ────────────────────────────────────────────────
Step "Étape 4 — Merge sur main"

git checkout main
git merge --no-ff $FeatureBranch -m "merge: $FeatureBranch"
git branch -d $FeatureBranch
Ok "Merge effectué · branche $FeatureBranch supprimée"

# ── ÉTAPE 5 : Push → CI GitHub ──────────────────────────────────────────────
Step "Étape 5 — Push + attente CI"

git push origin main
Info "Push effectué"

if ($GhAvailable) {
    Info "Attente CI GitHub Actions..."
    Start-Sleep -Seconds 15
    if (-not (gh run watch --exit-status 2>$null)) {
        Fail "CI GitHub KO — vérifier https://github.com/aflouat/app-store/actions"
    }
    Ok "CI GitHub vert"
} else {
    Warn "gh CLI absent — CI non attendu. Vérifier manuellement : https://github.com/aflouat/app-store/actions"
    Info "Attente 30s avant de continuer..."
    Start-Sleep -Seconds 30
}

# ── ÉTAPE 6 : Attente déploiement Vercel ────────────────────────────────────
Step "Étape 6 — Attente déploiement Vercel (2 min)"
Info "Attente du déploiement Vercel..."
Start-Sleep -Seconds 120

$VercelToken = $env:VERCEL_TOKEN
$E2EBaseUrl = "https://portal.perform-learn.fr"

if ($VercelToken) {
    try {
        $Headers = @{ Authorization = "Bearer $VercelToken" }
        $Response = Invoke-RestMethod -Uri "https://api.vercel.com/v6/deployments?limit=1" -Headers $Headers
        $PreviewUrl = $Response.deployments[0].url
        if ($PreviewUrl) { $E2EBaseUrl = "https://$PreviewUrl" }
    } catch {
        Warn "URL preview Vercel non récupérée — utilisation de portal.perform-learn.fr"
    }
} else {
    Warn "VERCEL_TOKEN absent — utilisation de portal.perform-learn.fr"
}
Info "E2E URL : $E2EBaseUrl"

# ── ÉTAPE 7 : Agent TESTEUR ─────────────────────────────────────────────────
Step "Étape 7 — Agent TESTEUR (E2E Playwright)"

$TesteurPrompt = @"
Tu es Agent TESTEUR pour perform-learn.fr.

Mission : exécuter les tests E2E Playwright sur $E2EBaseUrl
Commande : Set-Location portal; `$env:E2E_BASE_URL='$E2EBaseUrl'; npx playwright test

Si des tests échouent :
1. Identifier si c'est une régression (bug introduit par cette release) ou un bug existant
2. Pour chaque régression : ajouter dans ROADMAP.md :
   - [ ] **[BUG-XX] Description** · business_value: 90 · value_type: ux_improvement
3. Répondre avec le statut

Réponds avec :
E2E_STATUS: pass/fail
REGRESSIONS_FOUND: yes/no
REGRESSIONS_ADDED_TO_ROADMAP: [liste ou aucune]
"@

Info "Lancement Agent TESTEUR..."
$TesteurOutput = claude -p $TesteurPrompt
Write-Host $TesteurOutput

$E2EStatus = ($TesteurOutput -split "`n" | Where-Object { $_ -match "^E2E_STATUS:" }) -replace "E2E_STATUS:\s*", ""

if ($E2EStatus -ne "pass") {
    Warn "E2E KO — des régressions ont été ajoutées dans ROADMAP.md"
    Warn "La release est bloquée. Corriger les régressions avant de retenter."
    exit 1
}
Ok "E2E vert — aucune régression"

# ── ÉTAPE 8 : Agent RELEASE ─────────────────────────────────────────────────
Step "Étape 8 — Agent RELEASE"

$LastTag = git describe --tags --abbrev=0 2>$null
if (-not $LastTag) { $LastTag = "v0.0.0" }

$Parts   = $LastTag.TrimStart('v') -split '\.'
$Major   = $Parts[0]
$Minor   = $Parts[1]
$Patch   = [int]$Parts[2] + 1
$NewVersion = "v$Major.$Minor.$Patch"

Info "Dernière version : $LastTag → Nouvelle : $NewVersion"

if ($GhAvailable) {
    & "$PSScriptRoot\release-notes.ps1" -Version $NewVersion -PreviousTag $LastTag
    Ok "Release $NewVersion créée"
} else {
    Warn "gh CLI absent — GitHub Release skippé"
    Warn "Lancer manuellement après avoir installé gh : .\scripts\release-notes.ps1 -Version $NewVersion -PreviousTag $LastTag"
    # Mise à jour DONE.md et tag Git quand même
    $TagDate = Get-Date -Format "yyyy-MM-dd"
    git tag -a $NewVersion -m "Release $NewVersion — $TagDate" 2>$null
    git push origin $NewVersion 2>$null
    Ok "Tag $NewVersion créé et poussé"
}

# ── Résumé ──────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "╔══════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║   RELEASE $NewVersion TERMINÉE               ║" -ForegroundColor Green
Write-Host "║   US : $SelectedUS" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "Surveillance J0 :"
Write-Host "  Vercel  : https://vercel.com/aflouat/portal"
Write-Host "  Umami   : https://analytics.perform-learn.fr"
Write-Host "  Netdata : https://monitor.perform-learn.fr"
