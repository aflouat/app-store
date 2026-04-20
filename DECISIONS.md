# DECISIONS.md — Registre des décisions Agent DG

> Chaque décision de go/no-go, validation de budget, pivot ou engagement stratégique est archivée ici.
> Format : date ISO · décision · contexte · validé par · statut.

---

## Format d'entrée

```
### [DATE] — [TITRE COURT]
- **Décision** : GO | NO-GO | PIVOT | REPORT
- **Contexte** : pourquoi cette décision a été prise
- **Validé par** : Agent DG | Abdel | Mme Aminetou
- **Budget engagé** : X € (sur 25 € max / sprint)
- **Statut** : ✅ Livré | ⏳ En cours | ❌ Annulé | 🔄 Révisé
- **Résultat** : (rempli après livraison)
```

---

## Registre

### 2026-04-19 — Socle légal RGPD Phase 1

- **Décision** : GO
- **Contexte** : Lancement public 30/04. Aucun utilisateur réel ne peut être accueilli sans CGU, politique de confidentialité et mentions légales conformes RGPD.
- **Validé par** : Agent DG
- **Budget engagé** : ~0,5 € tokens
- **Statut** : ✅ Livré
- **Résultat** : Pages `/freelancehub/cgu`, `/freelancehub/privacy`, `/legal` déployées. Consentement explicite checkbox à l'inscription. Signatures horodatées (IP/UA) dans `freelancehub.signatures`. Identité : EMMAEINNA Aminetou / SIREN 103 082 673.

---

### 2026-04-19 — KYC Consultant (upload KBIS/URSSAF)

- **Décision** : GO
- **Contexte** : Bloquant métier pour atteindre le KPI "20 experts Ready-to-book". Sans KYC, aucun consultant ne peut être validé et le matching ne produit pas de profils crédibles.
- **Validé par** : Agent DG
- **Budget engagé** : ~0,5 € tokens
- **Statut** : ✅ Livré
- **Résultat** : Upload KBIS/URSSAF → MinIO bucket `kyc-documents` (privé, OVH France). Workflow `none → submitted → validated/rejected`. Admin : boutons Valider/Refuser avec motif. Notification in-app au consultant. Migration 011 appliquée sur VPS.

---

### 2026-04-19 — NDA Phase 1 (accord de non-divulgation consultant)

- **Décision** : GO
- **Contexte** : Exigence légale et de confiance client avant toute mission. Coût : 0 € (checkbox horodatée, pas de Yousign à ce stade). Phase 2 (Yousign eIDAS) prévue en C5 (bv: 62).
- **Validé par** : Agent DG
- **Budget engagé** : ~0,5 € tokens
- **Résultat attendu** : Page NDA avec texte complet (8 articles, 3 ans, non-sollicitation 12 mois). Signature horodatée → `freelancehub.signatures`. Banner sur page réservations si non signé.
- **Statut** : ✅ Livré — en attente feedback test utilisateur

---

### 2026-04-19 — Budget sprint semaine 19–25 avril

- **Décision** : Validé à 2 € (sur 25 € max)
- **Contexte** : Sprint focus légal + KYC + NDA. Aucun outil payant requis. Tout en tokens Claude.
- **Validé par** : Abdel
- **Budget engagé** : ~1,5 € réel (sous l'enveloppe de 2 € validée)
- **Statut** : ✅ Sous budget

---

### 2026-04-19 — Notifications email tâches agents humains

- **Décision** : GO
- **Contexte** : Chaque tâche assignée à un agent humain (Abdel / Mme Aminetou) doit déclencher un email structuré avec numéro, description, durée, outil et deadline. L'agent tech administre Resend directement (API REST) sans dépendre d'une action humaine.
- **Validé par** : Abdel
- **Budget engagé** : 0 € (Resend tier gratuit, domaine déjà vérifié)
- **Statut** : ✅ Livré — email reçu par Abdel (aflouat@gmail.com) confirmé le 19/04/2026
- **Résultat** : `POST /api/govern/tasks/notify` opérationnel. Expéditeur `noreply@perform-learn.fr`. Domaine `perform-learn.fr` vérifié dans Resend.

---

### 2026-04-20 — Landing page CTA → FreelanceHub

- **Décision** : GO
- **Contexte** : KPI acquisition C4 — la landing perform-learn.fr n'avait pas de CTA vers FreelanceHub. Bloquant pour la conversion des visiteurs organiques.
- **Validé par** : Agent DG
- **Budget engagé** : ~0,1 € tokens
- **Statut** : ✅ Livré
- **Résultat** : Section dark "Trouvez l'expert B2B" ajoutée entre "Comment ça marche" et le CTA band. Bouton primaire → /freelancehub/register. Pills : KYC vérifié, Paiement séquestre, Anonymat, Matching. Responsive mobile.

---

### 2026-04-20 — Early Adopter (badge Fondateur + commission 10%)

- **Décision** : GO
- **Contexte** : Levier d'acquisition des 20 premiers consultants. Commission réduite (10% vs 15%) + badge Fondateur visible. Attribution automatique lors de la validation KYC si < 20 consultants déjà validés.
- **Validé par** : Agent DG
- **Budget engagé** : ~0,2 € tokens
- **Statut** : ✅ Livré
- **Résultat** : Migration 012. KYC validation : auto-attribution si < 20 validés. Admin : toggle manuel + badge ★ Fondateur. Dashboard consultant : badge + taux affiché.

---

### 2026-04-20 — Correctifs sécurité high (Agent Tech — GO DG)

- **Décision** : GO — permission explicite Agent DG
- **Contexte** : 5 vulnérabilités identifiées dans refacto.md v1.3.0. 3 actives avant prod (CRON_SECRET, PaymentIntents multiples, exposition KYC). 2 complémentaires (timezone + health check). Risque réel sur la 1ère transaction réelle.
- **Validé par** : Agent DG (Abdel — 20/04/2026)
- **Budget engagé** : ~0,2 € tokens
- **Statut** : ✅ Livré
- **Résultat** : Fix CRON_SECRET (header only), Fix Multiple PI (lookup DB), Fix KYC generic error, Fix timezone UTC (`T00:00:00Z`), Health check `/api/freelancehub/health`. Tests E2E non-régression délégués à agent indépendant.

---

### 2026-04-20 — Plan acquisition leads C4

- **Décision** : GO — campagne acquisition manuelle avant lancement 30/04
- **Contexte** : 0 lead externe confirmé après audit BDD VPS. Waitlist = 7 entrées toutes internes. Pipeline vide à J-10.
- **Validé par** : Abdel
- **Budget engagé** : 0 € (LinkedIn gratuit, Malt scraping manuel, Brevo tier gratuit)
- **Statut** : ⏳ En cours
- **Actions** :
  - Post LinkedIn Abdel #1 le 23/04 (J-7)
  - Post LinkedIn Abdel #2 le 27/04 (J-3)
  - Batch Aminetou : 10 contacts Malt/jour × 10 jours
  - WaitlistModal corrigé + consentement RGPD opérationnel
- **KPI** : 10 consultants inscrits + 5 clients waitlist avant 30/04

---

## Décisions en attente de feedback

| Réf. | Feature | En attente de |
|---|---|---|
| 2026-04-19 NDA | Test parcours consultant complet | Feedback Abdel / Mme Aminetou |
| 2026-04-20 Landing CTA | Test visuel sur portal.perform-learn.fr | Feedback Abdel |
| 2026-04-20 Early Adopter | Critères manuels vs auto (T-011 Abdel) | Réponse Abdel (deadline 22/04) |
| — | Email waitlist Brevo (J-3 lancement) | Validation copie email (T-009 Mme Aminetou) |

---

## Règles de ce registre

1. Toute décision GO/NO-GO de l'Agent DG doit être archivée ici avant exécution
2. Le résultat est renseigné après livraison et feedback
3. Les décisions annulées ou révisées sont conservées (ne pas supprimer)
4. Ce fichier est lu en début de chaque session pour éviter de répéter une erreur stratégique
