# DECISIONS.md — Registre des décisions Agent DG

> **Destinataire exclusif : Agent DG** — pour maintenir la cohérence stratégique par rapport à l'objectif global.
> Lu également par Agent DEV en début de session (CLAUDE.md §0).
>
> **Règle de maintenance (Agent DG)** :
> - Garder les **5 dernières décisions** en format complet
> - Toutes les décisions antérieures → **Historique synthétique** (1 ligne par décision)
> - Appliquer cette règle à chaque nouvelle décision ajoutée pour éviter la croissance infinie

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

## Historique synthétique (avant les 5 dernières)

| Date | Titre | Décision | Statut | Résultat |
|---|---|---|---|---|
| 2026-04-19 | Socle légal RGPD Phase 1 | GO | ✅ Livré | CGU/Privacy/Legal déployées, signatures horodatées, SIREN EMMAEINNA |
| 2026-04-19 | KYC Consultant (upload KBIS/URSSAF) | GO | ✅ Livré | Upload MinIO, workflow none→submitted→validated/rejected, migration 011 |
| 2026-04-19 | NDA Phase 1 | GO | ✅ Livré | Checkbox horodatée IP/UA, stockée `signatures`, banner si non signé |
| 2026-04-19 | Budget sprint 19–25 avril | Validé 2 € | ✅ Sous budget | 1,5 € réel consommé |
| 2026-04-19 | Notifications email tâches agents | GO | ✅ Livré | `POST /api/govern/tasks/notify` opérationnel, domaine Resend vérifié |
| 2026-04-20 | Landing page CTA → FreelanceHub | GO | ✅ Livré | Section dark "Trouvez l'expert B2B" + CTA /register, responsive mobile |

---

## 5 dernières décisions (détail complet)

### 2026-04-20 — Early Adopter (badge Fondateur + commission 10 %)

- **Décision** : GO
- **Contexte** : Levier d'acquisition des 20 premiers consultants. Commission réduite (10 % vs 15 %) + badge Fondateur visible dans les résultats de matching. Attribution automatique lors de la validation KYC si < 20 consultants déjà validés.
- **Validé par** : Agent DG
- **Budget engagé** : ~0,2 € tokens
- **Statut** : ✅ Livré
- **Résultat** : Migration 012. KYC validation : auto-attribution si < 20 validés. Admin : toggle manuel + badge ★ Fondateur. Dashboard consultant : badge + taux affiché.

---

### 2026-04-20 — Correctifs sécurité high (pre-prod)

- **Décision** : GO — permission explicite Agent DG
- **Contexte** : 5 vulnérabilités identifiées avant la mise en prod. Risque réel sur la 1ère transaction réelle : CRON_SECRET en clair, double PaymentIntent possible, exposition KYC.
- **Validé par** : Abdel — 20/04/2026
- **Budget engagé** : ~0,2 € tokens
- **Statut** : ✅ Livré
- **Résultat** : Fix CRON_SECRET (header only), Fix double PI (lookup DB), Fix KYC generic error, Fix timezone UTC, Health check `/api/freelancehub/health`.

---

### 2026-04-20 — Plan acquisition leads C4

- **Décision** : GO — campagne acquisition manuelle avant lancement 30/04
- **Contexte** : 0 lead externe confirmé après audit BDD VPS. Waitlist = 7 entrées toutes internes. Pipeline vide à J-10.
- **Validé par** : Abdel
- **Budget engagé** : 0 € (LinkedIn gratuit, Malt scraping manuel, Brevo tier gratuit)
- **Statut** : ⏳ En cours
- **Actions** :
  - Post LinkedIn Abdel #1 le 23/04 · Post LinkedIn Abdel #2 le 27/04
  - Batch Aminetou : 10 contacts Malt/jour × 10 jours
- **KPI** : 10 consultants inscrits + 5 clients waitlist avant 30/04

---

### 2026-04-20 — Plan 100 € CA avant 31 mai 2026

- **Décision** : GO — plan validé, ressources engagées
- **Contexte** : 0 lead externe au 20/04. Stripe live opérationnel ce jour. 41 jours pour atteindre 100 € CA = 7 sessions × 100 € HT × 15 % commission.
- **Validé par** : Agent DG + Abdel
- **Budget engagé** : < 5 € (Stripe fees uniquement)
- **Statut** : ⏳ En cours
- **KPI go/no-go** : 3 consultants KYC soumis au 29/04 · 3 sessions complétées au 15/05 · **100 € CA au 31/05**
- **Actions humaines critiques** :
  - Abdel : `sk_live` dans Vercel + test vrai paiement
  - Abdel : 5 consultants réseau contactés
  - Aminetou : batch Malt 10/jour dès le 21/04
  - Aminetou : email blast waitlist lancement avant 27/04

---

### 2026-05-02 — Software Factory : pipeline 8 étapes + Agent Reviewer

- **Décision** : GO
- **Contexte** : La qualité des livraisons se dégradait (régressions auth, pas de tests, commits directs sur main). Remplacement du workflow "commit direct main" par un pipeline structuré avec branche dédiée par US, Agent Reviewer (session fraîche), Playwright E2E obligatoire.
- **Validé par** : Abdel
- **Budget engagé** : 0 € (refactoring documentation + tests uniquement)
- **Statut** : ✅ Livré
- **Résultat** : `scripts/orchestrator.ps1` + `orchestrator.sh` créés · CLAUDE.md restructuré · DEV-RULES.md créé · ROADMAP.md reformaté (IDs cohérents + Gherkin) · Playwright E2E (3 specs) + Vitest (matching, rbac, pricing) ajoutés · FEATURES.md + DEV.md dépréciés et supprimés

---

## Décisions en attente de résultat

| Réf. | Décision | En attente de |
|---|---|---|
| 2026-04-20 Plan acquisition | 10 consultants inscrits + 5 clients waitlist | Suivi Aminetou |
| 2026-04-20 Plan 100 € CA | 3 sessions complétées au 15/05 · 100 € CA au 31/05 | Suivi Abdel + Aminetou |
