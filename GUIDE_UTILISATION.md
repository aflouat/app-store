# Guide d'utilisation — Landing Page Perform-Learn.fr

## 🎯 Objectif

Capturer les emails de leads (consultants et clients) en attente du lancement officiel le **30 avril 2026 à 09:00**.

---

## 📖 Guide utilisateur (Point de vue visiteur)

### Étape 1 : Visite de la page

1. Ouvrir `front.html` dans le navigateur
2. Voir :
   - ✨ Logo animé au centre
   - 📊 Compteur qui diminue
   - 📝 Formulaire avec 2 champs

### Étape 2 : Remplir le formulaire

**Champ 1 — "Je suis..."**
- Cliquer sur la liste déroulante
- Choisir : 
  - ✅ "Un Consultant (Expert)" → Pour les prestataires
  - ✅ "Un Client (Entreprise)" → Pour les acheteurs
  
**Champ 2 — "votre@email.com"**
- Entrer adresse email professionnelle valide
- Format : `xxx@domaine.com` (validation native HTML5)

**Bouton — "REJOINDRE L'EXPÉRIENCE"**
- Couleur terracotta distinctive
- Effet hover : Remonte légèrement
- Cliquer pour soumettre

### Étape 3 : Confirmation

Après submit, 2 actions simultanées :

A) **Message de confirmation** remplace le formulaire
```
"Merci !
Le Laboratoire vous contactera dès l'ouverture des premiers slots.

Confirmé : votre@email.com"
```

B) **Toast animé** en bas à droite
```
"Bienvenue ! Vous êtes maintenant en waitlist."
```

### Étape 4 : Réinitialisation

Après 5 secondes, le formulaire réapparaît vierge (prêt pour un autre formulaire).

---

## 🔧 Guide technique (Point de vue développeur)

### Installation / Déploiement

```bash
# 1. Cloner ou télécharger
git clone <repo-url>
cd app-store

# 2. Lancer le serveur local (optionnel, HTTP pur)
python -m http.server 8000
# OU
npx http-server

# 3. Visiter
http://localhost:8000/front.html
```

### Architecture fichier

```
front.html
├── <head>
│   ├── Meta tags (charset, viewport)
│   ├── Google Fonts (Fraunces, DM Sans)
│   └── <style> (3000+ lignes CSS)
│
├── <body>
│   ├── <nav> hidden (pour l'app future)
│   ├── <div id="view-home" class="view active">
│   │   └── .launch-hero (section principal)
│   │       ├── logo SVG
│   │       ├── title
│   │       ├── countdown
│   │       ├── value-message
│   │       ├── waitlist-form
│   │       └── launch-footer
│   │
│   └── <script> (JavaScript)
│       └── initCountdown() + initWaitlistForm()
```

### Entrer les données (Demo)

**Pour tester**, actuellement les données ne vont **nulle part** :
- Prévu : Appel POST vers `backend/api/leads`
- Actuellement : Log dans console + local demo

**Ajouter intégration backend** :

```javascript
// Dans initWaitlistForm(), remplacer ligne 40:
fetch('/api/leads', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userType, email, timestamp: new Date() })
})
.then(r => r.json())
.then(data => {
  console.log('Lead saved:', data);
  // Afficher confirmation...
})
.catch(err => showToast('Erreur système', 'error'));
```

---

## 📊 Compteur à rebours

### Fonctionnement

```javascript
targetDate = new Date('2026-04-30T09:00:00').getTime()
// Update chaque 1000ms (1 seconde)
// Distance = targetDate - Date.now()
// Décompose en : days, hours, minutes, seconds
```

### Personnaliser la date

Chercher ligne ~6180 dans `front.html` :
```javascript
const targetDate = new Date('2026-04-30T09:00:00').getTime();
//                                     ↑ Changer ici
```

Format YYYY-MM-DDTHH:MM:SS (ISO 8601)

---

## 🎨 Personnaliser les couleurs

Tous les colors via variables CSS :

```css
:root {
  --c1: #B9958D;   /* Terracotta → CTA button */
  --c2: #AAB1AF;   /* Gris Vert → Titres */
  --c3: #96AEAA;   /* Sauge → Confirmations */
  --c4: #A3AB9A;   /* Vert Kaki → Back */
}
```

**Exemple** : Changer couleur bouton
```css
.btn-join {
  background: var(--c1);  /* Remplacer par --c2, --c3, etc. */
}
```

---

## 📱 Tests responsive

### Points de rupture

- **Desktop** (> 1024px) : Full layout
- **Tablet** (768-1023px) : Grids 2 cols
- **Mobile** (480-767px) : Stack 1 col
- **Small** (< 480px) : Compact padding

### Tester en Chrome DevTools

1. Appuyer `F12`
2. Cliquer icône mobile en haut à gauche
3. Choisir device (iPhone 12, iPad, etc.)
4. Observer responsive

---

## 🔒 Sécurité & RGPD

### Validation client-side
- HTML5 `required` sur inputs
- Type `email` avec validation native
- Message d'erreur utilisateur

### Données stockées (actuellement)
```javascript
{ userType, email, timestamp }
```
⚠️ **Important** : Actuellement logs console only. Ajouter DB backend.

### Conformité RGPD
- ✅ Lien "En savoir plus" → Politique privacy (à créer)
- ✅ Consentement implicite (submission = accord)
- ✅ Droit à l'oubli : Ajouter DELETE endpoint
- ✅ Chiffrement email en transit (HTTPS)

---

## 🐛 Dépannage

### Compteur ne s'affiche pas
- Vérifier console : `F12 > Console`
- Vérifier date cible : `new Date('2026-04-30T09:00:00')`
- Reload page

### Formulaire ne soumet pas
- Vérifier select + email remplis
- Ouvrir console pour logs
- Vérifier validation HTML5

### Logo ne s'anime pas
- Vérifier CSS `@keyframes float-logo`
- Vérifier animation: `animation: float-logo 6s ease-in-out infinite;`
- Supporter navigateur (IE11 not supported)

### Design cassé sur mobile
- Ouvrir DevTools responsive
- Vérifier media queries (ex: `@media (max-width: 767px)`)
- Zoom HTML correct : `<meta name="viewport" ...>`

---

## 🚀 Optimisations futures

1. **Minifier CSS/JS** → Réduire bundle
2. **Lazy-load** images
3. **Compress SVG** logo
4. **Service Worker** → Offline support
5. **CDN** pour fonts
6. **Monitoring errors** → Sentry, LogRocket

---

## 📧 Intégration email

Actuellement : **Aucun email d'auto-reply**

À ajouter :
```javascript
// Après succès form
await fetch('/api/send-email', {
  method: 'POST',
  body: JSON.stringify({
    to: email,
    template: 'waitlist_confirmed',
    variables: { userType }
  })
});
```

---

## 📞 Support

Pour questions sur l'implémentation, checklist :
1. ✅ Console navigateur (`F12`)
2. ✅ Vérifier validité HTML (W3C validator)
3. ✅ Tester sur Chrome + Firefox + Safari
4. ✅ Lancer Lighthouse (DevTools)

---

**Dernière mise à jour** : 4 avril 2026
