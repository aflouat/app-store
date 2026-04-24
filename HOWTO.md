# HOWTO.md — perform-learn.fr · Guide opérationnel

> Ce fichier couvre : setup de l'environnement de dev, workflow quotidien, scénarios de test E2E, et règles de gestion (RG) de la plateforme.

## Comptes de démonstration (mot de passe : `demo1234`)

| Rôle | Email |
|---|---|
| Admin | `admin@perform-learn.fr` |
| Consultant | `consultant1@perform-learn.fr` |
| Client | `client1@perform-learn.fr` |
---

## 0. Mode opératoire — test en local

### 0.1 Pre-flight (avant de tester quoi que ce soit)

```bash
# 1. Vérifier que .env.local existe
ls portal/.env.local

# 2. Installer les dépendances si besoin
cd portal && npm install

# 3. Vérifier la connectivité DB (VPS accessible)
# Le VPS doit être joignable depuis votre machine — tester :
ssh -p 2222 abdel@37.59.125.159 'echo OK'

# 4. Lancer le serveur de dev
cd portal && npm run dev
# → http://localhost:3000
```

> Si `DATABASE_URL` pointe sur `37.59.125.159`, le serveur local lit la DB de prod — toute réservation créée est réelle. C'est acceptable en POC avec les comptes demo.

---

### 0.2 Smoke test rapide (5 min)

Objectif : valider que l'environnement local fonctionne end-to-end.

```
[ ] http://localhost:3000 → page d'accueil charge (pas d'erreur 500)
[ ] /freelancehub/login → formulaire visible
[ ] Login admin@perform-learn.fr / demo1234 → redirige /freelancehub/admin
[ ] /freelancehub/admin/bookings → tableau "Transactions comptables" charge (filtres + totaux visibles)
[ ] Déconnexion → retour /freelancehub/login
[ ] Login consultant1@perform-learn.fr / demo1234
[ ] /freelancehub/consultant/bookings → tableau avec colonnes #N° et Action
[ ] Déconnexion → retour /freelancehub/login
[ ] Login client1@perform-learn.fr / demo1234
[ ] /freelancehub/client/search → recherche "ERP" → ≤ 5 cartes anonymes
[ ] Cloche nav → badge ou liste notifications visible
```

Si une étape échoue → voir 0.5 Diagnostic.

---

### 0.3 Tester le paiement Stripe en local

Les clés `sk_test_` / `pk_test_` suffisent pour créer de vrais PaymentIntents Stripe en mode test.

**Cartes de test Stripe :**

| Carte | Comportement |
|---|---|
| `4242 4242 4242 4242` | Paiement réussi |
| `4000 0000 0000 0002` | Déclin (generic) |
| `4000 0025 0000 3155` | Authentification 3DS requise |

- Date d'expiration : n'importe quelle date future
- CVC : n'importe quel nombre à 3 chiffres

**Forwarding webhooks Stripe (optionnel, si webhooks configurés) :**

```bash
# Installer Stripe CLI si pas déjà fait
# https://stripe.com/docs/stripe-cli

stripe login
stripe listen --forward-to http://localhost:3000/api/freelancehub/stripe/webhook
# → Copier le whsec_... affiché dans .env.local STRIPE_WEBHOOK_SECRET
```

> En POC actuel, les webhooks Stripe ne sont pas implémentés — le paiement est vérifié via l'API Stripe directement. Le forwarding n'est donc pas nécessaire pour l'instant.

---

### 0.4 Raccourcis SQL pour forcer les états (tests avancés)

Se connecter à la DB depuis le terminal local (la DB est sur le VPS) :

```bash
# Connexion rapide
ssh -p 2222 abdel@37.59.125.159 'docker exec -it postgres psql -U appstore -d appstore'
```

**Forcer une réservation en `completed` (pour tester les évaluations) :**

```sql
-- Remplacer <uuid> par l'ID de la réservation (visible dans l'URL ou /admin/bookings)
UPDATE freelancehub.bookings
SET status = 'completed'
WHERE id = '<uuid>';
```

**Forcer la libération des fonds sans évaluation (debug) :**

```sql
UPDATE freelancehub.payments
SET status = 'transferred', transferred_at = NOW()
WHERE booking_id = '<uuid>';
```

**Réinitialiser une réservation de test :**

```sql
-- Supprimer reviews + payment + booking (cascade si FK)
DELETE FROM freelancehub.reviews WHERE booking_id = '<uuid>';
DELETE FROM freelancehub.payments WHERE booking_id = '<uuid>';
DELETE FROM freelancehub.notifications WHERE booking_id = '<uuid>';
DELETE FROM freelancehub.bookings WHERE id = '<uuid>';
```

**Voir les bookings récents avec emails :**

```sql
SELECT b.booking_number, b.id, uc.email AS client, uc2.email AS consultant,
       b.status, b.amount_ht/100.0 AS ht_eur, b.revealed_at
FROM freelancehub.bookings b
JOIN freelancehub.users uc ON uc.id = b.client_id
JOIN freelancehub.consultants c ON c.id = b.consultant_id
JOIN freelancehub.users uc2 ON uc2.id = c.user_id
ORDER BY b.created_at DESC LIMIT 10;

-- Vérifier la séquence booking_number
SELECT last_value FROM freelancehub.bookings_booking_number_seq;
```

---

### 0.5 Tester le cron J-1 en local

```bash
# Déclencher manuellement le cron depuis votre machine (remplacer <CRON_SECRET>)
curl -X POST http://localhost:3000/api/freelancehub/cron/reminders \
  -H "Authorization: Bearer <CRON_SECRET>"

# Réponse attendue : {"sent": N} avec N = nombre de rappels envoyés
# Si 0 : aucune réservation avec slot_date = demain et status confirmed/in_progress
```

Pour créer un slot de test à J+1 :

```sql
-- Insérer un slot demain pour consultant1 (récupérer consultant_id d'abord)
INSERT INTO freelancehub.slots (consultant_id, slot_date, slot_time, is_available)
SELECT id, CURRENT_DATE + 1, '10:00', true
FROM freelancehub.consultants
WHERE user_id = (SELECT id FROM freelancehub.users WHERE email = 'consultant1@perform-learn.fr');
```

---

### 0.5 Diagnostic — erreurs courantes

| Symptôme | Cause probable | Solution |
|---|---|---|
| `ECONNREFUSED` sur DB | VPS inaccessible ou mauvais `DATABASE_URL` | Vérifier SSH VPS + `.env.local` |
| `NEXTAUTH_SECRET` error | Variable manquante dans `.env.local` | Ajouter une valeur quelconque (32 chars) |
| Stripe "No such payment_intent" | Mélange clés test/prod | Vérifier `sk_test_` dans `.env.local` |
| Page blanche après login | Erreur middleware Edge | `npm run build` pour voir les erreurs TypeScript |
| Notifications absentes | `createNotification` non appelé | Vérifier les logs terminal `npm run dev` |
| Build échoue | Erreur TypeScript | Lire l'output complet de `npm run build` |

---

## 0.6 Test itération C4 — Légal + KYC + NDA (sur portal.perform-learn.fr)

> Pas besoin d'environnement local. Tout se teste directement sur le site de production.
> Durée estimée : 15 minutes.

### Scénario 1 — Pages légales (2 min)

```
Ouvrir un navigateur en navigation privée (pour ne pas être connecté).

[ ] Aller sur https://portal.perform-learn.fr/freelancehub/cgu
    → La page s'affiche avec le texte des CGU
    → Nom "EMMAEINNA Aminetou" et "SIREN 103 082 673" visibles

[ ] Aller sur https://portal.perform-learn.fr/freelancehub/privacy
    → Politique de confidentialité affichée (tableaux sous-traitants, droits RGPD)

[ ] Aller sur https://portal.perform-learn.fr/legal
    → Mentions légales affichées
```

---

### Scénario 2 — Inscription avec consentement (3 min)

```
Toujours en navigation privée.

[ ] Aller sur https://portal.perform-learn.fr/freelancehub/register
[ ] Cliquer sur le panneau "Consultant Expert"
[ ] Remplir le formulaire (email test : testkyc@test.fr, mdp : test1234)
[ ] Vérifier que le bouton "Créer mon compte" est GRISÉ tant que la
    checkbox CGU n'est pas cochée
[ ] Cocher "J'accepte les CGU..." → le bouton devient actif
[ ] Soumettre → redirection vers /freelancehub/consultant

✅ Attendu : compte créé, connecté, dashboard consultant visible
```

Vérification DB (optionnel) :
```bash
ssh -p 2222 abdel@37.59.125.159 \
  'docker exec postgres psql -U appstore -d appstore -c "
    SELECT u.email, s.document_type, s.signed_at, s.ip_address
    FROM freelancehub.signatures s
    JOIN freelancehub.users u ON u.id = s.user_id
    WHERE u.email = '"'"'testkyc@test.fr'"'"';"'
```

---

### Scénario 3 — KYC Consultant (5 min)

```
Connecté en tant que consultant (testkyc@test.fr / test1234).

[ ] Dans la sidebar gauche, cliquer "Mon KYC"
    → URL : /freelancehub/consultant/kyc
    → Statut affiché "○ Non soumis"
    → Formulaire visible avec select (Kbis / Attestation URSSAF) + input fichier

[ ] Choisir "Kbis" dans le select
[ ] Sélectionner n'importe quel fichier PDF ou image (< 5 Mo)
    (un screenshot, une facture PDF, peu importe — c'est un test)
[ ] Cliquer "Envoyer le document"
    → Message vert "Document envoyé avec succès"
    → Statut change en "⏳ En cours de validation"
```

Puis en tant qu'**admin** :
```
[ ] Se déconnecter
[ ] Se connecter : admin@perform-learn.fr / demo1234
[ ] Aller sur /freelancehub/admin/consultants
    → Le consultant testkyc@test.fr apparaît avec KYC "⚡ En attente"
    → Colonne KYC visible avec lien "Voir document"
[ ] Cliquer "Valider KYC"
    → Le badge passe à "✓ Validé"
    → Le consultant passe en "✓ Vérifié"

[ ] Se déconnecter, se reconnecter en tant que testkyc@test.fr
[ ] Aller sur /freelancehub/consultant/kyc
    → Statut "✓ KYC validé — profil actif"
[ ] Aller sur le dashboard /freelancehub/consultant
    → Le banner orange KYC a disparu
```

---

### Scénario 4 — NDA Consultant (3 min)

```
Connecté en tant que testkyc@test.fr.

[ ] Cliquer "Réservations" dans la sidebar
    → Banner orange visible : "⚠ Vous devez signer le NDA..."
    → Lien "Lire et signer le NDA →" cliquable

[ ] Cliquer sur le lien → URL : /freelancehub/consultant/nda
    → Page NDA affichée avec 8 articles
    → Zone de scroll sur le texte

[ ] Cocher la checkbox "J'ai lu et j'accepte..."
    → Bouton "Signer le NDA" devient actif

[ ] Cliquer "Signer le NDA"
    → Message vert "Vous avez signé ce NDA. Redirection..."
    → Retour automatique sur /freelancehub/consultant/bookings
    → Le banner orange a disparu
```

---

### Rapport de feedback attendu

Pour chaque scénario, noter :
- ✅ OK / ❌ KO
- En cas de KO : copier le message d'erreur affiché

---

## 1. Installation de l'environnement de développement

### Prérequis

| Outil | Version min | Vérification |
|---|---|---|
| Node.js | 18+ | `node -v` |
| npm | 9+ | `npm -v` |
| Git | — | `git --version` |
| Accès SSH VPS | port 2222 | `ssh -p 2222 abdel@37.59.125.159` |

### Clone et installation

```bash
git clone https://github.com/aflouat/app-store.git
cd app-store/portal
npm install
```

### Variables d'environnement locales

Créer `portal/.env.local` (ne jamais commiter) :

```env
DATABASE_URL=postgresql://appstore:<password>@37.59.125.159:5432/appstore
NEXTAUTH_SECRET=<secret_local_quelconque>
NEXTAUTH_URL=http://localhost:3000
RESEND_API_KEY=<ta_clé_resend>
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_API_URL=https://api.perform-learn.fr
CRON_SECRET=<valeur_locale>
```

> En dev, utiliser les clés Stripe **test** (sk_test_ / pk_test_). Carte de test : `4242 4242 4242 4242`, exp future, CVC quelconque.

### Lancer en développement

```bash
cd portal
npm run dev       # http://localhost:3000
npm run build     # vérifier le build avant commit
npm run lint      # vérifier le code
```

### Comptes de démonstration (mot de passe : `demo1234`)

| Rôle | Email | Accès |
|---|---|---|
| Admin | `admin@perform-learn.fr` | `/freelancehub/admin` |
| Consultant | `consultant1@perform-learn.fr` | `/freelancehub/consultant` |
| Client | `client1@perform-learn.fr` | `/freelancehub/client` |

---

## 2. Workflow de développement

### Cycle complet

```
1. Lire les fichiers concernés
2. Modifier le code localement
3. Tester en dev : npm run dev
4. Valider le build : npm run build  ← obligatoire avant commit
5. Commiter (fichiers spécifiques, jamais git add -A) :
   git add portal/app/... portal/components/...
   git commit -m "feat(freelancehub): description"
6. Pusher :
   git push origin main
   → Vercel redéploie automatiquement (2-3 min)
7. Si migration SQL : appliquer sur le VPS (voir ci-dessous)
```

### Appliquer une migration SQL sur le VPS

```bash
# Appliquer
ssh -p 2222 abdel@37.59.125.159 \
  'docker exec -i postgres psql -U appstore -d appstore' \
  < migrations/00X_nom.sql

# Vérifier
ssh -p 2222 abdel@37.59.125.159 \
  'docker exec postgres psql -U appstore -d appstore -c "\dt freelancehub.*"'
```

> **Ordre** : appliquer la migration SQL **avant** de pusher le code si la migration ajoute des tables/colonnes que le code attend. Appliquer **après** si la migration supprime des colonnes que l'ancien code utilise encore.

### Modifier la config VPS (Caddyfile, docker-compose)

```bash
# Après modification et push
ssh -p 2222 abdel@37.59.125.159 'cd /appli/app-store && git pull origin main'

# Recharger Caddy sans downtime
ssh -p 2222 abdel@37.59.125.159 \
  'docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile'

# Redémarrer les containers si docker-compose modifié
ssh -p 2222 abdel@37.59.125.159 'cd /appli/app-store && docker compose up -d --build'
```

### Vérifier un déploiement Vercel

```bash
# Voir le statut du dernier déploiement
# → https://vercel.com/aflouats-projects/app-store
# URL de prod : https://app-store-sandy.vercel.app
# Alias : https://portal.perform-learn.fr
```

---

## 3. Scénarios de test E2E

> URL de test : `https://portal.perform-learn.fr` (ou `http://localhost:3000` en local)

### Scénario 1 — Login et RBAC

```
1. /freelancehub/login → login admin@perform-learn.fr / demo1234
   ✓ Redirige vers /freelancehub/admin
2. Déconnexion
3. Login consultant1@perform-learn.fr / demo1234
   ✓ Redirige vers /freelancehub/consultant
4. Tenter d'accéder à /freelancehub/client
   ✓ Redirige vers /freelancehub/consultant (mauvais rôle)
5. Login client1@perform-learn.fr / demo1234
   ✓ Redirige vers /freelancehub/client
```

### Scénario 2 — Recherche et matching

```
1. Login client1 → /freelancehub/client/search
2. Sélectionner une compétence (ex: "ERP / D365 F&O") + budget max
3. Cliquer "Rechercher"
   ✓ ≤ 5 cartes anonymes (sans nom ni email)
   ✓ Chaque carte : compétence, score composite, rating, tarif HT, barres de score
4. Cliquer une carte
   ✓ BookingModal s'ouvre à l'étape "confirm"
```

### Scénario 3 — Booking et paiement (flow complet)

```
1. Dans BookingModal étape confirm : vérifier le récapitulatif prix
2. Cliquer "Procéder au paiement"
   ✓ Stripe Elements s'affiche (formulaire carte)
3. Remplir : 4242 4242 4242 4242 / exp future / CVC 123
4. Valider
   ✓ POST /api/freelancehub/client/bookings → réservation créée
   ✓ POST /api/freelancehub/client/bookings/[id]/payment-intent → PaymentIntent Stripe
   ✓ POST /api/freelancehub/client/bookings/[id]/pay → paiement vérifié
   ✓ Email confirmation envoyé (client + consultant)
   ✓ Étape "done" : NOM et EMAIL du consultant révélés
   ✓ Notification in-app créée (cloche avec badge)
5. /freelancehub/client/bookings
   ✓ Réservation apparaît avec son #N° (status: confirmed)
```

### Scénario 4 — Vue consultant

```
1. Login consultant1 → /freelancehub/consultant/bookings
   ✓ La réservation du scénario 3 apparaît avec son #N°
   ✓ Notification "Nouvelle mission" visible dans /freelancehub/notifications
   ✓ Colonne "Action" : bouton "Démarrer" visible si statut = confirmed
2. Cliquer "Démarrer"
   ✓ Statut passe à in_progress
   ✓ Bouton devient "Terminer"
   ✓ Notification envoyée au client
3. Cliquer "Terminer"
   ✓ Statut passe à completed
   ✓ Bouton disparaît (plus d'action possible)
   ✓ Page /client/reviews débloquée pour le client
4. /freelancehub/consultant/agenda
   ✓ Créneaux disponibles : fond vert
   ✓ Créneaux pris : fond terracotta avec libellé "PRIS"
   ✓ Bouton "Dupliquer →" copie la semaine vers la suivante
5. /freelancehub/consultant/profile
   ✓ Modifier le THM (ex: 90) → sauvegarde
   ✓ Prochain booking utilise le nouveau tarif
```

### Scénario 5 — Évaluations et libération des fonds

```
Prérequis : passer booking en status 'completed' (admin ou SQL direct)
  → SSH: docker exec postgres psql -U appstore -d appstore
         -c "UPDATE freelancehub.bookings SET status='completed' WHERE id='<uuid>';"

1. Login client1 → /freelancehub/client/reviews/[bookingId]
   → Soumettre note (1-5) + commentaire
   ✓ Email "Évaluez votre mission" envoyé au consultant
   ✓ Notification review_request créée pour le consultant

2. Login consultant1 → /freelancehub/consultant/bookings/[bookingId]/review
   → Soumettre note (1-5) + commentaire
   ✓ payments.status → 'transferred'
   ✓ Email libération des fonds envoyé au consultant
   ✓ Notification fund_released créée

3. /freelancehub/consultant/earnings
   ✓ Montant net apparaît dans les gains
```

### Scénario 6 — Administration

```
1. Login admin → /freelancehub/admin/users
   ✓ Liste tous les utilisateurs avec rôles
2. /freelancehub/admin/bookings
   ✓ Tableau "Transactions comptables" : #N°, date, client, consultant, montant HT, commission, statut
   ✓ Filtres actifs : statut, date de/à, consultant (texte), client (texte), montant HT min/max
   ✓ Totaux filtrés : Σ HT, Σ TTC estimé, Σ commission — recalculés instantanément
   ✓ Bouton "✕ Réinitialiser" efface tous les filtres
   ✓ Bouton "↓ Export CSV" télécharge le fichier
3. /freelancehub/admin/payments
   ✓ Paiements avec statuts
4. Changer le statut d'une réservation via BookingStatusAction
   ✓ Statut mis à jour en base
```

### Scénario 7 — Notifications in-app

```
1. Login client1 → cloche dans le nav
   ✓ Badge rouge avec compteur si notifications non lues
2. Cliquer la cloche → /freelancehub/notifications
   ✓ Liste des notifications avec point rouge pour les non lues
3. Cliquer une notification non lue
   ✓ Passe en "lu", point rouge disparaît
4. Bouton "Tout marquer comme lu"
   ✓ Badge cloche disparaît
```

### Scénario 8 — Inscription d'un nouveau compte

```
1. /freelancehub/register
   ✓ Formulaire avec choix de rôle : Client ou Consultant
2. Sélectionner "Consultant" + remplir nom, email, mot de passe
3. Valider
   ✓ Compte créé dans freelancehub.users (mot de passe bcrypt)
   ✓ Auto-login → redirige vers /freelancehub/consultant
4. /freelancehub/consultant/profile
   ✓ Compléter : titre, bio, compétences, THM (ex: 90 €/h)
   ✓ Sauvegarder → is_available = false par défaut (en attente validation admin)
5. Login admin → /freelancehub/admin/consultants
   ✓ Nouveau consultant visible
   ✓ Activer → is_available = true → consultant apparaît dans la recherche client
```

### Scénario 9 — Gestion autonome du cycle de consultation (consultant)

```
Prérequis : avoir une réservation en status 'confirmed' (cf. Scénario 3)

1. Login consultant1 → /freelancehub/consultant/bookings
   ✓ Colonne "Action" : bouton bleu "Démarrer" sur la ligne confirmed
2. Cliquer "Démarrer"
   ✓ PATCH /api/freelancehub/consultant/bookings/[id]/status → {status: 'in_progress'}
   ✓ Statut passe à "En cours"
   ✓ Bouton devient vert "Terminer"
   ✓ Cloche cliente : notification "Consultation démarrée"
3. Cliquer "Terminer"
   ✓ Statut passe à "Terminée"
   ✓ Bouton disparaît (aucune action possible en terminal)
   ✓ /freelancehub/client/reviews/[id] débloqué pour le client
4. Vérifier qu'il est impossible de régresser depuis l'interface
   ✓ Aucun bouton "Annuler" — seul l'admin peut forcer un statut via BookingStatusAction
```

### Scénario 10 — Tableau comptable admin (filtres & totaux)

```
1. Login admin → /freelancehub/admin/bookings
   ✓ Titre "Transactions comptables", jusqu'à 500 lignes
2. Filtre "Statut = Terminée"
   ✓ Seules les réservations completed apparaissent
   ✓ Totaux recalculés (Σ HT, Σ TTC, Σ commission)
3. Ajouter filtre "Date de = 2026-04-01" + "Date à = 2026-04-30"
   ✓ Résultats restreints à la période
4. Saisir un nom de consultant dans le champ "Consultant"
   ✓ Filtre texte actif, seules les lignes correspondantes
5. Saisir un montant HT min (ex: 80 €)
   ✓ Seules les réservations ≥ 80 € HT apparaissent
6. Cliquer "✕ Réinitialiser"
   ✓ Tous les filtres effacés, toutes les réservations réapparaissent
7. Cliquer "↓ Export CSV"
   ✓ Fichier téléchargé : colonnes #N°, date, client, consultant, montant HT, commission, statut
```

### Commandes de diagnostic rapide

```bash
# Réservations récentes
ssh -p 2222 abdel@37.59.125.159 \
  'docker exec postgres psql -U appstore -d appstore -c "
    SELECT b.id, uc.email AS client, uc2.email AS consultant, b.status, b.revealed_at
    FROM freelancehub.bookings b
    JOIN freelancehub.users uc ON uc.id = b.client_id
    JOIN freelancehub.consultants c ON c.id = b.consultant_id
    JOIN freelancehub.users uc2 ON uc2.id = c.user_id
    ORDER BY b.created_at DESC LIMIT 5;"'

# Paiements
ssh -p 2222 abdel@37.59.125.159 \
  'docker exec postgres psql -U appstore -d appstore -c "
    SELECT booking_id, status, amount/100.0 AS montant_eur, captured_at
    FROM freelancehub.payments ORDER BY created_at DESC LIMIT 5;"'

# Notifications non lues par type
ssh -p 2222 abdel@37.59.125.159 \
  'docker exec postgres psql -U appstore -d appstore -c "
    SELECT type, COUNT(*) FROM freelancehub.notifications
    WHERE is_read = false GROUP BY type ORDER BY count DESC;"'

# Tester le cron J-1 manuellement
curl -X POST https://portal.perform-learn.fr/api/freelancehub/cron/reminders \
  -H "Authorization: Bearer <CRON_SECRET>"
```

---

## 4. Règles de gestion (RG)

### RG-01 — Anonymat consultant jusqu'au paiement

Le client ne voit jamais le nom, l'email, le bio ni le lien LinkedIn d'un consultant avant que le paiement soit capturé.

- `bookings.revealed_at` est `NULL` tant que le paiement n'est pas confirmé
- L'API `/matching` retourne uniquement : compétence, score, rating, tarif — aucun identifiant
- À la capture du paiement : `revealed_at = NOW()` → le consultant est révélé dans l'étape "done" du BookingModal
- **Côté code** : toute query qui expose `name`, `email`, `bio`, `linkedin_url` d'un consultant doit vérifier `revealed_at IS NOT NULL`

### RG-02 — Tarification

- Le consultant fixe son **Taux Horaire Moyen (THM)** dans son profil (`consultants.daily_rate`, en €)
- Une consultation = 1 heure = `daily_rate` HT
- Structure : `HT × 1,20 = TTC` · `HT × 0,15 = commission` · `HT × 0,85 = honoraire consultant`
- Le montant est calculé **côté serveur** uniquement — jamais côté client (règle de sécurité immuable)
- Le `PaymentIntent` Stripe est créé depuis `bookings.amount_ht` en DB, pas depuis le client
- Fallback si `daily_rate` non renseigné : 85 €/h

### RG-03 — Commission plateforme

- Commission : **15 %** du montant HT
- `commission_amount = amount_ht × 0.15`
- `consultant_amount = amount_ht × 0.85`
- Ces 3 montants sont stockés dans `bookings` à la création de la réservation

### RG-04 — Séquestre et libération des fonds

Le paiement suit ce cycle dans `payments.status` :

```
pending → authorized → captured → transferred → (refunded)
```

- `captured` : paiement confirmé par Stripe, mission réservée
- `transferred` : fonds libérés vers le consultant — se déclenche **automatiquement** quand les 2 évaluations (client + consultant) sont soumises
- Si une seule évaluation : les fonds restent en `captured`
- Libération manuelle possible par admin en passant directement à `transferred`

### RG-05 — Contrôle d'accès (RBAC)

3 rôles distincts, sans chevauchement :

| Rôle | Accès |
|---|---|
| `client` | Recherche, booking, paiement, évaluation de la mission |
| `consultant` | Profil, agenda (slots), réservations reçues, gains, évaluation de la mission |
| `admin` | Tout + gestion des utilisateurs, override statuts, export CSV |

- Le middleware Next.js (`middleware.ts`) vérifie le rôle JWT à chaque requête sur `/freelancehub/(auth)/*`
- Un consultant qui tente d'accéder à `/freelancehub/client` est redirigé vers `/freelancehub/consultant`
- L'`admin` peut accéder à toutes les routes admin mais **pas** aux interfaces client/consultant (RBAC strict)

### RG-06 — Algorithme de matching

Score composite sur 100 points (pondération v1.3) :

```
score = 0.55 × skill_match         (niveau : expert=100, senior=80, intermédiaire=60, junior=40)
      + 0.35 × rating_score        (rating consultant / 5 × 100)
      + 0.05 × availability_score  (créneau dans < 7j → 100, linéaire jusqu'à 30j → 0)
      + 0.05 × price_score         (1 - tarif_consultant_TTC / budget_client) × 100
```

- Top **5 consultants** retournés, triés par score décroissant
- Un consultant dont le tarif TTC > budget client est **filtré avant calcul**
- Si `client_budget` est null : `price_score = 100` (pas de contrainte prix)
- Seuls les consultants avec `is_available = true` et au moins 1 slot futur disponible sont candidats

### RG-07 — Notifications in-app

Les notifications sont créées automatiquement aux événements suivants :

| Type | Déclencheur | Destinataire |
|---|---|---|
| `booking_confirmed` | Paiement capturé | Client |
| `new_booking` | Paiement capturé | Consultant |
| `review_request` | 1re évaluation soumise | L'autre partie |
| `fund_released` | 2e évaluation soumise | Consultant |
| `reminder` | Cron J-1 (08:00 UTC) | Client + Consultant |

- Une notification non lue affiche un badge rouge sur la cloche dans la nav
- Cliquer une notification non lue la marque comme lue
- L'API `PATCH /api/freelancehub/notifications` accepte `{ all: true }` ou `{ id: "uuid" }`

### RG-08 — Cron rappels J-1

- Déclenchement : chaque jour à **08:00 UTC** (Vercel Cron)
- Cible : toutes les réservations avec `slot_date = CURRENT_DATE + 1` et `status IN ('confirmed', 'in_progress')`
- Actions : email Resend (client + consultant) + notification in-app (client + consultant)
- Sécurisé par `Authorization: Bearer <CRON_SECRET>`
- Idempotent : peut être déclenché plusieurs fois le même jour sans doublon (pas de contrainte unique, acceptable en POC)

### RG-09 — Conventions base de données

- **Vue `governance.v_artifact_context`** : toujours `DROP VIEW IF EXISTS ... CASCADE; CREATE VIEW` — jamais `CREATE OR REPLACE VIEW` (bug PostgreSQL si les colonnes changent d'ordre)
- **UUIDs** : générés par `gen_random_uuid()` — ne jamais forcer des IDs sauf pour les seeds de démo
- **Migrations** : numérotées séquentiellement `00X_nom.sql` — une migration = un changement cohérent — jamais modifier une migration déjà appliquée en prod
- **updated_at** : géré par trigger automatique (`set_updated_at`) sur `users`, `consultants`, `bookings`, `payments`

### RG-10 — Edge Runtime (Next.js middleware)



Le middleware s'exécute sur Edge Runtime — incompatible avec certains modules Node.js :

| Module | Compat Edge | Usage |
|---|---|---|
| `bcryptjs` | ❌ | `auth.ts` uniquement (Node.js) |
| `pg` (postgres) | ❌ | Routes API uniquement (Node.js) |
| `next-auth/jwt` | ✅ | Utilisable dans `auth.config.ts` |

Pattern obligatoire :
- `auth.config.ts` → config JWT/callbacks, sans providers → importé par `middleware.ts`
- `auth.ts` → étend authConfig + Credentials + bcrypt → jamais importé dans le middleware

### RG-11 — Numéro de réservation

- Chaque réservation a un `booking_number` (SERIAL, entier auto-incrémenté, unique)
- Affiché sous la forme `#N°` dans toutes les vues : consultant, client, admin
- Permet d'identifier une réservation sans exposer l'UUID interne (support, comptabilité)
- Les réservations antérieures à la migration 010 ont reçu leurs numéros automatiquement via la séquence

```sql
-- Trouver une réservation par son numéro
SELECT * FROM freelancehub.bookings WHERE booking_number = 42;
```

### RG-12 — Autonomie consultant (gestion du cycle de consultation)

À partir de la confirmation du paiement client, le consultant gère lui-même l'avancement :

| Statut actuel | Action consultant | Nouveau statut | Déclencheur |
|---|---|---|---|
| `confirmed` | Bouton **"Démarrer"** | `in_progress` | Début de la consultation |
| `in_progress` | Bouton **"Terminer"** | `completed` | Fin de la consultation |

- L'admin garde la possibilité de toutes les transitions
- Le client est notifié automatiquement à chaque transition (notification in-app)
- Une fois `completed`, les évaluations sont débloquées (RG-04)
- **Route** : `PATCH /api/freelancehub/consultant/bookings/[id]/status`
- Aucun retour arrière possible depuis `in_progress` ou `completed`

### RG-13 — Inscription utilisateur

- Page `/freelancehub/register` : choix du rôle (consultant ou client) + formulaire
- Création de compte dans `freelancehub.users` (bcrypt hash du mot de passe)
- Auto-login après inscription → redirection vers le dashboard du rôle
- Le consultant doit compléter son profil avant de pouvoir apparaître dans le matching (`is_available = false` par défaut)
- L'admin valide le dossier KYC pour passer `is_verified = true`

### RG-14 — Agenda visuel consultant

- Grille semaine (lundi → dimanche, 08h–20h, pas de 1h)
- **Vert** `#d4f3e5` : créneau disponible (clic = suppression)
- **Terracotta** `#e07b54` + libellé "PRIS" : créneau réservé par un client (non modifiable)
- **Grisé** : date passée (non cliquable)
- Navigation semaine précédente / suivante
- Bouton "Dupliquer →" : copie tous les créneaux disponibles de la semaine en cours vers la semaine suivante

### RG-15 — Tableau comptable admin

Le tableau `/freelancehub/admin/bookings` permet une analyse multi-critères des transactions :

| Filtre | Type | Description |
|---|---|---|
| Statut | Sélecteur | pending / confirmed / in_progress / completed / cancelled / disputed |
| Date de | Date | Filtre sur `slot_date ≥` |
| Date à | Date | Filtre sur `slot_date ≤` |
| Consultant | Texte libre | Recherche sur nom ou titre |
| Client | Texte libre | Recherche sur nom ou email |
| Montant HT min/max | Nombre (€) | Filtre sur `amount_ht` (centimes en DB) |

- Ligne de totaux : **Σ HT**, **Σ TTC estimé**, **Σ commission plateforme** sur les résultats filtrés
- Export CSV : toutes les réservations (bouton `↓ Export CSV`, route `GET /api/freelancehub/admin/export-csv`)

---

## 5. Historique des fonctionnalités implémentées

> Ce section archive les features livrées. Pour les prochaines priorités, voir `ROADMAP.md`.

### Avril 2026 — Pré-lancement (Sécurité & Fondations)

| Date | Feature | Détail |
|---|---|---|
| 2026-04-21 | **Page CGU** | `/freelancehub/cgu` + checkbox horodatée à l'inscription → `freelancehub.signatures` (IP + UA) |
| 2026-04-21 | **Politique de confidentialité** | `/freelancehub/privacy` : responsable traitement, données collectées, durée conservation, droits utilisateurs |
| 2026-04-21 | **Mentions légales** | `/legal` : éditeur, hébergeur, SIREN |
| 2026-04-21 | **Consentement email marketing** | Opt-in explicite à l'inscription + migration 014 |
| 2026-04-21 | **Droit à l'effacement** | API `DELETE /api/freelancehub/user/me` : anonymisation données, soft delete |
| 2026-04-21 | **Fix CRON_SECRET** | `Authorization: Bearer` uniquement dans `cron/reminders/route.ts` |
| 2026-04-21 | **Fix Multiple PaymentIntents** | Vérifie PI existant avant création Stripe |
| 2026-04-21 | **Fix exposition erreur KYC** | Message générique en réponse 500 |
| 2026-04-21 | **Health Check endpoint** | `GET /api/freelancehub/health` (SELECT 1 DB) |
| 2026-04-23 | **Headers sécurité HTTP** | `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` dans `next.config.mjs` |
| 2026-04-23 | **Fix IDOR matching** | Whitelist rôle (`=== 'client' \|\| === 'admin'`) |
| 2026-04-23 | **Fix IDOR slots** | JOIN consultants + `AND c.is_available = true` |
| 2026-04-23 | **Idempotence webhook Stripe** | Migration `015_webhook_events.sql` + INSERT ON CONFLICT |
| 2026-04-23 | **Vérification montant PI** | Calcul `expectedTtcCents` depuis DB + rejet 400 si mismatch |
| 2026-04-23 | **Formulaire de contact support** | `/freelancehub/support` : sujet/message/email → Resend + accusé réception |
| 2026-04-23 | **Chatbot support** | Widget flottant Intercom-style, agents Gemini Flash 2.0, escalade email |
| 2026-04-25 | **Router intelligent multi-agents** | 4 agents spécialisés (onboarding, matching, sales, support) avec classifier hybride mots-clés + LLM |

### Releases

Voir `ROADMAP.md` → section *Historique des releases* pour le détail complet par version.
