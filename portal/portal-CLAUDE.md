# CLAUDE.md — Portail App Store Perform-Learn.fr

## Mission

Construire le **portail App Store** de Perform-Learn.fr en Next.js 14+ (App Router), déployé sur Vercel, connecté au backend VPS existant.

---

## Contexte projet

**Perform-Learn.fr** est un Digital Service Hub haut de gamme qui automatise l'intermédiation freelance/entreprise. Le portail est le point d'entrée central où les utilisateurs découvrent et accèdent aux apps métiers.

- **Entité** : Le Laboratoire de la Performance et de l'Apprentissage (LPA)
- **Philosophie** : "Une entreprise performante est une entreprise apprenante"
- **Lancement** : 30 avril 2026
- **Audience** : Public (freelances ERP/D365 + entreprises)

---

## Architecture globale

```
┌─────────────────────────────────────────────┐
│         VPS OVH (37.59.125.159)             │
│                                              │
│  PostgreSQL ─── MinIO ─── Umami ─── Netdata │
│  API Node.js (api.perform-learn.fr)          │
└──────────────────┬──────────────────────────┘
                   │ HTTPS
         ┌─────────┼─────────┐
         │         │         │
    ┌────▼───┐ ┌───▼───┐ ┌──▼────┐
    │ Portal │ │ App 2 │ │ App 3 │
    │ Vercel │ │Vercel │ │Vercel │
    └────────┘ └───────┘ └───────┘
```

Le portail Next.js tourne sur **Vercel** et appelle l'API sur **api.perform-learn.fr** pour les données.

---

## Emplacement dans le repo

```
app-store/                    # Repo existant (aflouat/app-store)
├── CLAUDE.md                 # Contexte infra VPS
├── SECURITY.md
├── ROADMAP.md
├── docker-compose.yml
├── api/                      # API Node.js (backend VPS)
├── caddy/
├── landing.html              # Landing page pré-lancement
└── portal/                   # ← CE PROJET (Next.js)
    ├── CLAUDE.md             # ← CE FICHIER
    ├── package.json
    ├── next.config.js
    ├── tailwind.config.js
    ├── .env.local            # Variables d'env (ne pas commit)
    ├── .env.example
    ├── public/
    │   └── fonts/
    ├── src/
    │   ├── app/
    │   │   ├── layout.tsx
    │   │   ├── page.tsx              # Page d'accueil / catalogue
    │   │   ├── globals.css
    │   │   ├── apps/
    │   │   │   └── [slug]/
    │   │   │       └── page.tsx      # Page détail app
    │   │   ├── labo/
    │   │   │   └── page.tsx          # Page LPA (contenu/recherche)
    │   │   └── api/
    │   │       └── apps/
    │   │           └── route.ts      # API route proxy vers VPS
    │   ├── components/
    │   │   ├── Navbar.tsx
    │   │   ├── AppCard.tsx
    │   │   ├── AppCatalog.tsx
    │   │   ├── Hero.tsx
    │   │   ├── Footer.tsx
    │   │   ├── LaboSection.tsx
    │   │   └── WaitlistBanner.tsx
    │   └── lib/
    │       ├── api.ts                # Client fetch vers api.perform-learn.fr
    │       └── types.ts              # Types TypeScript
    └── vercel.json
```

---

## Stack technique

| Techno | Version | Usage |
|---|---|---|
| Next.js | 14+ (App Router) | Framework frontend |
| TypeScript | 5+ | Typage |
| Tailwind CSS | 3+ | Styling (utility classes uniquement) |
| Fraunces | Google Fonts | Titres (autorité/luxe) |
| DM Sans | Google Fonts | Body (modernité/fluidité) |
| Umami | Script tag | Analytics |
| Vercel | Déploiement | Hosting + CDN |

**Pas de dépendances lourdes** — pas de ORM, pas de state manager, pas de UI library. Fetch natif + Tailwind + composants maison.

---

## Design & identité visuelle

### Palette de couleurs (variables Tailwind)

```javascript
// tailwind.config.js
colors: {
  brand: {
    terracotta: '#B9958D',      // --c1 : CTA, accents, action
    'terracotta-light': '#cca89f',
    'terracotta-pale': '#ecddd9',
    'terracotta-bg': '#faf4f2',
    grey: '#AAB1AF',             // --c2 : éléments secondaires
    'grey-light': '#c2c8c6',
    sage: '#96AEAA',             // --c3 : succès, badges
    'sage-pale': '#d8e5e3',
    'sage-bg': '#eef3f2',
    kaki: '#A3AB9A',             // --c4 : info, labo
    'kaki-pale': '#dde1d8',
  },
  dark: '#22201e',
  text: '#2e2c2a',
  'text-mid': '#5c5956',
  'text-light': '#968e89',
  border: '#e2deda',
  bg: '#f7f5f3',
}
```

### Typographies

```css
/* globals.css */
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,400;0,700;0,900;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');
```

- **Fraunces** → `font-serif` : tous les titres (h1, h2, h3), valeurs statistiques
- **DM Sans** → `font-sans` : tout le reste (body, boutons, labels)

### Principes de design

- Minimaliste et haut de gamme — pas de surcharge visuelle
- Coins arrondis (14px cards, 24px boutons)
- Ombres douces (`shadow-sm` à `shadow-lg`)
- Animations CSS subtiles (fade-in, hover lift)
- Background principal : `#f7f5f3` (warm grey)
- Cards blanches avec bordure `#e2deda`
- Mobile-first responsive

---

## Backend API — endpoints disponibles

**Base URL** : `https://api.perform-learn.fr`

### Endpoints existants

| Method | Path | Description | Response |
|---|---|---|---|
| GET | `/health` | Healthcheck | `{ status: "ok" }` |
| POST | `/waitlist` | Inscription waitlist | `{ success: true }` |
| GET | `/waitlist/stats` | Compteurs waitlist | `{ total, by_type }` |

### Endpoints à créer sur le VPS (API Node.js)

Ces endpoints doivent être ajoutés au fichier `api/server.js` sur le VPS pour que le portail fonctionne :

```
GET  /apps              → Liste des apps publiées (depuis store.apps WHERE status='published')
GET  /apps/:slug        → Détail d'une app par slug
GET  /stats/overview    → Stats globales (nombre apps, users, etc.)
```

#### Schéma de réponse attendu pour GET /apps :

```json
[
  {
    "id": "uuid",
    "slug": "meteo-projet",
    "name": "Météo Projet",
    "description": "Dashboard de suivi santé projet D365/AS400",
    "icon_url": "https://s3.perform-learn.fr/icons/meteo.svg",
    "version": "0.1.0",
    "status": "published",
    "url": "https://meteo.perform-learn.fr",
    "api_base": "https://api.perform-learn.fr/meteo",
    "created_at": "2026-04-15T10:00:00Z"
  }
]
```

### En attendant les endpoints VPS

Le portail doit fonctionner avec des **données mockées en dur** si l'API VPS ne répond pas. Utiliser un fallback dans `src/lib/api.ts` :

```typescript
const MOCK_APPS = [
  {
    id: '1',
    slug: 'meteo-projet',
    name: 'Météo Projet',
    description: 'Dashboard de suivi santé projet ERP. Visualisez l\'état de vos chantiers D365/AS400 en un coup d\'œil.',
    icon_url: null,
    version: '0.1.0',
    status: 'published',
    url: null,
    category: 'Gestion de projet',
    tags: ['D365', 'AS400', 'Dashboard'],
  },
  {
    id: '2',
    slug: 'stock-manager',
    name: 'Gestion de Stock',
    description: 'Suivi simplifié des entrées/sorties de stock. Connecté à votre ERP.',
    icon_url: null,
    version: '0.1.0',
    status: 'draft',
    url: null,
    category: 'Supply Chain',
    tags: ['Stock', 'ERP', 'Logistique'],
  },
  {
    id: '3',
    slug: 'linkedin-generator',
    name: 'PMFlow — LinkedIn Generator',
    description: 'Générez des posts LinkedIn percutants spécialisés pour les consultants ERP/D365.',
    icon_url: null,
    version: '0.1.0',
    status: 'published',
    url: null,
    category: 'Marketing',
    tags: ['LinkedIn', 'IA', 'Consulting'],
  },
  {
    id: '4',
    slug: 'booking-consultant',
    name: 'Booking Consultant',
    description: 'Réservez un expert en quelques clics. Calendrier temps réel, NDA automatique, paiement sécurisé.',
    icon_url: null,
    version: '0.1.0',
    status: 'coming_soon',
    url: null,
    category: 'Consulting',
    tags: ['Booking', 'Freelance', 'Matching'],
  },
  {
    id: '5',
    slug: 'formation-hub',
    name: 'Formation Hub',
    description: 'Parcours de formation certifiants pour les professionnels ERP. Apprenez, pratiquez, certifiez.',
    icon_url: null,
    version: '0.1.0',
    status: 'coming_soon',
    url: null,
    category: 'Formation',
    tags: ['Formation', 'Certification', 'E-learning'],
  },
];
```

---

## Pages à construire

### 1. Page d'accueil (`/`) — Catalogue

- **Hero** : titre "Perform-Learn.fr", sous-titre "Le Hub Digital de la Performance", barre de recherche (filtrage client-side)
- **Stats bar** : nombre d'apps, inscrits waitlist (fetch `/waitlist/stats`), "100% Made with AI"
- **Grille d'apps** : cards avec icône, nom, description, tags, status badge (published / coming_soon / draft)
- **Filtre par catégorie** : tabs ou pills (Tous, Gestion de projet, Consulting, Formation, Marketing, Supply Chain)
- **CTA waitlist** : banner en bas si non inscrit

### 2. Page détail app (`/apps/[slug]`)

- Nom, description longue, screenshots (placeholder si pas encore de screenshots)
- Tags, version, catégorie
- Bouton "Ouvrir l'app" (lien vers l'URL Vercel de l'app) ou "Bientôt disponible" si coming_soon
- Lien retour vers le catalogue

### 3. Page Labo LPA (`/labo`)

- Titre "Le Laboratoire de la Performance et de l'Apprentissage"
- Liste d'articles/papiers de recherche (statique pour le moment — markdown ou hardcoded)
- 2 articles placeholder :
  - "L'entreprise apprenante — pourquoi les meilleurs freelances fuient les plateformes classiques"
  - "Time-to-Contract : la métrique que personne ne mesure"

---

## Variables d'environnement

### .env.example (à commit)

```
NEXT_PUBLIC_API_URL=https://api.perform-learn.fr
NEXT_PUBLIC_UMAMI_WEBSITE_ID=57c957f7-a6f5-493d-8c74-4bdc0ef38e39
NEXT_PUBLIC_UMAMI_URL=https://analytics.perform-learn.fr
```

### .env.local (ne pas commit)

```
NEXT_PUBLIC_API_URL=https://api.perform-learn.fr
NEXT_PUBLIC_UMAMI_WEBSITE_ID=57c957f7-a6f5-493d-8c74-4bdc0ef38e39
NEXT_PUBLIC_UMAMI_URL=https://analytics.perform-learn.fr
```

---

## Umami tracking

Ajouter dans `src/app/layout.tsx` :

```tsx
<Script
  defer
  src={`${process.env.NEXT_PUBLIC_UMAMI_URL}/script.js`}
  data-website-id={process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
/>
```

---

## Vercel config

### vercel.json

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "rewrites": [
    {
      "source": "/api/vps/:path*",
      "destination": "https://api.perform-learn.fr/:path*"
    }
  ]
}
```

### Déploiement

Le projet est dans le sous-dossier `portal/`. Sur Vercel :
- **Root Directory** : `portal`
- **Framework Preset** : Next.js
- **Environment Variables** : copier depuis `.env.example`

---

## Contraintes

- **Pas de `localStorage`** dans les composants (pas supporté côté serveur Next.js)
- **Pas de dépendances UI lourdes** (pas de Material UI, Chakra, etc.)
- **Tailwind uniquement** pour le styling
- **TypeScript strict** — pas de `any`
- **Composants serveur par défaut** — `'use client'` uniquement quand nécessaire (interactions, state)
- **Images** : utiliser `next/image` avec des SVG pour les icônes d'apps
- **Fonts** : charger via `next/font/google` ou `<link>` dans layout

---

## Commandes

```bash
cd portal

# Dev
npm run dev          # http://localhost:3000

# Build
npm run build

# Lint
npm run lint
```

---

## Checklist de livraison

- [ ] `npx create-next-app@latest portal` avec TypeScript + Tailwind + App Router
- [ ] Tailwind config avec la palette brand
- [ ] Layout global (Navbar, Footer, fonts, Umami)
- [ ] Page accueil avec catalogue d'apps (données mockées)
- [ ] Composant AppCard avec status badges
- [ ] Filtre par catégorie (client-side)
- [ ] Barre de recherche (client-side)
- [ ] Page détail app `/apps/[slug]`
- [ ] Page Labo LPA `/labo` avec 2 articles placeholder
- [ ] Banner waitlist avec fetch stats
- [ ] Responsive mobile
- [ ] `.env.example` + `vercel.json`
- [ ] Build sans erreur (`npm run build`)
- [ ] Déployer sur Vercel
