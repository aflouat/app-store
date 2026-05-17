# refacto.md — Analyse quotidienne · perform-learn.fr

> **Date** : 2026-05-17 · **Analyste** : Claude Sonnet 4.6 (Agent AMÉLIORATION)
> **Périmètre** : monorepo `app-store` — `apps/marketplace/`, `apps/sante/`, `packages/core-*/`
> **Axe** : Sécurité OWASP · Dette technique · Agilité pipeline
> **Δ depuis 2026-05-07** : 10 jours · 15 commits · Axe sante uniquement (marketplace non modifié)

---

## Résumé exécutif

| Axe | CRITIQUE | HAUTE | MOYENNE | FAIBLE | Total |
|---|---|---|---|---|---|
| Sécurité OWASP | 2 | 4 | 2 | 1 | **9** |
| Dette technique | 1 | 4 | 4 | 1 | **10** |
| Agilité | 2 | 1 | 3 | 1 | **7** |
| **TOTAL** | **5** | **9** | **9** | **3** | **26** |

**Items fermés depuis 2026-05-07** : 1 (TD-02 — nextauth épinglé `5.0.0-beta.30` sans `^` ✅)
**Nouveaux items hors ROADMAP.md** : 1 (US-LI-01 LinkedIn Share — soumis en ROADMAP.md)

---

## 1. SÉCURITÉ OWASP

### CRITIQUE

#### SEC-10 — CSV export expose consultants avant `revealed_at` *(déjà en ROADMAP.md)*
- **Fichier** : `apps/marketplace/app/api/freelancehub/admin/export-csv/route.ts` · lignes 48–62
- **Problème** : Requête SQL retourne `consultant_name` + `consultant_email` sans filtre `revealed_at IS NOT NULL` — **violation directe de RG-01** même pour un admin exportant les données.
- **Fix** : Masquer `consultant_name → 'Anonyme'` et `consultant_email → NULL` si `b.revealed_at IS NULL` dans la requête ou dans la boucle CSV.
- **Statut ROADMAP** : `[ ]` à faire — business_value 90

#### SEC-01 — Transaction isolation payment *(déjà en ROADMAP.md)*
- **Fichier** : `apps/marketplace/app/api/webhooks/stripe/route.ts` · handler `payment_intent.succeeded`
- **Problème** : `UPDATE payments SET status='captured'` + `UPDATE bookings SET status='confirmed'` en deux requêtes séparées hors transaction. Si la 2ᵉ échoue, état incohérent irréversible.
- **Note** : `POST /client/bookings/route.ts` utilise correctement `withTransaction()` — **ce pattern doit être appliqué au webhook aussi.**
- **Fix** : Envelopper les deux UPDATE dans `withTransaction()` dans `webhooks/stripe/route.ts`.
- **Statut ROADMAP** : `[ ]` à faire — business_value 95

---

### HAUTE

#### SEC-05 — Race condition Early Adopter *(déjà en ROADMAP.md)*
- **Fichier** : `apps/marketplace/app/api/freelancehub/admin/consultants/[id]/kyc/route.ts`
- **Problème** : `SELECT COUNT(*) ... WHERE kyc_status='validated'` puis `UPDATE ... SET is_early_adopter = $2` — deux requêtes non atomiques. Deux validations simultanées peuvent dépasser le cap 20.
- **Fix** : Sous-requête atomique inline :
  ```sql
  UPDATE freelancehub.consultants
  SET is_early_adopter = (SELECT COUNT(*) < 20 FROM freelancehub.consultants WHERE kyc_status = 'validated')
  WHERE id = $1
  ```
- **Statut ROADMAP** : `[ ]` à faire — business_value 75

#### SEC-03 — Timing-safe CRON_SECRET *(déjà en ROADMAP.md)*
- **Fichier** : `apps/marketplace/app/api/freelancehub/cron/reminders/route.ts:29`
- **Problème** : `secret !== process.env.CRON_SECRET` — comparaison `!==` vulnérable aux timing attacks.
- **Fix** : `crypto.timingSafeEqual(Buffer.from(bearer ?? ''), Buffer.from(process.env.CRON_SECRET ?? ''))`
- **Statut ROADMAP** : `[ ]` à faire — business_value 75

#### SEC-06 — CSP headers incomplets *(déjà en ROADMAP.md)*
- **Fichier** : `apps/marketplace/next.config.mjs` · lignes 43–57
- **Problème** : CSP présent mais `object-src`, `form-action`, `frame-ancestors` manquants. `data:` autorisé dans `img-src`. À noter : l'intégration LinkedIn ajoutera des endpoints (`linkedin.com/oauth/v2/`, `api.linkedin.com`) à déclarer dans `connect-src`.
- **Fix** : Ajouter `object-src 'none'`, `form-action 'self'`, `frame-ancestors 'none'`. Prévoir `connect-src += https://api.linkedin.com https://www.linkedin.com`.
- **Statut ROADMAP** : `[ ]` à faire — business_value 68

#### SEC-11 — Console.log DATABASE_URL dans register *(déjà en ROADMAP.md)*
- **Fichier** : `apps/marketplace/app/api/freelancehub/auth/register/route.ts:28`
- **Problème** : `console.log('[register] DB_HOST:', process.env.DATABASE_URL?.replace(...))` — informations infra dans Vercel logs. Également ligne 57 : `console.log('[register] success:', email, role)` — PII (email utilisateur) dans logs.
- **Fix** : Supprimer les deux lignes. (**5 min**)
- **Statut ROADMAP** : `[ ]` à faire — business_value 55

---

### MOYENNE

#### SEC-07 — Path traversal KYC double encodage *(déjà en ROADMAP.md)*
- **Fichier** : `apps/marketplace/app/api/freelancehub/admin/kyc-presign/route.ts` · lignes 26–42
- **Problème** : Check `!key.includes('..')` contournable avec `%2e%2e` avant `decodeURIComponent`.
- **Fix** : Regex `^kyc\/[a-zA-Z0-9_\-]+\/[a-zA-Z0-9_\-\.]+$` après `decodeURIComponent()`.
- **Statut ROADMAP** : `[ ]` à faire — business_value 60

#### SEC-08 — Atomicité chat budget cap *(déjà en ROADMAP.md)*
- **Fichier** : `apps/marketplace/lib/freelancehub/chat-router.ts:162`
- **Fix** : INSERT…ON CONFLICT avec clause WHERE sur le cap.
- **Statut ROADMAP** : `[ ]` à faire — business_value 55

---

### FAIBLE

#### SEC-09 — XSS stocké notes KYC *(déjà en ROADMAP.md)*
- **Fichier** : `apps/marketplace/app/api/freelancehub/admin/consultants/[id]/kyc/route.ts:81`
- **Fix** : Sanitiser `notes.trim()` avant interpolation dans le template email.
- **Statut ROADMAP** : `[ ]` à faire — business_value 45

---

## 2. DETTE TECHNIQUE

### CRITIQUE

#### Couverture tests insuffisante (inchangée)
- 30 routes API critiques · 7 fichiers test unitaires.
- Routes sans tests : `payment-intent`, `pay` (webhook), `register`, `export-csv`, toutes les routes admin.
- **Impact** : régressions silencieuses à chaque commit marketplace.

---

### HAUTE

#### TD-01 — Constants dupliqués *(déjà en ROADMAP.md)* — business_value 70
- `BOOKING_STATUS_MAP`, taux commission (0.15, 0.13, 0.10) dans 6+ fichiers.
- **Fix** : `apps/marketplace/lib/freelancehub/constants.ts`.

#### TD-03 — Pricing dupliqué *(déjà en ROADMAP.md)* — business_value 65
- `computePricing()` importé depuis `matching.ts` dans `bookings/route.ts` — couplage incorrect.
- **Fix** : déplacer vers `lib/freelancehub/pricing.ts`.

#### TD-10 — Validation manuelle sans Zod *(déjà en ROADMAP.md)* — business_value 62
- `register/route.ts`, `forgot-password`, `reset-password` : validations regex manuelles.
- **Fix** : Migrer vers Zod.

#### TD-05 — Types dupliqués *(déjà en ROADMAP.md)* — business_value 60
- `BookingRow`, `PaymentRow`, `AvailableSlot` redéfinis inline dans chaque route.
- **Fix** : `apps/marketplace/lib/freelancehub/types.ts` partagé.

---

### MOYENNE

#### TD-04 — Timezone sans `Z` *(déjà en ROADMAP.md)* — business_value 65
#### TD-06 — Erreurs email `.catch(() => null)` silencieuses *(déjà en ROADMAP.md)* — business_value 60
#### TD-07 — Skills sync non transactionnel *(déjà en ROADMAP.md)* — business_value 60
#### TD-08 — Stripe réinstancié par requête *(déjà en ROADMAP.md)* — business_value 60
- `new Stripe(process.env.STRIPE_SECRET_KEY!)` dans `webhooks/stripe/route.ts` — devrait être singleton.

---

### FAIBLE (FERMÉ)

#### ~~TD-02 — NextAuth v5 non épinglé~~ ✅ DONE
- `package.json` : `"next-auth": "5.0.0-beta.30"` sans `^` — **épinglé depuis 2026-05-07**.

---

## 3. AGILITÉ & PIPELINE

### CRITIQUE

#### BUG-01 — Stabilisation login/register — J+14 sans fix
- **ROADMAP.md** : `[ ]` à faire · business_value 95
- **Urgence** : KPI 100 € CA au 31/05/2026 — **J-14**. Aucune session facturable possible si auth cassée.
- **Action** : Initier branche `feat/BUG-01` immédiatement.

#### KPI 100 € CA — J-14
- **Deadline** : 31/05/2026 — **14 jours restants**.
- **Blocants** : SEC-01 (webhook) + BUG-01 (auth) doivent être livrés cette semaine.
- **Chemin critique** : BUG-01 → SEC-01 → première session réelle → 100 € CA.

---

### HAUTE

#### App sante — scaffold opérationnel (progrès C5)
- Auth fonctionnel (login/register médecin/patient/admin).
- Admin dashboard KPIs + liste utilisateurs livré.
- Agenda médecin hebdomadaire livré.
- **Manque** : routes booking patient, notifications, tests unitaires (0 test).
- **Next** : première US fonctionnelle sante (booking patient → médecin).

---

### MOYENNE

#### LinkedIn OAuth — nouveau levier acquisition (NOUVEAU)
- Intégration "Share on LinkedIn" configurée côté LinkedIn (Client ID `78r2233idep3v0`).
- Callback URL déclarée : `https://portal.perform-learn.fr/callback-published-posts`.
- **US-06 ajoutée en ROADMAP.md** — impacte direct le KPI acquisition C5.

#### Plan acquisition C4 — résultat à documenter dans DECISIONS.md
- KPI 10 consultants + 5 clients waitlist avant 30/04 (date passée).
- **Action DG** : documenter le résultat réel.

#### Plan 100 € CA — suivi hebdomadaire requis
- **Prérequis** : BUG-01 + SEC-01 livrés avant la 1ère session facturée.

---

### FAIBLE

#### Smoke-test CI — timeout fragile (inchangé)
- `.github/workflows/ci.yml` · 24 tentatives × 10s = 4 min — flaky si Vercel lent.
- **Fix** : 16 tentatives × 15s.

---

## 4. État apps

### marketplace (apps/marketplace)

| Composant | État |
|---|---|
| Auth chain | ⚠ BUG-01 non résolu — login/register instable |
| Stripe webhook | ⚠ SEC-01 — UPDATE non transactionnel |
| CSP headers | ⚠ SEC-06 — incomplet (object-src, form-action manquants) |
| Rate limiting | ⚠ SEC-02 — en mémoire Edge (reset au redéploiement) |
| CSV export | ⚠ SEC-10 — consultant_name/email exposés avant revealed_at |
| nextauth | ✅ Épinglé `5.0.0-beta.30` |
| Tests unitaires | ✅ matching · pricing · rbac · payment |

### sante (apps/sante)

| Composant | État |
|---|---|
| Auth (login/register) | ✅ Fonctionnel (médecin / patient / admin) |
| Admin dashboard | ✅ KPIs + liste utilisateurs |
| Agenda médecin | ✅ Hebdomadaire — créneaux disponibilités |
| Booking patient | ❌ Non livré |
| Notifications | ❌ Non livré |
| Tests unitaires | ❌ 0 test |
| DB migrations | ⚠ `001_sante_schema.sql` défini, statut prod inconnu |

---

## 5. Intégration LinkedIn — analyse technique

**Contexte** : Accès API "Share on LinkedIn" (Default Tier) accordé.
- **Client ID** : `78r2233idep3v0` · **Client Secret** : à stocker dans `LINKEDIN_CLIENT_SECRET` (Vercel env)
- **Callback URL déclarée** : `https://portal.perform-learn.fr/callback-published-posts`
- **Scope requis** : `w_member_social` (création de posts UGC)
- **Endpoint post** : `POST https://www.linkedin.com/v2/ugcPosts`

**Flux OAuth 2.0** :
```
1. Consultant clique "Connecter LinkedIn"
   → GET /api/freelancehub/consultant/linkedin/connect
   → Redirect vers https://www.linkedin.com/oauth/v2/authorization?client_id=78r2233idep3v0
      &redirect_uri=https://portal.perform-learn.fr/callback-published-posts
      &scope=w_member_social&state=[csrf_token]

2. LinkedIn → /callback-published-posts?code=...&state=...
   → Exchange code → access_token (POST /oauth/v2/accessToken)
   → Store linkedin_access_token + linkedin_person_id + expires_at en DB

3. Consultant clique "Partager ma disponibilité"
   → POST /api/freelancehub/consultant/linkedin/share
   → POST https://www.linkedin.com/v2/ugcPosts avec le token stocké
   → Post LinkedIn publié
```

**Valeur acquisition** : chaque partage = exposition organique du profil consultant sur LinkedIn → traffic entrant qualifié B2B.

**US-06 ajoutée en ROADMAP.md** · `business_value: 82` · `value_type: user_acquisition`

---

## 6. Plan d'action immédiat (< 72h)

| Priorité | Item | Durée estimée | Impact |
|---|---|---|---|
| 🔴 1 | **BUG-01** : diagnostiquer et corriger auth | 2h | KPI 100 € CA — bloquant |
| 🔴 2 | **SEC-01** : `withTransaction()` dans webhook Stripe | 45 min | Fiabilité 1ère transaction |
| 🟠 3 | **SEC-10** : filtre `revealed_at` CSV export | 15 min | Conformité RG-01 |
| 🟠 4 | **SEC-11** : supprimer `console.log` DB URL + email | 5 min | Hygiène logs + RGPD |
| 🟡 5 | **US-06** : LinkedIn Share consultant | 3h | Acquisition C5 |
| 🟡 6 | **SEC-03** : `timingSafeEqual` CRON_SECRET | 30 min | Sécurité CRON |

---

*Généré automatiquement — Agent AMÉLIORATION · perform-learn.fr · 2026-05-17*
