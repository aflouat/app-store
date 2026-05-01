# refacto.md — Analyse quotidienne perform-learn.fr
**Date** : 2026-05-01 · **Contexte** : J+1 post-lancement · **Analyste** : Claude Agent DG

---

## TL;DR

**J+1 — 11 items livrés : S13 (refund handler), S15 (password_hash NULL), S9 (email/notif isolation), trackEvent (register + booking_paid + search_consultant), suppression waitlist Navbar+AppCard, GitHub Actions CI, migration 018 referral (?ref= complet), DoD + tnr.sh.**

État prod inchangé depuis J0 : 9 users · 2 consultants KYC validés · 28 endpoints API actifs.

Page waitlist pré-lancement supprimée du portail (Navbar + AppCard). Bouton "Rejoindre" → `/freelancehub/register` directement. CI GitHub Actions actif sur `main`.

---

## 1. Sécurité OWASP

### Critiques résolus ✅ (rappel J0)

| ID | OWASP Cat. | Fichier | Statut |
|---|---|---|---|
| C1 | A04 | `client/bookings/route.ts` | ✅ Montant côté serveur |
| C2 | A01 | `reviews/route.ts:124` | ✅ Notification fonds corrigée |
| N1 | A09 | `chat-router.ts` | ✅ Budget cap mensuel |
| S12 | A01 | `admin/kyc-presign/route.ts:38` | ✅ Path traversal bloqué |
| S16 | A03 | `admin/export-csv/route.ts:9` | ✅ Formula injection |
| CORS | A05 | `caddy/Caddyfile` | ✅ Domaines explicites |
| PG-PORT | A05 | `docker-compose.yml:46` | ✅ 127.0.0.1 uniquement |

### Critiques — À traiter J+1

| ID | OWASP Cat. | Description | Fichier | Impact |
|---|---|---|---|---|
| S13 | A04 Insecure Design | `charge.refunded` handler vide — log uniquement, aucune MAJ DB ni notification | `portal/app/api/webhooks/stripe/route.ts:77-81` | Incohérence comptable : fonds remboursés sans trace DB ; client + consultant non notifiés |

**Code actuel S13** :
```typescript
case 'charge.refunded': {
  const charge = event.data.object as Stripe.Charge
  console.log('[stripe-webhook] charge.refunded:', charge.id)
  break  // ← rien d'autre
}
```

### Hautes — Planifiées C5

| ID | OWASP Cat. | Description | Fichier |
|---|---|---|---|
| S3/C3 | A08 | Rate limiting in-memory Map (réinitialisée cold start) — cleanup déclenché seulement au-delà de 500 entrées | `portal/middleware.ts:16-49` |
| S9 | A09 | Erreurs email catchées + loguées (console.error) mais sans retry ni monitoring externe | `reviews/route.ts:131,156` |
| S6 | A05 | Metadata Stripe : uniquement `booking_id` — pas de `client_id` ni timestamp pour audit Stripe | `client/bookings/[id]/pay/route.ts:55` |

### Moyennes — Semaine 1

| ID | Description | Fichier |
|---|---|---|
| S15 | `password_hash = ''` sur soft-delete (chaîne vide, pas NULL) — risque bypass RGPD | `user/me/route.ts:40` |
| S7 | Webhook deduplication `webhook_events` sans TTL — croissance non bornée | `webhooks/stripe/route.ts` |
| S8 | Audit trail admin absent — KYC/statuts sans log | `admin/consultants/[id]/route.ts` |
| N2 | Regex `\w+` exclut accents/tirets dans chat-router | `chat-router.ts:162` |

### Vérification BUG-01 — Infirmé

Aucun lien vers `/confidentialite.html` dans `email.ts`. Les templates email utilisent `${BASE}/freelancehub/*` (URL portail dynamique). Pas d'action requise.

---

## 2. Dette technique

### Critique

#### DT-01 — Rate limiting in-memory `portal/middleware.ts`
```typescript
// Problème : Map réinitialisée à chaque cold start Vercel + cleanup uniquement > 500 entrées
const RL_MAP = new Map<string, { count: number; resetAt: number }>()
```
**Fix C5** : Upstash Redis `@upstash/ratelimit` sliding window.

#### DT-02 — `computePricing()` sans `pricing.ts` centralisé
Défini dans `matching.ts:19-25`, importé dans `client/bookings/route.ts`. Calcul 85% dupliqué dans `email.ts:292` (`Math.round(Number(d.amount) * 0.85)`).
**Fix C5** : extraire vers `lib/freelancehub/pricing.ts`.

### Haute

#### DT-03 — `STATUS_MAP` dupliqué 4 fois (identique)

| Fichier | Lignes |
|---|---|
| `admin/page.tsx` | :148 |
| `client/page.tsx` | :134 |
| `consultant/bookings/page.tsx` | :64 |
| `components/freelancehub/admin/BookingsTable.tsx` | :27 |

**Fix C5** : `lib/freelancehub/constants.ts` — source unique.

#### DT-04 — Pool PG max:2 — PgBouncer absent
50 requêtes concurrentes = 100 connexions. PgBouncer en transaction pooling requis C6.

#### DT-05 — Composants monolithiques

| Composant | Lignes | Refactoring |
|---|---|---|
| `BookingModal.tsx` | ~500 | `<SlotPicker>`, `<PriceSummary>`, `<StripePaymentStep>` — C6 |
| `SearchClient.tsx` | ~400 | `<SearchForm>` — C6 |
| `AgendaCalendar.tsx` | ~305 | Hook `useAgendaSlots()` — C6 |
| `BookingsTable.tsx` | ~293 | `<BookingsFilters>` + `<BookingsTotals>` — C6 |

### Moyenne

#### DT-06 — `trackEvent()` non intégré (analytics dead code)
`portal/lib/freelancehub/analytics.ts` créé J0 — non appelé nulle part dans les composants. GTM/Umami initialisés mais aucun event personnalisé tiré.

**C5 priorité P1** : intégrer dans `register/page.tsx` + `BookingModal.tsx` + `SearchClient.tsx` + `consultant/kyc/page.tsx`.

#### DT-07 — Timezone ✅ RÉSOLU
`email.ts` utilise `T00:00:00Z` — UTC explicite. Pas d'action requise.

#### DT-08 — CGU/confidentialité HTML hors portail
`cgu.html` et `confidentialite.html` à la racine du repo ne sont plus servis directement (Caddy redirige tout vers portal). Le portail dispose de `/freelancehub/cgu` et `/freelancehub/privacy`. Les fichiers `.html` à la racine peuvent être supprimés lors d'un prochain nettoyage.

---

## 3. Agilité & Processus

### Points positifs ✅

- J0 livré dans les délais : 14 fixes/features + email waitlist envoyé
- Architecture repo stable, conventions de commit respectées
- Caddy opérationnel, CORS restreint, port PG sécurisé
- GTM + Umami actifs sur le portail (instrumentation de base)

### Points d'amélioration

#### AG-01 — Pas de CI/CD
**C5** : `.github/workflows/ci.yml` avec `tsc --noEmit` + `eslint` + `vitest --run`.

#### AG-02 — Pas de staging
Tests Stripe live uniquement. **C5** : Variables Vercel preview + schema test ou DB séparée.

#### AG-03 — Onboarding développeur incomplet
**C5** : `scripts/dev-setup.sh`.

---

## 4. Plan d'action J+1

### Livré J+1 (1er mai — matin)

| Statut | Action | Fichier |
|---|---|---|
| ✅ | S13 : handler `charge.refunded` complet | `webhooks/stripe/route.ts` |
| ✅ | S15 : `password_hash = NULL` sur soft-delete | `user/me/route.ts:40` |
| ✅ | `trackEvent('register')` post-inscription | `register/page.tsx` |
| ✅ | `trackEvent('booking_paid')` post-paiement | `BookingModal.tsx` |
| ✅ | Suppression waitlist Navbar → `/freelancehub/register` | `Navbar.tsx` |
| ✅ | Suppression waitlist AppCard (draft) → toast | `AppCard.tsx` |
| ✅ | GitHub Actions CI (tsc + vitest + build) | `.github/workflows/ci.yml` |

### Restant — Semaine 1

| Priorité | Action | Responsable |
|---|---|---|
| 🔴 P0 | Révoquer Stripe live + xAI + root VPS (si pas fait) | Abdel |
| 🟠 P1 | Poster LinkedIn post J+1 (angle fondateur) | Abdel |
| 🟠 P1 | Outreach DM 10 consultants ERP/D365 LinkedIn | Abdel |
| ✅ | Fix S9 : email isolé + notifications garanties | Claude |
| ✅ | Migration 018 referral `?ref=` — complet | Claude |

### Semaine 1 (2–7 mai)

- Fix S9 : retry ou monitoring webhook email
- Fix S6 : enrichir metadata Stripe
- Migration 018 referral + `?ref=` dashboard consultant
- GitHub Actions CI
- Supprimer `cgu.html` + `confidentialite.html` de la racine (plus servies)

### Semaine 2 (8–15 mai)

- Upstash Redis rate limiting
- `constants.ts` centraliser STATUS_MAP
- `pricing.ts` extraire computePricing

---

## 5. Métriques à surveiller J0–J7

| Métrique | Source | Alerte si |
|---|---|---|
| Signups | Umami `/freelancehub/register` | < 5 en 24h |
| Consultants KYC soumis | `SELECT COUNT(*) FROM freelancehub.consultants WHERE kyc_status='submitted'` | 0 après 48h |
| Erreurs API 5xx | Vercel Logs | > 5 en 1h |
| CPU VPS | Netdata `monitor.perform-learn.fr` | > 80% pendant > 5min |
| Budget IA | `SELECT identifier, count FROM freelancehub.chat_limits WHERE identifier LIKE 'agent:%'` | count > monthlyCap × 0.8 |
| Emails délivrés | Resend Dashboard | taux livraison < 95% |

---

## 6. Statut ROADMAP C5

| Feature | Statut |
|---|---|
| Rate limiting persistant (Upstash) | ❌ Semaine 2 |
| Referral `?ref=` | ✅ 01/05 — migration 018 + commission 13% + dashboard + register |
| GTM custom events (`trackEvent()`) | ✅ register + booking_paid + search_consultant + select_consultant |
| Facture PDF post-paiement | ❌ C5 |
| `constants.ts` STATUS_MAP | ❌ Semaine 2 |
| `pricing.ts` | ❌ Semaine 2 |
| S13 `charge.refunded` | ✅ Livré J+1 |
| S15 `password_hash` vide | ✅ Livré J+1 |
| S9 logger erreurs email | ✅ 01/05 — email isolé `.catch()`, notifications garanties |
| CI/CD GitHub Actions | ✅ Livré J+1 — tsc + vitest + build |
| Suppression page waitlist | ✅ Livré J+1 — Navbar + AppCard |

---

*Généré par Agent DG perform-learn.fr · Session J+1 post-lancement du 1er mai 2026*
