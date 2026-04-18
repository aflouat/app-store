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

## Décisions en attente de feedback

| Réf. | Feature | En attente de |
|---|---|---|
| 2026-04-19 NDA | Test parcours consultant complet | Feedback Abdel / Mme Aminetou |
| — | Landing page CTA → /register | GO Agent DG sprint suivant |
| — | Offre Early Adopter (commission 10% + badge) | GO Agent DG sprint suivant |
| — | Email lancement waitlist J-3 (27/04) | Accès Brevo + validation copie |

---

## Règles de ce registre

1. Toute décision GO/NO-GO de l'Agent DG doit être archivée ici avant exécution
2. Le résultat est renseigné après livraison et feedback
3. Les décisions annulées ou révisées sont conservées (ne pas supprimer)
4. Ce fichier est lu en début de chaque session pour éviter de répéter une erreur stratégique
