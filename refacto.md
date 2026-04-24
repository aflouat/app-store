# refacto.md — Analyse technique perform-learn.fr
*Générée automatiquement le 2026-04-25 · Base : commit 791224e*

---

## TL;DR

Le codebase affiche **une base solide** (S1-S5 corrigés cette semaine, prepared statements, auth rôle, transactions, anonymat respecté). **2 nouvelles failles critiques** ont été identifiées : le montant de réservation est accepté côté client (`bookings/route.ts`) et une notification fonds libérés cible un mauvais ID. Priorité absolue avant le lancement du 30/04.

---

## 1. Sécurité OWASP

### 🔴 CRITIQUE (nouveau)

| # | Fichier | Problème | Recommandation |
|---|---|---|---|
| C1 | `app/api/freelancehub/client/bookings/route.ts:12-20` | **Montant réservation contrôlé par le client** — `amount_ht`, `commission`, `consultant_net` sont lus du JSON client sans recalcul serveur. Un attaquant peut créer une réservation à 0,01 €. | Calculer `amount_ht` depuis `consultants.daily_rate` côté serveur. Ignorer les champs financiers envoyés par le client. |
| C2 | `app/api/freelancehub/reviews/route.ts:124` | **Notification fonds libérés → mauvais destinataire** — `createNotification(booking.consultant_id, ...)` passe l'ID table `consultants` à `user_id`. Notification orpheline. | Récupérer `c.user_id AS consultant_user_id` dans la query et utiliser cet ID. |

### 🔴 CRITIQUE (résolu)

| # | Fichier | Statut | Détail |
|---|---|---|---|
| S1 | `middleware.ts:15-63` | ✅ FIXÉ | Rate limiting Edge in-memory : 10 req/15min auth, 5 req/5min payment-intent, 20 req/min chat. *(Limitation : réinitialisé aux cold starts — passer à Upstash en C5)* |
| S2 | `app/api/freelancehub/client/bookings/[id]/pay/route.ts:54-68` | ✅ FIXÉ | Vérification `metadata.booking_id` + recalcul montant DB + guard null. |
| S3 | `app/api/freelancehub/matching/route.ts:7` | ✅ FIXÉ | Whitelist `=== 'client' \|\| === 'admin'`. |
| S4 | `app/api/freelancehub/client/slots/route.ts:29` | ✅ FIXÉ | `AND c.is_available = true` ajouté. |
| S5 | `app/api/webhooks/stripe/route.ts:28-38` | ✅ FIXÉ | Table `webhook_events(event_id UNIQUE)` + `ON CONFLICT DO NOTHING`. *(Migration 015 à appliquer sur VPS)* |

### 🟠 MAJEUR

| # | Fichier | Problème | Recommandation |
|---|---|---|---|
| S6 | `app/api/freelancehub/client/bookings/[id]/payment-intent/route.ts:72-80` | **Metadata Stripe expose le détail financier** (`amount_ht`, `tva`, `platform_commission`, `consultant_net`). Information commerciale sensible en clair chez Stripe. | Garder uniquement `booking_id` + `amount_ttc` en metadata. |
| S7 | `middleware.ts:66-73` | Exclusions par `startsWith` — un endpoint `/freelancehub/login-admin` court-circuiterait la protection | Utiliser une whitelist explicite de routes publiques (Set). |
| S8 | `app/freelancehub/register/page.tsx` | Formulaire d'inscription sans protection CSRF | Ajouter token CSRF dans le formulaire + vérifier dans `register/route.ts`. |
| S9 | `lib/freelancehub/email.ts` | `.catch(() => null)` silencieux sur 3 emails critiques (welcome, KYC validé/rejeté). Échec invisible en production. | Logger au minimum `console.error` avant le catch silencieux. |
| C3 | `middleware.ts:15-63` | Rate limiting in-memory non persistant. Un attaquant distribué ou un cold start Vercel réinitialise les compteurs. | Migrer vers Upstash Redis ou KV Vercel en C5. |

### 🟡 MINEUR

| # | Fichier | Problème | Recommandation |
|---|---|---|---|
| S10 | `app/api/freelancehub/consultant/slots/route.ts:58` | `Date.parse()` redondant après regex — accepte des formats aberrants | Garder uniquement la regex `/^\d{4}-\d{2}-\d{2}$/`. |
| S11 | `app/api/freelancehub/support/chat/public/route.ts` | Chat public sans auth — seul le rate limit middleware (20/min) protège. Risque de coût API IA si bypass. | Ajouter un challenge captcha ou token côté client + hard limit quotidienne par IP côté agent. |

---

## 2. Dette technique

### Duplications à extraire

| Priorité | Duplication | Fichiers concernés | Action |
|---|---|---|---|
| 🔴 | `computePricing()` réimplémentée 3× + montant client trusté | `BookingModal.tsx`, `matching.ts:19`, `payment-intent/route.ts:39`, `bookings/route.ts:64-66` | **C1** — calculer côté serveur dans `bookings/route.ts` depuis `daily_rate`. Unifier dans `lib/freelancehub/pricing.ts`. |
| 🟠 | Validation date/heure identique | `slots/route.ts:56`, `slots/bulk/route.ts:35` | Créer `lib/freelancehub/validators.ts` avec `isValidDate()`, `isValidTime()`. |
| 🟡 | Queries jointure booking+user+consultant | `cron/reminders:36`, `pay/route.ts:86`, `reviews/route.ts:106` | Créer `lib/freelancehub/queries.ts` : `getBookingDetails(id)`. |
| 🟡 | Logique d'autorisation rôle répétée sur 24 routes | Toutes les routes API | Helper `requireRole(...roles)(handler)` — voir C5. |

### Couplage fort

| Priorité | Problème | Fichier | Impact |
|---|---|---|---|
| 🟠 | Email envoyé directement dans route de paiement | `pay/route.ts:79-111` | Si Resend down → 500 sur paiement (actuellement catché mais silencieux). |
| 🟠 | Logique métier liée à Stripe (pas d'abstraction) | `payment-intent/route.ts`, `pay/route.ts` | Remplacement PSP = réécriture totale. |
| 🟡 | Skills sync non transactionnel | `consultant/profile/route.ts:52-66` | `DELETE` puis `INSERT` en dehors de la transaction du `UPSERT`. Crash entre les deux = perte des compétences. |

### Types TypeScript manquants

| Priorité | Problème | Fichier |
|---|---|---|
| 🟠 | Metadata Stripe non typée | `payment-intent/route.ts:72` |
| 🟠 | `query<T = unknown>()` trop permissif | `lib/freelancehub/db.ts:16,29` |
| 🟡 | Types de réponses API non unifiés (`{ error }` vs `{ message }`) | Toutes routes |

### Fichiers trop longs

| Fichier | Lignes | Action planifiée |
|---|---|---|
| `lib/freelancehub/email.ts` | 385 | Scinder `email-handlers.ts` + `email-templates.ts` (C5) |
| `components/freelancehub/client/BookingModal.tsx` | 498 | Extraire `<SlotPicker>`, `<PriceSummary>` (C6) |
| `lib/freelancehub/agents.ts` | 219 | `agents/config.ts` + `agents/prompts/*.ts` (C5) |
| `components/freelancehub/client/SearchClient.tsx` | 398 | Extraire `<SearchForm>` (C6) |

### Gestion d'erreurs incomplète

| Problème | Fichiers | Recommandation |
|---|---|---|
| Pas de rollback DB lisible — client reçoit 500 vague | `bookings/route.ts:83-90` | Logger payload + retourner 409/422 selon le cas. |
| Race condition possible sur upsert consultant | `consultant/profile/route.ts:30-45` | Ajouter `WHERE updated_at = $prev_updated_at` ou utiliser `ON CONFLICT` retournant l'ID existant. |

---

## 3. Agilité

### Tests manquants (critique avant lancement)

| Flux critique | Couverture actuelle | Priorité |
|---|---|---|
| Paiement (booking → PI → capture → fonds) | 🟡 1 test (buildPricing + computeStripeAmount) | 🟠 |
| Validation KYC admin | ❌ zéro test | 🔴 |
| Libération fonds (double review) | ❌ zéro test | 🔴 |
| Matching algorithm (4 critères) | ❌ zéro test | 🟠 |
| `computePricing()` | 🟡 testé via copie locale | 🟠 |
| Rate limiting middleware | ❌ zéro test | 🟠 |
| Webhook idempotence | ❌ zéro test | 🟠 |

Vitest est installé — setup en place. Ajouter au moins `computePricing` (depuis `matching.ts`), `findMatches` (mock DB), et un test webhook idempotence avant C5.

### Séparation des responsabilités

Route `pay/route.ts` (163 lignes) fait : validation Stripe + vérification ownership + update DB + email + notification. Créer `services/booking-service.ts` :
```typescript
confirmPayment(bookingId, paymentIntentId): Promise<Booking>
releaseEscrow(bookingId): Promise<void>
```
Routes = auth + validation input + appel service + réponse HTTP.

### Configuration dispersée

Les constantes suivantes sont éclatées dans 3+ fichiers — centraliser dans `lib/freelancehub/config.ts` :
```typescript
export const PRICING = {
  baseTva:                 0.20,
  baseCommission:          0.15,
  earlyAdopterCommission:  0.10,
  earlyAdopterCap:         20,
  defaultHourlyRate:       85,
}
```

---

## 4. Ce qui fonctionne bien ✅

- **Injection SQL** : 100% prepared statements (`$1, $2`), aucune concaténation SQL détectée
- **Auth par rôle** : vérification systématique `session.user.role` sur toutes les routes
- **Transactions DB** : `withTransaction()` utilisé sur les opérations critiques (booking création + slot lock)
- **Anonymat consultant** : `revealed_at IS NULL` respecté dans les queries matching
- **Montant Stripe côté serveur** : recalculé depuis DB, pas depuis le client (S2 fixé)
- **Validation de signature Stripe** : `stripe.webhooks.constructEvent()` en place + idempotence DB (S5 fixé)
- **Rate limiting basique** : in-memory Edge sur auth, payment, chat (S1 fixé — à renforcer en C5)
- **Headers sécurité HTTP** : `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` dans `next.config.mjs`

---

## 5. Plan d'action priorisé

### Avant lancement 30/04 (cette semaine)

1. **[C1] Fix montant client trusté** — calculer `amount_ht` depuis `consultants.daily_rate` dans `bookings/route.ts`, ignorer champs financiers client · 2h
2. **[C2] Fix notification fonds libérés** — utiliser `consultant_user_id` au lieu de `consultant_id` dans `reviews/route.ts` · 15 min
3. **[S6] Réduire metadata Stripe** — ne garder que `booking_id` + `amount_ttc` · 30 min
4. **[S10] Nettoyer validation date** — supprimer `Date.parse()` redondant · 15 min
5. **[S9] Logger erreurs email** — remplacer `.catch(() => null)` par `.catch(e => console.error)` · 30 min

### C5 Mai-Juin 2026

6. **[S1] Rate limiting persistant** — Upstash Redis ou KV Vercel sur auth + payment-intent · 3h
7. **[S8] CSRF** — token dans formulaire register + vérification route · demi-journée
8. **[validators.ts]** — centraliser validation date/heure · 1h
9. **[queries.ts]** — extraire `getBookingDetails()`, `getConsultantProfile()` · 2h
10. **[Tests Vitest]** — computePricing + findMatches + webhook idempotence · 3h
11. **[Service layer]** — `services/booking-service.ts` (confirmPayment, releaseEscrow) · 4h

### C6 Juillet+ 2026

12. **Abstraction PSP** — interface PaymentProcessor
13. **Découpage composants** — BookingModal, SearchClient (déjà planifié C6)
14. **Agents prompts** — scinder `agents.ts` en `agents/config.ts` + `agents/prompts/*.ts`
