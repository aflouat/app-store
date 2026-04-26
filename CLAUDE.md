# CLAUDE.md — perform-learn.fr · Instructions pour Claude

## Rôle de ce fichier

Instructions de travail pour Claude sur ce projet. Contient uniquement ce qui n'est pas dans les autres fichiers :
- **ROADMAP.md** — fonctionnalités futures, releases, priorités
- **DEV.md** — setup local, workflow, déploiement, contraintes techniques
- **FEATURES.md** — règles de gestion métier (RG-01–RG-14)

---

## Contexte projet

**perform-learn.fr** — Marketplace B2B : connecte freelances experts avec des entreprises via matching algorithmique, paiement séquestre et anonymat jusqu'au paiement.

**Propriétaire** : Abdel — développeur fullstack, PMP-certified, chef de projet.
**Version courante** : voir ROADMAP.md.

---

## Architecture

```
┌──────────────────────────────────────┐
│          VPS OVH (37.59.125.159)     │
│          Ubuntu 24.04 · 4 vCores/8Go │
│  PostgreSQL 16 · MinIO · Umami       │
│  Caddy (proxy) · Netdata · API Node  │
└──────────────────┬───────────────────┘
                   │ HTTPS
           ┌───────┴───────┐
      ┌────▼────┐     ┌────▼────┐
      │ Vercel  │     │ Vercel  │
      │ Portal  │     │  Apps   │
      │ Next.js │     │ (futur) │
      └─────────┘     └─────────┘
```

VPS = backend central (données, fichiers, analytics). Fronts Next.js sur Vercel (tier gratuit). Données sous contrôle local (OVH France, souveraineté RGPD).

### Infra VPS

| Élément | Valeur |
|---|---|
| IP | `37.59.125.159` |
| SSH | `ssh -p 2222 abdel@37.59.125.159` |
| Chemin projet | `/appli/app-store/` |
| Conteneurs | `postgres`, `minio`, `umami`, `netdata`, `caddy` |

| URL | Service |
|---|---|
| `perform-learn.fr` | Landing page |
| `portal.perform-learn.fr` | Portail Next.js (Vercel) |
| `api.perform-learn.fr` | API Node.js |
| `s3.perform-learn.fr` | MinIO |
| `analytics.perform-learn.fr` | Umami |
| `monitor.perform-learn.fr` | Netdata |

---

## PostgreSQL — Schémas `appstore`

| Schéma | Usage |
|---|---|
| `freelancehub` | Marketplace B2B (schéma principal) |
| `governance` | Framework Vision→Cycle→Epic→US→Task |
| `store` | App Store, waitlist |
| `shared` | Users partagés |

### Tables FreelanceHub

```
users             → 3 rôles : client | consultant | admin
consultants       → profil, tarif, rating
consultant_skills → pivot compétences ↔ consultants
skills            → référentiel compétences
slots             → créneaux disponibles
bookings          → réservations (revealed_at = NULL jusqu'au paiement)
payments          → escrow : pending → authorized → captured → transferred
reviews           → évaluations mutuelles (libèrent les fonds si 2 soumises)
notifications     → in-app events
signatures        → horodatage CGU/NDA (IP + UA)
```

---

## Structure repo (fichiers clés)

```
app-store/
├── CLAUDE.md / DEV.md / FEATURES.md / ROADMAP.md
├── migrations/             ← 001–017_*.sql
├── docker-compose.yml
├── caddy/Caddyfile
└── portal/                 ← Next.js App Router (Vercel)
    ├── auth.config.ts      ← Edge-safe (middleware uniquement)
    ├── auth.ts             ← NextAuth v5 + Google + bcrypt (Node.js)
    ├── middleware.ts        ← RBAC JWT
    ├── vercel.json         ← rewrites + crons
    ├── app/
    │   ├── freelancehub/(auth)/
    │   │   ├── consultant/ ← dashboard, profil, agenda, bookings, earnings
    │   │   ├── client/     ← dashboard, search, bookings, reviews
    │   │   └── admin/      ← dashboard, consultants, bookings, matching
    │   └── api/freelancehub/
    │       ├── matching/   · notifications/   · reviews/
    │       ├── client/bookings/   (création + Stripe)
    │       ├── consultant/ (profil + slots)
    │       ├── admin/      (export-csv, KYC, skills)
    │       └── cron/reminders/   (J-1, 08:00 UTC)
    ├── components/freelancehub/
    │   ├── FHNav.tsx       ← cloche notifications
    │   ├── client/BookingModal.tsx   ← confirm → Stripe → reveal
    │   └── client/SearchClient.tsx
    └── lib/freelancehub/
        ├── auth-queries.ts · db.ts · types.ts
        ├── matching.ts     ← algo scoring 4 critères
        ├── email.ts        ← Resend (4 templates)
        └── notifications.ts
```

---

## Variables d'environnement Vercel (prod)

| Variable | Statut |
|---|---|
| `DATABASE_URL` | ✅ |
| `NEXTAUTH_SECRET` | ✅ |
| `NEXTAUTH_URL` | ✅ `https://portal.perform-learn.fr` |
| `RESEND_API_KEY` | ✅ |
| `STRIPE_SECRET_KEY` | ✅ |
| `STRIPE_PUBLISHABLE_KEY` | ✅ |
| `NEXT_PUBLIC_API_URL` | ✅ `https://api.perform-learn.fr` |
| `CRON_SECRET` | ✅ |
| `GOOGLE_CLIENT_ID` | ⚠️ à configurer |
| `GOOGLE_CLIENT_SECRET` | ⚠️ à configurer |

---

## Décisions architecturales

| Date | Décision | Raison |
|---|---|---|
| 04/04 | Architecture hybride VPS + Vercel | Coût minimal + données sous contrôle |
| 04/04 | PostgreSQL multi-schéma | Simplicité opérationnelle en POC |
| 16/04 | Anonymat consultant jusqu'au paiement | Différenciation + RGPD |
| 16/04 | Prix paramétrable par consultant (THM) | Attractivité + matching prix/budget |
| 12/04 | Notifications in-app (pas push browser) | Moins intrusif, plus simple |
| 16/04 | Hébergement VPS OVH France | Souveraineté RGPD |
| 16/04 | Signatures horodatées IP/UA | Preuve légale CGU/NDA (art. 7 RGPD) |
| 26/04 | SSO Google via NextAuth v5 | Réduction friction inscription |

---

## Workflow Claude — Règles de travail

### Planifier avant de coder

1. **Lire** les fichiers concernés avant toute modification
2. **Annoncer le plan** : fichiers à toucher + changements attendus
3. **Valider avec Abdel** si le plan impacte : DB, middleware Edge, flow Stripe, ou plusieurs modules
4. **Phase par phase** : un ensemble cohérent de fichiers = un commit

### Conventions de commit

```
feat(scope):     nouvelle fonctionnalité
fix(scope):      correction de bug
refactor(scope): sans changement de comportement
chore(scope):    migration SQL, config, CI
docs(scope):     documentation uniquement

Scopes : freelancehub | govern | infra | portal | db
```

### Stratégie de branches

- Tout développement → `main` uniquement, commit direct
- Jamais de branche feature
- Release → `release/vX.Y.Z` taillée depuis `main`, sur décision explicite d'Abdel uniquement
- Après merge d'une PR Claude Code → supprimer la branche immédiatement (`git push origin --delete`)
- Nettoyage en début de session → `git fetch --prune && git branch -a`

---

## Règles de sécurité immuables

| Règle |
|---|
| Ne jamais calculer le montant Stripe côté client — toujours depuis la DB |
| Ne jamais exposer `name`, `email`, `bio`, `linkedin_url` avant `revealed_at IS NOT NULL` |
| Ne jamais importer `bcryptjs` dans `auth.config.ts` (Edge Runtime incompatible) |
| Ne jamais utiliser `CREATE OR REPLACE VIEW` — toujours `DROP VIEW IF EXISTS … CASCADE; CREATE VIEW` |
| Ne jamais utiliser `git add -A` ou `git add .` |

---

## Gouvernance — hiérarchie

```
Vision → Cycle → Epic → User Story → Task
```

| Score | Valeur |
|---|---|
| ≥ 75 | Haute |
| 50–74 | Moyenne |
| 25–49 | Faible |
| < 25 | Très faible |

`value_type` : `user_acquisition` | `cost_reduction` | `strategic_positioning` | `ux_improvement` | `technical_debt`

---

## Conventions générales

- **Langue** : français pour les échanges, anglais pour le code
- **Réponses** : scannable — headings, tables, bullet points
- **Approche** : POC fonctionnel, phase par phase, résultats concrets
