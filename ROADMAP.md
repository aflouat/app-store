# ROADMAP.md — Perform-Learn.fr

> **Vision** : "Une entreprise performante est une entreprise apprenante."
> **Positionnement** : Digital Service Hub haut de gamme — automatiser l'intermédiation pour libérer le talent de la paperasse.
> **Entité scientifique** : Le Laboratoire de la Performance et de l'Apprentissage (LPA)
> **Lancement** : 30 avril 2026
> **Approche** : Lean Startup — Build → Measure → Learn

---

## Principes directeurs

1. **Ne rien construire sans hypothèse à valider**
2. **Mesurer avant de scaler** (Umami + PostgreSQL)
3. **Un seul MVP par cycle** — livrer, observer, pivoter
4. **IA-first** : tout ce qui peut être généré par IA l'est (code, contenu, design)
5. **Coût minimal** : VPS 6€/mois + tiers gratuits (Vercel, Brevo)
6. **Zéro friction** : chaque feature doit réduire le "Time-to-Contract"

---

## Identité de marque

| Élément | Choix |
|---|---|
| Nom | Perform-Learn.fr |
| Logo | "L'Infini Connecté" (cycle Performance ↔ Apprentissage) |
| Terracotta `#B9958D` | Action, CTA, urgence |
| Sauge `#96AEAA` | Croissance, succès, validation |
| Gris Vert `#AAB1AF` | Stabilité, éléments secondaires |
| Kaki `#A3AB9A` | Analyse, Labo, données |
| Typographies | Fraunces (autorité/luxe) + DM Sans (modernité/fluidité) |

---

## Modèle économique

| Élément | Détail |
|---|---|
| Commission | 12-15% (vs 25-40% agences classiques) |
| Financement par la commission | Apport d'affaires, RC Pro, garantie paiement, admin automatisée |
| Paiement | Séquestre sécurisé, libéré dès fin du slot de travail |
| Transparence | Totale — le consultant voit exactement ce qu'il touche |

---

## Métriques Nord-Star par phase

| Phase | Métrique unique qui compte |
|---|---|
| Teasing (Cycle 1) | **Inscrits waitlist** |
| Autorité (Cycle 2) | **Engagement LinkedIn** (vues + interactions posts LPA) |
| Lancement (Cycle 4) | **Experts "Ready-to-book"** (dossier admin 100% validé) |
| Croissance (Cycle 5) | **Time-to-Contract** (objectif < 5 min) |
| Monétisation (Cycle 6) | **Taux de récurrence clients** |

---

## Cycle 0 — Validation du problème ✅

**Période** : Mars 2026
**Statut** : ✅ Terminé

### Hypothèse
> "Les freelances ERP/D365 et les entreprises ont besoin d'une plateforme spécialisée pour se connecter sans friction administrative."

### Build
- [x] Maquette HTML du concept (front.html)
- [x] Landing page avec proposition de valeur
- [x] Exploration du marché et positionnement PMFlow
- [x] Définition de l'identité de marque (logo, couleurs, typo)

### Measure
- Retours informels réseau professionnel
- Analyse concurrentielle : niche ERP/D365 non occupée
- Validation du "problème" : le chaos administratif freine les missions freelance

### Learn
- ✅ Le besoin existe — les freelances D365 galèrent à trouver des missions qualifiées
- ✅ Les entreprises veulent du matching par compétence, pas par réseau
- ✅ La commission des plateformes existantes (25-40%) est un frein majeur
- → **Go pour construire le MVP**

---

## Cycle 1 — Infra & Signal de demande 🔄

**Période** : 1er - 15 avril 2026
**Phase marketing** : **Phase A — Le Teasing**
**Statut** : 🔄 En cours

### Hypothèse
> "Des freelances et clients s'inscriront sur une waitlist si la proposition de valeur 'zéro friction' est claire."

### Build — Technique
- [x] VPS OVH provisionné (Ubuntu 24.04, Docker Compose)
- [x] Backend centralisé : PostgreSQL, MinIO, Umami, Netdata, Caddy
- [x] API waitlist (Node.js → PostgreSQL)
- [x] Landing page avec countdown 30/04/2026 + formulaire waitlist segmenté (Client / Freelance)
- [x] CLAUDE.md + SECURITY.md pour industrialiser le dev
- [x] Sécurisation VPS (SECURITY.md — 7 étapes)
- [x] Connecter Umami à la landing page (tracking visiteurs)

### Build — Marketing (Phase A : Teasing)
- [] **Post LinkedIn #1** : Le Problème — "Le chaos administratif qui tue la performance freelance" (storytelling personnel Abdel)
- [ ] **Post LinkedIn #2** : La Solution — "Et si réserver un expert prenait 5 minutes, pas 5 semaines ?" (teaser plateforme)
- [ ] **Post LinkedIn #3** : L'Invitation — "On construit la plateforme qu'on aurait voulu avoir" (lien waitlist)
- [ ] Partage direct à 20 contacts cibles (10 freelances Digitalisation, 10 décideurs entreprise)
- [ ] 1 post dans un groupe Slack/Discord Digitilisation

### Measure — KPIs cibles

| Métrique | Cible | Source |
|---|---|---|
| Visiteurs landing page | 200+ | Umami |
| Inscriptions waitlist | 50+ | PostgreSQL `store.waitlist` |
| Ratio client/freelance | 40/60 | PostgreSQL |
| Taux de conversion visiteur → inscription | >10% | Umami + PostgreSQL |
| Impressions LinkedIn (3 posts) | 3 000+ | LinkedIn Analytics |
| Clics LinkedIn → landing | 100+ | Umami (referrer) |

### Learn (à compléter après mesure)
- [ ] Quel profil s'inscrit le plus ? → oriente le Cycle 3 (quelle app construire en premier)
- [ ] D'où viennent les visiteurs ? → optimise les canaux pour Phase B
- [ ] La proposition de valeur "zéro friction" résonne-t-elle ? → ajuste le messaging

---

## Cycle 2 — Portail App Store + Autorité LPA

**Période** : 15 - 25 avril 2026
**Phase marketing** : **Phase B — L'Autorité**
**Statut** : ⬜ À faire

### Hypothèse
> "Un portail centralisant les apps métiers + du contenu expert (LPA) crédibilise la plateforme et augmente l'engagement."

### Build — Technique
- [ ] Portail Next.js sur Vercel (App Router)
- [ ] Page catalogue : cards des apps disponibles (depuis `store.apps`)
- [ ] Auth basique (NextAuth.js — email magic link)
- [ ] Tracking Umami intégré au portail
- [ ] 2-3 apps "placeholder" dans le catalogue
- [ ] Page "Le Labo" (LPA) — espace contenu/recherche

### Build — Marketing (Phase B : Autorité)
- [ ] **Papier LPA #1** : "L'entreprise apprenante — pourquoi les meilleurs freelances fuient les plateformes classiques" (article LinkedIn + blog)
- [ ] **Papier LPA #2** : "Time-to-Contract : la métrique que personne ne mesure (et qui coûte des milliers d'euros)" (article LinkedIn + blog)
- [ ] **Post LinkedIn #4** : Teaser du portail — "Voici ce qu'on construit" (screenshots/vidéo)
- [ ] **Post LinkedIn #5** : Coulisses — "On a construit toute l'infra avec l'IA en 2 semaines" (crédibilité tech)
- [ ] Email aux inscrits waitlist : "Merci + voici ce qui arrive le 30 avril" (Brevo)

### Measure — KPIs cibles

| Métrique | Cible | Source |
|---|---|---|
| Utilisateurs connectés portail (beta) | 20+ | NextAuth + PostgreSQL |
| Clics sur les apps | Identifier le top 3 | Umami events |
| Temps moyen sur le portail | >2 min | Umami |
| Vues articles LPA | 500+ par article | LinkedIn + Umami |
| Nouvelles inscriptions waitlist (via contenu) | 30+ | PostgreSQL |
| Feedback qualitatif | 10+ réponses | Formulaire intégré |

### Learn
- [ ] Quelle app intéresse le plus ? → priorité dev Cycle 3
- [ ] Le contenu LPA génère-t-il des inscriptions ? → double down ou pivoter
- [ ] Le concept "App Store métier" résonne-t-il ? → ajuster la navigation

---

## Cycle 3 — Première app métier live

**Période** : 20 - 30 avril 2026
**Phase marketing** : Transition Phase B → Phase C
**Statut** : ⬜ À faire

### Hypothèse
> "Une app métier fonctionnelle (même minimaliste) génère des retours d'usage exploitables et prouve la valeur 'zéro friction'."

### Build — Technique (choisir UNE app selon les données Cycle 2)

| Option | Déclencheur | Description |
|---|---|---|
| **A. Booking consultant** | Les freelances dominent la waitlist | Calendrier temps réel + réservation anonyme (core product) |
| **B. Outil PMFlow** | Intérêt outils dans les clics portail | Générateur LinkedIn pour consultants ERP |
| **C. Dashboard métier** | Les clients dominent la waitlist | Meteo-projet ou gestion de stock simplifiée |

- [ ] Déployer sur Vercel avec sous-domaine dédié
- [ ] Connecter au PostgreSQL VPS (schéma dédié)
- [ ] Intégrer Umami tracking
- [ ] Prototype "Réservation Anonyme" si Option A choisie

### Build — Marketing
- [ ] **Post LinkedIn #6** : "Notre première app est live — voici ce qu'elle fait en 30 secondes" (démo vidéo/gif)
- [ ] Email waitlist : "Accès anticipé — testez avant tout le monde"
- [ ] Recueillir 5 témoignages beta testeurs

### Measure — KPIs cibles

| Métrique | Cible | Source |
|---|---|---|
| Utilisateurs actifs hebdo | 10+ | Umami |
| Actions par session | >3 | Umami events |
| NPS ou satisfaction (1-5) | >3.5 | Feedback in-app |
| Bugs critiques | <5 | Formulaire feedback |
| Si Option A : réservations test | 5+ | PostgreSQL |

### Learn
- [ ] L'app résout-elle un vrai problème ?
- [ ] Les utilisateurs reviennent-ils ?
- [ ] Quel feature request revient le plus ?
- [ ] La "Réservation Anonyme" suscite-t-elle de la curiosité ?

---

## Cycle 4 — Lancement public 🚀

**Période** : 30 avril 2026
**Phase marketing** : **Phase C — Le Lancement / Conversion**
**Statut** : ⬜ À faire

### Hypothèse
> "Les inscrits waitlist convertiront en utilisateurs actifs si l'offre Early Adopter est suffisamment attractive."

### Build — Technique
- [ ] Landing page mise à jour → redirection vers le portail
- [ ] Offre "Early Adopter" (avantage fondateur : commission réduite, badge, priorité)
- [ ] Onboarding consultant : upload dossier admin (KYC/URSSAF), calendrier
- [ ] Onboarding client : booking direct (1h, 2h, 5h)
- [ ] NDA automatique (template pré-signé)
- [ ] 2ème app métier live (selon learnings Cycle 3)
- [ ] CGU / Politique de confidentialité (RGPD)

### Build — Marketing (Phase C : Conversion)
- [ ] **Email de lancement** aux inscrits waitlist (Brevo) — objet : "C'est ouvert. Réservez l'intelligence, pas la paperasse."
- [ ] **Post LinkedIn #7** : Annonce officielle — "Perform-Learn.fr est live" (vidéo de démo)
- [ ] **Post LinkedIn #8** : Social proof — témoignages beta testeurs
- [ ] **Argument clé** : "Réservez l'intelligence, pas la paperasse. Dossier admin et NDA déjà validés."
- [ ] Relance J+3 non-ouvreurs email (Brevo)

### Measure — KPIs cibles

| Métrique | Cible S1 | Source |
|---|---|---|
| Taux d'ouverture email lancement | >40% | Brevo |
| Taux de clic email → portail | >15% | Brevo + Umami |
| Nouveaux inscrits post-lancement | 30+ | PostgreSQL |
| Experts "Ready-to-book" (dossier validé) | 5+ | PostgreSQL |
| Premières réservations | 3+ | PostgreSQL |
| Utilisateurs actifs J7 | 15+ | Umami |

### Learn
- [ ] Le produit a-t-il du product-market fit ? (rétention J7)
- [ ] L'offre Early Adopter convertit-elle ?
- [ ] Le Time-to-Contract est-il < 5 minutes en pratique ?
- [ ] Quel canal d'acquisition fonctionne le mieux ?

---

## Cycle 5 — Croissance & récurrence

**Période** : Mai - Juin 2026
**Statut** : ⬜ À faire

### Hypothèse
> "Les clients satisfaits reviennent et réservent à nouveau — la récurrence prouve le product-market fit."

### Build
- [ ] Système de paiement par séquestre (Stripe Connect)
- [ ] Booking récurrent (abonnement 10h/mois, 20h/mois)
- [ ] Dashboard consultant : revenus, calendrier, statistiques
- [ ] Dashboard client : historique, factures, experts favoris
- [ ] 3ème-4ème app métier dans le catalogue
- [ ] Système de notation post-mission (anonyme puis révélé)
- [ ] Publication régulière LPA (1 article/semaine)

### Measure — KPIs cibles

| Métrique | Cible | Source |
|---|---|---|
| Taux de récurrence clients | >30% | PostgreSQL |
| Time-to-Contract moyen | <5 min | PostgreSQL (timestamps) |
| Experts "Ready-to-book" | 20+ | PostgreSQL |
| NPS plateforme | >40 | Survey |
| Visiteurs organiques/mois | 500+ | Umami |

### Learn
- [ ] Les clients bookent-ils plusieurs fois ? (récurrence = PMF)
- [ ] Les consultants gardent-ils leur calendrier à jour ?
- [ ] Le contenu LPA génère-t-il du trafic organique ?

---

## Cycle 6 — Monétisation & scaling

**Période** : Juillet - Septembre 2026
**Statut** : ⬜ À faire

### Hypothèse
> "Le modèle à 12-15% de commission est viable et les utilisateurs engagés acceptent des fonctionnalités premium."

### Build
- [ ] Commission activée sur les transactions réelles
- [ ] Assurance RC Pro intégrée (partenariat)
- [ ] Templates/documents premium (revenue stream PMFlow, 50-99€)
- [ ] Abonnement SaaS "Pro" pour consultants (19€/mois — profil boosté, analytics avancées)
- [ ] API publique pour intégrations tierces

### Measure — KPIs cibles

| Métrique | Cible | Source |
|---|---|---|
| MRR (Monthly Recurring Revenue) | >500€ | Stripe |
| Volume de transactions via séquestre | >2 000€/mois | Stripe |
| Nombre d'apps dans le catalogue | 5+ | PostgreSQL |
| Taux de conversion free → paid | >5% | Stripe + PostgreSQL |
| CAC (Coût d'acquisition client) | <10€ | Calcul |

### Décisions de scaling

| Signal | Action |
|---|---|
| >500 utilisateurs actifs simultanés | Migrer PostgreSQL → Supabase ou VPS plus gros |
| >50 Go de fichiers MinIO | Migrer → OVH Object Storage |
| MRR > 500€ | Domaine custom par app + support dédié |
| Rétention J30 > 20% | PMF confirmé → accélérer acquisition |
| Time-to-Contract < 3 min | Avantage compétitif → communiquer dessus |

---

## Vue calendaire

```
Mars 2026        1-15 Avril        15-25 Avril       20-30 Avril       30 Avril          Mai-Juin          Juil-Sept
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Cycle 0 ✅       Cycle 1 🔄        Cycle 2           Cycle 3           Cycle 4 🚀        Cycle 5           Cycle 6
Validation       Infra +           Portail +         1ère app          Lancement         Croissance +      Monétisation
problème         Waitlist          Autorité LPA      métier live       public            récurrence        + scaling

                 PHASE A           PHASE B           B → C             PHASE C
                 TEASING           AUTORITÉ          Transition        CONVERSION
                 "Le Problème"     "Le Labo"         Beta testeurs     "Early Adopter"
```

---

## Calendrier éditorial LinkedIn

| Semaine | Post | Angle | Phase |
|---|---|---|---|
| S1 Avril | #1 Le Problème | "Le chaos admin qui tue la performance freelance" | A — Teasing |
| S1 Avril | #2 La Solution | "Réserver un expert en 5 min, pas 5 semaines" | A — Teasing |
| S2 Avril | #3 L'Invitation | "On construit la plateforme qu'on aurait voulu avoir" + lien waitlist | A — Teasing |
| S2 Avril | Papier LPA #1 | "L'entreprise apprenante — pourquoi les freelances fuient les plateformes" | B — Autorité |
| S3 Avril | #4 Le Portail | Screenshots/vidéo du portail en construction | B — Autorité |
| S3 Avril | Papier LPA #2 | "Time-to-Contract : la métrique qui coûte des milliers d'euros" | B — Autorité |
| S3 Avril | #5 Coulisses | "On a construit toute l'infra avec l'IA en 2 semaines" | B — Autorité |
| S4 Avril | #6 Première app | Démo vidéo/gif de l'app live | B → C |
| 30 Avril | #7 Lancement | "Perform-Learn.fr est live" — vidéo démo | C — Conversion |
| S1 Mai | #8 Social proof | Témoignages beta testeurs | C — Conversion |

---

## Stack technique

| Couche | Techno | Coût |
|---|---|---|
| Backend/DB | PostgreSQL 16 (VPS) | 0€ (inclus VPS) |
| Stockage fichiers | MinIO (VPS) | 0€ (inclus VPS) |
| Analytics | Umami (VPS) | 0€ (inclus VPS) |
| Monitoring | Netdata (VPS) | 0€ (inclus VPS) |
| Reverse proxy | Caddy (VPS) | 0€ (inclus VPS) |
| API backend | Node.js (VPS) | 0€ (inclus VPS) |
| Frontend apps | Next.js 14+ (Vercel) | 0€ (tier gratuit) |
| Auth | NextAuth.js | 0€ |
| Email | Brevo (ex-Sendinblue) | 0€ (300/jour) |
| Paiements | Stripe Connect | 1.4% + 0.25€/tx |
| Hébergement VPS | OVH VPS-1 | ~6€/mois |
| **Total mensuel pré-revenu** | | **~6€/mois** |

---

## Règles de pivot

| Signal | Pivot envisagé |
|---|---|
| <20 inscrits waitlist après 2 semaines de promo | Revoir la proposition de valeur ou la cible |
| 80%+ freelances, 0 clients | Pivoter vers un outil SaaS pur pour freelances (PMFlow first) |
| 80%+ clients, 0 freelances | Pivoter vers marketplace de missions avec sourcing actif |
| Rétention J7 < 5% | Le produit ne résout pas le bon problème → interviews utilisateurs |
| Time-to-Contract > 30 min | La promesse "zéro friction" n'est pas tenue → simplifier l'onboarding |
| 0 conversion paid après 2 mois | Revoir le pricing ou le modèle (freemium vs one-shot) |
| Contenu LPA = 0 engagement | Abandonner l'angle "labo", aller direct produit |

---

## Historique des décisions

| Date | Décision | Raison |
|---|---|---|
| Mars 2026 | Positionnement "Digital Service Hub haut de gamme" | Différenciation vs plateformes généralistes low-cost |
| Mars 2026 | Commission 12-15% | Argument compétitif vs agences à 25-40% |
| Mars 2026 | Identité LPA (Laboratoire) | Crédibilité + contenu marketing différenciant |
| 04/04/2026 | Architecture hybride VPS + Vercel (Option A) | Scalabilité + coût minimal + données sous contrôle |
| 04/04/2026 | PostgreSQL multi-schéma plutôt que multi-DB | Simplicité opérationnelle pour un POC |
| 04/04/2026 | Waitlist segmentée client/freelance | Mesurer le ratio demande/offre dès le teasing |
| 04/04/2026 | Landing minimaliste plutôt que site complet | Valider la demande avant de construire |
| 04/04/2026 | Plan marketing 3 phases (Teasing → Autorité → Conversion) | Alignement marketing/tech sur le même calendrier |
