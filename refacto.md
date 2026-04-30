# refacto.md — Analyse technique perform-learn.fr
*Générée automatiquement le 2026-04-30 · Base : commit 7349c6c · **JOUR DE LANCEMENT***

---

## TL;DR

**🚀 LANCEMENT EFFECTIF 30/04 — 3 blockers critiques toujours ouverts en production.**

La plateforme est live depuis ce matin. Base solide : prepared statements, RBAC, transactions atomiques, anonymat consultant, idempotence webhook Stripe, rate limiting Edge. Mais **C1 (montant client-trusté), C2 (notification orpheline), N1 (budget IA non plafonné)** ont été confirmés ouverts par lecture directe du code source. En production, C1 expose un vecteur de fraude actif (réservation à 0,01 €). C2 prive le consultant de la notification de libération de fonds. N1 expose le budget API sans plafond effectif.

Nouveautés commit `7349c6c` : EA booster (offre Early Adopter), suppression page pre-launch, SEO. Le profil de risque global est inchangé sur les items critiques.

**Priorité absolue aujourd'hui** : C1 et C2 (< 1h de fix cumulé). N1 dans les 24h suivantes.

---

## 1. Sécurité OWASP

### 🔴 CRITIQUE — Production live — À corriger dans les 24h

| # | Fichier | Ligne | Problème | Statut |
|---|---|---|---|---|
| C1 | `app/api/freelancehub/client/bookings/route.ts` | 17-19, 64-66 | **Montant contrôlé par le client** — `amount_ht`, `commission`, `consultant_net` lus du body JSON client et insérés directement en DB sans recalcul serveur. Confirmé par lecture code : `amount_ht` passé en `$7` de l'INSERT. Fraude 0,01 € possible en production. | 🔴 OUVERT |
| C2 | `app/api/freelancehub/reviews/route.ts` | 124 | **Notification fonds libérés → mauvais destinataire** — `createNotification(booking.consultant_id, ...)` passe l'UUID de la table `consultants`, pas celui de `users`. Confirmé par lecture code : `booking.consultant_user_id` est disponible dans le même `queryOne` (`c.user_id AS consultant_user_id`) mais non utilisé. Notification orpheline en production. | 🔴 OUVERT |
| N1 | `lib/freelancehub/agents.ts` | 17 (monthlyCap) + chat-router | **Cap mensuel IA non enforce** — `monthlyCap` défini (100–300 c€) pour chaque agent mais aucun `checkAgentBudget()` appelé avant les appels LLM. Spam du chat public = coût Claude API illimité. Confirmé : pas de vérification de consommation avant dispatch. | 🔴 OUVERT |

### 🔴 CRITIQUE (résolu — archivé)

| # | Statut | Détail |
|---|---|---|
| S1 | ✅ | Rate limiting Edge in-memory : 10/15min auth, 5/5min payment-intent, 20/min chat |
| S2 | ✅ | `pay/route.ts` : vérification `metadata.booking_id` + recalcul TTC depuis DB |
| S3 | ✅ | `matching/route.ts` : whitelist rôle `client \|\| admin` |
| S4 | ✅ | `slots/route.ts` : `AND c.is_available = true` |
| S5 | ✅ | `webhook_events(event_id UNIQUE)` + `ON CONFLICT DO NOTHING` |

### 🟠 MAJEUR (post-lancement — Cycle 5)

| # | Fichier | Problème | Recommandation |
|---|---|---|---|
| S6 | `client/bookings/[id]/payment-intent/route.ts:72-80` | Metadata Stripe expose `amount_ht`, `tva`, `platform_commission`, `consultant_net` en clair chez Stripe | Garder uniquement `booking_id` + `amount_ttc` en metadata |
| S7 | `middleware.ts:66-73` | Exclusions `startsWith` — `/freelancehub/login-admin` court-circuiterait la protection | Whitelist explicite via `Set<string>` |
| S9 | `lib/freelancehub/email.ts` | `.catch(() => null)` silencieux sur welcome, KYC validé/rejeté | `console.error` avant chaque catch silencieux |
| C3 | `middleware.ts:15-63` | Rate limiting in-memory réinitialisé aux cold starts Vercel | Upstash Redis ou KV Vercel en C5 |

### 🟡 MINEUR

| # | Fichier | Problème | Recommandation |
|---|---|---|---|
| S12 | `admin/kyc-presign/route.ts:38` | **Path traversal MinIO** — `key` extrait de `docUrl` sans vérifier `key.startsWith('kyc/')` ni `key.includes('..')`. URL forgée peut pointer hors du bucket. | Guard : `if (!key.startsWith('kyc/') \|\| key.includes('..')) return 400` |
| S13 | `webhooks/stripe/route.ts:78-80` | `charge.refunded` : log-only, aucune mise à jour DB ni notification client | `UPDATE payments SET status='refunded'` + notification dans le handler |
| S14 | `user/me/route.ts:36-44` | Soft delete anonymise `users` mais laisse `reviews.comment`, `consultant_skills`, slots futurs | Anonymiser `reviews.comment = '[supprimé]'` + `DELETE slots futurs` dans la même transaction |
| S15 | `user/me/route.ts:37` | `password_hash = ''` — chaîne vide bypass si logique teste `!== ''` | `encode(gen_random_bytes(32), 'hex')` côté SQL |
| S16 | `admin/export-csv/route.ts:9-16` | CSV formula injection — `esc()` ne préfixe pas `=`, `+`, `@`, `-`. Nom forgé exécute formule Excel. | Voir code Pareto §3 |
| N2 | `lib/freelancehub/chat-router.ts:162` | Regex escalation `\{"escalate":true,"subject":"(\w+)"\}` — `\w+` exclut espaces/accents/tirets. Sujet "problème paiement" ignoré. | Remplacer par `[^"]+` |
| N3 | `lib/freelancehub/chat-router.ts:143-145` | Catch silencieux sur dispatcher LLM | `console.error('[chat-router] dispatcher failed:', err)` |
| S10 | `consultant/slots/route.ts:58` | `Date.parse()` redondant après regex | Garder uniquement `/^\d{4}-\d{2}-\d{2}$/` |
| S8 | `app/freelancehub/register/page.tsx` | Pas de token CSRF explicite | Next.js App Router + SameSite=Lax atténue ; token CSRF optionnel post-C5 |

---

## 2. Dette technique

### Duplications prioritaires

| Priorité | Duplication | Fichiers | Action ROADMAP |
|---|---|---|---|
| 🔴 | `computePricing()` réimplémentée + montant client trusté | `BookingModal.tsx`, `matching.ts:19`, `payment-intent/route.ts:39`, `bookings/route.ts:64-66` | C5 : `pricing.ts` + fix C1 bloquant |
| 🟠 | `STATUS_MAP` redéfini dans chaque page | `client/bookings/page.tsx:43`, `consultant/bookings/page.tsx:64` | C5 : `constants.ts` |
| 🟠 | Validation date/heure identique | `slots/route.ts:56`, `slots/bulk/route.ts:35` | C5 : `validators.ts` |
| 🟡 | Jointure booking+user+consultant répétée | `cron/reminders:36`, `pay/route.ts:86`, `reviews/route.ts:106` | C5 : `queries.ts::getBookingDetails()` |
| 🟡 | `T00:00:00` sans Z (timezone locale) | `email.ts:35`, `cron/reminders:91`, 8 composants | C5 : → `T00:00:00Z` |
| 🟡 | `(cents/100).toFixed(2)` — 19+ occurrences | Tous dashboards | C5 : `fmtEur(cents)` dans `pricing.ts` |

### Fichiers trop longs

| Fichier | Lignes | Tendance | Action planifiée |
|---|---|---|---|
| `components/freelancehub/client/BookingModal.tsx` | **498** | ↑ | C6 : `<SlotPicker>`, `<PriceSummary>`, `<StripePaymentStep>` |
| `components/freelancehub/client/SearchClient.tsx` | **398** | ↑ | C6 : `<SearchForm>` |
| `lib/freelancehub/agents.ts` | **380+** | stable | C5 : `agents/config.ts` + `agents/prompts/` |
| `lib/freelancehub/email.ts` | ~385 | stable | C5 : `email-handlers.ts` + `email-templates.ts` |

### Couplage fort

| Priorité | Problème | Fichier | Impact |
|---|---|---|---|
| 🟠 | Stripe non singleton — réinstancié par requête | `payment-intent/route.ts:44`, `pay/route.ts:8` | Fuite mémoire sous charge. `lib/freelancehub/stripe.ts` en C5. |
| 🟠 | Email envoyé dans route paiement | `pay/route.ts:79-111` | Resend down → 500 sur paiement |
| 🟡 | Skills sync non transactionnel | `consultant/profile/route.ts:52-66` | `DELETE` puis `INSERT` hors transaction — perte compétences en cas de crash |
| 🟡 | Pool connexions PostgreSQL — `max: 10` | `lib/freelancehub/db.ts` | Risque saturation sous charge. `max: 2` immédiat, PgBouncer en C6. |

### Absences notables (post-lancement)

| Item | Statut | Impact |
|---|---|---|
| `lib/freelancehub/constants.ts` | ❌ non créé | STATUS_MAP dupliqué dans 5+ fichiers |
| `lib/freelancehub/pricing.ts` | ❌ non créé | computePricing dispersé, C1 non bloqué |
| Tests Vitest/Playwright | ❌ non démarrés | Zéro filet de sécurité en production |
| CSP Headers (`next.config.ts`) | ❌ absent | XSS amplifiée sans Content-Security-Policy |
| Facture PDF post-paiement | ❌ non implémentée | Obligation légale (TVA, mentions légales) |

---

## 3. Checklist Pareto — Code ciblé post-lancement J+0

### C1 — Fix montant serveur (`bookings/route.ts`) — **URGENT**

```typescript
// Remplacer le destructuring client-trusté par un lookup DB
// Dans POST /api/freelancehub/client/bookings/route.ts

// SUPPRIMER dans le body destructuring :
//   amount_ht, commission, consultant_net

// AJOUTER avant withTransaction() :
const consultantRow = await queryOne<{ daily_rate: number | null; user_id: string }>(
  `SELECT c.daily_rate, c.user_id
   FROM freelancehub.consultants c
   WHERE c.id = $1 AND c.is_available = true`,
  [consultant_id]
)
if (!consultantRow) return NextResponse.json({ error: 'Consultant introuvable.' }, { status: 404 })

import { computePricing } from '@/lib/freelancehub/matching'
const { htCents, commCents, netCents } = computePricing(consultantRow.daily_rate ?? 80)

// Dans l'INSERT, remplacer $7, $8, $9 par htCents, commCents, netCents
```

**Test E2E simulé** : POST bookings avec `amount_ht: 1` → réservation créée avec le vrai montant DB. ✅ Fraude 0,01 € bloquée.

---

### C2 — Fix notification fonds libérés (`reviews/route.ts:124`) — **URGENT**

```typescript
// reviews/route.ts — ligne 124
// AVANT :
await createNotification(
  booking.consultant_id,   // ❌ UUID table consultants (pas users)
  'fund_released',
  ...
)

// APRÈS :
await createNotification(
  booking.consultant_user_id,  // ✅ c.user_id AS consultant_user_id (déjà dans le queryOne l.25)
  'fund_released',
  ...
)
```

**Test E2E simulé** : après 2 reviews, la notification apparaît dans le dashboard consultant. ✅

---

### N1 — Enforce budget cap IA (`agents.ts` + `chat-router.ts`)

```typescript
// lib/freelancehub/agents.ts — ajouter la fonction suivante

export async function checkAgentBudget(
  agentId: string,
  costCents: number,
  monthlyCap: number
): Promise<boolean> {
  const monthStart = new Date().toISOString().slice(0, 7) + '-01'
  const row = await queryOne<{ total: number }>(
    `SELECT COALESCE(SUM(count), 0)::int AS total
     FROM freelancehub.chat_limits
     WHERE identifier = $1 AND week_start >= $2`,
    [`agent:${agentId}`, monthStart]
  ).catch(() => null)
  return (row?.total ?? 0) + costCents <= monthlyCap
}

// Dans lib/freelancehub/chat-router.ts — avant l'appel LLM :
const agent = AGENTS[agentId]
const estimatedCost = estimateCost(agent, messages.length)
const budgetOk = await checkAgentBudget(agentId, estimatedCost, agent.monthlyCap)
if (!budgetOk) {
  return { agentId, content: 'Service temporairement indisponible.', escalate: false, subject: '', costCents: 0 }
}
```

**Test simulé** : après dépassement du cap mensuel, le chat retourne le fallback statique sans appel API. ✅

---

### S12 — Guard path traversal (`kyc-presign/route.ts`)

```typescript
// Après : const key = docUrl.slice(keyStart + bucketPrefix.length)
// AJOUTER :
if (!key.startsWith('kyc/') || key.includes('..') || key.includes('%2e')) {
  return NextResponse.json({ error: 'URL de document invalide.' }, { status: 400 })
}
```

---

### S16 — CSV formula injection (`export-csv/route.ts`)

```typescript
function esc(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return ''
  const s = String(v)
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s
  if (safe.includes(',') || safe.includes('"') || safe.includes('\n')) {
    return `"${safe.replace(/"/g, '""')}"`
  }
  return safe
}
```

---

### S15 — password_hash sécurisé (`user/me/route.ts`)

```sql
-- Remplacer password_hash = '' par :
password_hash = encode(gen_random_bytes(32), 'hex')
```

---

## 4. Plan d'action post-lancement J+0 → J+7

| Priorité | Item | Effort | Fichier | Délai |
|---|---|---|---|---|
| 🔴 P1 | Fix C1 — montant serveur | 45 min | `client/bookings/route.ts` | **Aujourd'hui** |
| 🔴 P2 | Fix C2 — notification fonds libérés | 5 min | `reviews/route.ts:124` | **Aujourd'hui** |
| 🔴 P3 | Fix N1 — budget cap IA | 1h | `agents.ts` + `chat-router.ts` | **J+1** |
| 🟠 P4 | Fix S12 — path traversal KYC | 10 min | `admin/kyc-presign/route.ts` | J+3 |
| 🟠 P5 | Fix S16 — CSV injection | 10 min | `admin/export-csv/route.ts` | J+3 |
| 🟠 P6 | Fix S15 — password_hash vide | 5 min | `user/me/route.ts` | J+3 |
| 🟡 P7 | Fix N2 — regex escalation chat | 5 min | `lib/freelancehub/chat-router.ts:162` | J+7 |
| 🟡 P8 | Créer `constants.ts` | 2h | `lib/freelancehub/constants.ts` | C5 |
| 🟡 P9 | Créer `pricing.ts` | 1h | `lib/freelancehub/pricing.ts` | C5 |

**Impact risque réel** : P1 (fraude financière directe) > P3 (coût API incontrôlé) > P2 (UX consultant cassé) > reste.

---

## 5. Statut Cycle 4 (Bilan lancement 30/04)

| Feature C4 | Statut |
|---|---|
| Onboarding KYC consultant (upload + admin validation) | ✅ Upload MinIO · ✅ Badge "Vérifié" admin |
| NDA automatique Phase 1 | ✅ Endpoint `consultant/nda/route.ts` opérationnel |
| Offre Early Adopter (commission 10% + badge Fondateur) | ✅ EA booster livré (commit 7349c6c) |
| Landing page → portail CTA | ✅ `front.html` → `/freelancehub/register` |
| SSO Google | ✅ NextAuth v5 + Google OAuth (migration 017) |
| Email lancement waitlist (Brevo) | ❌ Non livré |
| Facture PDF post-paiement | ❌ Non livré |
| `constants.ts` | ❌ Non créé |
| `pricing.ts` | ❌ Non créé |
| Fix C1 (montant serveur) | 🔴 Non livré — **vecteur de fraude actif** |
| Fix C2 (notification fonds) | 🔴 Non livré — **notification orpheline** |
| Fix N1 (budget cap IA) | 🔴 Non livré — **coût API illimité** |

**Bilan** : Fonctionnalités métier livrées à ~75%. Trois items critiques de sécurité reportés au-delà du lancement. À corriger dans les 24h suivant la mise en production.
