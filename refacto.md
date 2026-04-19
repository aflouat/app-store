# refacto.md — Analyse Technique perform-learn.fr
> **Généré le** : 2026-04-19 · **Version analysée** : v1.3.0 · **Branche** : claude/pensive-tesla-T6YSV

---

## 1. Résumé exécutif

| Domaine | Score | Criticité |
|---|---|---|
| Sécurité (OWASP) | 6.5 / 10 | 🔴 3 vulnérabilités actives |
| Dette technique | 5.5 / 10 | 🟠 Risques d'exploitation à corriger avant lancement |
| Agilité / maintenabilité | 4 / 10 | 🟠 Zéro test, pas de CI véritable |
| Couverture fonctionnelle C4 | 75 % | 🟡 Pages légales manquantes |

**Priorité absolue avant le 30 avril** : corriger les 3 vulnérabilités de sécurité actives (CRON_SECRET query param, multiple PaymentIntents, exposition d'erreur KYC).

---

## 2. Diagnostic Sécurité — OWASP Top 10

### 🔴 A01 — Broken Access Control

#### Vulnérabilité 1 : CRON_SECRET accepté en query param
**Fichier** : `portal/app/api/freelancehub/cron/reminders/route.ts:28-29`

```typescript
// ACTUEL — dangereux
const secret = authHeader?.replace('Bearer ', '') ?? req.nextUrl.searchParams.get('secret')
```

**Risque** : le secret apparaît en clair dans les logs Vercel, logs CDN, et logs proxy. Rotation imposée si compromis.

**Correction** :
```typescript
// CORRIGÉ — header uniquement
const secret = authHeader?.replace('Bearer ', '')
if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

#### Vulnérabilité 2 : N+1 INSERT non transactionnel dans profile/route.ts
**Fichier** : `portal/app/api/freelancehub/consultant/profile/route.ts`

La synchronisation des skills supprime toutes les compétences et réinsère chacune dans une boucle `for` sans transaction — une erreur partielle laisse le profil dans un état incohérent.

**Correction** :
```typescript
// Utiliser une seule requête batch via unnest
await queryTx(client,
  `INSERT INTO freelancehub.consultant_skills (consultant_id, skill_id, level)
   SELECT $1, skill_id, level
   FROM unnest($2::int[], $3::text[]) AS t(skill_id, level)`,
  [consultantId, skills.map(s => s.skill_id), skills.map(s => s.level)]
)
```

---

### 🔴 A02 — Cryptographic Failures

#### Vulnérabilité 3 : Multiple PaymentIntents pour la même réservation
**Fichier** : `portal/app/api/freelancehub/client/bookings/[id]/payment-intent/route.ts`

Chaque appel crée un nouveau `PaymentIntent` Stripe sans vérifier s'il en existe déjà un pour ce `booking_id`. Si le client clique plusieurs fois, plusieurs intents sont créés → risque de double-charge, difficulté de réconciliation comptable.

**Correction** :
```typescript
// Avant stripe.paymentIntents.create, chercher un intent existant
const existingPayments = await stripe.paymentIntents.search({
  query: `metadata['booking_id']:'${bookingId}' AND status:'requires_payment_method'`,
})
if (existingPayments.data.length > 0) {
  return NextResponse.json({ client_secret: existingPayments.data[0].client_secret })
}
```

---

### 🟠 A05 — Security Misconfiguration

#### Exposition d'erreur interne dans le KYC
**Fichier** : `portal/app/api/freelancehub/consultant/kyc/route.ts:97`

```typescript
// ACTUEL — fuite d'info interne
return NextResponse.json({ error: `Erreur serveur: ${msg}` }, { status: 500 })
```

`msg` peut contenir des détails internes (paths MinIO, stack trace). À corriger :
```typescript
console.error('[kyc] internal error:', msg)
return NextResponse.json({ error: 'Erreur lors du traitement du document.' }, { status: 500 })
```

#### Non-null assertions sans validation de démarrage
Partout dans le code : `process.env.STRIPE_SECRET_KEY!`, `process.env.MINIO_ACCESS_KEY!`. Si une variable manque en prod, Next.js plante silencieusement à l'exécution plutôt qu'au démarrage.

---

### 🟡 A07 — Identification and Authentication Failures

| Problème | Fichier | Impact |
|---|---|---|
| Aucun rate limiting sur `/auth/register` | `auth/register/route.ts` | Création massive de comptes bots |
| Aucun rate limiting sur le login NextAuth | `auth.ts` | Brute-force possible |
| JWT sans `maxAge` explicite | `auth.config.ts` | Session illimitée (NextAuth défaut = 30j) |
| Mot de passe : 8 chars min uniquement | `auth/register/route.ts:12` | Faiblesse acceptable en MVP |

---

### 🟡 A09 — Security Logging and Monitoring

- Aucune trace d'audit pour les actions critiques (paiement, validation KYC, transition booking)
- Logs `console.error` non structurés → non agrégables dans Netdata / Umami
- Pas d'alerte en cas d'échec répété d'authentification

---

## 3. Diagnostic Dette Technique

### 🔴 Pool de connexions PostgreSQL vs Serverless

**Fichier** : `portal/lib/freelancehub/db.ts:5`

```typescript
const pool = new Pool({ max: 10, ... })
```

Chaque **instance Lambda Vercel** crée son propre pool de 10 connexions. Avec 10 lambdas parallèles = 100 connexions ouvertes sur PostgreSQL 16 (limite par défaut : 100). En charge, cela provoque des `connection timeout`.

**Solution C5** : déployer PgBouncer en mode transaction sur le VPS, ou passer `max: 2` à court terme.

---

### 🟠 Client Stripe instancié à chaque requête

**Fichiers** : `payment-intent/route.ts`, `pay/route.ts`

```typescript
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)  // à chaque appel
```

**Correction** : singleton dans `lib/freelancehub/stripe.ts` :
```typescript
import Stripe from 'stripe'
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-04-10' })
```

---

### 🟠 Absence totale de tests

| Périmètre | Fichiers de test | Verdict |
|---|---|---|
| Unit tests (matching, pricing) | 0 | ❌ |
| Integration tests (API routes) | 0 | ❌ |
| E2E (booking flow) | 0 | ❌ |
| Configuration test runner | 0 | ❌ |

Le flow critique **recherche → booking → paiement → révélation** n'est pas couvert. Chaque déploiement est un risque de régression.

**Simulation E2E virtuelle — résultat sous-agent** :

| Scénario | Statut simulé | Risque identifié |
|---|---|---|
| Inscription consultant | ✅ OK (code correct) | Pas de rate limiting |
| Matching avec budget | ✅ OK | computePricing non testé aux limites |
| Booking + slot lock | ✅ OK | N+1 skills dans profile |
| PaymentIntent → pay | ⚠️ FLAKY | Multiple intents si double-clic |
| Review → fund release | ✅ OK | Auto-validate bypass (production) |
| Soft delete RGPD | ✅ OK | password_hash = '' (vide, ok car email anonymisé) |

---

### 🟠 Gestion des dates sans timezone

Partout dans le code :
```typescript
new Date(info.slotDate + 'T00:00:00')  // interprété en local → décalage selon TZ serveur
```

Vercel tourne en UTC, le VPS peut être Europe/Paris. Un slot `2026-04-30` parsé localement peut devenir `2026-04-29` si l'env est UTC+0 en hiver.

**Correction** :
```typescript
new Date(info.slotDate + 'T00:00:00Z')  // force UTC
```

---

### 🟡 Autres dettes identifiées

| Problème | Fichier | Effort | Impact |
|---|---|---|---|
| Export CSV charge toutes les lignes en mémoire | `admin/export-csv/route.ts` | S | Performance en charge |
| `listNotifications` sans cursor pagination | `lib/freelancehub/notifications.ts` | S | Scalabilité |
| Skill sync : DELETE all + N INSERTs individuels | `consultant/profile/route.ts` | S | N+1 + incohérence |
| Pas de validation de démarrage des env vars | `db.ts`, `kyc/route.ts` | XS | Debug difficile |
| KYC URL = endpoint MinIO interne | `kyc/route.ts:84` | S | Broken URL si port change |
| Pas de Health Check endpoint | — | XS | Monitoring impossible |
| Pas de `Content-Security-Policy` headers | `next.config` absent | M | XSS mitigation manquante |
| Cron rappels : `amountHt: 0` hardcodé | `cron/reminders/route.ts:75` | XS | Email sans montant |
| nextjs version `^16.2.3` (non LTS récente) | `package.json` | XS | Vérifier compat Next 15 |

---

## 4. Diagnostic Agilité

| Pratique | État | Recommandation |
|---|---|---|
| CI / Tests automatisés | ❌ Absent | Vitest (unit) + Playwright (E2E) |
| Environnement de staging | ❌ Absent | Vercel Preview sur PR |
| Code review / PR | ❌ Push direct main | Branching + review avant merge |
| Feature flags | ❌ Absent | Acceptable en MVP |
| Monitoring erreurs applicatives | ⚠️ Logs only | Sentry ou Axiom en C5 |
| Rollback stratégie | ⚠️ Vercel revert manuel | Documenter la procédure |
| Migrations versionnées | ✅ Bon (001→013) | Maintenir la convention |

---

## 5. Checklist d'implémentation — Pareto (80% impact, 20% effort)

### Sprint immédiat (avant 30 avril) — Sécurité

- [ ] **[XS] Fix CRON_SECRET query param** — supprimer le fallback `searchParams.get('secret')` dans `cron/reminders/route.ts:29`
- [ ] **[S] Fix Multiple PaymentIntents** — chercher PI existant via `metadata.booking_id` avant création dans `payment-intent/route.ts`
- [ ] **[XS] Fix exposition erreur KYC** — message générique en réponse 500 dans `kyc/route.ts:97`
- [ ] **[XS] Fix timezone dates** — remplacer `'T00:00:00'` par `'T00:00:00Z'` dans `email.ts` et `cron/reminders/route.ts`
- [ ] **[XS] Ajouter `/api/freelancehub/health`** — `SELECT 1` sur DB, retourne `{ status: 'ok', db: true }`

### Sprint C5 — Dette technique prioritaire

- [ ] **[M] Stripe singleton** — `lib/freelancehub/stripe.ts` importé par les routes
- [ ] **[M] Skills sync transactionnel batch** — `withTransaction` + `unnest` dans `profile/route.ts`
- [ ] **[S] Baisser pool max à 2** — en attendant PgBouncer : `max: 2` dans `db.ts`
- [ ] **[M] Rate limiting** — `upstash/ratelimit` ou middleware custom sur `/api/freelancehub/auth/*`
- [ ] **[M] CSP Headers** — `next.config.ts` avec `X-Frame-Options`, `X-Content-Type-Options`, `Content-Security-Policy`
- [ ] **[L] Vitest setup** — tester `computePricing`, `findMatches`, `createNotification`
- [ ] **[L] Playwright E2E** — scénario golden path : inscription → matching → booking → paiement

### Sprint C6 — Qualité long terme

- [ ] **[XL] PgBouncer** — déployer sur VPS en mode transaction, changer `DATABASE_URL`
- [ ] **[L] Structured logging** — remplacer `console.error` par un logger structuré (Pino)
- [ ] **[M] Sentry** — capture exceptions en prod, alertes Slack
- [ ] **[M] Audit log table** — `freelancehub.audit_log(user_id, action, target_id, ip, created_at)`

---

## 6. Propositions de code ciblées

### Fix 1 — CRON_SECRET (5 min)
**Fichier** : `portal/app/api/freelancehub/cron/reminders/route.ts`

```typescript
// Remplacer lignes 27-30
const authHeader = req.headers.get('authorization')
const secret = authHeader?.replace('Bearer ', '')
if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

---

### Fix 2 — Multiple PaymentIntents (15 min)
**Fichier** : `portal/app/api/freelancehub/client/bookings/[id]/payment-intent/route.ts`

```typescript
// Après la récupération du booking, avant stripe.paymentIntents.create :
const existing = await stripe.paymentIntents.list({
  limit: 1,
})
// Chercher via metadata côté DB pour éviter la recherche Stripe coûteuse
const existingPi = await queryOne<{ stripe_payment_id: string }>(
  `SELECT stripe_payment_id FROM freelancehub.payments
   WHERE booking_id = $1 AND status IN ('pending', 'authorized')
   LIMIT 1`,
  [bookingId]
)
if (existingPi?.stripe_payment_id) {
  try {
    const pi = await stripe.paymentIntents.retrieve(existingPi.stripe_payment_id)
    if (pi.status === 'requires_payment_method' || pi.status === 'requires_confirmation') {
      return NextResponse.json({ client_secret: pi.client_secret })
    }
  } catch { /* PI expired — créer un nouveau */ }
}
```

---

### Fix 3 — Health Check (5 min)
**Nouveau fichier** : `portal/app/api/freelancehub/health/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { queryOne } from '@/lib/freelancehub/db'

export async function GET() {
  try {
    await queryOne('SELECT 1')
    return NextResponse.json({ status: 'ok', db: true, ts: new Date().toISOString() })
  } catch {
    return NextResponse.json({ status: 'error', db: false }, { status: 503 })
  }
}
```

---

### Fix 4 — Stripe Singleton (10 min)
**Nouveau fichier** : `portal/lib/freelancehub/stripe.ts`

```typescript
import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not configured')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-04-10',
  typescript: true,
})
```

---

### Fix 5 — CSP Headers (20 min)
**Nouveau fichier** : `portal/next.config.ts`

```typescript
import type { NextConfig } from 'next'

const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://js.stripe.com",
      "frame-src https://js.stripe.com",
      "connect-src 'self' https://api.stripe.com",
      "img-src 'self' data: https://s3.perform-learn.fr",
    ].join('; '),
  },
]

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  },
}

export default nextConfig
```

---

## 7. État des pages légales C4

| Page | Route | Statut |
|---|---|---|
| CGU | `/freelancehub/cgu` | ✅ Répertoire `cgu/` détecté |
| Politique de confidentialité | `/freelancehub/privacy` | ✅ Répertoire `privacy/` détecté |
| Mentions légales | `/freelancehub/legal` | ⚠️ Non détecté — à créer |
| Suppression compte | `DELETE /api/freelancehub/user/me` | ✅ Implémenté |
| Consentement email marketing | `register/route.ts` | ✅ Champ `marketing_consent` |

---

## 8. Prochaine analyse

Cette analyse est générée automatiquement quotidiennement. Pour exécuter manuellement :
```bash
# Depuis la racine du repo
git log --oneline -5  # vérifier la version
# Puis relancer l'agent d'analyse
```
