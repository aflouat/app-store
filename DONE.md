# DONE.md — Critères of Done · perform-learn.fr

> Checklist obligatoire avant tout tag de version ou merge de release.
> Stratégie de branches : CLAUDE.md §7 · Scripts : `scripts/deploy-agent.sh`

---

## 0. Déclencheur de release

- [ ] Décision explicite d'Abdel (jamais automatique)
- [ ] Tous les items du cycle ROADMAP.md : marqués `✅` ou explicitement reportés avec raison
- [ ] `version courante` dans ROADMAP.md mis à jour → `vX.Y.Z`

---

## 1. Code — Qualité

### 1.1 TypeScript
```bash
cd portal && npx tsc --noEmit
```
- [ ] 0 erreur TypeScript

### 1.2 Tests unitaires
```bash
cd portal && npm test
```
- [ ] Tous les tests Vitest verts
- [ ] Pas de `.skip` ou `.only` oublié dans les tests

### 1.3 Build Next.js
```bash
cd portal && npm run build
```
- [ ] Build sans erreur ni warning critique

### 1.4 Lint
> ESLint non configuré (Next.js 16 a supprimé `next lint`). Tâche C5 : ajouter `eslint` + config `@eslint/eslintrc`.
- [x] ~~Lint~~ — non applicable tant qu'ESLint n'est pas installé

### 1.5 Vérifications manuelles
```bash
# Pas de secret hardcodé
grep -rn "sk_live_\|re_live_\|whsec_live_\|xai-live" portal/app portal/lib --include="*.ts" --include="*.tsx"

# Pas de console.log de debug dans les routes API
grep -rn "console\.log" portal/app/api --include="*.ts"

# Pas de TODO bloquant
grep -rn "TODO\|FIXME\|HACK" portal/app portal/lib --include="*.ts" --include="*.tsx"
```
- [ ] Aucun secret `*_live_*` dans le code
- [ ] Pas de `console.log` dans les routes API (seulement `console.error`/`console.warn`)
- [ ] TODO/FIXME recensés — aucun bloquant pour la release

---

## 2. CI Gate — GitHub Actions

URL : `https://github.com/aflouat/app-store/actions`

- [ ] Pipeline `CI` vert sur le dernier commit `main` (tsc + vitest + build + lint)
- [ ] Pipeline `Release Gate` vert sur le tag `vX.Y.Z` (si créé)
- [ ] Aucun job `skipped` inattendu

---

## 3. Sécurité

- [ ] `refacto.md` : aucun item **Critique** sans mitigation documentée
- [ ] Secrets Vercel à jour : `vercel env ls --environment=production`
- [ ] `caddy/Caddyfile` CORS : seuls `perform-learn.fr` et `portal.perform-learn.fr` autorisés
- [ ] Variables d'env Vercel checklist (CLAUDE.md §variables) :
  - [ ] `DATABASE_URL` ✅
  - [ ] `NEXTAUTH_SECRET` ✅ (≥ 32 chars)
  - [ ] `STRIPE_SECRET_KEY` ✅ (`sk_live_`)
  - [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` ✅ (`pk_live_`)
  - [ ] `RESEND_API_KEY` ✅
  - [ ] `STRIPE_WEBHOOK_SECRET` ✅
  - [ ] `CRON_SECRET` ✅

---

## 4. Base de données

- [ ] Migrations SQL numérotées séquentiellement (pas de saut entre la dernière appliquée en prod et la nouvelle)
- [ ] Chaque migration nouvelle listée dans les release notes (section §10)
- [ ] Ordre de déploiement respecté (DEV.md §2) :
  - `migration avant push` si le code attend une nouvelle colonne/table
  - `migration après push` si suppression d'une colonne encore utilisée

```bash
# Appliquer une migration sur le VPS
ssh -p 2222 abdel@37.59.125.159 \
  'docker exec -i postgres psql -U appstore -d appstore' \
  < migrations/00X_nom.sql
```

---

## 5. Git — Nettoyage

```bash
# 5.1 Synchroniser et nettoyer les refs obsolètes
git fetch --prune

# 5.2 Lister les branches mergées à supprimer
git branch -a

# 5.3 Supprimer les branches feature mergées
# (jamais de branch feature selon CLAUDE.md — vérifier s'il en traîne)
git branch -d <nom> && git push origin --delete <nom>

# 5.4 Vérifier l'état du working tree
git status       # doit être clean
git stash list   # doit être vide

# 5.5 Vérifier les 20 derniers commits
git log --oneline -20
```

- [ ] `git status` : clean (aucun fichier non commité)
- [ ] `git stash list` : vide
- [ ] Aucune branche feature pendante
- [ ] Les 20 derniers commits respectent la convention `feat|fix|refactor|chore|docs(scope):`
- [ ] Pas de commit `wip` ou `temp` non squashé

---

## 6. TNR local (obligatoire avant déploiement)

```bash
./scripts/tnr.sh
```

- [ ] Build ✅
- [ ] Tests Vitest ✅
- [ ] Lint ✅ (ou sauté si pas de config — acceptable si CI vert)
- [ ] Routes API comptées (nombre stable ou en hausse)
- [ ] Migrations SQL présentes

---

## 7. Déploiement VPS

```bash
./scripts/deploy-agent.sh
# Ou avec options :
./scripts/deploy-agent.sh --skip-migrations   # si pas de migration
./scripts/deploy-agent.sh --skip-caddy        # si Caddyfile inchangé
```

- [ ] `git pull` sur le VPS : up-to-date avec `main`
- [ ] `docker compose up -d --build` : tous les containers `running`
- [ ] Caddy rechargé (si Caddyfile modifié)
- [ ] Migrations appliquées (si nouvelles)

### Health checks VPS
```bash
curl -sf https://api.perform-learn.fr/health && echo API_OK
curl -sf https://portal.perform-learn.fr && echo PORTAL_OK
curl -sf https://analytics.perform-learn.fr && echo ANALYTICS_OK
```
- [ ] API `/health` répond 200
- [ ] Portal respond 200
- [ ] Containers : `postgres`, `minio`, `umami`, `caddy`, `netdata`, `app` tous `Up`

---

## 8. Déploiement Vercel

> Vercel redéploie automatiquement sur push `main` (2-3 min).

- [ ] Build Vercel vert dans le dashboard : https://vercel.com/aflouat/portal
- [ ] Pas d'erreur runtime dans les logs Vercel (vérifier 5 min après deploy)

### Smoke tests manuels post-Vercel (golden paths)

| Flow | URL | Attendu |
|---|---|---|
| Homepage | `https://portal.perform-learn.fr` | Charge, EarlyAdopterBand visible |
| Register consultant | `/freelancehub/register` | Formulaire fonctionnel, pas de modal waitlist |
| Login | `/freelancehub/login` | Auth credentials + Google SSO visible |
| Dashboard admin | `/freelancehub/admin` | Accès avec compte `admin@perform-learn.fr` |
| Recherche consultant | `/freelancehub/client` | Résultats de matching visibles |
| API health | `https://api.perform-learn.fr/health` | `{"status":"ok"}` |

- [ ] Tous les smoke tests passent
- [ ] Aucun 500/404 sur les flows critiques

---

## 9. Tag Git

```bash
VERSION=v1.X.0   # remplacer par la version réelle

# Créer le tag annoté
git tag -a "$VERSION" -m "Release $VERSION — $(date '+%Y-%m-%d')"

# Pousser le tag (déclenche le workflow Release Gate sur GitHub Actions)
git push origin "$VERSION"
```

- [ ] Tag créé sur le dernier commit de `main`
- [ ] Tag poussé sur origin
- [ ] Workflow `Release Gate` vert sur GitHub Actions

---

## 10. Documentation

### Release notes dans ROADMAP.md
Ajouter une section dans `## Historique des releases` :

```markdown
### vX.Y.Z — <Titre du cycle>
**JJ mois AAAA**

- Feature 1 — description courte
- Fix 1 — description courte
- Migrations : 00X_nom.sql (si applicable)
```

- [ ] Section release notes ajoutée à ROADMAP.md
- [ ] `version courante` mis à jour dans l'en-tête ROADMAP.md
- [ ] `refacto.md` : analyse post-release générée (bilan cycle, risques résiduels, plan C+1)
- [ ] `CLAUDE.md` : nouvelles décisions architecturales ajoutées si pertinentes
- [ ] `DEV.md` : procédures techniques mises à jour si nécessaire

---

## 11. Monitoring post-release (J0 → J7)

À surveiller dans les 7 jours suivant la release :

| Métrique | Source | Commande / URL | Alerte si |
|---|---|---|---|
| Signups | Umami | `analytics.perform-learn.fr` | < 5/24h |
| Erreurs 5xx | Vercel Logs | Dashboard Vercel → Logs | > 5/h |
| CPU VPS | Netdata | `monitor.perform-learn.fr` | > 80% pendant > 5 min |
| Budget IA | DB | `SELECT identifier, count FROM freelancehub.chat_limits WHERE identifier LIKE 'agent:%'` | > 80% du cap |
| Emails Resend | Resend | Dashboard Resend | taux livraison < 95% |
| Paiements Stripe | Stripe | Dashboard → Payments | webhook `charge.refunded` non géré |
| Consultants KYC | DB | `SELECT COUNT(*) FROM freelancehub.consultants WHERE kyc_status='submitted'` | 0 après 48h post-release |

---

## Résumé — Ordre d'exécution

```
1. Code prêt (tsc + tests + build + lint) ✅
2. CI GitHub Actions vert ✅
3. Sécurité vérifiée ✅
4. Git clean (status + stash + branches) ✅
5. DB migrations identifiées + appliquées ✅
6. TNR local ✅  →  ./scripts/tnr.sh
7. Deploy VPS ✅  →  ./scripts/deploy-agent.sh
8. Smoke tests manuels Vercel ✅
9. Tag git créé + poussé ✅  →  git tag -a vX.Y.Z && git push origin vX.Y.Z
10. Docs mise à jour (ROADMAP + refacto.md) ✅
11. Monitoring J0–J7 activé ✅
```

*Ce fichier est la référence pour Claude Agent DG et Abdel à chaque release.*
