# refacto.md — perform-learn.fr · Analyse technique quotidienne

> **Date** : 2026-05-01 · **Version** : v1.3.0 · **Analyste** : Claude Sonnet 4.6
>
> Ce fichier est régénéré à chaque session. Il est la **baseline** de l'état technique courant.
> Toute dette non listée ici est considérée **non connue** — ajouter avant de fixer.

---

## Synthèse exécutive

| Catégorie | Haute | Moyenne | Basse |
|---|---|---|---|
| Sécurité OWASP | 2 | 3 | 1 |
| Dette technique | 3 | 2 | 2 |
| **Total** | **5** | **5** | **3** |

**Blocants scalabilité** : S-01 (double paiement), S-02 (transaction isolation), T-01 (logique métier éparpillée → régressions garanties)

---

## 1. Sécurité OWASP

### S-01 — Race condition double PaymentIntent ❌ HAUTE
**Fichier** : `portal/app/api/freelancehub/client/bookings/[id]/payment-intent/route.ts` (lignes 52–66)

Le lookup d'un PI existant et la création d'un nouveau PI ne sont pas atomiques. Deux requêtes concurrentes peuvent toutes deux trouver «aucun PI existant» et créer deux charges Stripe pour la même réservation.

**Fix C5** : `SELECT stripe_payment_id FROM freelancehub.payments WHERE booking_id=$1 FOR UPDATE` dans une transaction.

---

### S-02 — Transaction manquante booking+payment ❌ HAUTE
**Fichier** : `portal/app/api/freelancehub/client/bookings/[id]/pay/route.ts` (lignes 71–88)

`UPDATE bookings SET status='confirmed'` + `INSERT INTO payments` sont deux requêtes séparées. Si l'INSERT échoue, le booking est `confirmed` sans paiement → état corrompu irréversible.

**Fix C5** : Envelopper dans `withTransaction()` — les deux opérations en bloc atomique.

---

### S-03 — Timing attack sur CRON_SECRET ❌ HAUTE
**Fichiers** :
- `portal/app/api/govern/tasks/notify/route.ts:11`
- `portal/app/api/govern/smoke-test/route.ts:11`
- `portal/app/api/freelancehub/cron/reminders/route.ts:28`

Comparaison `bearer === \`Bearer ${secret}\`` via `===` vulnérable à l'analyse temporelle.

**Fix C5** :
```typescript
import { timingSafeEqual } from 'crypto'
const ok = timingSafeEqual(Buffer.from(bearer ?? ''), Buffer.from(`Bearer ${secret}`))
```

---

### S-04 — Path traversal KYC partiel ⚠️ MOYENNE
**Fichier** : `portal/app/api/freelancehub/admin/kyc-presign/route.ts:40`

Guard vérifie `..`, `%2e`, `%2E`, `\0` mais pas `%252e` (double encodage) ni équivalents Unicode.

**Fix C5** : Valider contre `^kyc\/[a-zA-Z0-9_\-]+\/[a-zA-Z0-9_\-\.]+$` après `decodeURIComponent()`.

---

### S-05 — Race condition Early Adopter ❌ MOYENNE
**Fichier** : `portal/app/api/freelancehub/admin/consultants/[id]/kyc/route.ts` (lignes 46–51)

`COUNT(*)` et `UPDATE is_early_adopter` ne sont pas atomiques → deux validations simultanées peuvent dépasser le plafond de 20 consultants fondateurs.

**Fix C5** : Sous-requête atomique dans le UPDATE :
```sql
UPDATE freelancehub.consultants
SET kyc_status = 'validated',
    is_early_adopter = (SELECT COUNT(*) < 20 FROM freelancehub.consultants WHERE kyc_status = 'validated')
WHERE id = $1
```

---

### S-06 — Notes KYC interpolées dans notification ❌ BASSE
**Fichier** : `portal/app/api/freelancehub/admin/consultants/[id]/kyc/route.ts:81`

`notes.trim()` (saisie admin) directement interpolé dans le message de notification. Risque XSS stocké si le système d'email renvoie du HTML non sanitisé.

**Fix C5** : Sanitiser `notes` ou utiliser un template avec placeholder non-interpolé.

---

## 2. Dette technique

### T-01 — Logique métier éparpillée ❌ HAUTE (cause principale des régressions)

Trois items ROADMAP ❌ depuis C4 créent une dette en cascade :

| Manquant | Impact |
|---|---|
| `constants.ts` | `STATUS_MAP` dupliqué dans 5+ fichiers — modifier un endroit ne propage pas aux autres |
| `pricing.ts` | `computePricing()` dans `matching.ts` ET `BookingModal.tsx`, `buildPricing()` doublon — prix incohérents possibles |
| `types.ts` incomplet | `BookingRow`, `PaymentRow`, `AvailableSlot` définis localement par composant |

**Fix C5 (priorité absolue)** :
1. `portal/lib/freelancehub/constants.ts` — migrer tous les STATUS_MAP + BOOKING_TRANSITIONS
2. `portal/lib/freelancehub/pricing.ts` — `computePricing()` unique + `fmtEur(cents)`
3. Compléter `portal/lib/freelancehub/types.ts` — déplacer les types locaux

---

### T-02 — Emails fire-and-forget silencieux ❌ HAUTE
**Fichiers** : `portal/app/api/webhooks/stripe/route.ts:50–61`, `portal/app/api/freelancehub/cron/reminders/route.ts:71–74`, et 10+ autres routes

`.catch(() => null)` partout → pannes d'envoi d'email jamais remontées. Impossible de diagnostiquer un échec entre sessions. Item S9 ROADMAP C4 ❌ non livré.

**Fix C5** :
```typescript
.catch((err) => console.error('[email:error]', { template, to, err: err.message }))
```

---

### T-03 — Aucun test sur les flux critiques ❌ HAUTE

Le CI vérifie `tsc` + `next build` mais aucun test couvre :
- Flow booking → payment → review → fund release
- Auth (login, forgot-password, Google OAuth)
- Algorithme de matching

**Preuve** : La régression login introduite par `feat(forgot-password)` (commit 7a71300) aurait été détectée par un test auth basique.

**Fix C5** :
1. Vitest unit : `computePricing()`, `matching score`, transitions de statut
2. Playwright E2E minimal : login + booking + payment (cartes test Stripe)

---

### T-04 — Rate limiting in-memory inefficace ⚠️ MOYENNE
**Fichier** : `portal/middleware.ts:25–50`

Rate limiter en mémoire Edge → reset à chaque redéploiement Vercel. Un attaquant attend simplement un deploy pour contourner les limites. Déjà planifié ROADMAP C5.

**Fix C5** : Upstash Redis ou Vercel KV.

---

### T-05 — NextAuth v5 beta en production ⚠️ MOYENNE
**Fichier** : `portal/package.json` → `"next-auth": "^5.0.0-beta.30"`

API instable entre versions beta. Le `^` permet des mises à jour auto-breaking lors d'un `npm install`.

**Fix immédiat** : Épingler à `"5.0.0-beta.30"` (supprimer le `^`).

---

### T-06 — Index manquants sur FK ⚠️ BASSE
**Fichier** : `migrations/006_freelancehub_v1.sql`

Colonnes sans index : `payments.booking_id`, `reviews.booking_id`, `reviews.reviewer_id`, `reviews.reviewee_id`.

**Fix C6** : `020_missing_indexes.sql` avec `CREATE INDEX CONCURRENTLY`.

---

### T-07 — Contraintes FK sans action de suppression ⚠️ BASSE
**Fichier** : `migrations/006_freelancehub_v1.sql`

`bookings`, `payments`, `reviews` ont des FK sans `ON DELETE` explicite → impossible de supprimer un utilisateur même pour effacement RGPD.

**Fix C6** : Définir la politique `ON DELETE` explicitement selon la rétention RGPD choisie.

---

## 3. Agilité & processus

### A-01 — Triangle auth fragile non documenté (cause des régressions auth)

Le lien `auth.config.ts (Edge)` → `auth.ts (Node.js)` → `middleware.ts` n'est pas explicitement documenté comme zone à risque. Toute modification de `auth.ts` peut casser le middleware Edge.

**Règle à ajouter dans CLAUDE.md** : Avant tout commit touchant `auth.ts`, valider `npm run build` et tester le login manuellement.

### A-02 — refacto.md absent entre sessions

Ce fichier sert de baseline à chaque session. S'il est absent, Claude n'a pas de contexte sur les dettes connues et risque de réintroduire des problèmes déjà identifiés.

**Règle** : Régénérer ce fichier en début de session si absent ou daté de > 48h.

### A-03 — FEATURES.md éditable sans commit

FEATURES.md était modifié (annotations parasites) sans commit à l'ouverture de cette session. Claude peut lire des règles divergentes du code déployé.

**Règle** : Ne jamais laisser FEATURES.md en état `modified` non commité.

---

## 4. État du repo à cette date

```
Branche       : main
Dernier commit: e9e01ea feat(portal): mot de passe oublié — flow complet
Migrations    : 001 → 019 appliquées
Nettoyage     : mon_fichier.md supprimé ✅, FEATURES.md restauré ✅
```

### Items C4 — état réel

| Item | Statut |
|---|---|
| Fix montant côté serveur [C1] | ✅ 30/04 |
| Fix notification fonds [C2] | ✅ 30/04 |
| Enforcer monthlyCap IA [N1] | ✅ 30/04 |
| CSV injection [S16] | ✅ 30/04 |
| S3 presign validation [S12] | ✅ 30/04 |
| Refund handler [S13] | ✅ 01/05 |
| Fix password_hash [S15] | ✅ 01/05 |
| KYC consultant | ✅ 30/04 |
| NDA Phase 1 | ✅ 30/04 |
| Early Adopter | ✅ 30/04 |
| Landing page CTA | ✅ 30/04 |
| Email lancement | ✅ 30/04 |
| Système referral (migration 018) | ✅ 01/05 |
| GTM events | ✅ 01/05 |
| CSP + HSTS | ✅ 30/04 |
| Pool PostgreSQL | ✅ 30/04 |
| CI/CD GitHub Actions | ✅ 01/05 |
| **Mot de passe oublié (migration 019)** | ✅ 01/05 *(non listé ROADMAP → à ajouter)* |
| Réduire metadata Stripe [S6] | ❌ → reporter C5 |
| Logger erreurs email [S9] | ❌ → C5 (voir T-02) |
| Facture PDF | ❌ → C5 |
| constants.ts | ❌ → C5 priorité haute |
| pricing.ts | ❌ → C5 priorité haute |
| types.ts consolidation | ❌ → C5 |
