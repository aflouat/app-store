# PRE-LAUNCH CHECKLIST — Perform-Learn.fr

## 📋 Révision avant lancement (30/04/2026)

---

## 🎨 Design & UX

### Visuel
- [ ] Logo "L'Infini Connecté" animé visible et centered
- [ ] Titre "Perform-Learn.fr" avec design correct (Learn italique terracotta)
- [ ] Slogan "Le Laboratoire..." visible
- [ ] Compteur à rebours s'affiche correctement
- [ ] Message de valeur lisible (pas de débordement)
- [ ] Formulaire bien spacé sur desktop
- [ ] Footer visible avec liens RGPD + LinkedIn
- [ ] Aucun élément UI cassé ou débordant

### Responsive Mobile
- [ ] Logo : 80px sur petit mobile, 90px+ sur tablet
- [ ] Titre responsive : clamp() fonctionne
- [ ] Compteur lisible sur iPhone 12 / 12 Pro
- [ ] Formulaire input boutons cliquables (min 48px height)
- [ ] Footer lisible, lien clickable
- [ ] Pas de horizontal scroll
- [ ] Tap targets suffisant (44px min)

### Accessibilité
- [ ] Focus visible sur bouton (outline/ring)
- [ ] Focus visible sur inputs
- [ ] Contrast ratio ≥ 4.5:1 (WCAG AA)
- [ ] Labels associés inputs
- [ ] Alt text sur SVG logo
- [ ] Keyboard navigation possible (Tab)

---

## 💻 Fonctionnalité

### Compteur
- [ ] Compte à rebours décrémente (mise à jour 1x/sec)
- [ ] Format JJ:HH:MM:SS correct
- [ ] Atteint zéro à 30/04/2026 09:00:00
- [ ] Timezone : UTC ou local utilisateur ? (décider)
- [ ] Continuité après refresh page

### Formulaire
- [ ] Select popup fonctionne
  - [ ] Option "Un Consultant (Expert)" sélectionnable
  - [ ] Option "Un Client (Entreprise)" sélectionnable
- [ ] Input email accepte format valide
  - [ ] Rejette format invalide
  - [ ] Placeholder visible
  - [ ] Cursor visible
- [ ] Bouton "rejoindre" clickable
- [ ] Submit sur Enter key fonctionne
- [ ] Validation côté navigateur (required, type=email)

### Confirmation
- [ ] Message de confirmation apparaît après submit
- [ ] Email répété dans message
- [ ] Formulaire disparu pendant 5 secondes
- [ ] Toast "Bienvenue ! Vous êtes maintenant en waitlist." s'affiche
- [ ] After 5s, formulaire réapparaît vierge
- [ ] Test submit plusieurs fois (multi-submit possible?)

### Données
- [ ] Console log capture userType + email (dev check)
- [ ] Timestamp enregistré
- [ ] Aucune erreur JavaScript (console clean)

---

## 🌐 Navigateurs

Test sur tous :
- [ ] Chrome (Windows)
- [ ] Firefox (Windows)
- [ ] Safari (macOS)
- [ ] Edge (Windows)
- [ ] Chrome (Mobile iOS)
- [ ] Safari (iPhone)
- [ ] Chrome (Android)

### Performance
- [ ] Page charge < 2s (desktop)
- [ ] Page charge < 3s (mobile 4G)
- [ ] Pas de layout shift (CLS)
- [ ] Animation logo smooth (60fps)
- [ ] Countdown pas de lag

---

## 🔒 Sécurité

- [ ] Pas de script externe (Google Analytics pas encore)
- [ ] SVG inline safe (pas d'imports dangereux)
- [ ] Input email pas de XSS (oubli, pas back-end)
- [ ] Formulaire pas de CSRF token (à ajouter avant prod)
- [ ] Pas de clés API exposées
- [ ] HTTPS en production

---

## 🎯 Contenu

### Texte
- [ ] "Le Laboratoire de la Performance et de l'Apprentissage" exact
- [ ] "Une entreprise performante est une entreprise apprenante. Nous finalisons le cadre scientifique de vos futures collaborations." exact
- [ ] "Rejoindre l'expérience" sur bouton (pas "S'inscrire", "Submit", etc.)
- [ ] "Je suis..." sur select
- [ ] Pas de typo/accents manquants

### Couleurs
- [ ] --c1 (Terracotta #B9958D) sur bouton + Learn
- [ ] --c2 (Gris Vert #AAB1AF) sur Perform
- [ ] --c3 (Sauge #96AEAA) sur .fr + confirmation
- [ ] --c4 (Vert Kaki #A3AB9A) sur footer
- [ ] Pas d'autres couleurs utilisées (brand-first)

### Typo
- [ ] Fraunces sur titres
- [ ] DM Sans sur corps
- [ ] Fonts chargées (pas de fallback évident)

---

## 📊 Analytics (Optionnel pré-launch)

- [ ] Google Analytics code ? (décider)
- [ ] Hotjar heatmap ? (décider)
- [ ] Tracking form submit via GTM ?
- [ ] Event "waitlist_signup" registered ?

---

## 📧 Email Integration (Optionnel)

- [ ] Backend endpoint `/api/leads` prêt ?
- [ ] Auto-reply email configuré ?
- [ ] Spam check/rate-limit en place ?
- [ ] Email validation stricte ?
- [ ] Double opt-in requis ?

---

## 🗂️ Fichiers & Versioning

- [ ] `front.html` final committé
- [ ] `.gitignore` inclus
- [ ] `LANDING_PAGE_CHANGES.md` à jour
- [ ] `readme.md` a jour
- [ ] `GUIDE_UTILISATION.md` présent
- [ ] Cette checklist complétée
- [ ] Pas de fichiers temp/debug en repo
- [ ] .git/assets visionnés (logo.png ok?)

---

## 🚀 Déploiement

- [ ] Hébergement choisi (AWS, Netlify, Vercel, etc.)
- [ ] Domaine perform-learn.fr pointant vers landing
- [ ] SSL/HTTPS activé
- [ ] CDN configuré (optionnel)
- [ ] Cache headers optimisés
- [ ] 404 handling en place
- [ ] Monitoring/alertes actives

---

## 📅 Date Cible

```
Lancement : Mercredi 30 avril 2026
Heure     : 09:00:00 (UTC? Locale?)
```

- [ ] Countdown cible confirmée
- [ ] Timezone décidée (UTC vs Paris?)
- [ ] Notification slack/email 24h avant ?
- [ ] Post LinkedIn/Twitter planifié ?

---

## ❓ Questions ouvertes

- [ ] Qui reçoit les emails capturés ? (Adresse email de contact)
- [ ] Où stocker les données ? (DB, CRM, spreadsheet?)
- [ ] Qui modère le contenu après lancement ?
- [ ] Quand basculer vers app complète ? (01/05/2026?)
- [ ] Support utilisatieurs ? (Email, chat, FAQ?)

---

## 📝 Sign-off

| Role | Nom | Date | Approbation |
|------|-----|------|------------|
| Designer | — | — | ⬜ |
| Dev | — | — | ⬜ |
| Product | — | — | ⬜ |
| Marketing | — | — | ⬜ |

---

## 🎉 Lancé le

- **Date réelle de lancement** : ___________
- **Incidents** : ___________
- **Top metric** : _____ leads capturés en __ heures

---

**Dernière mise à jour** : 4 avril 2026  
**Status** : 🟡 À compléter avant 29/04/2026
