# refacto.md — Analyse technique perform-learn.fr
*Générée automatiquement le 2026-04-23 · Base : commit a1e1781*

---

## TL;DR

Le codebase affiche **une base solide** (prepared statements systématiques, transactions DB, auth par rôle sur 24+ routes) mais accumule **5 failles critiques** et une dette technique grandissante. Priorité absolue : rate limiting + idempotence Stripe + IDOR slot avant le lancement public du 30/04.

---

## 1. Sécurité OWASP

### 🔴 CRITIQUE

| # | Fichier | Problème | Recommandation |
|---|---|---|---|
| S1 | Toutes les routes API | **Aucun rate limiting** — brute-force registration, payment DoS possible | Middleware Vercel ou Upstash : 5 req/IP/h sur `auth/*`, 3 req/booking/min sur `payment-intent` |
| S2 | `app/api/freelancehub/client/bookings/[id]/pay/route.ts:41` | **Stripe PI non vérifié** — un PI d'un autre client peut être soumis, montant non re-validé | Re-calculer `amount` depuis DB, vérifier `paymentIntent.metadata.booking_id === bookingId` |
| S3 | `app/api/freelancehub/matching/route.ts:6-9` | **IDOR matching** — filtre `!== 'consultant'` insuffisant, un utilisateur sans rôle valide accède | Changer en `session.user.role === 'client' \|\| === 'admin'` (whitelist) |
| S4 | `app/api/freelancehub/client/slots/route.ts:14` | **IDOR slots** — `consultant_id` arbitraire, crénaux de consultants non publics accessibles | Ajouter `AND c.is_available = true` dans la query |
| S5 | `app/api/webhooks/stripe/route.ts` | **Rejeux webhook** — signature validée ✓ mais pas d'idempotence (event_id non stocké) | Table `webhook_events(stripe_event_id UNIQUE, processed_at)` — ignorer si déjà traité |

### 🟠 MAJEUR

| # | Fichier | Problème | Recommandation |
|---|---|---|---|
| S6 | `app/api/freelancehub/client/bookings/[id]/payment-intent/route.ts:72` | Montants HT/commission exposés en clair dans `paymentIntent.metadata` | Garder uniquement `booking_id` + `amount_ttc` en metadata, tout le reste en DB |
| S7 | `middleware.ts:19-26` | Exclusions par `startsWith` — un futur endpoint `/freelancehub/login-admin` court-circuiterait la protection | Utiliser une whitelist explicite de routes publiques |
| S8 | `app/freelancehub/register/page.tsx` | Formulaires sans protection CSRF | Ajouter header custom `X-Requested-With` vérifié côté middleware, ou SameSite=Strict |
| S9 | `lib/freelancehub/consultant/kyc/route.ts:94` | Log expose chemin MinIO + consultant ID en production | Logger uniquement statut et type, jamais chemins ou IDs d'accès |

### 🟡 MINEUR

| # | Fichier | Problème | Recommandation |
|---|---|---|---|
| S10 | `app/api/freelancehub/consultant/slots/route.ts:56-62` | Regex date + `Date.parse()` redondant — accepte formats aberrants | Garder uniquement `/^\d{4}-\d{2}-\d{2}$/` |
| S11 | `app/api/freelancehub/client/bookings/[id]/pay/route.ts:59` | Identité révélée avant acceptation consultant | Révéler seulement après premier échange ou confirmation explicite |

---

## 2. Dette technique

### Duplications à extraire

| Priorité | Duplication | Fichiers concernés | Action |
|---|---|---|---|
| 🟠 | `computePricing()` réimplémentée 3× | `BookingModal.tsx:21`, `matching.ts:19`, `payment-intent/route.ts:39` | Déjà planifié → `lib/freelancehub/pricing.ts` (C4) |
| 🟠 | Validation date/heure identique | `slots/route.ts:56`, `slots/bulk/route.ts:35` | Créer `lib/freelancehub/validators.ts` avec `isValidDate()`, `isValidTime()` |
| 🟡 | Queries jointure booking+user+consultant | `cron/reminders:36`, `pay/route.ts:86` | Créer `lib/freelancehub/queries.ts` : `getBookingDetails(id)` |
| 🟡 | Logique d'autorisation rôle répétée sur 24 routes | Toutes les routes API | Helper `requireRole(...roles)(handler)` — voir C5 |

### Couplage fort

| Priorité | Problème | Fichier | Impact |
|---|---|---|---|
| 🟠 | Email envoyé directement dans route de paiement | `pay/route.ts:79-111` | Si Resend down → 500 sur paiement |
| 🟠 | Logique métier liée à Stripe (pas d'abstraction) | `payment-intent/route.ts`, `pay/route.ts` | Remplacement PSP = réécriture totale |
| 🟡 | `.catch(() => null)` silencieux sur email/notification | 5 routes | Erreurs invisibles en production |

### Types TypeScript manquants

| Priorité | Problème | Fichier |
|---|---|---|
| 🟠 | Metadata Stripe non typée | `payment-intent/route.ts:72` |
| 🟠 | `query<T = unknown>()` trop permissif | `lib/freelancehub/db.ts:17,29` |
| 🟡 | Types de réponses API non unifiés (`{ error }` vs `{ message }`) | Toutes routes |

### Fichiers trop longs

| Fichier | Lignes | Action planifiée |
|---|---|---|
| `lib/freelancehub/email.ts` | 385 | Scinder `email-handlers.ts` + `email-templates.ts` |
| `components/freelancehub/client/BookingModal.tsx` | 498 | Extraire `<SlotPicker>`, `<PriceSummary>` (C6) |
| `lib/freelancehub/agents.ts` | 219 | `agents/config.ts` + `agents/prompts/*.ts` |

### Gestion d'erreurs incomplète

| Problème | Fichiers | Recommandation |
|---|---|---|
| Pas de rollback DB lisible — client reçoit 500 vague | `bookings/route.ts:27-79` | Logger payload + retourner 409/422 selon le cas |
| Race condition possible sur upsert consultant | `consultant/profile/route.ts:31-43` | Ajouter `WHERE updated_at = $prev_updated_at` |

---

## 3. Agilité

### Tests manquants (critique avant lancement)

| Flux critique | Couverture actuelle | Priorité |
|---|---|---|
| Paiement (booking → PI → capture → fonds) | ❌ zéro test | 🔴 |
| Validation KYC admin | ❌ zéro test | 🔴 |
| Libération fonds (double review) | ❌ zéro test | 🔴 |
| Matching algorithm (4 critères) | ❌ zéro test | 🟠 |
| `computePricing()` | ❌ zéro test | 🟠 |

Vitest est déjà installé — setup en place. Ajouter au moins les tests unitaires `computePricing` et `findMatches` avant C5.

### Séparation des responsabilités

Route `pay/route.ts` (152 lignes) fait : validation Stripe + vérification ownership + update DB + email + notification. Créer `services/booking-service.ts` :
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
- **Transactions DB** : `withTransaction()` utilisé sur les opérations critiques
- **Anonymat consultant** : `revealed_at IS NULL` respecté dans les queries matching
- **Montant Stripe côté serveur** : recalculé depuis DB, pas depuis le client
- **Validation de signature Stripe** : `stripe.webhooks.constructEvent()` en place

---

## 5. Plan d'action priorisé

### Avant lancement 30/04 (cette semaine)

1. **[S3] Fix IDOR matching** — whitelist rôle (`=== 'client' || === 'admin'`) · 30 min
2. **[S4] Fix IDOR slots** — ajouter `AND c.is_available = true` · 30 min
3. **[S2] Vérifier montant PI** — recalcul depuis DB avant `capture()` · 2h
4. **[S5] Idempotence webhook** — table `webhook_events` + unique constraint · 2h
5. **[Headers sécurité]** — déjà ROADMAP C4, appliquer dans `next.config.mjs` · 1h

### C5 Mai-Juin 2026

6. **[S1] Rate limiting** — Upstash sur auth + payment-intent (déjà planifié C5)
7. **[S8] CSRF** — header custom vérifié middleware · demi-journée
8. **[validators.ts]** — centraliser validation date/heure · 1h
9. **[queries.ts]** — extraire `getBookingDetails()`, `getConsultantProfile()` · 2h
10. **Tests Vitest** — computePricing + matching (déjà planifié C5)

### C6 Juillet+ 2026

11. **Service layer** — booking-service.ts
12. **Abstraction PSP** — interface PaymentProcessor
13. **Découpage composants** — BookingModal, SearchClient (déjà planifié C6)
