# ROADMAP.md — perform-learn.fr

> **Vision** : "Une entreprise performante est une entreprise apprenante. permettre à chaque consultant de proposer un service de qualité et à chaque entreprise d'accéder à un consultant compétent à l'heure et sans engagement!"
> **Positionnement** : Digital Service Hub haut de gamme — automatiser l'intermédiation freelance/entreprise pour libérer le talent de la paperasse.
> **Entité** : Marketplace d'intermediation entre freelance et client
> **Lancement public** : 30 avril 2026
**Version courante** : `v1.3.0`

---

## Modèle économique

| Élément | Détail |
|---|---|
| Commission | 15 % (vs 25-40 % agences classiques) |
| Prix consultation | Paramétrable par consultant (THM €/h) |
| Séquestre | Libéré automatiquement après 2 évaluations croisées |
| Coût infra | ~6 €/mois (VPS OVH) + Vercel tier gratuit |
| DEV | Basé sur IA Claude 90%, assistance humaine minimale |
| Ressources humaines | Étudiant BTP 1h/j (commercial/finance) + Chef de projet 1-2h/j |

---

## Métriques Nord-Star

| Phase | Métrique principale |
|---|---|
| Lancement (C4) | Experts « Ready-to-book » (dossier KYC validé) |
| Croissance (C5) | Time-to-Contract (objectif < 5 min) |
| Monétisation (C6) | Taux de récurrence clients |

---

## Roadmap — Cycles à livrer

### Cycle 4 — Lancement public 🚀
**30 avril 2026**

Priorités ordonnées par valeur client (confiance → acquisition → rétention) :

**🔴 Bloquants légaux — RGPD Phase 1** *(obligatoire avant tout utilisateur réel)*
- [x] **Page CGU** — page `/freelancehub/cgu`, checkbox horodatée à l'inscription → `freelancehub.signatures` (IP + UA) · `business_value: 90` · `value_type: strategic_positioning` ✅ 2026-04-21
- [x] **Politique de confidentialité** — page `/freelancehub/privacy` : responsable traitement, données collectées, durée conservation, droits utilisateurs · `business_value: 90` · `value_type: strategic_positioning` ✅ 2026-04-21
- [x] **Mentions légales** — page `/legal` : éditeur, hébergeur, SIRET *(⚠ adresse `[ADRESSE]` à compléter)* · `business_value: 85` · `value_type: strategic_positioning` ✅ 2026-04-21
- [x] **Consentement email marketing** — opt-in explicite à l'inscription waitlist/portail + migration 014 · `business_value: 80` · `value_type: user_acquisition` ✅ 2026-04-21
- [x] **Droit à l'effacement** — API `DELETE /api/freelancehub/user/me` : anonymisation données personnelles, soft delete · `business_value: 75` · `value_type: strategic_positioning` ✅ 2026-04-21

**🔴 Confiance client — Lancement crédible**
- [ ] **Onboarding consultant KYC** — upload KBIS/URSSAF dans MinIO ✅ (upload OK), validation admin avant activation du profil (badge "Vérifié") · `business_value: 92` · `value_type: user_acquisition`
- [ ] **NDA automatique Phase 1** — checkbox + signature horodatée avant 1ère mission, stockée dans `freelancehub.signatures` · `business_value: 80` · `value_type: strategic_positioning`
- [ ] **Offre Early Adopter** — commission 10% (au lieu de 15%) + badge "Fondateur" pour les 20 premiers consultants · `business_value: 88` · `value_type: user_acquisition`

**🟠 Acquisition — Signal de lancement**
- [ ] **Landing page → portail** — bouton CTA vers `/freelancehub/register` sur perform-learn.fr · `business_value: 95` · `value_type: user_acquisition`
- [ ] **Email de lancement** aux inscrits waitlist (Brevo) — J-3 teasing, J-0 go-live · `business_value: 88` · `value_type: user_acquisition`

**🔴 Sécurité — Correctifs avant lancement**
- [x] **Fix CRON_SECRET query param** — `Authorization: Bearer` uniquement dans `cron/reminders/route.ts` · `business_value: 85` · `value_type: strategic_positioning` ✅ 2026-04-21
- [x] **Fix Multiple PaymentIntents** — vérifie PI existant avant création Stripe dans `payment-intent/route.ts` · `business_value: 90` · `value_type: strategic_positioning` ✅ 2026-04-21
- [x] **Fix exposition erreur KYC** — message générique en réponse 500 (`kyc/route.ts`) · `business_value: 75` · `value_type: strategic_positioning` ✅ 2026-04-21
- [x] **Health Check endpoint** — `GET /api/freelancehub/health` (SELECT 1 DB) · `business_value: 70` · `value_type: technical_debt` ✅ 2026-04-21
- [x] **Headers sécurité HTTP** — `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` dans `next.config.mjs` · `business_value: 80` · `value_type: strategic_positioning` ✅ 2026-04-23
- [x] **Fix IDOR matching** — whitelist rôle (`role !== 'client' && !== 'admin'`) dans `matching/route.ts:7` · `business_value: 85` · `value_type: strategic_positioning` ✅ 2026-04-23
- [x] **Fix IDOR slots** — JOIN consultants + `AND c.is_available = true` dans `client/slots/route.ts` · `business_value: 80` · `value_type: strategic_positioning` ✅ 2026-04-23
- [x] **Idempotence webhook Stripe** — migration `015_webhook_events.sql` + INSERT ON CONFLICT dans webhook route · `business_value: 85` · `value_type: strategic_positioning` ✅ 2026-04-23 *(migration à appliquer sur VPS)*
- [x] **Vérification montant PI côté serveur** — calcul `expectedTtcCents` depuis DB + guard null, rejet 400 si mismatch · `business_value: 90` · `value_type: strategic_positioning` ✅ 2026-04-23

**🟡 Rétention — Post-lancement immédiat**
- [ ] **Facture PDF** générée automatiquement après paiement (nom client, n° réservation, montant HT/TVA/TTC, mentions légales) → stockée MinIO, accessible depuis "Mes paiements" · `business_value: 76` · `value_type: ux_improvement`

**🔵 Refactoring technique — Fondations avant scaling**
- [ ] **`constants.ts`** — centraliser `BOOKING_STATUS_MAP`, `PAYMENT_STATUS_MAP`, `BOOKING_TRANSITIONS`, types `BookingStatus`/`PaymentStatus`, constantes rôles (élimine 5+ duplications de STATUS_MAP) · `business_value: 70` · `value_type: technical_debt`
- [ ] **`pricing.ts`** — déplacer `computePricing()` depuis `matching.ts`, supprimer `buildPricing()` de `BookingModal`, unifier le calcul dans `payment-intent/route.ts`, ajouter `fmtEur(cents)` (élimine 19+ conversions inline `cents/100`) · `business_value: 65` · `value_type: technical_debt`
- [ ] **Centraliser `types.ts`** — déplacer `BookingRow`, `PaymentRow`, `AvailableSlot` depuis les composants vers `lib/freelancehub/types.ts` · `business_value: 60` · `value_type: technical_debt`

**KPIs cibles** : 3+ experts Ready-to-book au 30/04 · 5+ clients inscrits · **100€ CA au 31/05** (7 sessions × 15% commission)

---

### Cycle 5 — Croissance & récurrence
**Mai – Juin 2026**

**RGPD Phase 2 — Droits utilisateurs complets**
- [ ] **Export données** — `GET /api/freelancehub/user/me/export` : ZIP contenant profil, bookings, avis, paiements (format JSON + CSV lisible, délai légal 30 jours) · `business_value: 70` · `value_type: strategic_positioning`
- [ ] **Registre des traitements** (art. 30 RGPD) — document interne listant les traitements : booking, paiement, évaluation, emails, analytics Umami · `business_value: 65` · `value_type: strategic_positioning`
- [ ] **Signatures Phase 2 — Yousign** : NDA signé électroniquement (éditeur français, certifié eIDAS), document stocké MinIO, `provider_signature_id` tracé en DB · `business_value: 62` · `value_type: strategic_positioning`
- [ ] **Sous-traitants** — DPA (Data Processing Agreement) Stripe, Resend, Vercel, OVH documentés · `business_value: 55` · `value_type: strategic_positioning`

**Dette technique — Performance & Sécurité**
- [ ] **Rate limiting** — middleware sur `/api/freelancehub/auth/*` (Upstash ou in-memory) · `business_value: 80` · `value_type: strategic_positioning`
- [ ] **Stripe singleton** — `lib/freelancehub/stripe.ts` partagé (évite réinstanciation par requête) · `business_value: 60` · `value_type: technical_debt`
- [ ] **CSP Headers** — `next.config.ts` avec `Content-Security-Policy`, `X-Frame-Options` · `business_value: 72` · `value_type: strategic_positioning`
- [ ] **Pool connexions PostgreSQL** — `max: 2` immédiat + PgBouncer C6 (évite saturation 100 conx) · `business_value: 78` · `value_type: technical_debt`
- [ ] **Tests automatisés** — Vitest (unit: computePricing, matching) + Playwright (E2E booking flow) · `business_value: 85` · `value_type: technical_debt`
- [ ] **Fix timezone dates** — remplacer `'T00:00:00'` par `'T00:00:00Z'` dans email.ts et cron · `business_value: 65` · `value_type: technical_debt`
- [ ] **Skills sync transactionnel** — batch INSERT `unnest` dans `consultant/profile/route.ts` · `business_value: 60` · `value_type: technical_debt`
- [ ] **`validators.ts`** — centraliser `isValidDate()` et `isValidTime()` (dupliqués dans `slots/route.ts` + `slots/bulk/route.ts`) · `business_value: 55` · `value_type: technical_debt` *(identifié refacto.md 2026-04-23)*

**Support & relation client**
- [x] **Formulaire de contact support** — page `/freelancehub/support` : sujet (technique/paiement/compte/autre), message, email de contact pré-rempli → Resend vers `contact@perform-learn.fr` + accusé réception utilisateur · `business_value: 72` · `value_type: ux_improvement` ✅ 2026-04-23
- [x] **Chatbot support** — widget flottant Intercom-style (ChatWidget), visible sans login, agents Gemini Flash 2.0 (supportPublic + support), escalade vers email humain · `business_value: 68` · `value_type: ux_improvement` ✅ 2026-04-23

**Valeur client — Récurrence & revenus**
- [ ] **Stripe Connect** — reversement automatique consultant (supprime la gestion manuelle) · `business_value: 90` · `value_type: cost_reduction`
- [ ] **Booking récurrent** — abonnement 10h/20h/mois avec tarif dégressif (−10%) · `business_value: 85` · `value_type: user_acquisition`
- [ ] **Dashboard consultant enrichi** — revenus cumulés, courbe mensuelle, statistiques missions · `business_value: 80` · `value_type: ux_improvement`
- [ ] **Dashboard client enrichi** — historique complet, experts favoris, budget consommé/mois · `business_value: 80` · `value_type: ux_improvement`
- [ ] **Factures comptables enrichies** — export multi-période, regroupement par consultant · `business_value: 70` · `value_type: ux_improvement`

**Notoriété**
- [ ] Publication régulière LinkedIn (1 article/semaine — cible DRH et DSI) · `business_value: 75` · `value_type: user_acquisition`
- [ ] 2ème app métier dans le catalogue (Météo Projet ou Gestion Stock) · `business_value: 60` · `value_type: strategic_positioning`

**🔵 Refactoring technique — Composants réutilisables**
- [ ] **`KpiCard` + `StatusBadge` + `PageHeader`** — extraire 3 composants UI partagés (6 dashboards redéfinissent `KpiCard` inline, 5+ endroits copient `StatusBadge`) dans `components/freelancehub/ui/` · `business_value: 55` · `value_type: technical_debt`
- [ ] **`globals-fh.css`** — centraliser les classes de layout répétées dans 15+ fichiers (`.fh-page`, `.fh-page-title`, `.adm-table*`, `.adm-badge`) dans un CSS global importé par le layout · `business_value: 50` · `value_type: technical_debt`

**KPIs cibles** : taux récurrence > 30 %, Time-to-Contract < 5 min, 20+ experts Ready-to-book

---

### Cycle 6 — Monétisation & scaling
**Juillet – Septembre 2026**

**RGPD Phase 3 — Conformité entreprise (clients B2B)**
- [ ] **DPA client** — contrat de sous-traitance signable en ligne pour les clients entreprises (art. 28 RGPD obligatoire pour les DPO) · `business_value: 65` · `value_type: strategic_positioning`
- [ ] **Politique de rétention automatique** — purge automatique des données après expiration (ex : anonymisation comptes inactifs > 3 ans, purge slots > 1 an) · `business_value: 60` · `value_type: technical_debt`
- [ ] **Procédure de violation** — runbook documenté : détection, notification CNIL < 72h, communication aux personnes concernées · `business_value: 70` · `value_type: strategic_positioning`
- [ ] **Certification ISO 27001 roadmap** — audit préliminaire et plan d'action · `business_value: 50` · `value_type: strategic_positioning`

**Monétisation**
- [ ] **Commission sur transactions réelles** (Stripe Connect opérationnel) · `business_value: 95` · `value_type: cost_reduction`
- [ ] **Assurance RC Pro intégrée** (partenariat assureur) · `business_value: 75` · `value_type: strategic_positioning`
- [ ] **Abonnement SaaS « Pro » consultant** (19 €/mois — profil boosté + badge prioritaire) · `business_value: 85` · `value_type: user_acquisition`
- [ ] **Templates/documents premium** (50–99 €) · `business_value: 65` · `value_type: user_acquisition`
- [ ] **API publique** pour intégrations tierces (RH, ERP) · `business_value: 70` · `value_type: strategic_positioning`

**🔵 Refactoring technique — Découpage des gros composants**
- [ ] **Découper `BookingModal.tsx`** (458 lignes) — extraire `<SlotPicker>`, `<PriceSummary>`, `<StripePaymentStep>` ; BookingModal reste un orchestrateur d'étapes · `business_value: 45` · `value_type: technical_debt`
- [ ] **Découper `SearchClient.tsx`** (385 lignes) — extraire `<SearchForm>` (compétence + budget + submit) · `business_value: 40` · `value_type: technical_debt`
- [ ] **Découper `BookingsTable.tsx`** (293 lignes) — extraire `<BookingsFilters>` et `<BookingsTotals>` ; BookingsTable ne garde que le rendu tableau · `business_value: 40` · `value_type: technical_debt`
- [ ] **Hook `useAgendaSlots`** — extraire la logique métier slots de `AgendaCalendar.tsx` (305 lignes) dans un hook custom · `business_value: 35` · `value_type: technical_debt`

**KPIs cibles** : MRR > 500 €, volume séquestre > 2 000 €/mois, 5+ apps catalogue

---

## Décisions architecturales

| Date | Décision | Raison |
|---|---|---|
| 04/04/2026 | Architecture hybride VPS + Vercel | Scalabilité + coût minimal + données sous contrôle |
| 04/04/2026 | PostgreSQL multi-schéma (pas multi-DB) | Simplicité opérationnelle pour un POC |
| 04/04/2026 | Waitlist segmentée client/freelance | Mesurer le ratio demande/offre dès le teasing |
| 16/04/2026 | Anonymat consultant jusqu'au paiement | Différenciation + protection données RGPD |
| 16/04/2026 | Prix paramétrable par consultant (THM) | Attractivité marché + matching prix/budget client |
| 12/04/2026 | Notifications in-app plutôt que push browser | Moins intrusif, plus simple à implémenter |
| 16/04/2026 | Données hébergées VPS OVH France | Souveraineté données RGPD — pas de transfert hors UE |
| 16/04/2026 | Table `signatures` avec horodatage IP/UA | Preuve légale d'acceptation CGU/NDA (art. 7 RGPD) |

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

## Historique des releases

---

### v1.3.0 — FreelanceHub V1.3
**16 avril 2026**

**Bug fix critique**
- Évaluation client : violation FK corrigée (`consultant_user_id` au lieu de `consultant_id` dans `reviews`)

**Tarif consultant paramétrable**
- `daily_rate` (THM €/h) du consultant utilisé pour calculer le prix de la consultation
- `BookingModal` : affichage dynamique HT/TVA/TTC/honoraire selon le tarif du consultant
- `payment-intent` : recalcul serveur depuis la DB (règle sécurité — jamais côté client)
- Matching : filtre budget par consultant, `price_score` actif (5%)

**Numéro de réservation**
- Migration 010 : `booking_number SERIAL UNIQUE` sur `freelancehub.bookings`
- Affiché `#N°` sur les vues consultant, client et admin

**Consultant autonome**
- API `PATCH /api/freelancehub/consultant/bookings/[id]/status`
- Transitions autorisées : `confirmed → in_progress → completed`
- Composant `BookingAction` avec boutons "Démarrer" / "Terminer"
- Notification client automatique à chaque transition

**Admin tableau comptable**
- Composant `BookingsTable` client — filtres : statut, date de/à, consultant, client, montant min/max
- Ligne de totaux : Σ HT, Σ TTC estimé, Σ commission plateforme (sur résultats filtrés)
- Limite portée à 500 réservations

**UI Agenda**
- Créneaux réservés : fond terracotta `#e07b54` + libellé "PRIS" blanc (était bleu nuit illisible)

**Fichiers créés/modifiés** :
```
migrations/010_booking_number_hourly_rate.sql                       [nouveau]
portal/app/api/freelancehub/consultant/bookings/[id]/status/route.ts [nouveau]
portal/components/freelancehub/admin/BookingsTable.tsx              [nouveau]
portal/components/freelancehub/consultant/BookingAction.tsx         [nouveau]
portal/lib/freelancehub/matching.ts                                 [modifié — tarif paramétrable]
portal/components/freelancehub/client/BookingModal.tsx              [modifié — prix dynamique]
portal/app/api/freelancehub/client/bookings/[id]/payment-intent/route.ts [modifié — recalcul DB]
portal/app/api/freelancehub/reviews/route.ts                        [modifié — bug fix FK]
portal/app/freelancehub/(auth)/client/reviews/[bookingId]/page.tsx  [modifié — bug fix FK]
portal/app/freelancehub/(auth)/admin/bookings/page.tsx              [modifié — délègue BookingsTable]
portal/app/freelancehub/(auth)/consultant/bookings/page.tsx         [modifié — BookingAction + #N°]
portal/app/freelancehub/(auth)/client/bookings/page.tsx             [modifié — #N°]
portal/components/freelancehub/consultant/AgendaCalendar.tsx        [modifié — couleur terracotta]
```

---

### v1.2.0 — FreelanceHub V1.2
**12 avril 2026**

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
- Accès FreelanceHub depuis la homepage du portail
- Tests E2E documentés (scénarios 1→6)

---

### v1.0.0 — FreelanceHub MVP
**Avril 2026**

- Schéma PostgreSQL complet `freelancehub` : 8 tables (migration 006)
- Auth NextAuth v5 + Credentials + bcrypt, RBAC 3 rôles (client / consultant / admin)
- Algorithme de matching 4 critères, top 5 consultants anonymes
- Flow complet : recherche → booking → paiement Stripe → révélation identité
- Interface consultant : dashboard, profil, agenda (slots), réservations, gains
- Interface client : dashboard, recherche, réservations, paiements, évaluations
- Interface admin : dashboard, consultants, réservations, paiements, matching engine
- Emails transactionnels Resend (confirmation, rappel, évaluation, libération fonds)
- Edge Runtime safe (séparation `auth.config.ts` / `auth.ts`)

---

### v0.2.0 — Module gouvernance
**Avril 2026**

- Schéma PostgreSQL `governance` : 6 tables
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
