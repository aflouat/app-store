# refacto.md — Analyse quotidienne · 2026-04-21

## Score global : 7.5/10 ↑

| Dimension | Score | Tendance |
|---|---|---|
| Sécurité OWASP | 7.5/10 | ↑ |
| Qualité code | 7/10 | = |
| Performance | 6/10 | = |
| Dette technique | 8.5/10 | ↑ |

---

## Progrès depuis 2026-04-20 ✓

| Item | Statut |
|---|---|
| Fix CRON_SECRET Bearer (au lieu de query param) | ✅ Fait |
| Fix Multiple PaymentIntents (check PI existant) | ✅ Fait |
| Health check `/api/freelancehub/health` | ✅ Fait |
| RGPD — Droit à l'effacement `DELETE /api/user/me` | ✅ Fait |
| RGPD — Consentement marketing waitlist (migration 014) | ✅ Fait |
| RGPD — CGU acceptées à l'inscription + signature horodatée (IP/UA) | ✅ Fait |
| RGPD — Page CGU `/freelancehub/cgu` | ✅ Fait |
| RGPD — Politique de confidentialité `/freelancehub/privacy` | ✅ Fait |
| RGPD — Mentions légales `/legal` (avec placeholder `[ADRESSE]`) | ✅ Fait (⚠ adresse manquante) |
| KYC — Message générique en 500 (plus de détail serveur) | ✅ Fait |
| Fix prix dynamique depuis `daily_rate` consultant | ✅ Fait |
| Fix bouton Payer (état Chargement/Prêt) | ✅ Fait |

---

## 🔴 Critiques (à corriger avant lancement)

### 1. N+1 Queries dans `/consultant/profile/route.ts` — Insertion de compétences en boucle
**Fichier** : `portal/app/api/freelancehub/consultant/profile/route.ts:58-65`

**Problème** :
```typescript
for (const s of skills) {
  await query(
    `INSERT INTO freelancehub.consultant_skills (consultant_id, skill_id, level) VALUES ($1, $2, $3)...`,
    [consultant.id, s.skill_id, s.level ?? 'intermediate']
  )
}
```
Une requête DB par compétence → O(n) pour N compétences. Avec 10 compétences = 10 aller-retours réseau.

**Fix recommandé** :
```typescript
if (Array.isArray(skills) && skills.length > 0) {
  const values = skills.map((_, i) => `($1, $${i*2+2}, $${i*2+3})`).join(',')
  const params = [consultant.id, ...skills.flatMap(s => [s.skill_id, s.level ?? 'intermediate'])]
  await query(
    `INSERT INTO freelancehub.consultant_skills (consultant_id, skill_id, level)
     VALUES ${values}
     ON CONFLICT (consultant_id, skill_id) DO UPDATE SET level = EXCLUDED.level`,
    params
  )
}
```

---

### 2. N+1 dans `/consultant/slots/bulk/route.ts` — Vérification + insertion en boucle
**Fichier** : `portal/app/api/freelancehub/consultant/slots/bulk/route.ts:42-61`

**Problème** : Pour chaque slot (jusqu'à 70) : un SELECT doublon + un INSERT. Maximum 140 requêtes pour 70 créneaux.

**Fix recommandé** :
```typescript
// 1. Récupérer tous les slots existants en une seule requête
const existing = await query<{ slot_date: string; slot_time: string }>(
  `SELECT slot_date::text, slot_time::text FROM freelancehub.slots
   WHERE consultant_id = $1 AND status != 'cancelled'`,
  [consultant_id]
)
const existingSet = new Set(existing.map(e => `${e.slot_date}|${e.slot_time}`))

// 2. Filtrer les doublons en mémoire
const toInsert = slots.filter(s =>
  dateRegex.test(s.slot_date) && timeRegex.test(s.slot_time) &&
  s.slot_date >= today && !existingSet.has(`${s.slot_date}|${s.slot_time}`)
)

// 3. Batch INSERT unique
if (toInsert.length > 0) {
  const values = toInsert.map((_, i) => `($1, $${i*3+2}, $${i*3+3}, $${i*3+4})`).join(',')
  const params = [consultant_id, ...toInsert.flatMap(s => [s.slot_date, s.slot_time, s.duration_min ?? 60])]
  const rows = await query<{ id: string; slot_date: string; slot_time: string; duration_min: number; status: string }>(
    `INSERT INTO freelancehub.slots (consultant_id, slot_date, slot_time, duration_min)
     VALUES ${values}
     RETURNING id, slot_date::text, slot_time::text, duration_min, status`,
    params
  )
  created.push(...rows)
}
```

---

### 3. Absence de headers de sécurité HTTP (OWASP A05)
**Fichier** : `portal/next.config.mjs:1-4`

**Problème** : Le fichier est entièrement vide (`const nextConfig = {}`). Aucun header de sécurité.
Risques : Clickjacking (X-Frame-Options absent), XSS sans CSP, MIME sniffing.

**Fix** :
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options',        value: 'DENY' },
          { key: 'X-Content-Type-Options',  value: 'nosniff' },
          { key: 'Referrer-Policy',         value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',      value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
}
export default nextConfig
```
*Note : CSP nécessite un inventaire des scripts/styles (Stripe, Resend) → à affiner en C5, mais les 4 headers ci-dessus sont sans risque.*

---

### 4. Mentions légales — placeholder `[ADRESSE]` non remplacé
**Fichier** : `portal/app/legal/page.tsx`

**Problème** : Adresse physique non renseignée (obligation légale — L.R. 29 juillet 1998).

**Fix** : Remplacer `[ADRESSE]` par l'adresse réelle avant le lancement public.

---

## 🟠 Hautes (sprint courant)

### 1. Rate limiting absent sur `/auth/register` (OWASP A04)
**Fichier** : `portal/app/api/freelancehub/auth/register/route.ts`

**Problème** : Aucun rate limiting → énumération d'emails possible, spam DB.

**Fix** : Middleware Vercel Edge ou header-based throttle (ex: 5 req/IP/10min) :
```typescript
const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
// Utiliser Upstash Redis Ratelimit ou un Map in-memory simple pour MVP
```

---

### 2. Stripe instantié à chaque requête (non-singleton)
**Fichiers** : `portal/app/api/freelancehub/client/bookings/[id]/pay/route.ts:36`
           `portal/app/api/freelancehub/client/bookings/[id]/payment-intent/route.ts:44`

**Problème** :
```typescript
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)  // ← dans le handler, à chaque appel
```
Réinstanciation à chaque requête = overhead inutile + mauvais pattern.

**Fix** : Créer `portal/lib/freelancehub/stripe.ts` :
```typescript
import Stripe from 'stripe'
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
})
```

---

### 3. Double SELECT dans `/client/bookings/[id]/pay/route.ts`
**Fichier** : `portal/app/api/freelancehub/client/bookings/[id]/pay/route.ts:81-127`

**Problème** : Deux requêtes quasi-identiques sur la même réservation (email details ligne 81–96, notification details ligne 115–127). Les données pourraient diverger entre les deux lectures.

**Fix** : Fusionner en un SELECT unique :
```typescript
const details = await queryOne<{ ... }>(`SELECT uc.name AS client_name, uc.email,
  c.user_id AS consultant_user_id, uc2.name AS consultant_name, uc2.email AS consultant_email,
  sk.name AS skill_name, s.slot_date::text, s.slot_time::text, b.amount_ht, b.client_id
  FROM freelancehub.bookings b ... WHERE b.id = $1`, [bookingId])
// Réutiliser `details` pour email ET notification
```

---

### 4. Export CSV sans limite de résultats
**Fichier** : `portal/app/api/freelancehub/admin/export-csv/route.ts`

**Problème** : Charge toute la table `bookings` en mémoire (0 LIMIT). OOM si > 50k lignes.

**Fix** : Ajouter `LIMIT 10000 OFFSET $n` ou streaming progressif.

---

### 5. Pool PostgreSQL `max: 10` inadapté au serverless
**Fichier** : `portal/lib/freelancehub/db.ts:6`

**Problème** :
```typescript
const pool = new Pool({ max: 10, ... })
```
Sur Vercel chaque fonction Lambda est un processus Node distinct. `max: 10` par instance × N instances simultanées = saturation rapide des 100 connexions PostgreSQL. 

**Fix recommandé C5** : `max: 2` + PgBouncer à moyen terme.

---

## 🟡 Moyennes (backlog)

### 1. `user_id` consultant exposé dans les résultats de matching
**Fichier** : `portal/lib/freelancehub/matching.ts:130`

**Problème** : `user_id: c.user_id` retourné au client avant révélation. Permet de relier un consultant anonyme à d'autres endpoints.

**Fix** : Supprimer `user_id` de l'objet retourné (il n'est pas utilisé côté client pour le booking).

---

### 2. Timezone emails rappels
**Fichier** : `portal/app/api/freelancehub/cron/reminders/route.ts:83`

**Problème** : `new Date(b.slot_date + 'T00:00:00Z')` force UTC. Si consultants/clients en timezone ±2h, le texte "demain" peut être incorrect.

**Fix C5** : Stocker la timezone utilisateur en DB, l'utiliser au rendu.

---

### 3. Fire-and-forget emails sans fallback
**Fichiers** : `portal/app/api/freelancehub/client/bookings/[id]/pay/route.ts:79-149`

**Problème** : Erreurs email catchées et loggées, mais silencieuses. Aucune retry, aucune alerte admin.

**Fix C5** : Table `email_failures` ou webhook Resend pour retry automatique.

---

### 4. Magic numbers éparpillés
**Fichiers** : `portal/lib/freelancehub/matching.ts:28` (DEFAULT_HOURLY_RATE = 85), `booking/route.ts` (0.15 / 0.85 commission), bulk slots:24 (MAX = 70)

**Fix** : Créer `portal/lib/freelancehub/constants.ts` (roadmap C4).

---

## 🟢 Faibles / veille

### 1. `nextauth` encore en beta
**Package** : `next-auth@5.0.0-beta.30`

Beta stable pour production mais surveiller les CVE sur la v5.

### 2. Pas de validation schema (Zod)
Validation manuelle dans chaque route → fragile. Migration progressive vers `zod` recommandée en C5.

### 3. Mentions légales adresse placeholder
Voir critique #4 ci-dessus.

---

## Bonnes pratiques confirmées ✓

- ✓ Requêtes SQL paramétrées partout ($1, $2) — pas d'injection SQL (OWASP A03)
- ✓ Vérification d'ownership systématique (user_id / consultant_id) — RBAC strict (A01)
- ✓ Transactions ACID avec `withTransaction()` + SELECT FOR UPDATE (race conditions)
- ✓ Middleware Edge Runtime RBAC (middleware.ts) — protection route complète
- ✓ bcrypt 12 rounds sur les mots de passe (A02)
- ✓ JWT sessions NextAuth v5, Edge Runtime safe (auth.config.ts séparé)
- ✓ Stripe webhook signature HMAC validée (A08)
- ✓ `revealed_at` anonymisation respectée dans toutes les queries
- ✓ `SELECT FOR UPDATE` sur slots pour booking concurrent
- ✓ Vérification `metadata.booking_id` Stripe (anti-replay)
- ✓ CRON_SECRET via `Authorization: Bearer` uniquement (non plus query param)
- ✓ Pages légales CGU + Confidentialité + Mentions légales en place
- ✓ Signature CGU horodatée (IP + UA) en base
- ✓ Droit à l'effacement RGPD implémenté (soft delete + anonymisation)
- ✓ Health check endpoint opérationnel
- ✓ KYC — upload MinIO avec validation MIME + taille 5 Mo max

---

## Checklist OWASP Top 10

| # | Catégorie | Statut | Détail |
|---|---|---|---|
| A01 | Broken Access Control | ✅ Bon | RBAC Edge + ownership checks partout |
| A02 | Cryptographic Failures | ✅ Bon | bcrypt 12, HTTPS, secrets en env vars |
| A03 | Injection | ✅ Bon | 100% requêtes paramétrées |
| A04 | Insecure Design | ⚠ Partiel | Rate limiting manquant sur /auth/register |
| A05 | Security Misconfiguration | 🔴 Critique | next.config.mjs vide — aucun header sécurité |
| A06 | Vulnerable Components | ✅ Bon | Next.js récent, Stripe 22, bcryptjs 3 |
| A07 | Auth Failures | ✅ Bon | NextAuth v5, JWT, middleware RBAC |
| A08 | Software Integrity | ✅ Bon | Stripe webhook HMAC validé |
| A09 | Logging & Monitoring | ⚠ Partiel | Logs serveur OK, pas d'audit log DB centralisé |
| A10 | SSRF | ✅ Bon | Pas de client HTTP externe contrôlable |

---

## Checklist lancement public (30/04/2026)

| Item | Statut |
|---|---|
| ✅ RGPD — Page CGU | Fait |
| ✅ RGPD — Politique de confidentialité | Fait |
| ✅ RGPD — Mentions légales | Fait (⚠ adresse placeholder) |
| ✅ RGPD — Consentement email marketing | Fait |
| ✅ RGPD — Droit à l'effacement | Fait |
| ✅ RGPD — CGU acceptées + signature horodatée | Fait |
| ✅ Fix CRON_SECRET | Fait |
| ✅ Fix Multiple PaymentIntents | Fait |
| ✅ Fix KYC erreur exposition | Fait |
| ✅ Health check `/health` | Fait |
| 🔴 Headers sécurité HTTP (X-Frame, nosniff) | **À faire** |
| 🟠 Adresse mentions légales [ADRESSE] | **À compléter** |
| 🟠 NDA automatique Phase 1 | Pending |
| 🟠 Offre Early Adopter (badge Fondateur, 10%) | Pending |
| 🟠 Landing → CTA portail /register | Pending |
| 🟠 Email lancement waitlist (J-3 / J-0) | Pending |
| 🟡 Facture PDF post-paiement | Backlog C4 |
| 🟡 `constants.ts` centralisation | Backlog C4 |

---

## Plan d'action Pareto (80% résultats, 20% effort)

| # | Action | Impact | Effort | Fichier |
|---|--------|--------|--------|---------|
| 1 | Headers sécurité HTTP (`next.config.mjs`) | Sécurité OWASP A05 | **15 min** | `next.config.mjs` |
| 2 | Compléter adresse dans mentions légales | Légal obligatoire | **5 min** | `app/legal/page.tsx` |
| 3 | Stripe singleton (`lib/stripe.ts`) | Perf + pattern | **15 min** | 2 fichiers |
| 4 | Fix N+1 skills insert | Perf DB | **30 min** | `consultant/profile/route.ts` |
| 5 | Fix N+1 slots/bulk | Perf DB critique | **45 min** | `slots/bulk/route.ts` |
| 6 | Fusionner 2 SELECT dans `/pay` | Perf + cohérence | **20 min** | `client/bookings/[id]/pay/route.ts` |
| 7 | Rate limiting `/auth/register` | Sécurité A04 | **60 min** | `auth/register/route.ts` |
| 8 | Export CSV paginé | Stabilité | **30 min** | `admin/export-csv/route.ts` |
| 9 | Pool DB `max: 2` | Stabilité serverless | **5 min** | `lib/db.ts` |
| 10 | Masquer `user_id` dans matching | Sécu IDOR | **10 min** | `lib/matching.ts` |

**Quick wins (#1, #2, #3, #9, #10) = 50 min → score OWASP 7.5 → 8.5**

---

**Confiance** : 90% (analyse statique, 16 fichiers lus, agent d'exploration indépendant)
**Date** : 2026-04-21
**Prochaine revue** : 2026-04-22
