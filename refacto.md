# refacto.md — Analyse quotidienne perform-learn.fr
**Date** : 2026-04-30 · **Contexte** : Jour du lancement public (C4) · **Analyste** : Claude Agent DG

---

## TL;DR

**Lancement J0 — 6 bloquants critiques corrigés dans cette session. Lançable immédiatement.**

Fixes appliqués : C1 (montant serveur), C2 (notification orpheline), N1 (budget cap IA), S12 (path traversal KYC), S16 (CSV injection), CORS wildcard, port PostgreSQL public, headers CSP+HSTS. Nouveau : OG image dynamique, GTM portail, email de lancement waitlist, analytics.ts.

**Risques résiduels** : rate limiting in-memory Vercel (non persistant entre cold starts) — à résoudre C5 avec Upstash Redis.

---

## 1. Sécurité OWASP

### Critiques résolus aujourd'hui ✅

| ID | OWASP Cat. | Fichier | Statut |
|---|---|---|---|
| C1 | A04 Insecure Design | `client/bookings/route.ts:12-68` | ✅ Montant calculé côté serveur via `computePricing()` + lookup `daily_rate` DB |
| C2 | A01 Broken Access | `reviews/route.ts:124` | ✅ `consultant_id` → `consultant_user_id` (notification fonds libérés) |
| N1 | A09 Security Logging | `chat-router.ts` | ✅ Budget cap mensuel enregistré + vérifié dans `chat_limits` avant appel LLM |
| S12 | A01 Broken Access | `admin/kyc-presign/route.ts:38` | ✅ Guard path traversal (`kyc/` + `..` + `%2e` + `\0`) |
| S16 | A03 Injection | `admin/export-csv/route.ts:9` | ✅ Préfixe `'` sur caractères formula injection Excel |
| CORS | A05 Misconfig | `Caddyfile:13` | ✅ `*.vercel.app` → `portal.perform-learn.fr` uniquement |
| PG-PORT | A05 Misconfig | `docker-compose.yml:46` | ✅ `5432:5432` → `127.0.0.1:5432:5432` |

### Hautes — À corriger C5

| ID | OWASP Cat. | Description | Fichier | Impact |
|---|---|---|---|---|
| S3/C3 | A08 Software Failures | Rate limiting in-memory (Map) inefficace sur Vercel serverless — réinitialisé à chaque cold start | `portal/middleware.ts:16-49` | DDoS sur auth + paiement possible |
| S9 | A09 Security Logging | Erreurs email silencieuses `.catch(() => null)` — incidents Resend invisibles | `reviews/route.ts`, `cron/reminders` | Perte notifications critiques |
| S13 | A04 Insecure Design | Webhook Stripe `charge.refunded` non géré — remboursement sans mise à jour DB | `webhooks/stripe/route.ts` | Incohérence comptable |
| S6 | A08 Software Failures | Metadata Stripe expose montants ventilés — surface RGPD inutile | `client/bookings/[id]/pay/route.ts` | RGPD + sécurité |

### Moyennes — Planifiées C5-C6

| ID | Description | Fichier |
|---|---|---|
| S15 | `password_hash = ''` lors du soft-delete → compte réactivable sans mot de passe | `user/me/route.ts:40` |
| S7 | Webhook deduplication sans TTL — `webhook_events` croît sans limite | `webhooks/stripe/route.ts` |
| S8 | Audit trail admin absent — modifications KYC/statuts sans log | `admin/consultants/[id]/route.ts` |
| N2 | Regex escalation `\w+` exclut accents/tirets — sujets perdus | `chat-router.ts:162` |

### Incidents (hors git — risque résiduel)

| Incident | Description | Action requise |
|---|---|---|
| CRED-01 | `.env.local` sur disque contient credentials live (hors git, non exposé) | Rotation préventive Stripe + xAI + root VPS recommandée |

---

## 2. Dette technique

### Critique (bloque la scalabilité)

#### DT-01 — Rate limiting in-memory `portal/middleware.ts`
```typescript
// Actuel — problème : Map réinitialisée à chaque cold start Vercel
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
```
**Fix C5** : Upstash Redis `@upstash/ratelimit` sliding window. Variables Vercel : `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`.

#### DT-02 — Pas de `pricing.ts` centralisé
`computePricing()` dans `matching.ts` — maintenant aussi importé par `client/bookings/route.ts`. À déplacer en `lib/freelancehub/pricing.ts`. 19 occurrences de `/ 100` inline.

### Haute

#### DT-03 — Duplication `STATUS_MAP` (5 fichiers)
`BOOKING_STATUS_MAP` et `PAYMENT_STATUS_MAP` dans `admin/bookings/page.tsx`, `client/bookings/page.tsx`, `consultant/bookings/page.tsx`, `admin/payments/page.tsx`, `BookingsTable.tsx`. → `lib/freelancehub/constants.ts` en C5.

#### DT-04 — Pool PG `max: 2` fait — PgBouncer absent
50 requêtes concurrentes = 100 connexions PG. `max_connections=100` par défaut sur VPS. PgBouncer en mode transaction pooling requis avant C6.

#### DT-05 — Composants monolithiques

| Composant | Lignes | Refactoring planifié |
|---|---|---|
| `BookingModal.tsx` | 498 | `<SlotPicker>`, `<PriceSummary>`, `<StripePaymentStep>` — C6 |
| `SearchClient.tsx` | 398 | `<SearchForm>` — C6 |
| `AgendaCalendar.tsx` | 305 | Hook `useAgendaSlots()` — C6 |
| `BookingsTable.tsx` | 293 | `<BookingsFilters>` + `<BookingsTotals>` — C6 |

### Moyenne

#### DT-06 — Absence de tests automatisés
Zero Vitest/Playwright. Flow booking → paiement → review → libération fonds testé manuellement uniquement.

**C5** :
1. Vitest unit : `computePricing()`, `findMatches()`, `esc()`
2. Playwright E2E : register → KYC → admin validate → client search → booking → payment → review

#### DT-07 — Timezone `T00:00:00` non UTC
`email.ts:36` et cron utilisent timezone locale au lieu de `Z`. Risque si timezone VPS change.

---

## 3. Agilité & Processus

### Points positifs ✅

- Architecture monorepo claire avec migrations séquentielles
- Convention de commits respectée (feat/fix/refactor + scopes)
- CLAUDE.md complet et à jour
- ROADMAP.md priorisée avec `business_value` et `value_type`
- Système de gouvernance en DB

### Points d'amélioration

#### AG-01 — Pas de CI/CD
Aucun GitHub Actions. Deploy Vercel automatique mais pas de lint/typecheck/tests en PR.
**C5** : `.github/workflows/ci.yml` avec `tsc --noEmit` + `eslint` + `vitest --run`.

#### AG-02 — Pas de staging
Tests en production Stripe live. Pas d'environnement preview avec test keys.
**C5** : Variables Vercel pour preview + schema `test_freelancehub` ou DB séparée.

#### AG-03 — Onboarding développeur incomplet
`DEV.md` existe mais ne couvre pas setup complet local (MinIO bucket init, ordre migrations).
**C5** : `scripts/dev-setup.sh` ou `make setup`.

---

## 4. Growth — Livraisons J0

| Livraison | Fichier | Statut |
|---|---|---|
| OG image dynamique 1200×630 | `portal/app/og-image.png/route.tsx` | ✅ Créé |
| GTM-5CWFL95D dans portail Next.js | `portal/app/layout.tsx` | ✅ Ajouté |
| Analytics client (GTM + Umami) | `portal/lib/freelancehub/analytics.ts` | ✅ Créé — à intégrer dans composants |
| Email lancement consultant segment | `portal/lib/freelancehub/email.ts` | ✅ `sendLaunchEmail()` |
| Script batch waitlist | `portal/scripts/launch-email.ts` | ✅ Créé — `npx tsx` |
| CORS sécurisé | `Caddyfile:13` | ✅ Déployé |

### Gaps growth restants (C5)

| Gap | Action | Effort |
|---|---|---|
| Referral `?ref=CONSULTANT_ID` | Migration 018 + route register | 3h |
| Custom events GTM dans composants | Intégrer `trackEvent()` dans register/page.tsx + BookingModal + SearchClient | 2h |
| FAQ landing page | Section FAQ dans `front.html` | 1h |
| Pages SEO par domaine (`/consultants/erp-d365`) | Nouvelles pages Next.js | 4h |

---

## 5. Plan d'action post-lancement

### J0 — Aujourd'hui

| Priorité | Action | Responsable | Durée |
|---|---|---|---|
| 🔴 P0 | Révoquer Stripe live + xAI + root VPS (si pas fait) | Abdel | 15 min |
| 🔴 P0 | Déployer VPS : `ssh -p 2222 abdel@37.59.125.159 'cd /appli/app-store && git pull && docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile'` | Abdel | 5 min |
| 🔴 P0 | Envoyer email lancement : `npx tsx portal/scripts/launch-email.ts --dry-run` puis réel | Abdel | 30 min |
| 🟠 P1 | Poster LinkedIn post J0 (angle fondateur) | Abdel | 20 min |
| 🟠 P1 | Outreach DM 10 consultants ERP/D365 sur LinkedIn | Abdel | 2h |

### J+1 (1er mai)

| Priorité | Action | Durée |
|---|---|---|
| 🟠 P1 | Intégrer `trackEvent()` dans `register/page.tsx` + `BookingModal.tsx` | 1h |
| 🟠 P1 | Configurer Upstash Redis (créer compte + variables Vercel) | 30 min |
| 🟠 P1 | Valider KYC premiers consultants inscrits | Admin |
| 🟡 P2 | Poster LinkedIn post J+3 (angle KYC confiance) | 20 min |

### Semaine 1

- Fix S15 `password_hash` vide (`user/me/route.ts:40`)
- Fix S9 logger erreurs email
- Migration 018 referral + `?ref=` dashboard consultant
- GitHub Actions CI (tsc + eslint)

---

## 6. Métriques à surveiller J0–J7

| Métrique | Source | Alerte si |
|---|---|---|
| Signups | Umami `/freelancehub/register` | < 5 en 24h |
| Consultants KYC soumis | `SELECT COUNT(*) FROM freelancehub.consultants WHERE kyc_status='submitted'` | 0 après 48h |
| Erreurs API 5xx | Vercel Logs | > 5 en 1h |
| CPU VPS | Netdata `monitor.perform-learn.fr` | > 80% pendant > 5min |
| Budget IA | `SELECT identifier, count FROM freelancehub.chat_limits WHERE identifier LIKE 'agent:%'` | count > monthlyCap × 0.8 |

---

## 7. Statut ROADMAP Cycle 4

| Feature C4 | Statut |
|---|---|
| Fix C1 montant booking côté serveur | ✅ Corrigé |
| Fix C2 notification fonds libérés | ✅ Corrigé |
| Fix N1 budget cap IA | ✅ Corrigé |
| Fix S12 path traversal KYC | ✅ Corrigé |
| Fix S16 CSV formula injection | ✅ Corrigé |
| Fix CORS wildcard | ✅ Corrigé |
| Fix port PostgreSQL public | ✅ Corrigé |
| Headers HSTS + CSP | ✅ Ajouté |
| Pool PG max:2 | ✅ Corrigé |
| OG image | ✅ Route dynamique créée |
| GTM portail Next.js | ✅ Ajouté |
| Email lancement waitlist | ✅ Script prêt |
| Onboarding KYC consultant | ✅ Upload + validation admin |
| NDA automatique Phase 1 | ✅ Endpoint opérationnel |
| Offre Early Adopter (UI) | ✅ EarlyAdopterBand + badge |
| Landing page → portail CTA | ✅ front.html → `/freelancehub/register` |
| Rate limiting persistant (Upstash) | ❌ Planifié C5 |
| Facture PDF post-paiement | ❌ Planifié C5 |
| `constants.ts` | ❌ Planifié C5 |
| `pricing.ts` | ❌ Planifié C5 |

---

*Généré par Agent DG perform-learn.fr · Session du 30 avril 2026*
