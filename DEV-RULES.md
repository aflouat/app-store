# DEV-RULES.md — Règles techniques · perform-learn.fr

> **Lu par : Agent DEV uniquement** (étape 2 de la séquence CLAUDE.md §5).
> Ce fichier contient l'architecture, les variables d'environnement, le workflow local et le diagnostic.
> Les règles métier (RG) et la sécurité sont dans `CLAUDE.md §7–§8`.

---

## Architecture infra

```
┌──────────────────────────────────────┐
│      VPS OVH (37.59.125.159)         │
│      Ubuntu 24.04 · 4 vCores / 8 Go │
│  PostgreSQL 16 · MinIO · Umami       │
│  Caddy (reverse proxy) · Netdata     │
└──────────────────┬───────────────────┘
                   │ HTTPS
           ┌───────┴───────┐
      ┌────▼────┐     ┌────▼────┐
      │ Vercel  │     │ Vercel  │
      │ Portal  │     │  Apps   │
      │ Next.js │     │ (futur) │
      └─────────┘     └─────────┘
```

| URL | Service |
|---|---|
| `portal.perform-learn.fr` | Portail Next.js (Vercel) |
| `api.perform-learn.fr` | API Node.js (VPS) |
| `s3.perform-learn.fr` | MinIO (VPS) |
| `analytics.perform-learn.fr` | Umami (VPS) |
| `monitor.perform-learn.fr` | Netdata (VPS) |

SSH : `ssh -p 2222 abdel@37.59.125.159`

---

## Structure repo (fichiers clés)

```
app-store/
├── CLAUDE.md               ← Pipeline, RG, sécurité — tous agents
├── DEV-RULES.md            ← Règles techniques — Agent DEV (CE FICHIER)
├── DONE.md                 ← §1 release notes · §2 DoD checklist
├── HOWTO.md                ← Guide utilisateur
├── ROADMAP.md              ← Backlog priorisé
├── DECISIONS.md            ← Registre GO/NO-GO — Agent DG
├── migrations/             ← 001–0XX_*.sql (jamais modifier, seulement ajouter)
├── scripts/
│   ├── orchestrator.ps1    ← Pipeline 8 étapes (Windows PowerShell)
│   ├── orchestrator.sh     ← Pipeline 8 étapes (Linux/CI)
│   ├── release-notes.ps1   ← Génération release notes (Windows)
│   ├── release-notes.sh    ← Génération release notes (Linux)
│   ├── tnr.sh              ← TNR local
│   └── deploy-vps.sh       ← Déploiement VPS
├── .github/workflows/
│   ├── ci.yml              ← TypeScript + Vitest + Build + E2E
│   └── release.yml         ← Gate sur git tag
└── portal/                 ← Next.js App Router (Vercel)
    ├── auth.config.ts      ← Edge-safe (middleware UNIQUEMENT — pas de Node.js)
    ├── auth.ts             ← NextAuth v5 + Google + bcrypt (Node.js)
    ├── middleware.ts        ← RBAC JWT (importe auth.config.ts UNIQUEMENT)
    ├── playwright.config.ts
    ├── __tests__/          ← Vitest unit tests
    ├── tests/e2e/          ← Playwright E2E
    └── app/
        ├── freelancehub/(auth)/
        │   ├── consultant/ ← dashboard, profil, agenda, bookings, earnings
        │   ├── client/     ← dashboard, search, bookings, reviews
        │   └── admin/      ← dashboard, consultants, bookings, matching
        └── api/freelancehub/
            ├── matching/   · notifications/   · reviews/
            ├── client/bookings/   (création + Stripe)
            ├── consultant/ (profil + slots)
            ├── admin/      (export-csv, KYC, skills)
            └── cron/reminders/
```

---

## Schéma DB — schéma `freelancehub`

```
users             → id, email, password_hash, role (client|consultant|admin)
                    oauth_provider, oauth_provider_id
consultants       → profil, daily_rate (€/h), rating, kyc_status,
                    is_available, is_early_adopter, stripe_account_id
consultant_skills → pivot compétences ↔ consultants (niveau: junior→expert)
skills            → référentiel compétences
slots             → créneaux disponibles (consultant_id, slot_date, slot_time)
bookings          → réservations — revealed_at NULL jusqu'au paiement
                    amount_ht, tva, amount_ttc, platform_commission, consultant_net
payments          → escrow : pending → authorized → captured → transferred
                    stripe_payment_id, invoice_url
reviews           → évaluations mutuelles — libèrent les fonds si 2 soumises
notifications     → in-app events (type + read_at)
signatures        → horodatage CGU/NDA (user_id, type, ip, user_agent)
chat_limits       → cap mensuel agents IA (identifier, week_start, count)
```

**Conventions SQL :**
- Toujours créer un nouveau fichier `migrations/0XX_nom.sql` — jamais modifier une migration existante
- `DROP VIEW IF EXISTS … CASCADE; CREATE VIEW` (jamais `CREATE OR REPLACE VIEW`)
- Indexes sur FK : `payments.booking_id`, `reviews.booking_id/reviewer_id/reviewee_id` (C6)

---

## Variables d'environnement

### Vercel (production)

| Variable | Format |
|---|---|
| `DATABASE_URL` | `postgresql://appstore:…@37.59.125.159:5432/appstore` |
| `NEXTAUTH_SECRET` | chaîne ≥ 32 chars |
| `NEXTAUTH_URL` | `https://portal.perform-learn.fr` |
| `RESEND_API_KEY` | `re_…` |
| `STRIPE_SECRET_KEY` | `sk_live_…` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_…` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` |
| `NEXT_PUBLIC_API_URL` | `https://api.perform-learn.fr` |
| `CRON_SECRET` | chaîne aléatoire ≥ 32 chars |
| `GOOGLE_CLIENT_ID` | OAuth Google Console |
| `GOOGLE_CLIENT_SECRET` | OAuth Google Console |

### Local `.env.local`

Mêmes variables avec :
- `NEXTAUTH_URL=http://localhost:3000`
- `STRIPE_SECRET_KEY=sk_test_…`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_…`

> `DATABASE_URL` pointe sur le VPS prod — toute réservation locale est réelle. Utiliser les comptes démo.

### Cartes Stripe de test

| Carte | Comportement |
|---|---|
| `4242 4242 4242 4242` | Succès |
| `4000 0000 0000 0002` | Déclin |
| `4000 0025 0000 3155` | 3DS requis |

---

## Workflow développement local

```bash
# Setup
cd portal && npm install

# Dev
npm run dev          # http://localhost:3000

# Avant tout commit (OBLIGATOIRE)
npm run build        # doit passer sans erreur TypeScript
npm test             # Vitest doit être vert

# E2E local (optionnel, obligatoire en CI)
npm run test:e2e     # Playwright contre localhost:3000

# E2E contre une URL spécifique
E2E_BASE_URL=https://preview.vercel.app npm run test:e2e

# Appliquer une migration SQL sur le VPS
ssh -p 2222 abdel@37.59.125.159 \
  'docker exec -i postgres psql -U appstore -d appstore' \
  < migrations/0XX_nom.sql
```

### Comptes de démonstration (mot de passe : `demo1234`)

| Rôle | Email |
|---|---|
| Admin | `admin@perform-learn.fr` |
| Consultant | `consultant1@perform-learn.fr` |
| Client | `client1@perform-learn.fr` |

---

## Diagnostic rapide

| Symptôme | Cause probable | Solution |
|---|---|---|
| Page blanche après login | `bcrypt` ou `pg` importé dans `auth.config.ts` | Vérifier tous les imports de `auth.config.ts` |
| `/error` après OAuth Google | Callback mal configuré | Vérifier `GOOGLE_CLIENT_ID` + redirect URI Google Console |
| `ECONNREFUSED` DB | VPS inaccessible | `ssh -p 2222 abdel@37.59.125.159 'docker ps'` |
| Stripe "No such payment_intent" | Mélange clés test/prod | Vérifier `sk_test_` dans `.env.local` |
| Build échoue TypeScript | Erreur de type | Lire l'output complet de `npm run build` |
| E2E échoue sur booking | Stripe webhook non reçu | En local : `stripe listen --forward-to localhost:3000/api/webhooks/stripe` |
| Vercel déploie un build cassé | Push sans `npm run build` | Toujours valider le build en local avant push |

---

## Décisions architecturales clés

| Date | Décision | Raison |
|---|---|---|
| 04/04 | Hybride VPS + Vercel | ~6 €/mois + données sous contrôle RGPD |
| 04/04 | PostgreSQL multi-schéma | Simplicité opérationnelle en POC |
| 16/04 | Anonymat consultant jusqu'au paiement | Différenciation + RGPD |
| 16/04 | Prix paramétrable par consultant (THM) | Attractivité + matching |
| 26/04 | SSO Google via NextAuth v5 | Réduction friction inscription |
| 01/05 | Pool PostgreSQL `max:2` | Évite saturation 100 connexions Vercel |
| 01/05 | CSP Headers + HSTS | Sécurité navigateur sans coût infra |
| 01/05 | Branche `feat/US-XX` par US | Agent Reviewer possible + CI propre |
| 02/05 | `DEV-RULES.md` séparé de `CLAUDE.md` | CLAUDE.md < 300 lignes, règles techniques isolées |

---

## Conventions générales

- **Langue** : français pour les échanges, anglais pour le code
- **Réponses** : scannable — headings, tables, bullet points
- **Approche** : POC fonctionnel, phase par phase, résultats concrets
- **Scopes de commit** : `freelancehub` · `govern` · `infra` · `portal` · `db`
