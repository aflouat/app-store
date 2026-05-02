# ROADMAP.md — perform-learn.fr

> **Vision** : "Permettre à chaque consultant de proposer un service de qualité et à chaque entreprise d'accéder à un consultant compétent à l'heure et sans engagement."
> **Version courante** : `v1.3.0` · Lancement public : 30 avril 2026.
>
> **Règles** :
> - Items livrés → supprimer (historique dans `HOWTO.md §Changelog`)
> - Format obligatoire : IDs uniques + Gherkin complet sur les items de priorité haute
> - **Agent DG** : ajoute/priorise · **Agent TESTEUR** : ajoute les bugs · **DEV et Reviewer** : interdits d'écriture
> - Statuts possibles : `[ ]` à faire · `[→ EN COURS]` sélectionné par DG · `[x]` livré

---

## Modèle économique

| Élément | Détail |
|---|---|
| Commission standard | 15 % du HT |
| Commission Early Adopter | 10 % (20 premiers consultants validés KYC) |
| Commission parrainage | 13 % si filleul actif |
| Séquestre | Libéré automatiquement après 2 évaluations croisées |

**KPI actif** : **100 € CA au 31/05/2026** (7 sessions × 15 % commission)

---

## Métriques Nord-Star

| Phase | Métrique | Objectif |
|---|---|---|
| Lancement (C4) ✅ | Experts Ready-to-book | 3+ au 30/04 |
| Croissance (C5) | Time-to-Contract | < 5 min |
| Monétisation (C6) | Taux de récurrence clients | > 30 % |

---

## Backlog — Cycle 5 (Mai – Juin 2026)

> Items triés par `business_value` décroissant à l'intérieur de chaque catégorie.
> Format complet (Gherkin) sur les items `business_value ≥ 75`.

---

### BUG-01 — Stabilisation login / register

**Contexte** : Des régressions auth empêchent des utilisateurs de se connecter ou de s'inscrire. Bloquant pour la croissance (KPI 100 € CA au 31/05).
**Règles métier** : RG-09 (SSO Google), RG-10 (RBAC redirections), RG-05.
**Critères SMART** :
- Spécifique : login email+password, login Google et register fonctionnent sans erreur pour les 3 rôles
- Mesurable : `auth.spec.ts` 100 % vert (9 scénarios)
- Atteignable : isolé dans `auth.ts`, `auth.config.ts`, pages login/register
- Réaliste : pas de migration SQL requise
- Temporel : livrable en 1 session

**Gherkin** :
```gherkin
Feature: Authentification login et register

  Scenario: Login email/password client réussi
    Given je suis sur /freelancehub/login
    When je saisis client1@perform-learn.fr / demo1234 et je soumets
    Then je suis redirigé vers /freelancehub/client
    And mon email est affiché dans le header

  Scenario: Login email/password consultant réussi
    Given je suis sur /freelancehub/login
    When je saisis consultant1@perform-learn.fr / demo1234 et je soumets
    Then je suis redirigé vers /freelancehub/consultant

  Scenario: Login admin réussi
    Given je suis sur /freelancehub/login
    When je saisis admin@perform-learn.fr / demo1234 et je soumets
    Then je suis redirigé vers /freelancehub/admin

  Scenario: Register nouveau client
    Given je suis sur /freelancehub/register
    When je choisis le rôle Client, je saisis un email unique et un mot de passe
    Then je suis auto-connecté et redirigé vers /freelancehub/client

  Scenario: Credentials invalides
    Given je suis sur /freelancehub/login
    When je saisis un mot de passe incorrect
    Then un message d'erreur s'affiche et je reste sur /freelancehub/login

  Scenario: Import Node.js dans auth.config.ts
    Given auth.config.ts importe bcryptjs ou pg
    When le middleware Edge Runtime charge auth.config.ts
    Then une erreur Edge Runtime est levée — le fix doit interdire tout import Node.js dans auth.config.ts
```

**Fichiers autorisés** : `portal/auth.ts`, `portal/auth.config.ts`, `portal/app/freelancehub/(auth)/login/page.tsx`, `portal/app/freelancehub/(auth)/register/page.tsx`, `portal/app/api/auth/[...nextauth]/route.ts`
**Fichiers interdits** : `portal/middleware.ts`, toute route API hors auth, migrations/
**Migration SQL** : non
**Critères d'acceptance** :
- [ ] `npm run build` passe
- [ ] `npm test` passe (rbac.test.ts inclus)
- [ ] `npx playwright test tests/e2e/auth.spec.ts` 100 % vert
- [ ] Pas de régression sur booking ni paiement

`business_value: 95` · `value_type: ux_improvement`

---

### SEC-01 — Transaction isolation payment

**Contexte** : `UPDATE bookings SET status='confirmed'` et `INSERT INTO payments` sont deux requêtes séparées. Si l'INSERT échoue, le booking est `confirmed` sans paiement — état corrompu irréversible.
**Règles métier** : RG-02, RG-04.
**Critères SMART** :
- Spécifique : les deux requêtes dans une transaction `withTransaction()`
- Mesurable : impossible d'avoir un booking `confirmed` sans ligne dans `payments`
- Atteignable : 1 fichier route + 1 helper transaction
- Réaliste : pas de migration schema
- Temporel : 1 session

**Gherkin** :
```gherkin
Feature: Atomicité booking + payment

  Scenario: Paiement capturé avec succès
    Given un booking en statut pending
    When le webhook Stripe déclenche payment_intent.succeeded
    Then booking.status = confirmed ET payments contient une ligne — dans la même transaction

  Scenario: INSERT payment échoue
    Given un booking en statut pending
    When l'INSERT payments lève une erreur DB
    Then booking.status reste pending (rollback atomique)
    And aucune ligne orpheline n'existe dans payments

  Scenario: Double appel concurrent au webhook
    Given deux requêtes webhook simultanées pour le même booking_id
    When les deux exécutent SELECT stripe_payment_id FOR UPDATE
    Then une seule transaction s'exécute, l'autre attend le verrou
    And un seul payment est inséré
```

**Fichiers autorisés** : `portal/app/api/freelancehub/client/bookings/[id]/pay/route.ts`, `portal/app/api/freelancehub/client/bookings/[id]/payment-intent/route.ts`, `portal/lib/freelancehub/db.ts`
**Fichiers interdits** : `migrations/`, `portal/middleware.ts`
**Migration SQL** : non
**Critères d'acceptance** :
- [ ] `npm run build` passe
- [ ] `npm test` passe
- [ ] Test unitaire ajouté pour le cas rollback
- [ ] Pas de régression E2E sur le flow booking → paiement

`business_value: 95` · `value_type: strategic_positioning`

---

### US-01 — Stripe Connect (reversement automatique consultant)

**Contexte** : Les reversements aux consultants sont aujourd'hui manuels (virement bancaire). Stripe Connect automatise ce flux et supprime la charge opérationnelle. Prérequis au KPI récurrence.
**Règles métier** : RG-02, RG-03, RG-04.
**Critères SMART** :
- Spécifique : après libération du séquestre, le consultant reçoit `amount_ht × (1 - taux_commission)` via Stripe Connect
- Mesurable : ligne `transfers` visible dans le dashboard Stripe du consultant
- Atteignable : Stripe Connect Express, compte consultant onboardé
- Réaliste : nécessite migration SQL pour `stripe_account_id` consultant
- Temporel : livrable en 2 sessions

**Gherkin** :
```gherkin
Feature: Reversement automatique consultant via Stripe Connect

  Scenario: Libération du séquestre après double évaluation
    Given les 2 parties ont soumis leur évaluation
    When le cron fund-release s'exécute
    Then un Transfer Stripe est créé vers le compte Connect du consultant
    And le montant = amount_ht × (1 - taux_commission) en centimes
    And payment.status = transferred

  Scenario: Consultant sans compte Connect
    Given un consultant n'a pas complété l'onboarding Stripe Connect
    When le cron tente le reversement
    Then le Transfer est mis en attente (status = pending_connect)
    And une notification est envoyée au consultant pour compléter son onboarding

  Scenario: Commission Early Adopter
    Given le consultant a is_early_adopter = true
    When le Transfer est calculé
    Then taux_commission = 0.10 (et non 0.15)
```

**Fichiers autorisés** : `portal/app/api/freelancehub/cron/fund-release/route.ts`, `portal/app/api/freelancehub/consultant/stripe-connect/route.ts` (à créer), `portal/lib/freelancehub/stripe.ts`, `portal/app/freelancehub/consultant/earnings/page.tsx`
**Fichiers interdits** : `portal/middleware.ts`, `portal/auth.ts`
**Migration SQL** : oui (`020_stripe_connect.sql` — ajouter `stripe_account_id` sur `consultants`)
**Critères d'acceptance** :
- [ ] `npm run build` passe
- [ ] `npm test` passe (pricing.test.ts Early Adopter inclus)
- [ ] Transfer visible en mode test Stripe
- [ ] Pas de régression E2E

`business_value: 90` · `value_type: cost_reduction`

---

### SEC-02 — Rate limiting persistant (Upstash Redis)

**Contexte** : Le rate limiter actuel est en mémoire Edge — il se reset à chaque redéploiement Vercel. Un attaquant attend un deploy pour bypasser les limites sur `/api/auth` et `/payment-intent`.
**Règles métier** : RG-05.

**Gherkin** :
```gherkin
Feature: Rate limiting persistant

  Scenario: Brute force login bloqué
    Given 10 tentatives de login échouées depuis la même IP en 1 minute
    When la 11ème requête arrive sur /api/auth/signin
    Then HTTP 429 est retourné
    And le compteur persiste après un redéploiement Vercel

  Scenario: Redéploiement Vercel ne reset pas les limites
    Given 8 tentatives enregistrées dans Upstash Redis
    When Vercel redéploie l'application (cold start Edge)
    Then les 8 tentatives sont toujours comptabilisées
```

**Fichiers autorisés** : `portal/middleware.ts`, `portal/lib/freelancehub/rate-limit.ts` (à créer)
**Fichiers interdits** : `portal/auth.ts`, `portal/auth.config.ts`
**Migration SQL** : non
**Critères d'acceptance** :
- [ ] `npm run build` passe
- [ ] Variable `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` documentées dans `.env.example`
- [ ] Test unitaire rate-limit ajouté
- [ ] Pas de régression auth E2E

`business_value: 80` · `value_type: strategic_positioning`

---

### US-02 — Booking récurrent (abonnement 10h/20h/mois)

**Contexte** : Les clients doivent re-réserver manuellement chaque session. Un abonnement mensuel augmente la récurrence et génère un CA prévisible (KPI > 30 % récurrence).

**Gherkin** :
```gherkin
Feature: Abonnement mensuel consultant

  Scenario: Souscription abonnement 10h/mois
    Given je suis client connecté sur le profil d'un consultant disponible
    When je sélectionne "Abonnement 10h/mois" avec tarif dégressif (-10 %)
    Then un PaymentIntent récurrent Stripe est créé
    And 10 créneaux sont pré-réservés pour le mois suivant

  Scenario: Tarif dégressif appliqué
    Given consultant.hourly_rate = 100 €/h
    When je souscris un abonnement 10h/mois
    Then montant_mensuel = 100 × 10 × 0.90 = 900 € HT
```

**Fichiers autorisés** : `portal/app/api/freelancehub/client/bookings/route.ts`, `portal/app/freelancehub/client/page.tsx`, `portal/lib/freelancehub/pricing.ts`
**Fichiers interdits** : `portal/middleware.ts`, `portal/auth.ts`, `migrations/` existantes
**Migration SQL** : oui (`021_recurring_bookings.sql`)
**Critères d'acceptance** :
- [ ] `npm run build` passe
- [ ] `npm test` passe (pricing.test.ts mis à jour)
- [ ] Flow E2E souscription → confirmation email

`business_value: 85` · `value_type: user_acquisition`

---

### US-03 — Facture PDF après paiement

**Contexte** : Obligation légale B2B. Clients attendent une facture dans "Mes paiements". Reporté depuis C4.

**Gherkin** :
```gherkin
Feature: Facture PDF

  Scenario: Facture générée après capture paiement
    Given un paiement vient d'être capturé (webhook payment_intent.succeeded)
    When le webhook handler s'exécute
    Then une facture PDF est générée et stockée dans MinIO sous kyc/{booking_id}/invoice.pdf
    And un lien de téléchargement est accessible depuis /freelancehub/client/payments

  Scenario: Facture inaccessible à un tiers
    Given je suis consultant connecté
    When j'essaie d'accéder à /api/freelancehub/client/payments/{booking_id}/invoice
    Then HTTP 403 est retourné
```

**Fichiers autorisés** : `portal/app/api/webhooks/stripe/route.ts`, `portal/lib/freelancehub/pdf.ts` (à créer), `portal/app/api/freelancehub/client/payments/[id]/invoice/route.ts` (à créer), `portal/app/freelancehub/client/payments/page.tsx`
**Fichiers interdits** : `portal/middleware.ts`, `portal/auth.ts`
**Migration SQL** : non (stocker l'URL dans `payments.invoice_url`)
**Critères d'acceptance** :
- [ ] `npm run build` passe
- [ ] PDF téléchargeable depuis le dashboard client
- [ ] Accès 403 si mauvais rôle

`business_value: 76` · `value_type: ux_improvement`

---

### SEC-03 — Timing-safe CRON_SECRET

**Contexte** : Comparaison `===` sur le secret CRON vulnérable à l'analyse temporelle (timing attack).

**Fichiers autorisés** : `portal/app/api/govern/tasks/notify/route.ts`, `portal/app/api/govern/smoke-test/route.ts`, `portal/app/api/freelancehub/cron/reminders/route.ts`
**Migration SQL** : non
**Fix** : `crypto.timingSafeEqual(Buffer.from(bearer ?? ''), Buffer.from('Bearer ' + secret))`

`business_value: 75` · `value_type: strategic_positioning`

---

### TD-01 — Centraliser constants.ts

**Contexte** : `BOOKING_STATUS_MAP`, `PAYMENT_STATUS_MAP`, `BOOKING_TRANSITIONS` et les taux de commission (0.15, 0.13, 0.10) sont dupliqués dans 6+ fichiers — cause directe des régressions de statut.

**Fichiers autorisés** : `portal/lib/freelancehub/constants.ts` (à créer), tous les fichiers qui importent actuellement ces constantes
**Migration SQL** : non

`business_value: 70` · `value_type: technical_debt`

---

### TD-02 — Épingler NextAuth v5

**Contexte** : `"next-auth": "^5.0.0-beta.30"` — le `^` autorise des mises à jour breaking lors d'un `npm install`.

**Fix** : `portal/package.json` → `"next-auth": "5.0.0-beta.30"` (supprimer le `^`)
**Migration SQL** : non

`business_value: 70` · `value_type: technical_debt`

---

### RGPD-01 — Export données utilisateur (art. 20)

**Contexte** : Obligation RGPD. `GET /api/freelancehub/user/me/export` → ZIP contenant toutes les données personnelles.

**Fichiers autorisés** : `portal/app/api/freelancehub/user/me/export/route.ts` (à créer)
**Migration SQL** : non

`business_value: 70` · `value_type: strategic_positioning`

---

### TD-03 — Centraliser pricing.ts

**Contexte** : `computePricing()` dupliqué dans `matching.ts` et `BookingModal.tsx`. 41 conversions `cents/100` inline.

**Fix** : `portal/lib/freelancehub/pricing.ts` — `computePricing()` unique + `fmtEur(cents: number): string`
**Migration SQL** : non

`business_value: 65` · `value_type: technical_debt`

---

### TD-04 — Fix timezone dates

**Contexte** : `'T00:00:00'` sans `Z` interprété en heure locale → décalages selon le fuseau.

**Fix** : Remplacer `'T00:00:00'` par `'T00:00:00Z'` dans `email.ts` et les routes cron
**Migration SQL** : non

`business_value: 65` · `value_type: technical_debt`

---

### SEC-04 — Réduire metadata Stripe

**Contexte** : 8 champs en metadata Stripe dont `amount_ht`, `tva`, `platform_commission`, `consultant_net` — marges exposées dans les logs Stripe.

**Fix** : Garder uniquement `{ booking_id, amount_ttc }` dans `payment-intent/route.ts:72`
**Migration SQL** : non

`business_value: 65` · `value_type: strategic_positioning`

---

### RGPD-02 — Registre des traitements (art. 30)

`business_value: 65` · `value_type: strategic_positioning`

---

### RGPD-03 — Signatures Phase 2 — Yousign (NDA eIDAS)

**Contexte** : NDA actuel = horodatage IP sans valeur légale. Yousign = signature eIDAS niveau avancé, stockée MinIO.

`business_value: 62` · `value_type: strategic_positioning`

---

### SEC-05 — Race condition Early Adopter

**Fix** : Sous-requête atomique dans `admin/consultants/[id]/kyc/route.ts` :
```sql
UPDATE freelancehub.consultants
SET kyc_status = 'validated',
    is_early_adopter = (SELECT COUNT(*) < 20 FROM freelancehub.consultants WHERE kyc_status = 'validated')
WHERE id = $1
```

`business_value: 75` · `value_type: strategic_positioning`

---

### TD-05 — Centraliser types.ts

**Fix** : Déplacer `BookingRow`, `PaymentRow`, `AvailableSlot` vers `portal/lib/freelancehub/types.ts`

`business_value: 60` · `value_type: technical_debt`

---

### TD-06 — Logger erreurs email

**Fix** : Remplacer `.catch(() => null)` par `.catch((err) => console.error('[email:error]', err.message))` dans 10+ routes

`business_value: 60` · `value_type: technical_debt`

---

### TD-07 — Skills sync transactionnel

**Fix** : Batch INSERT `unnest` dans `consultant/profile/route.ts`

`business_value: 60` · `value_type: technical_debt`

---

### TD-08 — Stripe singleton

**Fix** : `portal/lib/freelancehub/stripe.ts` partagé — évite la réinstanciation par requête

`business_value: 60` · `value_type: technical_debt`

---

### US-04 — Dashboard consultant enrichi

**Contexte** : Revenus cumulés, courbe mensuelle, statistiques missions pour fidéliser les consultants.

`business_value: 80` · `value_type: ux_improvement`

---

### US-05 — Dashboard client enrichi

**Contexte** : Historique complet, experts favoris, budget consommé/mois.

`business_value: 80` · `value_type: ux_improvement`

---

### SEC-06 — Compléter CSP headers

**Contexte** : CSP de base déployé en C4, mais `object-src`, `form-action`, `frame-ancestors` manquants — vecteurs XSS et clickjacking résiduels identifiés dans l'analyse refacto 2026-05-01.

**Fix** : `next.config.mjs` — ajouter `object-src 'none'`, `form-action 'self'`, `frame-ancestors 'none'`, supprimer `data:` de `img-src`
**Migration SQL** : non

`business_value: 68` · `value_type: strategic_positioning`

---

### SEC-07 — Path traversal KYC double encodage

**Fix** : Valider contre `^kyc\/[a-zA-Z0-9_\-]+\/[a-zA-Z0-9_\-\.]+$` après `decodeURIComponent()` dans `admin/kyc-presign/route.ts:40`

`business_value: 60` · `value_type: strategic_positioning`

---

### SEC-08 — Atomicité chat budget cap

**Fix** : `chat-router.ts:162` — requête atomique INSERT…ON CONFLICT avec clause WHERE sur le cap

`business_value: 55` · `value_type: cost_reduction`

---

### UI-01 — Composants partagés (KpiCard, StatusBadge, PageHeader)

**Fix** : Créer `portal/components/freelancehub/ui/` avec 3 composants (6 dashboards les redéfinissent inline)

`business_value: 55` · `value_type: technical_debt`

---

### RGPD-04 — Sous-traitants DPA documentés

**Contexte** : Stripe, Resend, Vercel, OVH doivent être documentés comme sous-traitants.

`business_value: 55` · `value_type: strategic_positioning`

---

### TD-09 — Centraliser validators.ts

**Fix** : `isValidDate()` + `isValidTime()` dupliqués dans `slots/route.ts` + `slots/bulk/route.ts` → `portal/lib/freelancehub/validators.ts`

`business_value: 55` · `value_type: technical_debt`

---

### TD-10 — Zod validation routes auth

**Contexte** : Validation d'entrée manuelle dans `register` et `login` — absence de Zod laisse des chemins non validés. Identifié dans l'analyse refacto 2026-05-01.

**Fix** : Migrer vers Zod dans `portal/app/api/auth/register/route.ts` et pages login/register en priorité
**Migration SQL** : non

`business_value: 62` · `value_type: technical_debt`

---

### SEC-09 — XSS stocké notes KYC

**Fix** : Sanitiser `notes.trim()` avant interpolation dans la notification email (`admin/consultants/[id]/kyc/route.ts:81`)

`business_value: 45` · `value_type: strategic_positioning`

---

### UI-02 — Centraliser globals-fh.css

**Fix** : Classes layout dupliquées dans 15+ fichiers → `globals-fh.css`

`business_value: 50` · `value_type: technical_debt`

---

## Backlog — Cycle 6 (Juillet – Septembre 2026)

| ID | Item | business_value | value_type |
|---|---|---|---|
| C6-US-01 | Commission sur transactions réelles (Stripe Connect opérationnel) | 95 | cost_reduction |
| C6-US-02 | Abonnement SaaS « Pro » consultant (19 €/mois) | 85 | user_acquisition |
| C6-US-03 | Assurance RC Pro intégrée | 75 | strategic_positioning |
| C6-RGPD-01 | Procédure de violation CNIL < 72h | 70 | strategic_positioning |
| C6-US-04 | API publique pour intégrations tierces (RH, ERP) | 70 | strategic_positioning |
| C6-RGPD-02 | DPA client signable en ligne (art. 28 RGPD) | 65 | strategic_positioning |
| C6-US-05 | Templates/documents premium (50–99 €) | 65 | user_acquisition |
| C6-RGPD-03 | Politique de rétention automatique | 60 | technical_debt |
| C6-TD-01 | PgBouncer — pool connexions VPS | 60 | technical_debt |
| C6-TD-02 | Index manquants FK (payments, reviews) | 55 | technical_debt |
| C6-TD-03 | FK ON DELETE explicite (RGPD suppression) | 50 | technical_debt |

---

## Template US — format obligatoire

> Toute US ajoutée DOIT respecter ce format (voir CLAUDE.md §4 pour la description complète).

```markdown
### [US-XX] Titre fonctionnel court

**Contexte** : Pourquoi cette US existe (problème résolu, valeur métier).
**Règles métier** : RG-XX concernées.
**Critères SMART** :
- Spécifique : comportement exact attendu
- Mesurable : assertion testable
- Atteignable : faisable en 1 session Claude Code
- Réaliste : dans le scope technique actuel
- Temporel : livrable dans le cycle courant

**Gherkin** :
` `` `gherkin
Feature: [Titre]
  Scenario: [Cas nominal]
    Given [état initial]
    When [action]
    Then [résultat vérifiable]

  Scenario: [Cas d'erreur]
    Given [état initial]
    When [action déclenchant l'erreur]
    Then [comportement attendu]
` `` `

**Fichiers autorisés** : [liste explicite]
**Fichiers interdits** : [liste explicite]
**Migration SQL** : oui (00X_nom.sql) | non
**Critères d'acceptance** :
- [ ] `npm run build` passe
- [ ] `npm test` passe
- [ ] Comportement Gherkin vérifié
- [ ] Pas de régression sur auth, booking, Stripe

`business_value: XX` · `value_type: [strategic_positioning|ux_improvement|cost_reduction|user_acquisition|technical_debt]`
```
