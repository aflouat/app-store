# DONE.md — Release Notes + Definition of Done · perform-learn.fr

> Ce fichier a deux rôles :
> 1. **§1 — Dernière release** : notes générées automatiquement par `scripts/release-notes.sh`, mises à jour à chaque release.
> 2. **§2 — Definition of Done** : checklist de gates que l'Agent RELEASE exécute avant tout tag.
>
> Référence : `CLAUDE.md §5` (protocole Agent RELEASE) · `scripts/release-notes.sh`

---

## 1. Dernière release — v1.3.0 (01 mai 2026)

> *Section mise à jour automatiquement par `scripts/release-notes.sh vX.Y.Z`. Ne pas éditer manuellement.*

### Nouveautés

- **Mot de passe oublié** — flow complet : token 1h, pages UI, email Resend sécurisé
- **Système referral `?ref=`** — commission 13% si parrainage actif, dashboard consultant avec lien + compteur filleuls
- **GTM custom events** — `trackEvent()` sur register, booking_paid, search_consultant, select_consultant

### Corrections de sécurité

- **Fix montant réservation côté serveur** — `amount_ht` calculé depuis `consultants.daily_rate` en DB (ignoré côté client)
- **Fix notification fonds libérés** — `booking.consultant_user_id` corrigé dans `reviews/route.ts`
- **Fix password_hash vide** — NULL au lieu de `''` sur soft-delete utilisateur
- **Fix Stripe `charge.refunded`** — UPDATE payment + booking cancelled + notifications client+consultant
- **CSV formula injection** — préfixe `'` sur formules `=+-@` dans `esc()`
- **Valider clé S3 presign** — `key.startsWith('kyc/')` + `!key.includes('..')` + guard `\0`

### Infrastructure

- **CI/CD GitHub Actions** — tsc + vitest + next build sur push main
- **CSP Headers + HSTS** — `Content-Security-Policy` + `Strict-Transport-Security`
- **Pool PostgreSQL** — `max: 2` immédiat (évite saturation 100 connexions Vercel)
- **Enforcer monthlyCap agents IA** — `chat_limits (identifier=agent:X)`, fallback statique si cap atteint

### Migrations SQL

- `019_password_reset_tokens.sql` — table `freelancehub.password_reset_tokens`
- `018_referral.sql` — `referrer_id`, `referrer_commission_until` sur `freelancehub.users`

---

## 2. Definition of Done — Checklist Agent RELEASE

> L'Agent RELEASE exécute cette checklist dans l'ordre. Chaque section doit être ✅ avant de passer à la suivante.
> Si un item est KO : STOP → notifier Abdel → corriger → reprendre depuis le début.

---

### Gate 1 — Code qualité

```bash
cd portal
npx tsc --noEmit          # 0 erreur TypeScript
npm test                  # Vitest : tous verts, pas de .skip/.only oublié
npm run build             # Build Next.js sans erreur ni warning critique
```

Vérifications manuelles :
```bash
# Secrets hardcodés
grep -rn "sk_live_\|re_live_\|whsec_live_\|xai-live" portal/app portal/lib portal/components --include="*.ts" --include="*.tsx"

# console.log dans routes API (interdit — seulement console.error/warn)
grep -rn "console\.log" portal/app/api --include="*.ts"

# TODO bloquants
grep -rn "TODO\|FIXME\|HACK" portal/app portal/lib --include="*.ts" --include="*.tsx"
```

- [ ] 0 erreur TypeScript
- [ ] Vitest : tous tests verts
- [ ] Build Next.js réussi
- [ ] Aucun secret `*_live_*` dans le code
- [ ] Pas de `console.log` dans les routes API
- [ ] Aucun TODO/FIXME bloquant

---

### Gate 2 — CI GitHub Actions

URL : `https://github.com/aflouat/app-store/actions`

- [ ] Pipeline `CI` vert sur le dernier commit `main` (tsc + vitest + build + E2E)
- [ ] Aucun job `skipped` inattendu

---

### Gate 3 — Tests E2E

```bash
cd portal
E2E_BASE_URL=https://<preview-url>.vercel.app npx playwright test
```

- [ ] `auth.spec.ts` vert — login credentials + Google OAuth
- [ ] `booking.spec.ts` vert — search → book → Stripe test card → reveal consultant
- [ ] `consultant.spec.ts` vert — voir booking → soumettre review → fonds libérés

---

### Gate 4 — Sécurité

- [ ] `DECISIONS.md` : aucun item **Critique** sans mitigation documentée
- [ ] Secrets Vercel à jour : `vercel env ls --environment=production`
- [ ] Variables prod vérifiées :
  - [ ] `DATABASE_URL` ✅
  - [ ] `NEXTAUTH_SECRET` ✅ (≥ 32 chars)
  - [ ] `STRIPE_SECRET_KEY` ✅ (`sk_live_…`)
  - [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` ✅ (`pk_live_…`)
  - [ ] `RESEND_API_KEY` ✅
  - [ ] `STRIPE_WEBHOOK_SECRET` ✅
  - [ ] `CRON_SECRET` ✅

---

### Gate 5 — Base de données

- [ ] Migrations SQL numérotées séquentiellement (pas de saut)
- [ ] Chaque nouvelle migration listée dans §1 (release notes)
- [ ] Ordre de déploiement respecté (migration avant push si code attend nouvelle colonne)

```bash
# Appliquer une migration
ssh -p 2222 abdel@37.59.125.159 \
  'docker exec -i postgres psql -U appstore -d appstore' \
  < migrations/0XX_nom.sql
```

---

### Gate 6 — Git propre

```bash
git fetch --prune
git status       # doit être clean
git stash list   # doit être vide
git log --oneline -10
git branch -a    # aucune branche feature pendante
```

- [ ] Working tree propre
- [ ] Stash vide
- [ ] Aucune branche feature pendante
- [ ] Commits respectent la convention `feat|fix|refactor|chore|docs(scope):`

---

### Gate 7 — TNR local

```bash
./scripts/tnr.sh
```

- [ ] 7/7 étapes vertes

---

### Gate 8 — Déploiement VPS

```bash
./scripts/deploy-agent.sh
```

```bash
# Health checks
curl -sf https://api.perform-learn.fr/health && echo API_OK
curl -sf https://portal.perform-learn.fr && echo PORTAL_OK
curl -sf https://analytics.perform-learn.fr && echo ANALYTICS_OK
```

- [ ] `git pull` VPS up-to-date
- [ ] Containers `postgres`, `minio`, `umami`, `caddy`, `netdata` tous `Up`
- [ ] API `/health` → 200
- [ ] Portal → 200

---

### Gate 9 — Smoke tests Vercel (golden paths)

| Flow | URL | Attendu |
|---|---|---|
| Homepage | `https://portal.perform-learn.fr` | Charge, EarlyAdopterBand visible |
| Login | `/freelancehub/login` | Credentials + Google SSO visible |
| Register | `/freelancehub/register` | Formulaire fonctionnel |
| Dashboard admin | `/freelancehub/admin` | Accès avec `admin@perform-learn.fr` |
| Recherche consultant | `/freelancehub/client` | Résultats matching visibles |
| API health | `https://api.perform-learn.fr/health` | `{"status":"ok"}` |

- [ ] Tous les smoke tests passent
- [ ] Aucun 500/404 sur les flows critiques

---

### Gate 10 — Tag + Release GitHub

```bash
VERSION=vX.Y.Z

# Générer les release notes et créer la release GitHub
./scripts/release-notes.sh "$VERSION" "$(git describe --tags --abbrev=0 HEAD^)"

# Tag annoté
git tag -a "$VERSION" -m "Release $VERSION — $(date '+%Y-%m-%d')"
git push origin "$VERSION"
```

- [ ] Release notes générées et relues
- [ ] §1 de DONE.md mis à jour avec les nouvelles notes
- [ ] HOWTO.md mis à jour si nouvelles fonctionnalités utilisateur
- [ ] Tag créé et poussé
- [ ] Workflow `Release Gate` vert sur GitHub Actions
- [ ] `version courante` mis à jour dans ROADMAP.md

---

### Gate 11 — Monitoring post-release (J0 → J7)

| Métrique | Source | Alerte si |
|---|---|---|
| Signups | Umami `analytics.perform-learn.fr` | < 5/24h |
| Erreurs 5xx | Vercel Logs | > 5/h |
| CPU VPS | Netdata `monitor.perform-learn.fr` | > 80% pendant > 5 min |
| Budget IA | `SELECT identifier, count FROM freelancehub.chat_limits WHERE identifier LIKE 'agent:%'` | > 80% du cap |
| Emails | Dashboard Resend | taux livraison < 95% |
| Paiements | Dashboard Stripe → Payments | `charge.refunded` non géré |
| KYC | `SELECT COUNT(*) FROM freelancehub.consultants WHERE kyc_status='submitted'` | 0 après 48h |

---

### Résumé — Ordre d'exécution Agent RELEASE

```
Gate 1  → Code qualité (tsc + tests + build + vérifs)   ✅
Gate 2  → CI GitHub Actions vert                         ✅
Gate 3  → E2E Playwright vert (3 flows critiques)        ✅
Gate 4  → Sécurité (secrets, variables prod)             ✅
Gate 5  → Migrations SQL appliquées                      ✅
Gate 6  → Git propre                                     ✅
Gate 7  → TNR local                     ./scripts/tnr.sh ✅
Gate 8  → Deploy VPS              ./scripts/deploy-agent.sh ✅
Gate 9  → Smoke tests Vercel                             ✅
Gate 10 → Tag + Release GitHub    ./scripts/release-notes.sh ✅
Gate 11 → Monitoring J0 activé                          ✅
```
