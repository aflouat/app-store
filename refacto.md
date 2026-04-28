# refacto.md — Analyse technique perform-learn.fr
*Générée automatiquement le 2026-04-28 · Base : commit courant · Branche : claude/pensive-tesla-gAWkt*

---

## TL;DR — J-2 avant lancement (30 avril 2026)

**Situation** : la base est solide (prepared statements, RBAC, transactions, anonymat, idempotence webhook). **3 failles bloquantes** restent ouvertes à 48h du lancement : montant de réservation trusté côté client (C1), notification fonds libérés orpheline (C2), cap mensuel IA non enforced (N1). Sans corriger C1, un attaquant peut créer une réservation à 0,01 € et déclencher le flow Stripe réel. **Corriger C1 et C2 est la priorité absolue avant le 30/04.**

---

## 1. Sécurité OWASP

### 🔴 CRITIQUE — Bloquants lancement

| # | Fichier | Problème | Recommandation | Effort |
|---|---|---|---|---|
| C1 | `app/api/freelancehub/client/bookings/route.ts:12-20` | **Montant contrôlé par le client** — `amount_ht`, `commission`, `consultant_net` lus du JSON client et insérés sans recalcul serveur. Un attaquant forge une réservation à 0,01 €. | Récupérer `consultants.daily_rate` en DB depuis `consultant_id`, calculer `amount_ht`, `commission`, `consultant_net` côté serveur. Ignorer les champs financiers du JSON client. | 2h |
| C2 | `app/api/freelancehub/reviews/route.ts:123` | **Notification fonds libérés → mauvais destinataire** — `createNotification(booking.consultant_id, ...)` passe l'ID table `consultants` (UUID différent). La query ligne 26 fetche bien `consultant_user_id` mais ne l'utilise pas ici. Notification orpheline invisible en prod. | Remplacer `booking.consultant_id` par `booking.consultant_user_id` à la ligne 123. | 5 min |

### 🔴 CRITIQUE — Résolu

| # | Fichier | Statut | Détail |
|---|---|---|---|
| S1 | `middleware.ts:15-63` | ✅ FIXÉ | Rate limiting Edge in-memory : 10 req/15min auth, 5 req/5min payment-intent, 20 req/min chat. *(limitation cold start — voir C5 Upstash)* |
| S2 | `client/bookings/[id]/pay/route.ts:54-68` | ✅ FIXÉ | Vérification `metadata.booking_id` + recalcul montant DB + guard null. |
| S3 | `matching/route.ts:7` | ✅ FIXÉ | Whitelist `=== 'client' \|\| === 'admin'`. |
| S4 | `client/slots/route.ts:29` | ✅ FIXÉ | `AND c.is_available = true` ajouté. |
| S5 | `webhooks/stripe/route.ts:29-38` | ✅ FIXÉ | Table `webhook_events(event_id UNIQUE)` + `ON CONFLICT DO NOTHING` — idempotence confirmée. |

### 🟠 MAJEUR

| # | Fichier | Problème | Recommandation | Effort |
|---|---|---|---|---|
| N1 | `lib/freelancehub/agents.ts:370-380` | **Cap mensuel IA non enforced** — `estimateCost()` calcule mais ne bloque pas. `monthlyCap` (0,50–3€) défini pour chaque agent mais jamais vérifié. Chat public à 20 req/min = dépassement budget si bot. | Ajouter `checkBudget(agentId, estimatedCost)` avec stockage en DB (`agent_usage` table ou KV Vercel) et retourner fallback statique si cap mensuel atteint. | 2h |
| S6 | `client/bookings/[id]/payment-intent/route.ts:72-81` | **Metadata Stripe expose détail financier** — `amount_ht`, `tva`, `platform_commission`, `consultant_net` en clair chez Stripe. Accessible aux opérateurs Stripe. | Garder uniquement `booking_id`, `client_id`, `platform`, `amount_ttc` en metadata. | 15 min |
| S7 | `middleware.ts:66-73` | **Exclusions publiques par `startsWith`** — un chemin `/freelancehub/login-admin` ou `/freelancehub/register-bypass` court-circuiterait la protection. | Remplacer par un `Set<string>` de routes publiques exactes ou regex précises. | 30 min |
| S8 | `app/freelancehub/register/page.tsx` | **Formulaire d'inscription sans CSRF** — aucun token dans le form ni vérification dans `register/route.ts`. | Token CSRF généré côté serveur, vérifié à la soumission (NextAuth CSRF ou bibliothèque dédiée). | ½ journée |
| S9 | `lib/freelancehub/email.ts` | **Erreurs email silencieuses** — `.catch(() => null)` sur 3 emails critiques (welcome, KYC validé/rejeté). Échec invisible en production. | Remplacer par `.catch(e => console.error('[email] failed:', e))`. | 15 min |
| C3 | `middleware.ts:15-63` | **Rate limiting non persistant** — compteurs réinitialisés aux cold starts Vercel. Attaque distribuée ou redéploiement = bypass. | Migrer vers Upstash Redis ou KV Vercel en C5. | 3h |

### 🟡 MINEUR — Persistants

| # | Fichier | Problème | Recommandation |
|---|---|---|---|
| S12 | `admin/kyc-presign/route.ts:38` | **Path traversal S3 partiel** — extraction de clé via `docUrl.slice()` protège le bucket mais une URL forgée avec `../` dans le chemin peut pointer vers d'autres objets. | Ajouter : `if (!key.startsWith('kyc/') \|\| key.includes('..')) return 400`. |
| S13 | `webhooks/stripe/route.ts:77-80` | **Remboursements non gérés** — `charge.refunded` = `console.log` uniquement. Aucune mise à jour DB ni notification client. | `UPDATE payments SET status='refunded'` + `createNotification(client_id, ...)`. |
| S14 | `user/me/route.ts:36-44` | **RGPD delete partiel** — soft delete anonymise `users` mais laisse `reviews.comment`, `consultant_skills`, `slots` futurs. | Anonymiser `reviews.comment = '[supprimé]'` + `DELETE FROM slots WHERE date >= NOW()` dans la même transaction. |
| S15 | `user/me/route.ts:40` | **`password_hash = ''`** — chaîne vide. Si une vérification `password_hash !== ''` autorise une connexion, c'est un bypass. | Utiliser `encode(gen_random_bytes(32), 'hex')` à la place. |
| S16 | `admin/export-csv/route.ts:9-16` | **CSV formula injection** — `esc()` ne protège pas `=`, `+`, `@`, `-` en début de cellule. Un nom malveillant exécute une formule Excel à l'ouverture. | Préfixer d'une apostrophe les valeurs commençant par `=+-@\t\r`. |
| N2 | `lib/freelancehub/chat-router.ts:162` | **Regex escalation trop stricte** — `\{"escalate":true,"subject":"(\w+)"\}` ne capture que `[A-Za-z0-9_]`. Un sujet "problème paiement" est ignoré. | Remplacer `\w+` par `[^"]+`. |
| N3 | `lib/freelancehub/chat-router.ts:143-145` | **Catch silencieux LLM dispatcher** — échec = fallback support sans log. | Ajouter `console.error('[chat-router] dispatcher failed:', err)`. |
| S10 | `consultant/slots/route.ts:58` | **`Date.parse()` redondant** après regex — accepte des formats aberrants. | Supprimer `Date.parse()`, garder uniquement la regex `/^\d{4}-\d{2}-\d{2}$/`. |
| S11 | `support/chat/public/route.ts` | **Chat public sans auth** — seul le rate limit (20/min) protège vs. coût API IA. | Challenge captcha ou hard limit quotidienne par IP + enforcer N1 en priorité. |

---

## 2. Dette technique

### Duplications à extraire

| Priorité | Duplication | Fichiers concernés | Action |
|---|---|---|---|
| 🔴 | `computePricing()` / `buildPricing()` × 3 + montant client trusté | `BookingModal.tsx`, `matching.ts:19`, `payment-intent/route.ts:39`, `bookings/route.ts` | **C1** — calculer en DB dans `bookings/route.ts`. Puis créer `lib/freelancehub/pricing.ts` (C4 tech debt). |
| 🟠 | Validation date/heure identique | `slots/route.ts:56`, `slots/bulk/route.ts:35` | Créer `lib/freelancehub/validators.ts` avec `isValidDate()`, `isValidTime()`. |
| 🟡 | Query jointure booking+user+consultant | `cron/reminders:36`, `pay/route.ts:86`, `reviews/route.ts:106` | Créer `lib/freelancehub/queries.ts` : `getBookingDetails(id)`. |
| 🟡 | Logique autorisation rôle répétée (24 routes) | Toutes routes API | Helper `requireRole(...roles)(handler)` (C5). |
| 🟡 | `STATUS_MAP` dupliqué 5+ fois | `BookingsTable.tsx`, `admin/bookings/page.tsx`, etc. | Centraliser dans `lib/freelancehub/constants.ts` (déjà en ROADMAP C4). |

### Couplage fort

| Priorité | Problème | Fichier | Impact |
|---|---|---|---|
| 🟠 | Email envoyé dans route paiement | `pay/route.ts:79-111` | Si Resend down → 500 sur paiement (catché mais silencieux). |
| 🟠 | Skills sync non transactionnel | `consultant/profile/route.ts:52-66` | `DELETE` puis `INSERT` hors transaction du `UPSERT`. Crash entre les deux = perte des compétences. |
| 🟠 | Stripe réinstancié par requête | `payment-intent/route.ts:50`, `pay/route.ts:45`, `webhooks/stripe:18` | 3 instances Stripe distinctes. Créer `lib/freelancehub/stripe.ts` singleton (ROADMAP C5). |
| 🟡 | Logique métier liée à Stripe sans abstraction | `payment-intent/route.ts`, `pay/route.ts` | Remplacement PSP = réécriture totale. |

### Types TypeScript manquants

| Priorité | Problème | Fichier |
|---|---|---|
| 🟠 | Metadata Stripe non typée | `payment-intent/route.ts:72` |
| 🟠 | `query<T = unknown>()` trop permissif | `lib/freelancehub/db.ts:16,29` |
| 🟡 | Réponses API non unifiées (`{ error }` vs `{ message }`) | Toutes routes |

### Fichiers trop longs

| Fichier | Lignes | Action planifiée |
|---|---|---|
| `lib/freelancehub/email.ts` | 385 | Scinder `email-handlers.ts` + `email-templates.ts` (C5) |
| `components/freelancehub/client/BookingModal.tsx` | 498 | Extraire `<SlotPicker>`, `<PriceSummary>` (C6) |
| `lib/freelancehub/agents.ts` | 381 | `agents/config.ts` + `agents/prompts/*.ts` (C5) |
| `components/freelancehub/client/SearchClient.tsx` | 398 | Extraire `<SearchForm>` (C6) |

### Gestion d'erreurs incomplète

| Problème | Fichier | Recommandation |
|---|---|---|
| 500 vague sur erreur DB | `bookings/route.ts:83-90` | Logger payload + retourner 409/422 selon le cas. |
| Race condition upsert consultant | `consultant/profile/route.ts:30-45` | `ON CONFLICT` retournant l'ID existant ou `WHERE updated_at = $prev`. |

---

## 3. Agilité

### Tests manquants (critique avant lancement)

| Flux critique | Couverture actuelle | Priorité |
|---|---|---|
| Paiement (booking → PI → capture → fonds) | 🟡 1 test partiel (`buildPricing`) | 🟠 |
| Validation KYC admin | ❌ zéro test | 🔴 |
| Libération fonds (double review) | ❌ zéro test | 🔴 |
| Matching algorithm (4 critères) | ❌ zéro test | 🟠 |
| Rate limiting middleware | ❌ zéro test | 🟠 |
| Webhook idempotence | ❌ zéro test | 🟠 |
| Chat router (keyword + dispatcher) | ❌ zéro test | 🟠 |
| CSV formula injection (`esc()`) | ❌ zéro test | 🟡 |

Vitest est installé. Tests minimum avant C5 : `computePricing`, `findMatches` (mock DB), `routeMessage` (mock agents), webhook idempotence.

### Séparation des responsabilités

`pay/route.ts` (163 lignes) : validation Stripe + ownership + update DB + email + notification. À découper en C5 :

```typescript
// services/booking-service.ts
confirmPayment(bookingId: string, paymentIntentId: string): Promise<Booking>
releaseEscrow(bookingId: string): Promise<void>
```

### Configuration dispersée

Centraliser dans `lib/freelancehub/config.ts` (ROADMAP C4 — `pricing.ts`) :

```typescript
export const PRICING = {
  baseTva:                0.20,
  baseCommission:         0.15,
  earlyAdopterCommission: 0.10,
  earlyAdopterCap:        20,
  defaultHourlyRate:      85,   // €/h
}
```

---

## 4. Ce qui fonctionne bien ✅

| Domaine | Détail |
|---|---|
| **Injection SQL** | 100% prepared statements (`$1, $2`), aucune concaténation détectée |
| **Auth par rôle** | Vérification systématique `session.user.role` sur toutes les routes |
| **Transactions DB** | `withTransaction()` sur création booking + lock slot atomique |
| **Anonymat consultant** | `revealed_at IS NULL` respecté dans les queries matching |
| **Recalcul montant Stripe** | `payment-intent/route.ts` lit depuis DB, pas depuis le client (S2 ✅) |
| **Signature Stripe** | `stripe.webhooks.constructEvent()` + idempotence `webhook_events` (S5 ✅) |
| **Rate limiting basique** | In-memory Edge sur auth, payment, chat (à renforcer C5) |
| **Headers HTTP** | `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` dans `next.config` |
| **Multi-agents chat** | Router hybride keyword + LLM dispatcher opérationnel, 4 agents + fallback |
| **Timezone emails** | `T00:00:00Z` utilisé dans `email.ts:35,57` — dates correctes pour les emails |

---

## 5. Simulation E2E (sous-agent virtuel — 2026-04-28)

### Flux 1 : Inscription consultant + KYC

```
[GIVEN] Visiteur sur /freelancehub/register
[WHEN]  Soumission formulaire (email, mot de passe, rôle consultant)
[THEN]  ✅ Compte créé, rôle stocké en DB
[WHEN]  Upload KYC (KBIS PDF)
[THEN]  ✅ Fichier stocké MinIO via presign
[WHEN]  Admin valide KYC
[THEN]  ✅ is_kyc_validated = true, email envoyé (⚠️ catch silencieux S9)
[RISK]  S9 — échec Resend invisible si RESEND_API_KEY non configuré
```

### Flux 2 : Recherche + Réservation (path critique C1)

```
[GIVEN] Client connecté sur /freelancehub/client/search
[WHEN]  Recherche compétence "ERP", budget 100€
[THEN]  ✅ Matching retourne top 5 anonymes
[WHEN]  Client choisit un créneau et confirme la réservation
[POST]  bookings/route.ts reçoit : amount_ht=8500, commission=1275, consultant_net=7225
[THEN]  ❌ FAILLE C1 — Ces montants sont trustés tels quels depuis le client
        Un attaquant peut envoyer : amount_ht=1, commission=0, consultant_net=1
        → Réservation créée en DB avec 0,01 € sans erreur
[IMPACT] Fraude au paiement, perte financière directe
```

### Flux 3 : Paiement Stripe

```
[GIVEN] Booking créé (état pending)
[WHEN]  Client charge /payment-intent
[THEN]  ✅ Montant recalculé depuis DB (S2 OK)
[THEN]  ⚠️ Metadata Stripe expose amount_ht, tva, platform_commission (S6)
[WHEN]  Stripe webhook payment_intent.succeeded
[THEN]  ✅ Idempotence vérifiée (webhook_events)
[THEN]  ✅ Payment status → captured, notification client envoyée
```

### Flux 4 : Double évaluation + libération fonds (path critique C2)

```
[GIVEN] Booking completed, client + consultant connectés
[WHEN]  Client soumet évaluation (rating=5)
[THEN]  ✅ Review insérée, email de demande d'évaluation envoyé au consultant
[WHEN]  Consultant soumet évaluation (rating=4)
[THEN]  ✅ Paiement → status=transferred
[THEN]  ✅ Email sendFundRelease envoyé (consultant_email correct)
[THEN]  ❌ FAILLE C2 — createNotification(booking.consultant_id, ...) passe l'ID
        de la table consultants, pas le user_id → Notification orpheline
        Le consultant ne voit pas "Paiement versé" dans sa cloche
[IMPACT] UX dégradée, consultant manque l'information que les fonds sont libérés
```

### Flux 5 : Chat support public

```
[GIVEN] Visiteur non connecté sur la landing page
[WHEN]  Envoie 25 messages en 60 secondes
[THEN]  ✅ Rate limit 20/min déclenché (429)
[THEN]  ❌ FAILLE N1 — monthlyCap de l'agent non vérifié
        Si 1000 visiteurs/jour × 5 messages = ~0,03€/j → acceptable
        Si bot automatisé : 20 req/min × 60 × 24 = 28 800 req/j → 2,1€/j → 63€/mois
        → Dépasse largement le monthlyCap de 2€
[IMPACT] Coût API IA non plafonné en cas d'abus
```

---

## 6. Plan d'action priorisé

### 🚨 AVANT LANCEMENT 30/04 (J-2) — Obligatoire

| # | Fix | Fichier | Description | Temps |
|---|---|---|---|---|
| 1 | **C1** | `client/bookings/route.ts` | Calculer `amount_ht` depuis `consultants.daily_rate` en DB. Ignorer les champs financiers du JSON client. | 2h |
| 2 | **C2** | `reviews/route.ts:123` | Remplacer `booking.consultant_id` par `booking.consultant_user_id` dans `createNotification`. | 5 min |
| 3 | **N1** | `lib/freelancehub/agents.ts` + `chat/route.ts` | Stocker consommation mensuelle en DB, bloquer si `monthlyCap` atteint, retourner fallback statique. | 2h |
| 4 | **S16** | `admin/export-csv/route.ts:9-16` | Préfixer `=+-@\t\r` dans `esc()` — protection formula injection. | 15 min |
| 5 | **S12** | `admin/kyc-presign/route.ts:38` | Valider `key.startsWith('kyc/')` et `!key.includes('..')`. | 10 min |
| 6 | **S13** | `webhooks/stripe/route.ts:77-80` | Implémenter `charge.refunded` : UPDATE payment + notification client. | 45 min |
| 7 | **S9** | `lib/freelancehub/email.ts` | Remplacer `.catch(() => null)` par `.catch(e => console.error('[email]', e))`. | 10 min |
| 8 | **S6** | `payment-intent/route.ts:72-81` | Supprimer `amount_ht`, `tva`, `platform_commission`, `consultant_net` des metadata Stripe. | 10 min |
| 9 | **S15** | `user/me/route.ts:40` | Remplacer `password_hash = ''` par `encode(gen_random_bytes(32), 'hex')`. | 5 min |

### Cycle 5 — Mai-Juin 2026

| Priorité | Item | Effort |
|---|---|---|
| 🟠 | Rate limiting persistant (Upstash Redis) | 3h |
| 🟠 | Tests Vitest : computePricing + findMatches + webhook idempotence + chat router | 4h |
| 🟠 | Skills sync transactionnel | 1h |
| 🟠 | Service layer : `services/booking-service.ts` | 4h |
| 🟡 | CSRF token register | ½j |
| 🟡 | `validators.ts` — centraliser validation date/heure | 1h |
| 🟡 | `queries.ts` — extraire `getBookingDetails()` | 2h |
| 🟡 | Stripe singleton `lib/freelancehub/stripe.ts` | 30 min |
| 🟡 | RGPD delete complet (reviews, slots futurs) | 2h |
| 🟡 | S7 whitelist routes publiques (Set) | 30 min |
| 🟡 | N2 Regex escalation `[^"]+` | 5 min |
| 🟡 | N3 Logger dispatcher | 5 min |

### Cycle 6 — Juillet+ 2026

- Abstraction PSP (interface PaymentProcessor)
- Découpage composants (BookingModal → SlotPicker + PriceSummary + StripePaymentStep)
- Scinder `agents.ts` → `agents/config.ts` + `agents/prompts/*.ts`
- `KpiCard`, `StatusBadge`, `PageHeader` partagés
- `globals-fh.css` layout global
- Pool connexions PostgreSQL `max: 2` + PgBouncer

---

*Prochaine analyse automatique : 2026-04-29*
