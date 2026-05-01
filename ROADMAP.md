# ROADMAP.md — perform-learn.fr

> **Vision** : "Une entreprise performante est une entreprise apprenante. permettre à chaque consultant de proposer un service de qualité et à chaque entreprise d'accéder à un consultant compétent à l'heure et sans engagement!"
> **Positionnement** : Digital Service Hub haut de gamme — automatiser l'intermédiation freelance/entreprise pour libérer le talent de la paperasse.
> **Entité** : Marketplace d'intermediation entre freelance et client
> **Lancement public** : 30 avril 2026
> **Version courante** : `v1.3.0`
>
> **Pour les features déjà livrées, voir `HOWTO.md` , pour chaque feature livrée, les supprimer de ce fichier


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
| agent DG autonome | agent dev| agent devops|agent testeur| agent humain Étudiant BTP 1h/j (finance) + Chef de projet 1-2h/j |


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

**🔴 Sécurité — Bloquants lancement (J-2, voir refacto.md)**
- [x] **[C1] Fix montant réservation côté serveur** — calculer `amount_ht` depuis `consultants.daily_rate` en DB, ignorer les champs financiers du JSON client dans `client/bookings/route.ts` · `business_value: 100` · `value_type: strategic_positioning` ✅ 30/04
- [x] **[C2] Fix notification fonds libérés** — remplacer `booking.consultant_id` par `booking.consultant_user_id` dans `reviews/route.ts:124` · `business_value: 90` · `value_type: ux_improvement` ✅ 30/04
- [x] **[N1] Enforcer monthlyCap agents IA** — consommation mensuelle enregistrée dans `chat_limits (identifier=agent:X)`, fallback statique si cap atteint · `business_value: 85` · `value_type: cost_reduction` ✅ 30/04
- [x] **[S16] CSV formula injection** — préfixe `'` sur formules `=+-@` dans `esc()` · `business_value: 70` · `value_type: strategic_positioning` ✅ 30/04
- [x] **[S12] Valider clé S3 presign** — `key.startsWith('kyc/')` + `!key.includes('..')` + guard `\0` · `business_value: 70` · `value_type: strategic_positioning` ✅ 30/04
- [x] **[S13] Gérer charge.refunded** — UPDATE payment + booking cancelled + notifications client+consultant · `business_value: 68` · `value_type: ux_improvement` ✅ 01/05
- [ ] **[S6] Réduire metadata Stripe** — garder uniquement `booking_id` + `amount_ttc` · `business_value: 65` · `value_type: strategic_positioning`
- [ ] **[S9] Logger erreurs email** — remplacer `.catch(() => null)` silencieux · `business_value: 60` · `value_type: technical_debt`
- [x] **[S15] Fix password_hash vide** — NULL au lieu de `''` sur soft-delete · `business_value: 60` · `value_type: strategic_positioning` ✅ 01/05

**🔴 Confiance client — Lancement crédible**
- [x] **Onboarding consultant KYC** — upload KBIS/URSSAF dans MinIO ✅ (upload OK), validation admin avant activation du profil (badge "Vérifié") · `business_value: 92` · `value_type: user_acquisition` ✅ 30/04
- [x] **NDA automatique Phase 1** — checkbox + signature horodatée avant 1ère mission, stockée dans `freelancehub.signatures` · `business_value: 80` · `value_type: strategic_positioning` ✅ 30/04
- [x] **Offre Early Adopter** — commission 10% (au lieu de 15%) + badge "Fondateur" pour les 20 premiers consultants · `business_value: 88` · `value_type: user_acquisition` ✅ 30/04

**🟠 Acquisition — Signal de lancement**
- [x] **Landing page → portail** — bouton CTA vers `/freelancehub/register` sur perform-learn.fr · `business_value: 95` · `value_type: user_acquisition` ✅ 30/04
- [x] **Email de lancement** aux inscrits waitlist — segment consultant + client, script batch, envoyé J0 (1 destinataire marketing_consent=true) · `business_value: 88` · `value_type: user_acquisition` ✅ 30/04

**🟢 Sécurité — Post-lancement**
- [x] **Mot de passe oublié** — flow complet : token 1h (migration 019), API `/auth/forgot-password` + `/auth/reset-password`, pages UI, email Resend · `business_value: 85` · `value_type: ux_improvement` ✅ 01/05

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
- [ ] **Transaction isolation payment** — `withTransaction()` dans `client/bookings/[id]/pay/route.ts` (UPDATE booking + INSERT payment atomiques) + `SELECT FOR UPDATE` dans `payment-intent/route.ts` · `business_value: 95` · `value_type: strategic_positioning`
- [ ] **Timing-safe CRON_SECRET** — remplacer `===` par `crypto.timingSafeEqual()` dans 3 routes (govern/tasks/notify, govern/smoke-test, cron/reminders) · `business_value: 75` · `value_type: strategic_positioning`
- [ ] **[S-08] Atomicité chat budget cap** — `SELECT count` + `INSERT ON CONFLICT` non-atomic dans `lib/freelancehub/chat-router.ts:162-189` → race condition bypasse `monthlyCap` ; corriger avec requête atomique unique conditionnelle · `business_value: 55` · `value_type: cost_reduction`
- [ ] **Rate limiting persistant** — Upstash Redis ou KV Vercel sur auth + payment-intent (remplace in-memory Edge) · `business_value: 80` · `value_type: strategic_positioning`
- [x] **Système referral `?ref=`** — migration 018 `referrer_id` + `referrer_commission_until` ; commission 13% si parrainage actif ; register lit `?ref=` ; dashboard consultant : lien + compteur filleuls · `business_value: 85` · `value_type: user_acquisition` ✅ 01/05
- [x] **GTM custom events** — `trackEvent()` : register, booking_paid, search_consultant, select_consultant · `business_value: 78` · `value_type: user_acquisition` ✅ 01/05
- [ ] **Export données utilisateur (Art. 20 RGPD)** — `GET /api/freelancehub/user/me/export` ZIP · `business_value: 70` · `value_type: strategic_positioning`
- [ ] **Stripe singleton** — `lib/freelancehub/stripe.ts` partagé (évite réinstanciation par requête) · `business_value: 60` · `value_type: technical_debt`
- [x] **CSP Headers + HSTS** — `next.config.mjs` avec `Content-Security-Policy` + `Strict-Transport-Security` · `business_value: 72` · `value_type: strategic_positioning` ✅ 30/04
- [x] **Pool connexions PostgreSQL** — `max: 2` immédiat + PgBouncer C6 (évite saturation 100 conx) · `business_value: 78` · `value_type: technical_debt` ✅ 30/04
- [x] **CI/CD GitHub Actions** — `.github/workflows/ci.yml` : tsc + vitest + next build sur push main · `business_value: 80` · `value_type: technical_debt` ✅ 01/05
- [ ] **Tests automatisés** — Vitest unit: computePricing, matching (base CI existante) + Playwright E2E booking flow · `business_value: 85` · `value_type: technical_debt`
- [ ] **Fix timezone dates** — remplacer `'T00:00:00'` par `'T00:00:00Z'` dans email.ts et cron · `business_value: 65` · `value_type: technical_debt`
- [ ] **Skills sync transactionnel** — batch INSERT `unnest` dans `consultant/profile/route.ts` · `business_value: 60` · `value_type: technical_debt`
- [ ] **`validators.ts`** — centraliser `isValidDate()` et `isValidTime()` (dupliqués dans `slots/route.ts` + `slots/bulk/route.ts`) · `business_value: 55` · `value_type: technical_debt`
- [ ] **Épingler NextAuth v5** — supprimer le `^` dans `package.json` (`"next-auth": "5.0.0-beta.30"` sans caret) pour éviter les mises à jour auto-breaking · `business_value: 70` · `value_type: technical_debt`

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

### v1.3.0 — FreelanceHub V1.3
**16 avril 2026**

- Bug fix critique : violation FK corrigée dans `reviews`
- Tarif consultant paramétrable (`daily_rate`)
- Numéro de réservation (`booking_number`)
- Consultant autonome (transitions `confirmed → in_progress → completed`)
- Admin tableau comptable avec filtres et totaux
- UI Agenda : créneaux réservés en terracotta

### v1.2.0 — FreelanceHub V1.2
**12 avril 2026**

- Notifications in-app (`freelancehub.notifications`)
- Cron J-1 rappels automatiques (08:00 UTC)
- Export CSV admin

### v1.1.0 — FreelanceHub Stripe réelle + recherche avancée
**Avril 2026**

- Intégration Stripe réelle avec vérification PI
- Recherche consultants par compétence + budget
- Tests E2E documentés

### v1.0.0 — FreelanceHub MVP
**Avril 2026**

- Schéma PostgreSQL complet `freelancehub`
- Auth NextAuth v5 + Credentials + bcrypt, RBAC 3 rôles
- Algorithme de matching 4 critères
- Flow complet : recherche → booking → paiement Stripe → révélation identité
- Emails transactionnels Resend


