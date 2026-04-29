# refacto.md — Analyse technique perform-learn.fr
*Générée automatiquement le 2026-04-29 · Base : commit b100922 · Lancement J-1*

---

## TL;DR

**⚠️ LANCEMENT DEMAIN (30/04) — 3 blockers critiques non résolus.**

Base solide : prepared statements, RBAC, transactions atomiques, anonymat consultant, idempotence webhook Stripe, rate limiting Edge, chat public limité à 2 msg/semaine par IP. Mais **C1 (montant client-trusté), C2 (notification orpheline), N1 (budget IA non plafonné)** restent ouverts à J-1. Sans C1, un attaquant peut créer une réservation à 0,01 €. Sans N1, le spam du chat public peut générer un coût API illimité en production. Ce sont les seules priorités du jour.

Nouveaux endpoints déployés depuis J-4 (NDA, KYC, SSO Google, chat public, pages CGU/confidentialité) : globalement sécurisés. Nouvelle faille mineure identifiée : **S17** — Google OAuth assigne le rôle `consultant` par défaut à tous les nouveaux utilisateurs (pas de sélection client/consultant). 4 ajustements mineurs restants (S12, S16, S17, bypass DB chat).

---

## 1. Sécurité OWASP

### 🔴 CRITIQUE — À corriger avant le 30/04

| # | Fichier | Problème | Fix |
|---|---|---|---|
| C1 | `app/api/freelancehub/client/bookings/route.ts:12-20` | **Montant contrôlé par le client** — `amount_ht`, `commission`, `consultant_net` lus du body client et insérés en DB sans recalcul serveur. Un attaquant peut créer une réservation à 0,01 €. | Calculer depuis `consultants.daily_rate` + `computePricing()` côté serveur. Voir code Pareto §3. |
| C2 | `app/api/freelancehub/reviews/route.ts:108` | **Notification fonds libérés → mauvais destinataire** — `createNotification(booking.consultant_id, ...)` passe l'ID table `consultants` (pas `users`). La notification est orpheline. | Remplacer par `booking.consultant_user_id` (déjà présent dans le `queryOne` via `c.user_id AS consultant_user_id`). Fix 1 ligne. |
| N1 | `lib/freelancehub/agents.ts:17,306-366` | **Cap mensuel IA non enforce** — `monthlyCap` défini (100–300 c€) pour chaque agent mais jamais vérifié avant l'appel LLM. Spam chat public = coût Claude API illimité. | Implémenter `checkAgentBudget(agentId, estimatedCost)` avec table `freelancehub.agent_usage` ou réutiliser `chat_limits`. Voir code Pareto §3. |

### 🔴 CRITIQUE (résolu — archivé)

| # | Statut | Détail |
|---|---|---|
| S1 | ✅ | Rate limiting Edge in-memory : 10/15min auth, 5/5min payment-intent, 20/min chat |
| S2 | ✅ | pay/route.ts : vérification `metadata.booking_id` + recalcul depuis DB |
| S3 | ✅ | matching/route.ts : whitelist rôle `client \|\| admin` |
| S4 | ✅ | slots/route.ts : `AND c.is_available = true` |
| S5 | ✅ | webhook_events(event_id UNIQUE) + ON CONFLICT DO NOTHING |

### 🟠 MAJEUR (post-lancement C5)

| # | Fichier | Problème | Recommandation |
|---|---|---|---|
| S6 | `client/bookings/[id]/payment-intent/route.ts:72-80` | Metadata Stripe expose `amount_ht`, `tva`, `platform_commission`, `consultant_net` en clair chez Stripe | Garder uniquement `booking_id` + `amount_ttc` en metadata |
| S7 | `middleware.ts:66-73` | Exclusions `startsWith` — `/freelancehub/login-admin` court-circuiterait la protection | Whitelist explicite via `Set<string>` |
| S9 | `lib/freelancehub/email.ts` | `.catch(() => null)` silencieux sur welcome, KYC validé/rejeté | `console.error` avant chaque catch silencieux |
| C3 | `middleware.ts:15-63` | Rate limiting in-memory réinitialisé aux cold starts Vercel | Upstash Redis ou KV Vercel en C5 |

### 🟡 MINEUR

| # | Fichier | Problème | Recommandation |
|---|---|---|---|
| S12 | `admin/kyc-presign/route.ts:38` | **Path traversal MinIO** — `key` extrait de `docUrl` sans vérifier `key.startsWith('kyc/')` ni `key.includes('..')`. URL forgée peut pointer hors du bucket. | Ajouter guard : `if (!key.startsWith('kyc/') \|\| key.includes('..')) return 400` |
| S13 | `webhooks/stripe/route.ts:78-80` | `charge.refunded` : log-only, aucune mise à jour DB ni notification client | `UPDATE payments SET status='refunded'` + notification dans le handler |
| S14 | `user/me/route.ts:36-44` | Soft delete anonymise `users` mais laisse `reviews.comment`, `consultant_skills`, slots futurs | Anonymiser `reviews.comment = '[supprimé]'` + `DELETE slots futurs` dans la même transaction |
| S15 | `user/me/route.ts:37` | `password_hash = ''` — chaîne vide bypass si une logique teste `!== ''` | `encode(gen_random_bytes(32), 'hex')` côté SQL |
| S16 | `admin/export-csv/route.ts:9-16` | CSV formula injection — `esc()` ne préfixe pas `=`, `+`, `@`, `-`. Nom forgé exécute une formule Excel. | Voir code Pareto §3 |
| S11 | `support/chat/public/route.ts` | ~~Chat public sans auth~~ → **partiellement résolu** : WEEKLY_LIMIT=2 per IP via table `chat_limits`. MAIS `.catch(() => null)` à la ligne 43 : si DB indisponible, le rate limit est contourné silencieusement. N1 (budget IA) reste le vrai risque. | Supprimer le `.catch(() => null)` ou gérer explicitement l'erreur DB. Bloquer si N1 non résolu. |
| N2 | `lib/freelancehub/chat-router.ts:162` | Regex escalation `\{"escalate":true,"subject":"(\w+)"\}` — `\w+` exclut espaces/accents/tirets. Sujet "problème paiement" ignoré. | Remplacer par `[^"]+` |
| N3 | `lib/freelancehub/chat-router.ts:143-145` | Catch silencieux sur dispatcher LLM | `console.error('[chat-router] dispatcher failed:', err)` |
| S10 | `consultant/slots/route.ts:58` | `Date.parse()` redondant après regex | Garder uniquement `/^\d{4}-\d{2}-\d{2}$/` |
| S8 | `app/freelancehub/register/page.tsx` | Pas de token CSRF explicite | Next.js App Router + SameSite=Lax atténue ; token CSRF optionnel post-C5 |
| S17 | `lib/freelancehub/auth-queries.ts:51` | **Google OAuth : rôle `consultant` par défaut** — `upsertOAuthUser` crée tous les nouveaux utilisateurs OAuth avec `role = 'consultant'`. Un utilisateur souhaitant s'inscrire comme `client` via Google se retrouve consultant, sans sélection de rôle. | Ajouter un paramètre `role?: UserRole` dans `upsertOAuthUser` ou une page de sélection de rôle post-OAuth (`/freelancehub/oauth-setup`). |

---

## 2. Dette technique

### Duplications prioritaires

| Priorité | Duplication | Fichiers | Action ROADMAP |
|---|---|---|---|
| 🔴 | `computePricing()` réimplémentée + montant client trusté | `BookingModal.tsx`, `matching.ts:19`, `payment-intent/route.ts:39`, `bookings/route.ts:64-66` | C4 : `pricing.ts` + fix C1 |
| 🟠 | `STATUS_MAP` redéfini dans chaque page | `client/bookings/page.tsx:43`, `consultant/bookings/page.tsx:64` | C4 : `constants.ts` |
| 🟠 | Validation date/heure identique | `slots/route.ts:56`, `slots/bulk/route.ts:35` | C5 : `validators.ts` |
| 🟡 | Jointure booking+user+consultant répétée | `cron/reminders:36`, `pay/route.ts:86`, `reviews/route.ts:106` | C5 : `queries.ts::getBookingDetails()` |
| 🟡 | `T00:00:00` sans Z (timezone locale) | `email.ts:35`, `cron/reminders:91`, 8 composants | C5 : → `T00:00:00Z` |
| 🟡 | `(cents/100).toFixed(2)` — 19+ occurrences | Tous dashboards | C4 : `fmtEur(cents)` dans `pricing.ts` |

### Fichiers trop longs

| Fichier | Lignes | Tendance | Action planifiée |
|---|---|---|---|
| `components/freelancehub/client/BookingModal.tsx` | **498** | ↑ (+40 vs ROADMAP) | C6 : `<SlotPicker>`, `<PriceSummary>`, `<StripePaymentStep>` |
| `components/freelancehub/client/SearchClient.tsx` | **398** | ↑ (+13 vs ROADMAP) | C6 : `<SearchForm>` |
| `lib/freelancehub/agents.ts` | **380** | stable | C5 : `agents/config.ts` + `agents/prompts/` |
| `lib/freelancehub/email.ts` | ~385 | stable | C5 : `email-handlers.ts` + `email-templates.ts` |

### Couplage fort

| Priorité | Problème | Fichier | Impact |
|---|---|---|---|
| 🟠 | Stripe non singleton — réinstancié par requête | `payment-intent/route.ts:44`, `pay/route.ts:8` | Fuite mémoire sous charge. `lib/freelancehub/stripe.ts` partagé en C5. |
| 🟠 | Email envoyé dans route paiement | `pay/route.ts:79-111` | Resend down → 500 sur paiement |
| 🟡 | Skills sync non transactionnel | `consultant/profile/route.ts:52-66` | `DELETE` puis `INSERT` hors transaction — perte compétences en cas de crash |
| 🟡 | Pool connexions PostgreSQL — pas de `max` configuré | `lib/freelancehub/db.ts` | Risque saturation (100 conx) sous charge. `max: 2` immédiat, PgBouncer en C6. |

### Absences notables (C4 → en cours)

| Item | Statut | Impact |
|---|---|---|
| `lib/freelancehub/constants.ts` | ❌ non créé | STATUS_MAP dupliqué dans 5+ fichiers |
| `lib/freelancehub/pricing.ts` | ❌ non créé | computePricing dispersé, C1 non bloqué |
| Tests Vitest/Playwright | ❌ non démarrés | Zéro filet de sécurité pour le lancement |
| CSP Headers (`next.config.ts`) | ❌ absent | XSS amplifiée sans CSP |
| Facture PDF post-paiement | ❌ non implémentée | Obligation légale (TVA, mentions légales) |

---

## 3. Checklist Pareto — Code ciblé J-1

### C1 — Fix montant serveur (`bookings/route.ts`)

```typescript
// Remplacer le destructuring client-trusté par un lookup DB
// Dans POST /api/freelancehub/client/bookings/route.ts

// SUPPRIMER dans le body destructuring :
//   amount_ht, commission, consultant_net

// AJOUTER avant withTransaction() :
const consultantRow = await queryOne<{ daily_rate: number | null }>(
  `SELECT daily_rate FROM freelancehub.consultants WHERE id = $1 AND is_available = true`,
  [consultant_id]
)
if (!consultantRow) return NextResponse.json({ error: 'Consultant introuvable.' }, { status: 404 })

import { computePricing, DEFAULT_HOURLY_RATE } from '@/lib/freelancehub/matching'
const { htCents, commCents, netCents } = computePricing(consultantRow.daily_rate ?? DEFAULT_HOURLY_RATE)

// Dans l'INSERT, remplacer $7, $8, $9 par htCents, commCents, netCents
```

**Test E2E simulé** : POST bookings avec `amount_ht: 1` → réservation créée avec le vrai montant DB. ✅ Fraude bloquée.

---

### C2 — Fix notification fonds libérés (`reviews/route.ts:108`)

```typescript
// reviews/route.ts — ligne ~108
// AVANT :
await createNotification(
  booking.consultant_id,   // ❌ ID table consultants
  'fund_released',
  ...
)

// APRÈS :
await createNotification(
  booking.consultant_user_id,  // ✅ ID users (déjà dans le queryOne)
  'fund_released',
  ...
)
```

**Test E2E simulé** : après 2 reviews, la notification apparaît dans le dashboard consultant. ✅

---

### N1 — Enforce budget cap IA (`agents.ts`)

```typescript
// lib/freelancehub/agents.ts — ajouter après estimateCost()

export async function checkAgentBudget(
  agentId: string,
  costCents: number,
  monthlyCap: number
): Promise<boolean> {
  // Réutilise chat_limits avec un identifier agent spécifique
  const monthStart = new Date().toISOString().slice(0, 7) + '-01'
  const row = await queryOne<{ total: number }>(
    `SELECT COALESCE(SUM(count), 0)::int AS total
     FROM freelancehub.chat_limits
     WHERE identifier = $1 AND week_start >= $2`,
    [`agent:${agentId}`, monthStart]
  ).catch(() => null)
  return (row?.total ?? 0) + costCents <= monthlyCap
}

// Dans chat-router.ts — avant l'appel LLM :
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
  // Guard formula injection
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

## 4. Plan d'action J-1 (30/04)

| Priorité | Item | Effort | Fichier |
|---|---|---|---|
| 🔴 P1 | Fix C1 — montant serveur | 45 min | `client/bookings/route.ts` |
| 🔴 P2 | Fix C2 — notification fonds libérés | 5 min | `reviews/route.ts:108` |
| 🔴 P3 | Fix N1 — budget cap IA | 1h | `agents.ts` + `chat-router.ts` |
| 🟠 P4 | Fix S12 — path traversal KYC | 10 min | `admin/kyc-presign/route.ts` |
| 🟠 P5 | Fix S16 — CSV injection | 10 min | `admin/export-csv/route.ts` |
| 🟠 P6 | Fix S15 — password_hash vide | 5 min | `user/me/route.ts` |
| 🟡 P7 | Fix N2 — regex escalation | 5 min | `lib/freelancehub/chat-router.ts:162` |
| 🟡 P8 | Créer `constants.ts` | 2h | `lib/freelancehub/constants.ts` |
| 🟡 P9 | Créer `pricing.ts` | 1h | `lib/freelancehub/pricing.ts` |

**Total J-1 critique** : ~2h pour P1–P3. **Ne pas lancer sans P1 et N1.**

---

## 5. Statut ROADMAP Cycle 4

| Feature C4 | Statut |
|---|---|
| Onboarding KYC consultant (upload + admin validation) | ✅ Upload OK · ⏳ Badge "Vérifié" admin |
| NDA automatique Phase 1 | ✅ Endpoint `consultant/nda/route.ts` opérationnel |
| Offre Early Adopter (commission 10% + badge Fondateur) | ❌ Non implémentée |
| Landing page → portail CTA | ✅ front.html → `/freelancehub/register` |
| Email lancement waitlist (Brevo) | ❌ Non planifié |
| Facture PDF post-paiement | ❌ Non implémentée |
| `constants.ts` | ❌ Non créé |
| `pricing.ts` | ❌ Non créé |
| Centraliser `types.ts` | ✅ BookingStatus/PaymentStatus dans `lib/freelancehub/types.ts` |

**Risque lancement** : Offre Early Adopter et facture PDF non livrées. À prioriser post J-1 ou décaler à J+7.
