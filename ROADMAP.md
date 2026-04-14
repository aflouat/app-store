# ROADMAP.md — perform-learn.fr

> **Vision** : "Une entreprise performante est une entreprise apprenante. permettre à chaque consultant de proposer un service de qualité et à chaque entreprise d'accéder à un consultant compétent à l'heure et sans engagement!"
> **Positionnement** : Digital Service Hub haut de gamme — automatiser l'intermédiation freelance/entreprise pour libérer le talent de la paperasse.
> **Entité** : Marketplace d'intermediation entre freelance et client, 
> **Lancement public** : 30 avril 2026
**Version courante** : `v1.2.0`

---
## Algorithme de matching

```
score = 0.40 × skill_match
      + 0.30 × rating_score       (rating / 5)
      + 0.20 × availability_score (slot dispo à la date)
      + 0.10 × price_score        (1 - tarif_norm / budget_max)
```

## Modèle économique

| Élément | Détail |
|---|---|
| Commission | 15 % (vs 25-40 % agences classiques) |
| Prix consultation | paramétrable
| Séquestre | Libéré automatiquement après 2 évaluations croisées |
| Coût infra | ~6 €/mois (VPS OVH) + Vercel tier gratuit |
| DEV| Basé sur claude IA 90% avec un peu d'assistance humaine et devra nécessiter le moins d'intervention technique possibles  |
|ressources humaines| dispo d'une personne profil etudiant en BTP avec une 1h par jour de dispo pour aider dans le commercial et la finance et un Chef de projet 1-2H avec le controle de l'IA dev|

---

## Métriques Nord-Star par phase

| Phase | Métrique principale |
|---|---|
| Teasing (C1) | Inscrits waitlist |
| Autorité (C2) | Engagement LinkedIn (vues + interactions) |
| Lancement (C4) | Experts « Ready-to-book » (dossier validé) |
| Croissance (C5) | Time-to-Contract (objectif < 5 min) |
| Monétisation (C6) | Taux de récurrence clients |

---

## Roadmap — Cycles

### Cycle 0 — Validation du problème ✅
**Mars 2026**

- Maquette HTML du concept
- Exploration marché, positionnement PMFlow
- Identité de marque (logo, palette, typo)
- **Apprentissage** : besoin validé, niche ERP/D365 non occupée, commission des plateformes existantes frein majeur

---

### Cycle 1 — Infra & Signal de demande ✅
**1–15 avril 2026**

- VPS OVH provisionné (Docker Compose, PostgreSQL, MinIO, Umami, Netdata, Caddy)
- API waitlist (Node.js → PostgreSQL)
- Landing page avec countdown 30/04/2026 + formulaire waitlist segmenté
- Sécurisation VPS

---

### Cycle 2 — FreelanceHub MVP ✅
**16–30 avril 2026**

- Schéma PostgreSQL `freelancehub` (8 tables)
- Auth NextAuth v5 + RBAC (3 rôles)
- Algo matching 4 critères (skill 40 %, rating 30 %, dispo 20 %, prix 10 %)
- Flow booking anonyme → paiement Stripe → révélation identité
- Emails transactionnels Resend (4 templates)
- Interface complète consultant / client / admin

---

### Cycle 3 — FreelanceHub V1.2 🔄
**Avril 2026 — en cours**

- Notifications in-app (badge cloche, page dédiée)
- Cron J-1 rappels automatiques (Vercel Cron 08:00 UTC)
- Export CSV réservations (admin)
- Migration SQL 007

**Prochaines étapes prioritaires** :

| Priorité | Feature | Valeur |
|---|---|---|
| 🔴 | Cron J-1 activer et tester en prod | opérationnel |
| 🔴 | Onboarding consultant (upload dossier admin KYC/URSSAF) | user_acquisition |
| 🟠 | Booking récurrent (abonnement 10h/mois) | cost_reduction |
| 🟠 | Page profil consultant éditable publiquement | ux_improvement |
| 🟡 | Tableau de bord client : experts favoris | ux_improvement |

---

### Cycle 4 — Lancement public 🚀
**30 avril 2026**

- [ ] Landing page → redirection portail
- [ ] Offre Early Adopter (commission réduite, badge fondateur)
- [ ] Onboarding consultant KYC/URSSAF complet
- [ ] CGU / Politique de confidentialité (RGPD)
- [ ] Email de lancement aux inscrits waitlist (Brevo)
- [ ] **Signatures Phase 1** — table `freelancehub.signatures` + checkbox CGU horodatée à l'onboarding (migration 008, provider `checkbox`, légalement suffisant pour CGU/ToS)
- [ ] **NDA automatique Phase 1** — template PDF NDA généré à la 1ère mission, acceptation checkbox + signature stockée en DB

---

### Cycle 5 — Croissance & récurrence
**Mai – Juin 2026**

- [ ] Stripe Connect (reversement automatique consultant)
- [ ] Booking récurrent (abonnement 10h/20h par mois)
- [ ] Dashboard consultant : revenus, calendrier, statistiques
- [ ] Dashboard client : historique, factures, experts favoris
- [ ] 2ème-3ème app métier dans le catalogue (Météo Projet ou Gestion Stock)
- [ ] Publication régulière LPA (1 article/semaine)
- [ ] **Agenda Doctolib — CalendarWeek consultant** ✅ implémenté C5 : grille semaine visuelle (clic par case), navigation sem. précédente/suivante, duplication de semaine en 1 clic, migration 008
- [ ] **Agenda — Slot picker client** ✅ implémenté C5 : étape 0 BookingModal, sélection date + heure parmi les créneaux disponibles du consultant (60 jours)
- [ ] **Signatures Phase 2 — Yousign** : intégration API Yousign (éditeur français, RGPD), NDA signé électroniquement avant 1ère mission consultant, document stocké MinIO, `provider_signature_id` tracé en DB

**KPIs cibles** : taux récurrence > 30 %, Time-to-Contract < 5 min, 20+ experts Ready-to-book

---

### Cycle 6 — Monétisation & scaling
**Juillet – Septembre 2026**

- [ ] Commission activée sur transactions réelles (Stripe Connect)
- [ ] Assurance RC Pro intégrée (partenariat)
- [ ] Abonnement SaaS « Pro » consultant (19 €/mois — profil boosté)
- [ ] Templates/documents premium (50–99 €)
- [ ] API publique pour intégrations tierces

**KPIs cibles** : MRR > 500 €, volume séquestre > 2 000 €/mois, 5+ apps catalogue

---

## Décisions architecturales

| Date | Décision | Raison |
|---|---|---|
| 04/04/2026 | Architecture hybride VPS + Vercel | Scalabilité + coût minimal + données sous contrôle |
| 04/04/2026 | PostgreSQL multi-schéma (pas multi-DB) | Simplicité opérationnelle pour un POC |
| 04/04/2026 | Waitlist segmentée client/freelance | Mesurer le ratio demande/offre dès le teasing |
| 16/04/2026 | Anonymat consultant jusqu'au paiement | Différenciation + protection données RGPD |
| 16/04/2026 | Prix fixe 85 € TTC (pas TJM libre) | Simplicité UX + matching plus juste |
| 12/04/2026 | Notifications in-app plutôt que push browser | Moins intrusif, plus simple à implémenter |

---

## Règles de pivot

| Signal | Pivot envisagé |
|---|---|
| < 20 inscrits waitlist après 2 semaines | Revoir la proposition de valeur ou la cible |
| 80 % freelances, 0 clients | Pivoter vers SaaS pur freelances (PMFlow first) |
| Rétention J7 < 5 % | Le produit ne résout pas le bon problème → interviews |
| Time-to-Contract > 30 min | La promesse « zéro friction » n'est pas tenue → simplifier onboarding |
| 0 conversion paid après 2 mois | Revoir pricing ou modèle |

---

---

## Historique des releases

---

### v1.2.0 — FreelanceHub V1.2
**12 avril 2026** la release 2 est remplacée par 1.2

**Notifications in-app**
- Nouvelle table PostgreSQL `freelancehub.notifications` (migration 007)
- `lib/freelancehub/notifications.ts` : `createNotification`, `getUnreadCount`, `listNotifications`, `markAllRead`, `markOneRead`
- API `GET /api/freelancehub/notifications` (liste) + `PATCH` (mark read)
- Page `/freelancehub/notifications` : liste avec indicateur point rouge, marquage lu/non lu
- Badge cloche dans FHNav (compteur non lus, mise à jour côté serveur dans le layout)
- Notifications automatiques au paiement (`booking_confirmed` client + `new_booking` consultant)
- Notifications automatiques aux évaluations (`review_request` + `fund_released`)

**Cron J-1 rappels automatiques**
- Route `POST /api/freelancehub/cron/reminders` (auth via `Authorization: Bearer <CRON_SECRET>`)
- Vercel Cron configuré : `0 8 * * *` (08:00 UTC chaque jour)
- Envoie emails Resend + crée notifications in-app pour les bookings du lendemain
- Env var `CRON_SECRET` à configurer dans Vercel

**Export CSV admin**
- Route `GET /api/freelancehub/admin/export-csv` (admin only)
- Exporte toutes les réservations avec filtre optionnel `?status=confirmed,completed`
- Bouton `↓ Export CSV` dans `/freelancehub/admin/bookings`

**Fichiers créés/modifiés** :
```
migrations/007_freelancehub_v2.sql                    [nouveau]
portal/lib/freelancehub/notifications.ts              [nouveau]
portal/app/api/freelancehub/notifications/route.ts    [nouveau]
portal/app/api/freelancehub/cron/reminders/route.ts   [nouveau]
portal/app/api/freelancehub/admin/export-csv/route.ts [nouveau]
portal/app/freelancehub/(auth)/notifications/page.tsx [nouveau]
portal/components/freelancehub/FHNav.tsx              [modifié — cloche + badge]
portal/app/freelancehub/(auth)/layout.tsx             [modifié — unreadCount]
portal/app/api/freelancehub/client/bookings/[id]/pay/route.ts   [modifié — notifs]
portal/app/api/freelancehub/reviews/route.ts          [modifié — notifs]
portal/vercel.json                                    [modifié — cron config]
```

---

### v1.1.0 — FreelanceHub Stripe réelle + recherche avancée
**Avril 2026**

- Intégration Stripe réelle (remplace le mock) : `payment-intent/route.ts`, vérification `paymentIntents.retrieve`, protection replay attack via `metadata.booking_id`
- Recherche consultants par compétence + budget client
- Prix fixe 85 € TTC (70,83 € HT) — retire le TJM libre
- Accès FreelanceHub depuis la homepage du portail
- Tests E2E documentés (scénarios 1→6)

---

### v1.0.0 — FreelanceHub MVP
**Avril 2026**

- Schéma PostgreSQL complet `freelancehub` : 8 tables (migration 006)
- Auth NextAuth v5 + Credentials + bcrypt, RBAC 3 rôles (client / consultant / admin)
- Algorithme de matching 4 critères, top 5 consultants anonymes
- Flow complet : recherche → booking → paiement mock → révélation identité
- Interface consultant : dashboard, profil, agenda (slots), réservations, gains
- Interface client : dashboard, recherche, réservations, paiements, évaluations
- Interface admin : dashboard, consultants, réservations, paiements, matching engine
- Emails transactionnels Resend (confirmation, rappel, évaluation, libération fonds)
- Edge Runtime safe (séparation `auth.config.ts` / `auth.ts`)

---

### v0.2.0 — Module gouvernance
**Avril 2026**

- Schéma PostgreSQL `governance` : 6 tables (artifacts, execution_logs, metrics, projects, users, artifact_types)
- Hiérarchie Vision → Cycle → Epic → User Story → Task
- business_value (0–100), value_type, scoring badge
- Vue `v_artifact_context` (jointure complète)
- Interface `/govern` : plan, roadmap, logs, artifacts

---

### v0.1.0 — Infra & Landing
**Mars – début avril 2026**

- VPS OVH Ubuntu 24.04, Docker Compose
- PostgreSQL 16, MinIO, Umami, Netdata, Caddy
- API Node.js (waitlist)
- Landing page perform-learn.fr avec countdown + formulaire waitlist segmenté
- DNS + SSL (Hostinger + Caddy)
- Schéma PostgreSQL `store` (apps, installations, waitlist)
