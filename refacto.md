# refacto.md — Analyse quotidienne · perform-learn.fr

> **Date** : 2026-05-02 · **Version codebase** : v1.3.0
> **Scope** : Sécurité OWASP, dette technique, tests/agilité
> **Méthode** : Exploration statique complète de `portal/` (app/, lib/, __tests__/, package.json, auth.ts, middleware.ts)

---

## Résumé exécutif

| Catégorie | Critique | Haute | Moyenne | Faible |
|---|---|---|---|---|
| Sécurité | 0 | 3 | 4 | 2 |
| Dette technique | 0 | 2 | 4 | 4 |
| Tests | 0 | 3 | 1 | 0 |

**Points forts** : Parameterized queries (0 injection SQL) · RBAC middleware strict · Vérification ownership · Soft-delete RGPD · Séquestre Stripe intégré.

**Risques immédiats** : CI bloqué (package-lock.json absent) · Timing attack CRON · Path traversal KYC · XSS notes KYC (déjà dans ROADMAP SEC-03/06/08 — non encore implémentés).

---

## 1. Sécurité OWASP

### S-01 · Timing attack CRON_SECRET — HAUTE
**Fichiers** : `app/api/freelancehub/cron/reminders/route.ts:30`, `app/api/govern/tasks/notify/route.ts`, `app/api/govern/smoke-test/route.ts`
**ROADMAP** : SEC-03 `business_value: 75` · Déjà planifié
```typescript
// ACTUEL — vulnérable
if (secret !== process.env.CRON_SECRET) { ... }
// FIX
if (!crypto.timingSafeEqual(Buffer.from(bearer ?? ''), Buffer.from('Bearer ' + secret))) { ... }
```

### S-02 · Path traversal KYC double-encodage — HAUTE
**Fichier** : `app/api/freelancehub/admin/kyc-presign/route.ts:34-41`
**ROADMAP** : SEC-06 `business_value: 60` · Déjà planifié
```typescript
// FIX — regex après normalisation
if (!/^kyc\/[a-zA-Z0-9_\-]+\/[a-zA-Z0-9_\-\.]+$/.test(key)) return 400
```

### S-03 · XSS stocké notes KYC — HAUTE
**Fichier** : `app/api/freelancehub/admin/consultants/[id]/kyc/route.ts:81`
**ROADMAP** : SEC-08 `business_value: 45` · Déjà planifié (valeur sous-estimée — vecteur email réel)
```typescript
// FIX — encoder avant interpolation dans email
`Motif : ${notes.trim().replace(/[<>"'&]/g, c => `&#${c.charCodeAt(0)};`)}`
```

### S-04 · Race condition Early Adopter (badge 10% commission) — MOYENNE
**Fichier** : `app/api/freelancehub/admin/consultants/[id]/kyc/route.ts:45-51`
**ROADMAP** : SEC-05 `business_value: 60` · Déjà planifié (sous-requête atomique SQL)

### S-05 · Exposition metadata Stripe (marges visibles) — MOYENNE
**Fichier** : `app/api/freelancehub/client/bookings/[id]/payment-intent/route.ts:72-81`
**ROADMAP** : SEC-04 `business_value: 65` · Déjà planifié
8 champs dont `platform_commission`, `consultant_net` → garder uniquement `{ booking_id, amount_ttc }`.

### S-06 · Race condition budget cap chat (non-atomique) — MOYENNE
**Fichier** : `lib/freelancehub/chat-router.ts:162-189`
**ROADMAP** : SEC-07 `business_value: 55` · Déjà planifié (INSERT…ON CONFLICT atomique)

### S-07 · CSRF — validation Origin absente sur mutations — MOYENNE
**Fichier** : `middleware.ts` / routes PATCH/POST sensibles
**ROADMAP** : **NOUVEAU** — voir items ajoutés §5
NextAuth v5 utilise SameSite cookies (protection partielle). Les API Routes ne vérifient pas l'en-tête `Origin`. Vecteur : formulaire cross-site POST sur routes consultant sans token CSRF explicite.

### S-08 · Type casting unsafe `parseInt(COUNT(*))` — FAIBLE
**Fichier** : `app/api/freelancehub/admin/consultants/[id]/kyc/route.ts:50`
PostgreSQL retourne `COUNT(*)` en string → `parseInt(countRow?.cnt ?? '0', 10)` fonctionne mais est fragile. Utiliser `CAST(COUNT(*) AS INTEGER)` côté SQL.

### S-09 · Rate limit chat en mémoire Edge — FAIBLE
**Fichier** : `app/api/freelancehub/support/chat/public/route.ts`
Rate limit en mémoire → reset à chaque cold start Vercel. Couvert partiellement par SEC-02 (Redis Upstash). Priorité faible car route publique limitée à 2 msg/semaine.

---

## 2. Dette technique

### D-01 · Absence totale de `package-lock.json` — HAUTE → CI BLOQUÉ
**Fichier** : `portal/` (racine)
**ROADMAP** : CI-01 `business_value: 95` · **NOUVEAU**
`npm ci` exige `package-lock.json`. Le fichier est absent du repo → CI `TypeScript + Vitest + Build` échoue en 9s sur toutes les PRs. Fichier généré lors de cette analyse (commit inclus).

### D-02 · Types `any` non supervisés — HAUTE
**Fichiers** : `lib/freelancehub/db.ts`, `lib/freelancehub/agent-client.ts:86` + 23 autres occurrences
```typescript
export async function query<T = unknown>(...): Promise<T[]> {
  return result.rows as T[]  // cast non validé, T inconnu à l'exécution
}
```
Recommandation : valider les résultats DB avec `zod` pour les routes critiques (booking, payment).

### D-03 · Duplication `computePricing()` / calculs inline — HAUTE
**Fichiers** : `lib/freelancehub/matching.ts:20`, `app/api/.../payment-intent/route.ts:39-43`, `__tests__/payment.test.ts:4-19`
**ROADMAP** : TD-03 `business_value: 65` · Déjà planifié
41 conversions `cents/100` inline sans utilitaire partagé — divergence tarifaire possible.

### D-04 · Stripe réinstancié par requête — MOYENNE
**Fichier** : `app/api/freelancehub/client/bookings/[id]/payment-intent/route.ts:50`
**ROADMAP** : TD-08 `business_value: 60` · Déjà planifié (singleton `lib/freelancehub/stripe.ts`)

### D-05 · `email.ts` monolithique — MOYENNE
**Fichier** : `lib/freelancehub/email.ts` (474 lignes)
Mélange logique transactionnelle + templates HTML. Extraction templates → `lib/freelancehub/email-templates/` recommandée.

### D-06 · Constantes magiques dupliquées (6+ fichiers) — MOYENNE
`BOOKING_STATUS_MAP`, taux commission, `EARLY_ADOPTER_LIMIT=20`.
**ROADMAP** : TD-01 `business_value: 70` · Déjà planifié

### D-07 · `@types/node` manquant — MOYENNE
**Fichier** : `package.json`
`process.env`, `crypto`, `Buffer` utilisés dans de nombreuses routes → TypeScript ne les trouve pas sans `@types/node`. Cause secondaire des erreurs CI.

### D-08 · Observabilité absente — MOYENNE
Aucun error tracking (Sentry, Datadog). `console.error` non structuré. Zero correlation-id sur les requêtes.
**ROADMAP** : D-11 `business_value: 75` · **NOUVEAU**

### D-09 · NextAuth `^5.0.0-beta.30` non épinglé — FAIBLE
**ROADMAP** : TD-02 `business_value: 70` · Déjà planifié

### D-10 · Timezone `T00:00:00` sans `Z` — FAIBLE
**ROADMAP** : TD-04 `business_value: 65` · Déjà planifié

---

## 3. Tests / Agilité

### T-01 · CI bloqué — package-lock.json absent
Voir D-01. Bloquant pour toute PR.

### T-02 · Couverture routes critiques insuffisante — HAUTE
Routes sans aucun test unitaire ni intégration :
- ❌ `app/api/freelancehub/admin/consultants/[id]/kyc/route.ts` (validation KYC, Early Adopter)
- ❌ `app/api/webhooks/stripe/route.ts` (logique paiement principale)
- ❌ `app/api/freelancehub/cron/reminders/route.ts` (emails, CRON_SECRET)
- ❌ `app/api/freelancehub/reviews/route.ts` (libération séquestre)
- ❌ `app/api/freelancehub/support/chat/public/route.ts` (rate limit, budget cap)

**ROADMAP** : T-01 `business_value: 80` · **NOUVEAU**

### T-03 · RG-07 à RG-14 sans tests — HAUTE
Couverture actuelle :
| RG | Couvert | Fichier test |
|---|---|---|
| RG-01 (Anonymat) | Partiel | `auth.spec.ts` |
| RG-02 (Tarification) | ✅ | `pricing.test.ts` |
| RG-03 (Commission) | ✅ | `pricing.test.ts` |
| RG-04 (Séquestre) | ❌ | — |
| RG-05 (RBAC) | ✅ | `rbac.test.ts` |
| RG-06 (Matching) | ✅ | `matching.test.ts` |
| RG-07 à RG-14 | ❌ | — |

### T-04 · E2E Playwright exécution non vérifiée — MOYENNE
Specs présentes (`auth.spec.ts`, `booking.spec.ts`, `consultant.spec.ts`) mais pas d'exécution CI sur PR (uniquement sur push main). Risque de drift silencieux.

---

## 4. Items déjà dans ROADMAP — statut de couverture

| ID ROADMAP | Finding | Statut |
|---|---|---|
| SEC-01 | Transaction isolation payment | Planifié · business_value: 95 |
| SEC-02 | Rate limiting Redis Upstash | Planifié · business_value: 80 |
| SEC-03 | Timing-safe CRON_SECRET | Planifié · business_value: 75 |
| SEC-04 | Métadata Stripe réduite | Planifié · business_value: 65 |
| SEC-05 | Race condition Early Adopter | Planifié · business_value: 60 |
| SEC-06 | Path traversal KYC | Planifié · business_value: 60 |
| SEC-07 | Budget cap chat atomique | Planifié · business_value: 55 |
| SEC-08 | XSS notes KYC | Planifié · business_value: 45 ⚠️ sous-estimé |
| TD-01 | constants.ts | Planifié · business_value: 70 |
| TD-02 | NextAuth épinglé | Planifié · business_value: 70 |
| TD-03 | pricing.ts centralisé | Planifié · business_value: 65 |
| TD-04 | Timezone T00:00:00Z | Planifié · business_value: 65 |
| TD-06 | Logger erreurs | Planifié · business_value: 60 |
| TD-08 | Stripe singleton | Planifié · business_value: 60 |
| TD-09 | validators.ts | Planifié · business_value: 55 |

---

## 5. Nouveaux items ajoutés à ROADMAP.md

| ID | Item | business_value | Justification |
|---|---|---|---|
| CI-01 | Committer `package-lock.json` | 95 | CI bloqué sur toutes les PRs |
| T-01 | Tests routes critiques manquantes (KYC, Stripe webhook, cron) | 80 | Couverture < 40% sur les chemins financiers |
| D-11 | Error tracking Sentry (observabilité prod) | 75 | Zéro visibilité sur les erreurs production actuelles |

---

## 6. Recommandations prioritaires

**Semaine S (bloquant CI)**
1. CI-01 : Committer `package-lock.json` + `@types/node` dans devDependencies

**Semaine 1 (financier / sécurité)**
2. SEC-03 : timing-safe CRON (30 min)
3. SEC-06 : path traversal KYC (1h)
4. SEC-08 : XSS notes KYC — `business_value` à revoir à 70 (vecteur email réel)

**Semaine 2 (qualité)**
5. TD-01 : constants.ts
6. TD-03 : pricing.ts centralisé
7. T-01 : Tests routes critiques

**Semaine 3+ (observabilité)**
8. D-11 : Sentry
9. SEC-01 : Transactions atomiques paiement
