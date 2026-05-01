# refacto.md — Analyse quotidienne perform-learn.fr
**Date** : 2026-05-01 · **Contexte** : J+1 post-lancement · **Analyste** : Claude Agent DG

---

## TL;DR

**J+1 — Infrastructure stable. Aucun incident prod détecté. 3 vulnérabilités résiduelles prioritaires.**

Depuis J0 : fix GTM `<Script>` placé dans `<body>` (layout.tsx). Aucun nouveau correctif sécurité.

Risques résiduels confirmés par re-scan aujourd'hui :
- **S15** `password_hash = ''` — compte soft-deleted réactivable sans mot de passe (`user/me/route.ts:40`)
- **S9** Erreurs email silencieuses `.catch(() => null)` — 3 routes affectées (KYC, register, reviews)
- **S17** ⚡ NEW — Race condition Early Adopter KYC : 2 validations concurrentes peuvent attribuer le badge à plus de 20 consultants

Nouveaux items dette technique identifiés : S18 CSP incomplet, DT-09 Zod absent, DT-10 Stripe non singleton.

---

## 1. Sécurité OWASP

### Critiques résolus ✅ (hérités J0)

| ID | OWASP Cat. | Fichier | Statut |
|---|---|---|---|
| C1 | A04 Insecure Design | `client/bookings/route.ts:12-68` | ✅ Montant calculé côté serveur via `computePricing()` + lookup `daily_rate` DB |
| C2 | A01 Broken Access | `reviews/route.ts:124` | ✅ `consultant_id` → `consultant_user_id` (notification fonds libérés) |
| N1 | A09 Security Logging | `chat-router.ts` | ✅ Budget cap mensuel enregistré + vérifié dans `chat_limits` avant appel LLM |
| S12 | A01 Broken Access | `admin/kyc-presign/route.ts:38` | ✅ Guard path traversal (`kyc/` + `..` + `%2e` + `\0`) |
| S16 | A03 Injection | `admin/export-csv/route.ts:9` | ✅ Préfixe `'` sur caractères formula injection Excel |
| CORS | A05 Misconfig | `caddy/Caddyfile` | ✅ `*.vercel.app` → `portal.perform-learn.fr` uniquement |
| PG-PORT | A05 Misconfig | `docker-compose.yml:46` | ✅ `127.0.0.1:5432:5432` — port PG non exposé en prod |

### Critiques résiduels — Semaine 1 obligatoire 🔴

| ID | OWASP Cat. | Description | Fichier | Impact |
|---|---|---|---|---|
| S15 | A07 Auth Failures | `password_hash = ''` lors du soft-delete — si `deleted_at` bypassé, compte sans mot de passe | `user/me/route.ts:40` | Authentification sans secret |
| S9 | A09 Logging Failures | `.catch(() => null)` silencieux sur `sendKycValidated()`, `sendKycRejected()`, `sendWelcomeConsultant()` — incidents Resend invisibles | `admin/kyc/route.ts:69,83` `auth/register/route.ts:58` | Perte notifications critiques sans trace |
| **S17** ⚡ NEW | A04 Insecure Design | Race condition Early Adopter : 2 KYC concurrent → COUNT < 20 lu deux fois → badge attribué à > 20 consultants | `admin/consultants/[id]/kyc/route.ts:45-51` | Perte financière commission 10% × N surplus |

**Fix S17 proposé** (Pareto — 8 lignes) :
```sql
-- Remplacer le COUNT() + isEarlyAdopter JS par une UPDATE atomique
UPDATE freelancehub.consultants
SET is_early_adopter = (
  SELECT COUNT(*) < 20
  FROM freelancehub.consultants
  WHERE kyc_status = 'validated' AND is_early_adopter = true
  FOR UPDATE
),
commission_rate = CASE
  WHEN (SELECT COUNT(*) < 20 FROM freelancehub.consultants WHERE kyc_status='validated' AND is_early_adopter=true FOR UPDATE) THEN 0.10
  ELSE 0.15
END
WHERE id = $1;
```

**Fix S15 proposé** (4 lignes) :
```typescript
// user/me/route.ts:40 — remplacer password_hash = ''
import { randomBytes } from 'crypto'
password_hash = randomBytes(32).toString('hex'),  // inutilisable, non-bcrypt volontaire
```

**Fix S9 proposé** (remplacer `.catch(() => null)`) :
```typescript
.catch((emailErr: unknown) => {
  console.error('[email] sendKycValidated failed', { consultantId, error: String(emailErr) })
})
```

### Hautes — À corriger C5

| ID | OWASP Cat. | Description | Fichier | Impact |
|---|---|---|---|---|
| S3 | A08 Software Failures | Rate limiting in-memory (Map) non persistant — réinitialisé à chaque cold start Vercel | `middleware.ts:16-49` | DDoS sur auth + paiement possible |
| S13 | A04 Insecure Design | Webhook Stripe `charge.refunded` non géré — remboursement sans mise à jour DB ni notification | `webhooks/stripe/route.ts` | Incohérence comptable |
| S6 | A05 Misconfig | Metadata Stripe : `client_id`, `amount_ttc`, `amount_ht`, `tva`, `consultant_net` — surface RGPD inutile | `client/bookings/[id]/payment-intent/route.ts:72-80` | RGPD data minimization |

**Fix S6 proposé** (Pareto) — garder uniquement `booking_id` + `platform` :
```typescript
// payment-intent/route.ts
metadata: {
  booking_id: booking.id,
  platform: 'perform-learn',
  // Suppression : client_id, amount_ttc, amount_ht, tva, platform_commission, consultant_net
}
```

### Moyennes — Planifiées C5-C6

| ID | Description | Fichier |
|---|---|---|
| **S18** ⚡ NEW | CSP incomplet : `unsafe-inline` scripts/styles, `data:` img-src, absence `object-src 'none'`, `form-action 'self'`, `frame-ancestors 'none'` | `next.config.mjs:29-38` |
| S7 | Webhook deduplication sans TTL — `webhook_events` croît sans limite | `webhooks/stripe/route.ts` |
| S8 | Audit trail admin absent — modifications KYC/statuts sans log structuré | `admin/consultants/[id]/route.ts` |
| N2 | Regex escalation `\w+` exclut accents/tirets — sujets chat perdus | `chat-router.ts:162` |

**Fix S18 CSP** (Pareto) :
```typescript
// next.config.mjs — amélioration CSP immédiate
"object-src 'none'",         // bloque Flash/plugins
"form-action 'self'",        // bloque exfiltration formulaires
"frame-ancestors 'none'",    // remplace X-Frame-Options plus efficacement
// Supprimer 'data:' de img-src (remplacer par 'blob:' si nécessaire)
```

### Incidents (hors git — risque résiduel)

| Incident | Description | Action requise |
|---|---|---|
| CRED-01 | `.env.local` sur disque contient credentials live (hors git, non exposé) | Rotation Stripe live + xAI + root VPS — statut inconnu |

---

## 2. Dette technique

### Critique (bloque la scalabilité)

#### DT-01 — Rate limiting in-memory `portal/middleware.ts`
```typescript
// Actuel — Map réinitialisée à chaque cold start Vercel
const RL_MAP = new Map<string, RateEntry>()
// Règles : auth 10 req/15min · payment-intent 5 req/5min · chat/public 20 req/min
```
**Fix C5** : Upstash Redis `@upstash/ratelimit` sliding window. Variables : `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`.

#### DT-02 — Pas de `pricing.ts` centralisé
`computePricing()` dans `matching.ts` importé par `client/bookings/route.ts`. **26+ occurrences** de `/ 100` inline sans utilitaire typé `fmtEur(cents)`.
- Risque : double conversion silencieuse, perte de précision
- Fix C5 : `lib/freelancehub/pricing.ts` → `computePricing()` + `fmtEur()` + `eurToCents()`

### Haute

#### DT-03 — Duplication `STATUS_MAP` (4-5 fichiers confirmés)
`BOOKING_STATUS_MAP` et `PAYMENT_STATUS_MAP` redéfinis dans :
- `components/freelancehub/admin/BookingsTable.tsx`
- `app/freelancehub/(auth)/admin/page.tsx`
- `app/freelancehub/(auth)/consultant/bookings/page.tsx`
- `app/freelancehub/(auth)/client/page.tsx`
→ `lib/freelancehub/constants.ts` en C5.

#### DT-04 — Pool PG `max: 2` — PgBouncer absent
`db.ts:5` — 2 connexions simultanées max. Scalabilité bloquée > 5 req/s. PgBouncer mode transaction requis avant C6.

#### DT-05 — Composants monolithiques (inchangé)

| Composant | Lignes | Refactoring planifié |
|---|---|---|
| `BookingModal.tsx` | ~498 | `<SlotPicker>`, `<PriceSummary>`, `<StripePaymentStep>` — C6 |
| `SearchClient.tsx` | ~398 | `<SearchForm>` — C6 |
| `AgendaCalendar.tsx` | ~305 | Hook `useAgendaSlots()` — C6 |
| `BookingsTable.tsx` | ~293 | `<BookingsFilters>` + `<BookingsTotals>` — C6 |

### Moyenne

#### DT-06 — Absence de tests automatisés
Zero Vitest/Playwright. Flow booking → paiement → review → libération testé manuellement uniquement.
**C5** : Vitest unit (`computePricing`, `findMatches`, `esc`) + Playwright E2E (register → KYC → booking → payment → review).

#### DT-07 — Timezone `T00:00:00` non UTC
`email.ts:36` et cron — timezone locale au lieu de `Z`. Risque si timezone VPS change.

#### DT-08 — `trackEvent()` non intégré dans composants
`portal/lib/freelancehub/analytics.ts` créé — non appelé depuis `register/page.tsx`, `BookingModal.tsx`, `SearchClient.tsx`, `consultant/kyc/page.tsx`.

#### DT-09 ⚡ NEW — Validation d'entrée manuelle et hétérogène
Aucune bibliothèque de schéma (Zod/Valibot). Validation par regex custom :
- `consultant/slots/route.ts:55-66` : regex date/heure manuelles
- `auth/register/route.ts:20-25` : longueur seule, pas de complexité
- `auth/register/route.ts:22` : regex email basique `[^\s@]+@[^\s@]+\.[^\s@]+` (accepte `a@b.c`)
**C5** : Migration progressive Zod en partant des routes d'authentification.

#### DT-10 ⚡ NEW — Stripe non singleton
`new Stripe(process.env.STRIPE_SECRET_KEY!)` instancié à chaque requête dans les routes concernées. Surcoût connexion HTTPS par invocation serverless.
**Fix** : `lib/freelancehub/stripe.ts` — instance partagée (déjà planifié ROADMAP C5).

---

## 3. Agilité & Processus

### Points positifs ✅

- Architecture monorepo claire avec migrations séquentielles (001–017)
- Convention de commits respectée (feat/fix/refactor + scopes freelancehub/infra/portal/db)
- CLAUDE.md complet, ROADMAP.md priorisée avec `business_value` + `value_type`
- Lancement J0 exécuté sans incident (email waitlist envoyé, OG image, GTM, CSP+HSTS)
- Système de gouvernance en DB opérationnel

### Points d'amélioration

#### AG-01 — Pas de CI/CD
Aucun GitHub Actions. Deploy Vercel automatique mais sans lint/typecheck/tests en PR.
**C5** : `.github/workflows/ci.yml` avec `tsc --noEmit` + `eslint` + `vitest --run`.

#### AG-02 — Pas de staging
Tests sur Stripe live. Pas d'environnement preview avec test keys.
**C5** : Variables Vercel preview + schéma `test_freelancehub` ou DB séparée.

#### AG-03 — Onboarding développeur incomplet
`DEV.md` existe mais ne couvre pas setup complet local (MinIO bucket init, ordre migrations).
**C5** : `scripts/dev-setup.sh` ou `make setup`.

---

## 4. Checklist Pareto — Semaine 1 (J+1 → J+7)

> **Principe** : 20% des actions → 80% de la réduction de risque. Priorisées par rapport impact/effort.

| # | Priorité | Action | Effort | Fichier cible | Impact |
|---|---|---|---|---|---|
| 1 | 🔴 P0 | Fix S15 — `password_hash` aléatoire au lieu de `''` | 10 min | `user/me/route.ts:40` | Critique sécurité auth |
| 2 | 🔴 P0 | Fix S17 — Race condition Early Adopter (UPDATE atomique SQL) | 20 min | `admin/consultants/[id]/kyc/route.ts:45-51` | Risque financier direct |
| 3 | 🔴 P0 | Fix S9 — Logger erreurs email (3 `.catch(() => null)`) | 15 min | `kyc/route.ts:69,83` · `register/route.ts:58` | Observabilité critique |
| 4 | 🟠 P1 | Fix S6 — Réduire metadata Stripe (`booking_id` + `platform` uniquement) | 10 min | `payment-intent/route.ts:72-80` | RGPD data minimization |
| 5 | 🟠 P1 | Fix S13 — Gérer `charge.refunded` dans webhook Stripe | 45 min | `webhooks/stripe/route.ts` | Intégrité comptable |
| 6 | 🟠 P1 | Intégrer `trackEvent()` dans composants (register + BookingModal) | 1h | `register/page.tsx`, `BookingModal.tsx` | Observabilité growth |
| 7 | 🟡 P2 | Fix S18 — Compléter CSP (`object-src`, `form-action`, `frame-ancestors`) | 10 min | `next.config.mjs:29-38` | XSS defense-in-depth |
| 8 | 🟡 P2 | Configurer Upstash Redis + migrer rate limiting | 2h | `middleware.ts` + Vercel env vars | DDoS protection persistante |
| 9 | 🟡 P2 | `constants.ts` — centraliser STATUS_MAP (5 fichiers) | 1h | `lib/freelancehub/constants.ts` | Maintenabilité |
| 10 | 🟡 P2 | `pricing.ts` — `computePricing()` + `fmtEur()` centralisés | 2h | `lib/freelancehub/pricing.ts` | Éliminer 26+ conversions inline |

---

## 5. Plan d'action

### Immédiat (J+1 — aujourd'hui)

| Priorité | Action | Responsable | Durée |
|---|---|---|---|
| 🔴 P0 | Fix S15, S17, S9 (voir checklist Pareto #1-3) | Claude | 45 min |
| 🔴 P0 | Rotation credentials si CRED-01 non traité | Abdel | 15 min |
| 🟠 P1 | Outreach LinkedIn — 10 consultants ERP/D365 | Abdel | 2h |
| 🟠 P1 | Poster LinkedIn post J+1 (angle fondateur) | Abdel | 20 min |
| 🟠 P1 | Valider KYC consultants inscrits (admin portal) | Abdel | — |

### Semaine 1 (J+2 → J+7)

- Fix S6 metadata Stripe + S13 charge.refunded
- Intégrer `trackEvent()` dans register + BookingModal
- Fix S18 CSP headers complet
- Migration 018 referral `?ref=` (consultant dashboard)
- GitHub Actions CI (`tsc --noEmit` + `eslint`)

### Semaine 2 (J+8 → J+14)

- Upstash Redis rate limiting persistant (Abdel : créer compte + variables Vercel)
- `constants.ts` — centraliser STATUS_MAP
- `pricing.ts` — déplacer `computePricing()` + `fmtEur()`
- Vitest unit tests : `computePricing`, `findMatches`, `esc`

---

## 6. Métriques à surveiller J+1–J+7

| Métrique | Source | Alerte si |
|---|---|---|
| Signups J+1 | Umami `/freelancehub/register` | < 2 en 24h post-lancement |
| Consultants KYC soumis | `SELECT COUNT(*) FROM freelancehub.consultants WHERE kyc_status='submitted'` | 0 après 72h |
| Erreurs API 5xx | Vercel Logs | > 5 en 1h |
| CPU VPS | Netdata `monitor.perform-learn.fr` | > 80% pendant > 5min |
| Budget IA | `SELECT identifier, count FROM freelancehub.chat_limits WHERE identifier LIKE 'agent:%'` | count > monthlyCap × 0.8 |
| Emails délivrés | Resend Dashboard | taux livraison < 95% |
| Early Adopters validés | `SELECT COUNT(*) FROM freelancehub.consultants WHERE is_early_adopter=true` | > 20 (race condition S17) |

---

## 7. Statut ROADMAP Cycle 4

| Feature C4 | Statut |
|---|---|
| Fix C1 montant booking côté serveur | ✅ Corrigé J0 |
| Fix C2 notification fonds libérés | ✅ Corrigé J0 |
| Fix N1 budget cap IA | ✅ Corrigé J0 |
| Fix S12 path traversal KYC | ✅ Corrigé J0 |
| Fix S16 CSV formula injection | ✅ Corrigé J0 |
| Fix CORS wildcard | ✅ Corrigé J0 |
| Fix port PostgreSQL public | ✅ Corrigé J0 |
| Headers HSTS + CSP (base) | ✅ Ajouté J0 |
| Pool PG max:2 | ✅ Corrigé J0 |
| OG image dynamique | ✅ Route dynamique créée J0 |
| GTM portail Next.js | ✅ Ajouté J0 (Script body fix J+1) |
| Email lancement waitlist | ✅ Envoyé J0 (1/1) |
| Onboarding KYC consultant | ✅ Upload + validation admin opérationnel |
| NDA automatique Phase 1 | ✅ Endpoint opérationnel |
| Offre Early Adopter | ✅ EarlyAdopterBand + badge |
| Landing page → portail CTA | ✅ front.html → `/freelancehub/register` |
| Facture PDF post-paiement | ❌ Planifié C5 |
| Rate limiting persistant (Upstash) | ❌ Planifié C5 |
| `constants.ts` | ❌ Planifié C5 |
| `pricing.ts` | ❌ Planifié C5 |
| S13 charge.refunded | ❌ Semaine 1 |
| S6 Metadata Stripe | ❌ Semaine 1 |
| S9 Logger erreurs email | ❌ **P0 — aujourd'hui** |
| S15 password_hash vide | ❌ **P0 — aujourd'hui** |
| S17 Race condition Early Adopter | ❌ **P0 — nouveau** |

---

*Généré par Agent DG perform-learn.fr · Analyse quotidienne J+1 du 2026-05-01*
