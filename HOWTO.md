# HOWTO.md — Guide utilisateur · perform-learn.fr

> **Mis à jour à chaque release par l'Agent RELEASE.**
> Version courante : `v1.3.0` — 01 mai 2026
>
> Ce guide décrit comment utiliser la plateforme perform-learn.fr selon votre rôle.
> Pour les règles métier détaillées et le setup technique, voir `CLAUDE.md`.

---

## Accès à la plateforme

| URL | Description |
|---|---|
| `https://portal.perform-learn.fr` | Portail principal |
| `https://portal.perform-learn.fr/freelancehub/register` | Inscription |
| `https://portal.perform-learn.fr/freelancehub/login` | Connexion |

**Comptes de démonstration** (mot de passe : `demo1234`) :

| Rôle | Email | Dashboard |
|---|---|---|
| Admin | `admin@perform-learn.fr` | `/freelancehub/admin` |
| Consultant | `consultant1@perform-learn.fr` | `/freelancehub/consultant` |
| Client | `client1@perform-learn.fr` | `/freelancehub/client` |

---

## Rôles et accès

| Rôle | Ce qu'il peut faire |
|---|---|
| **Client** | Rechercher un consultant, réserver, payer, laisser une évaluation |
| **Consultant** | Gérer son profil et agenda, voir ses réservations, suivre ses gains, évaluer |
| **Admin** | Tout + valider les KYC, gérer les utilisateurs, exporter CSV, libérer des fonds manuellement |

---

## Guide Client

### 1. S'inscrire en tant que client

1. Aller sur `/freelancehub/register`
2. Choisir le rôle **Client**
3. Renseigner email + mot de passe → auto-login vers le dashboard client
4. Alternative : **Continuer avec Google** (rôle consultant attribué par défaut → contactez l'admin pour changer)

### 2. Rechercher un consultant

1. Dashboard client → champ de recherche par compétence
2. Renseigner le budget horaire (optionnel — améliore le matching)
3. Les résultats affichent les 5 meilleurs consultants selon le score de matching :
   - Compétence (55%) · Rating (35%) · Disponibilité (5%) · Prix (5%)
4. Les identités des consultants sont **anonymes** jusqu'au paiement (RG-01)

### 3. Réserver et payer

1. Cliquer sur un consultant → **Réserver**
2. Sélectionner un créneau disponible dans son agenda
3. Vérifier le récapitulatif : prix HT, TVA, TTC
4. Cliquer **Confirmer et payer** → modal Stripe
5. Renseigner les informations de carte (cartes test : `4242 4242 4242 4242`)
6. Après paiement capturé : l'identité du consultant est **révélée** (nom, email, bio, LinkedIn)
7. Une notification de confirmation est envoyée par email et dans la cloche

### 4. Suivre mes réservations

Dashboard client → **Mes réservations** :

| Statut | Signification |
|---|---|
| `pending` | Réservation créée, paiement en attente |
| `confirmed` | Paiement capturé, mission confirmée |
| `in_progress` | Consultant a démarré la session |
| `completed` | Session terminée |
| `cancelled` | Annulée (remboursement via Stripe) |

### 5. Laisser une évaluation

Après `completed` : **Évaluer la mission** → note /5 + commentaire.
Les fonds sont libérés au consultant quand les 2 parties ont évalué.

---

## Guide Consultant

### 1. S'inscrire en tant que consultant

1. Aller sur `/freelancehub/register`
2. Choisir le rôle **Consultant**
3. Après inscription : `is_available = false` par défaut (en attente validation KYC admin)

### 2. Compléter son profil

Dashboard consultant → **Mon profil** :
- Titre, bio, compétences (avec niveau : Junior / Intermédiaire / Senior / Expert)
- Tarif horaire (THM en €) — **détermine le prix affiché aux clients**
- LinkedIn URL
- Photo de profil

### 3. Passer le KYC

1. Dashboard → **Vérification KYC**
2. Uploader KBIS et/ou attestation URSSAF (formats : PDF, JPG, PNG)
3. L'admin valide → vous recevez une notification + email
4. Une fois validé : `is_available = true` → profil visible dans le matching

**Badge Fondateur** : attribué automatiquement aux 20 premiers consultants validés (commission 10% au lieu de 15%).

### 4. Signer le NDA

Avant la 1ère mission : lire et cocher le NDA (Accord de Non-Divulgation).
La signature est horodatée (IP + date) et archivée.

### 5. Gérer son agenda

Dashboard → **Mon agenda** :
- Grille semaine (lundi–dimanche, 08h–20h, pas de 1h)
- **Clic sur un créneau vert** → ajouter une disponibilité
- **Clic sur un créneau vert existant** → supprimer
- **Créneau terracotta "PRIS"** → réservation existante (non modifiable)
- **Bouton "Dupliquer →"** → copier les créneaux disponibles vers la semaine suivante

### 6. Gérer ses réservations

Dashboard → **Mes missions** :
- Voir le détail de chaque mission (client révélé après paiement)
- Bouton **Démarrer** (passe en `in_progress`)
- Bouton **Terminer** (passe en `completed`)
- Laisser une évaluation du client après complétion

### 7. Suivre ses gains

Dashboard → **Mes gains** :
- Revenus cumulés, historique par mission
- Commission : 15% (10% si badge Fondateur ou parrainage actif)
- Formule : `montant_consultant = HT × 0.85`

### 8. Programme de parrainage

- Votre lien de parrainage : `https://portal.perform-learn.fr/freelancehub/register?ref=VOTRE_ID`
- Commission réduite à 13% sur vos missions si un filleul actif
- Compteur de filleuls dans votre dashboard

---

## Guide Administrateur

### 1. Accès

Dashboard admin : `/freelancehub/admin` — accessible uniquement avec le rôle `admin`.

### 2. Valider les KYC

Admin → **Consultants** → liste des KYC soumis :
- **Valider** : active le consultant (`is_available = true`), envoie une notification
- **Refuser** : avec motif obligatoire, notification envoyée au consultant

### 3. Gérer les réservations et paiements

Admin → **Réservations** :
- Filtres : statut, dates, consultant, client, montant HT min/max
- Totaux en bas : Σ HT, Σ TTC, Σ commission
- **Libérer manuellement** les fonds (si une partie ne soumet pas d'évaluation)
- Override de statut en cas de litige

### 4. Exporter en CSV

`GET /api/freelancehub/admin/export-csv` (bouton dans le tableau des réservations).
Protection anti-injection : les formules Excel (`=`, `+`, `-`, `@`) sont préfixées par `'`.

### 5. Monitoring

| Outil | URL | Usage |
|---|---|---|
| Analytics | `analytics.perform-learn.fr` | Trafic, conversions |
| Monitoring | `monitor.perform-learn.fr` | CPU, RAM, disque VPS |
| Logs Vercel | Dashboard Vercel | Erreurs runtime Next.js |
| Stripe | Dashboard Stripe | Paiements, webhooks, remboursements |
| Resend | Dashboard Resend | Taux de livraison emails |

---

## Notifications

La cloche dans le header affiche un badge rouge en cas de notification non lue.

| Notification | Déclencheur |
|---|---|
| `booking_confirmed` | Paiement capturé (→ client) |
| `new_booking` | Paiement capturé (→ consultant) |
| `review_request` | 1ère évaluation soumise (→ l'autre partie) |
| `fund_released` | 2e évaluation soumise (→ consultant) |
| `reminder` | La veille d'une mission à 08:00 UTC (→ client + consultant) |

Cliquer sur une notification la marque comme lue. **Tout marquer comme lu** : bouton dans le panel.

---

## FAQ

**Q : Mon profil consultant n'apparaît pas dans les résultats de recherche.**
R : Vérifiez que votre KYC est validé (`is_available = true`) et que vous avez au moins 1 créneau futur dans votre agenda.

**Q : Je ne vois pas l'identité du consultant après avoir payé.**
R : Rafraîchissez la page. L'identité est révélée après la capture Stripe (peut prendre quelques secondes).

**Q : J'ai oublié mon mot de passe.**
R : `/freelancehub/login` → **Mot de passe oublié** → email avec lien valable 1h.

**Q : Le paiement est décliné.**
R : Vérifiez les informations de carte. En test : utilisez `4242 4242 4242 4242`. En prod : contactez votre banque.

**Q : Je veux me connecter avec Google mais j'ai déjà un compte email.**
R : Le SSO Google lie automatiquement votre compte si l'email Google correspond à votre compte existant.

**Q : Mes fonds ne sont pas libérés.**
R : Les fonds sont libérés quand les 2 parties ont soumis une évaluation. Si l'une des parties ne le fait pas, contactez l'admin pour une libération manuelle.

**Q : Comment fonctionne la commission Early Adopter ?**
R : Les 20 premiers consultants dont le KYC est validé reçoivent le badge Fondateur. Commission : 10% au lieu de 15%, à vie.

---

## Changelog utilisateur

### v1.3.0 — 01 mai 2026
- **Mot de passe oublié** — nouveau flow de réinitialisation par email
- **Parrainage** — lien `?ref=` dans votre dashboard, commission 13% si filleul actif
- **Corrections de sécurité** — montant calculé côté serveur, webhooks Stripe robustifiés

### v1.2.0 — 30 avril 2026 (lancement public)
- **KYC consultant** — upload KBIS/URSSAF + validation admin + badge Fondateur
- **NDA automatique** — signature horodatée avant 1ère mission
- **SSO Google** — connexion avec votre compte Google
- **Offre Early Adopter** — badge Fondateur + commission 10% pour les 20 premiers

### v1.1.0 — 20 avril 2026
- **Landing page** — CTA vers le portail + section experts B2B
- **Agenda consultant** — grille semaine avec duplication de créneaux
- **Tableau admin** — filtres avancés + export CSV

### v1.0.0 — 04 avril 2026
- Lancement interne : matching, booking, paiement Stripe, évaluations, notifications
