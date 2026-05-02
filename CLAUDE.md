# CLAUDE.md — Software Factory · perform-learn.fr

> **Source de vérité unique pour tous les agents.**
> Question traitée : *Comment Claude Code monte et gère une software factory d'agents IA pour livrer une release depuis ROADMAP.md ?*
> Fichiers complémentaires : `DONE.md` · `HOWTO.md` · `ROADMAP.md` · `DECISIONS.md` · `DEV-RULES.md`

---

## 0. Lecture obligatoire en début de session

| Fichier | Lu par | Pourquoi |
|---|---|---|
| `CLAUDE.md` (ce fichier) | Tous | Pipeline, RG, sécurité, rôles |
| `DEV-RULES.md` | DEV uniquement | Archi, env vars, workflow local, diagnostic |
| `DONE.md §1` | DEV · Reviewer · TESTEUR | Régressions connues de la dernière release |
| `DECISIONS.md` | DG · DEV | Cohérence stratégique, décisions GO/NO-GO passées |
| `HOWTO.md` | DEV · RELEASE | Si l'US impacte un parcours utilisateur documenté |

---

## 1. La Software Factory — Pipeline

**Orchestrateur = Abdel** (lance chaque agent via `scripts/orchestrator.ps1` ou manuellement).
**Règle : pipeline séquentiel. Chaque étape attend la précédente. Une session = un périmètre.**

```
┌─────────────────────────────────────────────────────────────────┐
│  INPUT — ROADMAP.md · US au format SMART/Gherkin validée DG     │
└────────────────────┬────────────────────────────────────────────┘
                     │
     ┌───────────────▼───────────────┐
     │  1. AGENT DG                  │  Session dédiée
     │  Priorise ROADMAP.md          │  Écrit dans DECISIONS.md
     │  Formate les US SMART/Gherkin │  Choisit 1–3 US par sprint
     └───────────────┬───────────────┘
                     │ US validées
     ┌───────────────▼───────────────┐
     │  2. AGENT DEV                 │  Session dédiée · branche feat/US-XX
     │  Analyse → Planifie → Code    │  npm run build && npm test ✅
     │  Unit tests inclus            │  Commit sur feat/US-XX
     └───────────────┬───────────────┘
                     │ commit sur feat/US-XX
     ┌───────────────▼───────────────┐
     │  3. AGENT REVIEWER            │  Session fraîche (diff injecté)
     │  Vérifie RG + sécurité        │  APPROVED ou CHANGES_REQUIRED
     └───────────────┬───────────────┘
                     │ APPROVED
     ┌───────────────▼───────────────┐
     │  4. MERGE + PUSH              │  Orchestrateur
     │  git merge --no-ff feat/US-XX │  git push origin main
     └───────────────┬───────────────┘
                     │ push main
     ┌───────────────▼───────────────┐
     │  5. AGENT DEVOPS              │  Session dédiée
     │  Surveille CI GitHub Actions  │  gh run watch → CI_STATUS
     │  Récupère URL preview Vercel  │  VERCEL_URL pour E2E
     └───────────────┬───────────────┘
                     │ CI vert + VERCEL_URL
     ┌───────────────▼───────────────┐
     │  6. AGENT TESTEUR             │  Session dédiée · Preview Vercel
     │  Playwright E2E (3 flows)     │  Ajoute bugs dans ROADMAP.md
     └───────────────┬───────────────┘
                     │ E2E vert
     ┌───────────────▼───────────────┐
     │  7. AGENT RELEASE             │  scripts/release-notes.ps1
     │  DONE.md + HOWTO.md + tag     │  GitHub Release + deploy VPS
     └───────────────┬───────────────┘
                     │ release livrée (ou blocage détecté)
     ┌───────────────▼───────────────┐
     │  8. AGENT AMÉLIORATION        │  Toujours exécuté (succès ou échec)
     │  Analyse blocages du cycle    │  Écrit dans DECISIONS.md
     │  Propose solutions concrètes  │  Met à jour ROADMAP.md si US tech
     └─────────────────────────────────┘
```

---

## 2. Les 7 agents — Rôles et ownership

| Agent | Rôle | Peut écrire dans | Ne touche JAMAIS |
|---|---|---|---|
| **DG** | Stratège · décideur unique | `ROADMAP.md` · `DECISIONS.md` | Code · tests · `DONE.md` |
| **DEV** | Implémentation 1 US/bug par session | Code · tests unitaires | `ROADMAP.md` · `DECISIONS.md` · `DONE.md` · `HOWTO.md` |
| **REVIEWER** | Revue code (session fraîche, diff injecté) | Commentaires uniquement | Tout fichier du repo |
| **DEVOPS** | Surveillance CI GitHub + déploiement Vercel | Aucun fichier repo | Tout fichier du repo |
| **TESTEUR** | E2E Playwright · détection régressions | `ROADMAP.md` (bugs uniquement) | Code · `DECISIONS.md` · `DONE.md` |
| **RELEASE** | Livraison complète | `DONE.md` · `HOWTO.md` · tags git | `ROADMAP.md` · code |
| **AMÉLIORATION** | Analyse blocages · amélioration continue du pipeline | `DECISIONS.md` · `ROADMAP.md` (US tech uniquement) | Code · `DONE.md` · `HOWTO.md` |

```
✅ Peut ajouter/prioriser ROADMAP.md : Agent DG
✅ Peut ajouter bugs/régressions ROADMAP.md : Agent TESTEUR
✅ Peut ajouter US techniques ROADMAP.md : Agent AMÉLIORATION (après validation DG)
❌ Interdit d'écrire dans ROADMAP.md : DEV · REVIEWER · DEVOPS · RELEASE
```

---

## 3. Stratégie de branches

```
main        ← production (toujours stable)
feat/US-XX  ← 1 branche par US, tirée depuis main, supprimée après merge
```

```bash
git checkout main && git pull origin main
git checkout -b feat/BUG-01-stabilisation-auth

# ... implémentation ...

git add portal/app/[fichier] portal/lib/[fichier]   # JAMAIS git add -A
git commit -m "fix(freelancehub): BUG-01 stabilisation auth"
# NE PAS pousser — l'orchestrateur merge après review
```

---

## 4. Format d'entrée — User Story SMART / Gherkin

**Toute US qui entre dans la factory DOIT respecter ce format.**
Un agent DEV qui reçoit une US mal formatée DOIT demander une reformulation avant de coder.

```markdown
### [US-XX] Titre fonctionnel court

**Contexte** : Pourquoi cette US existe (problème résolu, valeur métier).
**Règles métier** : RG-XX concernées.
**Critères SMART** :
- Spécifique : comportement exact attendu
- Mesurable : assertion testable
- Atteignable : faisable en 1 session Claude Code
- Réaliste : dans le scope technique actuel
- Temporel : livrable dans le cycle courant

**Gherkin** :
` ``gherkin
Feature: [Titre]
  Scenario: [Cas nominal]
    Given [état initial]
    When [action]
    Then [résultat vérifiable]

  Scenario: [Cas d'erreur]
    Given [état initial]
    When [action déclenchant l'erreur]
    Then [comportement attendu]
` ``

**Fichiers autorisés** : [liste explicite]
**Fichiers interdits** : [liste explicite]
**Migration SQL** : oui (00X_nom.sql) | non
**Impact chaîne auth (Edge Runtime)** : oui | non
  → Si oui : fichiers concernés parmi `auth.config.ts` · `auth.ts` · `middleware.ts`
**Critères d'acceptance** :
- [ ] `npm run build` passe
- [ ] `npm test` passe
- [ ] Comportement Gherkin vérifié
- [ ] Pas de régression auth, booking, Stripe
```

---

## 5. Protocoles d'exécution par agent

### Agent DEV — Séquence obligatoire

```
── PHASE 1 : LECTURE ──────────────────────────────────────────────
1. LIRE  → CLAUDE.md §7 (sécurité) + §8 (RG concernées par l'US)
2. LIRE  → DEV-RULES.md (architecture, Edge Runtime, schéma DB)
3. LIRE  → DONE.md §1 (régressions de la dernière release à éviter)

── PHASE 2 : ANALYSE (obligatoire avant d'écrire 1 ligne de code) ─
4. LIRE  → Chaque fichier listé dans "Fichiers autorisés" de l'US
           → Comprendre l'implémentation existante : interfaces, types,
             imports, dépendances, patterns utilisés
           → Identifier ce qui existe déjà vs ce qui est à créer
           → Détecter les risques : migration SQL imprévue, Stripe, modules partagés
           → Si l'US déclare "Impact chaîne auth = oui" OU si un fichier autorisé
             appartient à {auth.config.ts, auth.ts, middleware.ts} :
             LIRE et LISTER les imports actuels de ces 3 fichiers AVANT d'écrire
             la première ligne · Vérifier que la séparation Edge Runtime (§7)
             est respectée dans l'état existant

5. ANNONCER un plan d'implémentation :
   - Fichiers touchés (liste exacte avec raison)
   - Changements par fichier (signatures, nouvelles fonctions, tables)
   - Tests unitaires à écrire
   - Risques identifiés et mitigation

── PHASE 3 : VALIDATION ───────────────────────────────────────────
6. STOP si le plan touche simultanément middleware.ts + auth.ts,
   ou si une migration SQL n'est pas prévue dans l'US,
   ou si le changement impacte > 3 modules distincts.
   → Attendre validation Abdel avant de continuer.

── PHASE 4 : IMPLÉMENTATION ───────────────────────────────────────
7. CODER  → Selon le plan validé · UNIQUEMENT les fichiers du scope
8. TESTER → npm run build && npm test (les deux DOIVENT passer)
9. VÉRIF  → grep pour secrets hardcodés + console.log dans routes API
10. COMMIT → git add [fichiers spécifiques] · JAMAIS git add -A
            → git commit -m "feat|fix|refactor|chore(scope): US-XX desc"
            → NE PAS pousser — l'orchestrateur gère le merge
```

**Arrêt immédiat si :** build KO après 2 tentatives · tests cassés hors scope · migration SQL non spécifiée.

**Convention de commit :**
```
feat(freelancehub):  nouvelle fonctionnalité
fix(freelancehub):   correction de bug
refactor(portal):    sans changement de comportement
chore(db):           migration SQL, config, scripts
docs(portal):        documentation uniquement
```

---

### Agent REVIEWER — Session fraîche (Option B)

Le Reviewer reçoit le diff complet injecté dans son prompt. Il n'a aucun contexte de la session DEV.

**Violations = CHANGES_REQUIRED automatique :**

| Catégorie | Vérification |
|---|---|
| Sécurité | Montant Stripe calculé côté serveur uniquement ? |
| Sécurité | `revealed_at IS NOT NULL` avant d'exposer l'identité consultant ? |
| Sécurité | `bcryptjs` / `pg` absents de `auth.config.ts` et `middleware.ts` ? |
| Sécurité | Aucun secret `*_live_*` hardcodé ? |
| Qualité | Pas de `console.log` dans les routes API ? |
| Qualité | `git add -A` ou `git add .` absents du commit ? |
| Métier | Aucune violation RG-01 à RG-14 ? |
| Scope | Seuls les fichiers du scope US sont modifiés ? |

**Format de réponse obligatoire :**
```
APPROVED
```
ou
```
CHANGES_REQUIRED:
1. [fichier:ligne — description précise]
```

---

### Agent TESTEUR

```
1. Récupérer la Preview URL Vercel du dernier déploiement
2. cd portal && E2E_BASE_URL=<preview_url> npx playwright test
3. Si KO → identifier régression (bug de cette release) vs bug existant
4. Pour chaque régression → ajouter dans ROADMAP.md :
   - [ ] **[BUG-XX] Description** · business_value: 90 · value_type: ux_improvement
5. Signaler E2E_STATUS: pass/fail à l'orchestrateur
```

Specs critiques (NE JAMAIS ignorer) :
- `tests/e2e/auth.spec.ts` — login 3 rôles + RBAC redirections
- `tests/e2e/booking.spec.ts` — search → book → Stripe → reveal (RG-01)
- `tests/e2e/consultant.spec.ts` — dashboard, agenda, gains, KYC

---

### Agent RELEASE

```
# Prérequis : CI vert + E2E vert
.\scripts\release-notes.ps1 -Version vX.Y.Z -PreviousTag vX.(Y-1).Z
# → Met à jour DONE.md §1 + HOWTO.md §Changelog + tag git + GitHub Release
```

---

### Agent DEVOPS — CI GitHub + Vercel

```
Mission (session dédiée, aucune modification de fichier repo) :

1. Surveiller le run CI GitHub Actions le plus récent sur aflouat/app-store :
   - gh run list --branch main --limit 1
   - gh run watch <run-id> --exit-status
   - Si KO : relever job + step + message d'erreur complet

2. Récupérer l'URL preview Vercel la plus récente :
   - GET https://api.vercel.com/v6/deployments?limit=1
     Authorization: Bearer $VERCEL_TOKEN
   - Attendre statut "READY" (polling 15s, max 3 min)
   - Fallback : https://portal.perform-learn.fr

3. Répondre à l'orchestrateur :
   CI_STATUS: pass/fail
   CI_ERRORS: [description ou aucune]
   VERCEL_URL: [URL https://...]
   VERCEL_STATUS: ready/error/timeout
```

**Règle absolue :** l'Agent DEVOPS ne modifie aucun fichier du repo. Il surveille uniquement.

---

### Agent AMÉLIORATION CONTINUE

```
Mission (toujours exécuté, succès ou échec du pipeline) :

1. Analyser le journal d'exécution du cycle qui vient de se terminer :
   - Étapes qui ont bloqué (Review KO, CI KO, E2E KO, build KO)
   - Nombre d'itérations Reviewer ↔ DEV
   - Erreurs récurrentes identifiées
   - Objectifs DG atteints / manqués

2. Pour chaque blocage identifié :
   a. Proposer une solution concrète (règle à ajouter, pattern à documenter,
      test à écrire, workflow à ajuster)
   b. Évaluer si la solution nécessite une US technique
   c. Si oui et business_value ≥ 50 : proposer l'US au format DECISIONS.md
      (la DG valide avant ajout dans ROADMAP.md)

3. Écrire dans DECISIONS.md une entrée "RETRO cycle [date]" :
   Format :
   ### RETRO [date] — cycle [US-XX]
   **Blocages** : [liste]
   **Solutions appliquées** : [ce qui a été ajusté immédiatement]
   **US techniques proposées** : [liste avec business_value estimé]
   **Statut** : PENDING_DG_VALIDATION

4. Ne pas modifier ROADMAP.md directement — soumettre uniquement via DECISIONS.md.
   La DG valide les US techniques proposées lors du prochain cycle.
```

**Objectif :** chaque cycle doit réduire le nombre de blocages du suivant.

---

## 6. Tests obligatoires

**Règle : pas de merge sans tests verts. L'Agent DEV écrit les tests en même temps que le code.**

| Quand | Quoi | Où |
|---|---|---|
| Nouvelle logique de calcul | Test unitaire | `portal/__tests__/pricing.test.ts` |
| Nouvelle RG ou modification | Test unitaire | `portal/__tests__/[domaine].test.ts` |
| Bug fix | Test qui aurait détecté la régression | Fichier test existant le plus proche |
| Logique RBAC | Test unitaire | `portal/__tests__/rbac.test.ts` |
| US touchant auth/booking/paiement | Test d'intégration | `portal/__tests__/integration/` |

Tests existants (ne pas casser) :
- `__tests__/matching.test.ts` — algorithme scoring RG-06
- `__tests__/rbac.test.ts` — accès et redirections RG-05
- `__tests__/pricing.test.ts` — RG-02/03, Early Adopter, parrainage

**E2E obligatoires avant release** — les 3 specs doivent être vertes :

| Spec | Bloquant si |
|---|---|
| `tests/e2e/auth.spec.ts` | Login KO |
| `tests/e2e/booking.spec.ts` | Anonymat RG-01 violé |
| `tests/e2e/consultant.spec.ts` | Dashboard inaccessible |

Un bug fixé DOIT avoir un test qui aurait détecté ce bug.

---

## 7. Règles immuables — Sécurité

Ces règles ne peuvent JAMAIS être contournées, même sous pression de deadline.

| Règle | Raison |
|---|---|
| Ne jamais calculer le montant Stripe côté client | Fraude client |
| Ne jamais exposer `name/email/bio/linkedin_url` avant `revealed_at IS NOT NULL` | RG-01 |
| Ne jamais importer `bcryptjs` dans `auth.config.ts` | Edge Runtime → page blanche silencieuse |
| Ne jamais importer `pg` dans `auth.config.ts` ou `middleware.ts` | Edge Runtime incompatible |
| Ne jamais utiliser `CREATE OR REPLACE VIEW` | Détruit les dépendances CASCADE |
| Ne jamais utiliser `git add -A` ou `git add .` | Risque d'inclure `.env`, secrets |
| Ne jamais modifier une migration SQL déjà appliquée en prod | Incohérence de schéma irréversible |
| Ne jamais hardcoder `sk_live_`, `re_live_`, `whsec_live_` | Secrets en clair dans repo public |
| Ne jamais pousser si `npm run build` échoue | Vercel déploie le build cassé en prod |
| Ne jamais pousser sans `npm test` vert | Régression silencieuse |

**Edge Runtime — pattern obligatoire :**
```
auth.config.ts  → config JWT/callbacks SANS providers, SANS bcrypt, SANS pg
auth.ts         → étend authConfig + Credentials + Google + bcrypt (Node.js uniquement)
middleware.ts   → importe auth.config.ts UNIQUEMENT (jamais auth.ts)
```

---

## 8. Règles métier condensées (RG-01 à RG-14)

**RG-01 — Anonymat consultant**
`name/email/bio/linkedin_url` invisibles avant paiement. `revealed_at IS NULL` = anonyme. Capture Stripe → `revealed_at = NOW()`.

**RG-02 — Tarification (serveur uniquement)**
`HT = consultants.daily_rate × 100 (cents)` · `TTC = HT × 1.20` · Fallback 85 €/h.

**RG-03 — Commission**
Standard 15 % · Early Adopter 10 % · Parrainage actif 13 %. `consultant_net = HT × (1 - taux)`. 3 montants stockés à la création du booking.

**RG-04 — Séquestre Stripe**
`pending → authorized → captured → transferred → (refunded)`. Libération auto après 2 reviews. Libération manuelle par admin.

**RG-05 — RBAC**
`client` → `/freelancehub/client` · `consultant` → `/freelancehub/consultant` · `admin` → `/freelancehub/admin`. Mauvais rôle → redirection. Admin : pas d'accès aux dashboards client/consultant.

**RG-06 — Matching (score /100)**
`0.55 × skill_match + 0.35 × rating + 0.05 × availability + 0.05 × price`. Top 5. `is_available = true` + slot futur requis.

**RG-07 — Notifications in-app**
`booking_confirmed` · `new_booking` · `review_request` · `fund_released` · `reminder` (cron J-1 08:00 UTC).

**RG-08 — Cron**
Sécurisé : `Authorization: Bearer <CRON_SECRET>`. Comparer avec `crypto.timingSafeEqual`.

**RG-09 — Inscription**
`/freelancehub/register` · bcrypt · auto-login → dashboard rôle. Consultant : `is_available = false` jusqu'à validation KYC admin.

**RG-10 — SSO Google**
Compte existant (même email) → OAuth lié. Nouveau → rôle `consultant` par défaut. Colonnes : `oauth_provider`, `oauth_provider_id`.

**RG-11 — Numéro de réservation**
`booking_number` SERIAL affiché `#N°`. Ne jamais exposer l'UUID interne.

**RG-12 — Cycle consultation**
`confirmed` → Démarrer → `in_progress` → Terminer → `completed`. Aucun retour arrière.

**RG-13 — Agenda**
Grille lundi–dimanche 08h–20h. Vert = disponible. Terracotta = réservé. Grisé = passé. Bouton "Dupliquer →" vers semaine suivante.

**RG-14 — Tableau admin**
Filtres : statut, dates, consultant, client, montant HT. Totaux Σ HT/TTC/commission. Export CSV avec protection injection Excel.

---

## 9. Gouvernance

```
Vision → Cycle → Epic → User Story (SMART/Gherkin) → Task
```

| Score business_value | Priorité |
|---|---|
| ≥ 75 | Haute — traiter dans le cycle courant |
| 50–74 | Moyenne — cycle suivant si pas de slot |
| < 50 | Faible — backlog |

`value_type` : `user_acquisition` · `cost_reduction` · `strategic_positioning` · `ux_improvement` · `technical_debt`

**Entité** : EMMAEINNA · SIREN 103 082 673 · Aminetou (DG) · Abdel (CTO/orchestrateur · aflouat@gmail.com)
