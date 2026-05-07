# refacto.md — Analyse quotidienne · perform-learn.fr

> **Date** : 2026-05-07 · **Analyste** : Claude Sonnet 4.6 (Agent AMÉLIORATION)
> **Périmètre** : monorepo `app-store` — `apps/marketplace/`, `apps/sante/`, `packages/core-*/`
> **Axe** : Sécurité OWASP · Dette technique · Agilité pipeline

---

## Résumé exécutif

| Axe | CRITIQUE | HAUTE | MOYENNE | FAIBLE | Total |
|---|---|---|---|---|---|
| Sécurité OWASP | 2 | 5 | 2 | 1 | **10** |
| Dette technique | 2 | 4 | 4 | 1 | **11** |
| Agilité | 2 | 1 | 3 | 1 | **7** |
| **TOTAL** | **6** | **10** | **9** | **3** | **28** |

**Nouveaux items hors ROADMAP.md** : 2 (SEC-NEW-01, SEC-NEW-02) — à soumettre à validation DG.

---

## 1. SÉCURITÉ OWASP

### CRITIQUE

#### SEC-01 — Transaction isolation payment *(déjà en ROADMAP.md)*
- **Fichier** : `apps/marketplace/app/api/freelancehub/client/bookings/[id]/pay/route.ts` · lignes 71–88
- **Problème** : `UPDATE bookings` + `INSERT INTO payments` en deux requêtes séparées. Si l'INSERT échoue, booking reste `confirmed` sans paiement — état corrompu irréversible.
- **Fix** : `withTransaction()` comme dans `bookings/route.ts`.
- **Statut ROADMAP** : `[ ]` à faire — business_value 95

#### SEC-NEW-01 — CSV export expose consultants avant `revealed_at` *(NOUVEAU — hors ROADMAP.md)*
- **Fichier** : `apps/marketplace/app/api/freelancehub/admin/export-csv/route.ts` · lignes 49–94
- **Problème** : La requête SQL n'a pas de filtre `revealed_at IS NOT NULL`. Les emails et noms de consultants anonymes sont exportés en CSV avant paiement du client — **violation directe de RG-01**.
- **Fix** : Ajouter `AND (b.revealed_at IS NOT NULL)` sur les colonnes `consultant_name`, `consultant_email` dans la requête, ou remplacer par `'Anonyme'` si `revealed_at IS NULL`.
- **Sévérité** : CRITIQUE — RG-01
- **Statut ROADMAP** : absent — à soumettre DG

---

### HAUTE

#### SEC-03 — Timing-safe CRON_SECRET *(déjà en ROADMAP.md)*
- **Fichiers** :
  - `apps/marketplace/app/api/freelancehub/cron/reminders/route.ts:30`
  - `apps/marketplace/app/api/govern/tasks/notify/route.ts:11`
  - `apps/marketplace/app/api/govern/smoke-test/route.ts:11`
- **Problème** : Comparaison `===` sur bearer token — vulnérable aux timing attacks.
- **Fix** : `crypto.timingSafeEqual(Buffer.from(bearer ?? ''), Buffer.from('Bearer ' + secret))`
- **Statut ROADMAP** : `[ ]` à faire — business_value 75

#### SEC-04 — Metadata Stripe expose les marges *(déjà en ROADMAP.md)*
- **Fichier** : `apps/marketplace/app/api/freelancehub/client/bookings/[id]/payment-intent/route.ts` · lignes 72–81
- **Problème** : `amount_ht`, `tva`, `platform_commission`, `consultant_net` visibles dans les logs Stripe.
- **Fix** : Garder uniquement `{ booking_id, amount_ttc }`.
- **Statut ROADMAP** : `[ ]` à faire — business_value 65

#### SEC-05 — Race condition Early Adopter *(déjà en ROADMAP.md)*
- **Fichier** : `apps/marketplace/app/api/freelancehub/admin/consultants/[id]/kyc/route.ts`
- **Problème** : SELECT COUNT + UPDATE non atomique — deux validations simultanées peuvent dépasser le cap des 20.
- **Fix** : Sous-requête atomique SQL (voir ROADMAP.md §SEC-05).
- **Statut ROADMAP** : `[ ]` à faire — business_value 75

#### SEC-06 — CSP headers incomplets *(déjà en ROADMAP.md)*
- **Fichier** : `apps/marketplace/next.config.mjs` · lignes 48–57
- **Problème** : Manquent `object-src 'none'`, `form-action 'self'`, `frame-ancestors 'none'`. `data:` présent dans `img-src`.
- **Fix** : Compléter le bloc CSP (voir ROADMAP.md §SEC-06).
- **Statut ROADMAP** : `[ ]` à faire — business_value 68

#### SEC-07 — Path traversal KYC double encodage *(déjà en ROADMAP.md)*
- **Fichier** : `apps/marketplace/app/api/freelancehub/admin/kyc-presign/route.ts` · lignes 26–42
- **Problème** : Check `!key.includes('..')` contournable avec `%2e%2e`.
- **Fix** : Regex `^kyc\/[a-zA-Z0-9_\-]+\/[a-zA-Z0-9_\-\.]+$` après `decodeURIComponent()`.
- **Statut ROADMAP** : `[ ]` à faire — business_value 60

---

### MOYENNE

#### SEC-NEW-02 — Console.log DATABASE_URL dans register *(NOUVEAU — hors ROADMAP.md)*
- **Fichier** : `apps/marketplace/app/api/freelancehub/auth/register/route.ts` · ligne 28
- **Problème** : `console.log('[register] DB_HOST:', process.env.DATABASE_URL?.replace(...))` — logue l'URL DB même masquée, informations infra visibles dans Vercel logs.
- **Fix** : Supprimer ce log.
- **Sévérité** : MOYENNE

#### SEC-08 — Atomicité chat budget cap *(déjà en ROADMAP.md)*
- **Fichier** : `apps/marketplace/lib/freelancehub/chat-router.ts:162`
- **Fix** : INSERT…ON CONFLICT avec clause WHERE sur le cap.
- **Statut ROADMAP** : `[ ]` à faire — business_value 55

---

### FAIBLE

#### SEC-09 — XSS stocké notes KYC *(déjà en ROADMAP.md)*
- **Fichier** : `apps/marketplace/app/api/freelancehub/admin/consultants/[id]/kyc/route.ts:81`
- **Fix** : Sanitiser `notes.trim()` avant interpolation email.
- **Statut ROADMAP** : `[ ]` à faire — business_value 45

---

## 2. DETTE TECHNIQUE

### CRITIQUE

#### TD-02 — NextAuth v5 beta non épinglé *(déjà en ROADMAP.md)*
- **Fichier** : `apps/marketplace/package.json` · dépendances
- **Problème** : `"next-auth": "^5.0.0-beta.30"` — le `^` autorise des breaking changes silencieux au prochain `npm install`.
- **Fix** : Supprimer le `^`.
- **Statut ROADMAP** : `[ ]` à faire — business_value 70 · **Fix 2 minutes**

#### Couverture de tests insuffisante
- **30 routes API critiques** vs **7 fichiers test unitaires**.
- Routes sans tests : `payment-intent`, `pay`, `register`, `KYC presign`, `export-csv`, toutes les routes admin.
- **Impact** : régressions silencieuses possibles.

---

### HAUTE

#### TD-01 — Constants dupliqués dans 6+ fichiers *(déjà en ROADMAP.md)*
- **Scope** : `BOOKING_STATUS_MAP`, `PAYMENT_STATUS_MAP`, taux commission (0.15, 0.13, 0.10)
- **Fichiers concernés** : `matching.ts`, `payment-intent/route.ts`, `pay/route.ts`, `kyc/route.ts`…
- **Fix** : Centraliser dans `apps/marketplace/lib/freelancehub/constants.ts`.
- **Statut ROADMAP** : `[ ]` à faire — business_value 70

#### TD-03 — Pricing dupliqué + 41 conversions cents inline *(déjà en ROADMAP.md)*
- **Scope** : `computePricing()` dans `matching.ts` et `BookingModal.tsx`
- **Fix** : `apps/marketplace/lib/freelancehub/pricing.ts` — `computePricing()` + `fmtEur(cents)`.
- **Statut ROADMAP** : `[ ]` à faire — business_value 65

#### TD-05 — Types dupliqués par route *(déjà en ROADMAP.md)*
- **Scope** : `BookingRow`, `PaymentRow`, `AvailableSlot` redéfinis inline.
- **Fix** : `apps/marketplace/lib/freelancehub/types.ts` partagé.
- **Statut ROADMAP** : `[ ]` à faire — business_value 60

#### TD-10 — Validation manuelle (pas Zod) *(déjà en ROADMAP.md)*
- **Fichiers** : `auth/register/route.ts`, `auth/forgot-password/route.ts`, `auth/reset-password/route.ts`
- **Fix** : Migrer vers Zod.
- **Statut ROADMAP** : `[ ]` à faire — business_value 62

---

### MOYENNE

#### TD-04 — Timezone sans `Z` *(déjà en ROADMAP.md)* — business_value 65
#### TD-06 — Erreurs email `.catch(() => null)` silencieuses *(déjà en ROADMAP.md)* — business_value 60
#### TD-07 — Skills sync non transactionnel *(déjà en ROADMAP.md)* — business_value 60
#### TD-08 — S3 client + Stripe réinstanciés par requête *(déjà en ROADMAP.md)* — business_value 60

---

## 3. AGILITÉ & PIPELINE

### CRITIQUE

#### BUG-01 — Stabilisation login/register
- **ROADMAP.md** : `[ ]` à faire · business_value 95
- **Urgence** : KPI 100 € CA au 31/05/2026 — aucune session possible si auth cassée.
- **Action** : Initier branche `feat/BUG-01` en priorité 1.

#### KPI 100 € CA — Deadline J+24
- **Deadline** : 31/05/2026
- **Risque** : SEC-01 (booking corrompu) + BUG-01 (auth KO) bloquent la 1ère transaction réelle.
- **Action** : SEC-01 + BUG-01 avant toute autre US ce cycle.

---

### HAUTE

#### Déploiement sante KO × 3 — Corrigé en session
- **Root cause** : Next.js 16 active Turbopack par défaut. Webpack config sans `turbopack: {}` → WorkerError.
- **Fix appliqué** : commit `f013719` — `turbopack: {}` dans `apps/sante/next.config.mjs`.
- **Leçon** : Toute nouvelle app Next.js 16 avec config webpack doit déclarer `turbopack: {}`.

---

### MOYENNE

#### Plan acquisition C4 — statut DECISIONS.md à mettre à jour
- KPI : 10 consultants + 5 clients waitlist avant 30/04 (date passée).
- **Action DG** : Documenter le résultat réel dans DECISIONS.md.

#### Plan 100 € CA — suivi actif recommandé
- **Prérequis** : BUG-01 + SEC-01 livrés avant la 1ère session facturée.

#### Smoke-test CI — timeout fragile
- **Fichier** : `.github/workflows/ci.yml` · job smoke-test
- **Problème** : 24 tentatives × 10s = 4 min — flaky si Vercel lent.
- **Fix** : 16 tentatives × 15s.

---

### FAIBLE

#### DONE.md — Monitoring post-release 30/04
- Aucun signalement de régression post-lancement visible.
- **Action** : Vérifier Umami signups, Vercel 5xx, payments/refunds.

---

## 4. État scaffold SantéApp

| Composant | État |
|---|---|
| `next.config.mjs` | ✅ Turbopack fix appliqué (session 2026-05-07) |
| `middleware.ts` | ⚠ Avertissement Next.js 16 : convention `middleware` → `proxy` (cosmétique) |
| `auth.config.ts` | ✅ Edge-safe (aucun import bcryptjs/pg) |
| `auth.ts` | ✅ Node.js only |
| `/api/health` | ✅ Route health opérationnelle |
| Migrations DB | ⚠ `migrations/sante/001_sante_schema.sql` défini, non appliqué en prod |
| Tests | ❌ 0 test unitaire — à créer avec la 1ère US fonctionnelle |

---

## 5. Nouveaux items à soumettre à validation DG

> Ces items sont absents de ROADMAP.md. Ils doivent passer par DECISIONS.md avant ajout.

| ID proposé | Titre | Sévérité | business_value estimé | value_type |
|---|---|---|---|---|
| SEC-NEW-01 | CSV export : filtrer `revealed_at IS NOT NULL` (RG-01) | CRITIQUE | 90 | strategic_positioning |
| SEC-NEW-02 | Supprimer `console.log` DATABASE_URL dans register | MOYENNE | 55 | strategic_positioning |

---

## 6. Plan d'action immédiat (< 48h)

| Priorité | Item | Durée estimée | Bloquant pour |
|---|---|---|---|
| 1 | **BUG-01** : diagnostiquer et corriger auth | 2h | KPI 100 € CA |
| 2 | **SEC-01** : transaction atomique `pay/route.ts` | 30 min | Fiabilité 1ère transaction |
| 3 | **SEC-NEW-01** : filtre `revealed_at` CSV export | 15 min | RG-01 conformité |
| 4 | **SEC-03** : `timingSafeEqual` dans 3 routes CRON | 30 min | Sécurité CRON |
| 5 | **SEC-NEW-02** : supprimer `console.log` DB URL | 5 min | Hygiène logs |
| 6 | **TD-02** : épingler NextAuth `5.0.0-beta.30` | 2 min | Stabilité build |

---

*Généré automatiquement — Agent AMÉLIORATION · perform-learn.fr · 2026-05-07*
