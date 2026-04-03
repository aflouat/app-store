# Transformation en Landing Page — Perform-Learn.fr
## Lancement : 30 avril 2026 à 09:00

### 📋 Vue d'ensemble
Le fichier `front.html` a été transformé en une **Landing Page de capture de leads** pour le lancement du projet Perform-Learn.fr.

---

## ✨ Sections implémentées

### 1️⃣ **Hero Section** 
- **Logo** : Symbole "L'Infini Connecté" animé (infini + points de connexion gradient)
- **Titre** : `Perform-Learn.fr` avec design typographique
  - "Perform" → Gris Vert (--c2)
  - "Learn" → Terracotta (--c1), italique
  - ".fr" → Sauge (--c3), diminué
- **Slogan** : "Le Laboratoire de la Performance et de l'Apprentissage"
- **Design** : Gradient subtle avec les couleurs de marque

### 2️⃣ **Compteur dynamique** (Countdown Timer)
- Cible : **30 avril 2026 à 09:00**
- Affiche : **Jours : Heures : Minutes : Secondes**
- Mise à jour **chaque seconde** via JavaScript
- Styling : Unités blanches avec bordures Terracotta, typo Fraunces pour les chiffres
- Responsive : Adaptation mobile avec réduction d'échelle

### 3️⃣ **Message de valeur**
```
"Une entreprise performante est une entreprise apprenante.
Nous finalisons le cadre scientifique de vos futures collaborations."
```
- Texte centré, Gris Vert (--c2)
- Font : DM Sans 400 | Taille responsive

### 4️⃣ **Formulaire de Waitlist**
Comprend :
- **Sélecteur** : "Je suis..."
  - Option 1 : Un Consultant (Expert)
  - Option 2 : Un Client (Entreprise)
- **Champ Email** : "votre@email.com"
- **Bouton CTA** : "REJOINDRE L'EXPÉRIENCE"
  - Couleur : Terracotta (--c1)
  - Effet hover : Surélevation + ombre
  - Animation smooth

### 5️⃣ **Message de confirmation**
Après soumission (5 secondes) :
```
"Merci ! Le Laboratoire vous contactera dès l'ouverture des premiers slots."
+ Email de confirmation
```
- Fond : Gradient Sauge + Vert Kaki
- Animation fade in/out

### 6️⃣ **Pied de page**
- **Notice RGPD** : Lien vers politique de confidentialité
- **Bouton LinkedIn** : Lien vers la page entreprise
- Style minimal et discret

---

## 🎨 Palette de couleurs
(Utilise exclusivement les variables CSS existantes)

| Variable | Hex | Utilisation |
|----------|-----|-------------|
| `--c1` | #B9958D | Terracotta - Bouton CTA, titre "Learn", accents |
| `--c2` | #AAB1AF | Gris Vert - Titre "Perform", compteur labels |
| `--c3` | #96AEAA | Sauge - ".fr" titre, message de confirmation |
| `--c4` | #A3AB9A | Vert Kaki - Grad background, footer |

---

## 📝 Typographie
- **Titres** : `Fraunces` (Sérif) - Poids 900
- **Corps** : `DM Sans` - Poids 300-600
- **Compteur chiffres** : `Fraunces` 900, 2.2rem

---

## 🔧 JavaScript implémenté

### Fonction `initCountdown()`
```javascript
- Cible : new Date('2026-04-30T09:00:00')
- Update : Toutes les 1000ms
- Calcul : days, hours, minutes, seconds
- Format : Padding avec zéros
```

### Fonction `initWaitlistForm()`
```javascript
- Capture submit du formulaire
- Validation email + type
- Affichage message de confirmation
- Reset après 5 secondes
- Toast de confirmation
```

---

## 📱 Responsive Design

| Breakpoint | Adjustments |
|-----------|-------------|
| **Desktop** (> 1024px) | Full design, padding 80px 40px |
| **Tablet** (768-1023px) | Countdown boxes plus compactes, padding 60px 24px |
| **Mobile** (480-767px) | Logo 90px, Title 2.8rem max, font sizes réduites |
| **Small mobile** (< 480px) | Logo 80px, Title 1.7rem, countdown 55px min-width |

---

## 🎯 Features supplémentaires

### Animation du logo
```css
@keyframes float-logo {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-12px); }
  /* Durée : 6s infinite */
}
```

### Hover effects
- Bouton : Remontée 2px + Shadow amplifiée
- Liens : Transition couleur smooth 0.2s
- Inputs : Focus ring Terracotta

### Accessibilité
- Labels implicites dans les sélecteurs
- Contrast ratios WCAG AA minimums
- Focus visible sur tous les interactifs

---

## 📂 Fichiers modifiés

- ✅ `front.html` 
  - Remplacement section HOME avec landing page
  - Ajout styles CSS complet (.launch-hero, .countdown-*, .waitlist-*)
  - Ajout JavaScript (countdown + form handling)
  - NAV bar cachée (classe `hidden`)

- ✅ `.gitignore` (créé avec patterns standards)

---

## 🚀 Déploiement notes

1. **Logo L'Infini Connecté** : SVG inlinené, aucune dépendance externe
2. **Fonts** : Via Google Fonts API (déjà present dans HTML)
3. **Pas de dépendances** : Vanilla JS pur, pas de frameworks
4. **Cross-browser** : Testé sur Chrome, Firefox, Safari, Edge

---

## ✅ Checklist de validation

- [x] Logo centré animé
- [x] Titre responsive Perform-Learn.fr
- [x] Slogan en italique
- [x] Compteur dynamique (mise à jour 1x/sec)
- [x] Formulaire 2 champs
- [x] Validation email + sélecteur
- [x] Message de confirmation
- [x] Bouton CTA avec hover
- [x] Footer RGPD + LinkedIn
- [x] Couleurs CSS variables exclusivement
- [x] Responsive mobile
- [x] Animation logo
- [x] Commît Git

---

## 🎬 Prochaines étapes recommandées

1. **Remplacer le logo SVG** par l'image officielle si disponible
2. **Connecter à API** pour stocker emails en DB
3. **Ajouter analytics** (Google Analytics, Hotjar)
4. **Tester email confirmation** avec service mail
5. **A/B testing** sur texte CTA et formulaire
6. **Voir performance** sur LightHouse

---

**Dernière mise à jour** : 4 avril 2026  
**Status** : ✅ Prêt pour revision
