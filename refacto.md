# refacto.md — Analyse quotidienne · 2026-04-20

## Score global : 7/10

| Dimension | Score | Tendance |
|---|---|---|
| Sécurité OWASP | 7/10 | ↑ |
| Qualité code | 7/10 | = |
| Performance | 6/10 | ↓ |
| Dette technique | 8/10 | ↑ |

---

## 🔴 Critiques (à corriger maintenant)

### 1. N+1 Queries dans `/consultant/profile/route.ts` — Insertion de compétences en boucle
**Fichier** : `portal/app/api/freelancehub/consultant/profile/route.ts:57-65`

**Problème** :
```typescript
for (const s of skills) {
  await query(
    `INSERT INTO freelancehub.consultant_skills (consultant_id, skill_id, level) VALUES ($1, $2, $3)...`,
    [consultant.id, s.skill_id, s.level ?? 'intermediate']
  )
}
```
Une requête DB par compétence → O(n) pour N compétences au lieu d'une insertion batch.

**Risque** : Avec 10+ compétences, chaque profil = 10+ appels réseau. Ralentit l'API, peut timeout.

**Fix** :
```typescript
if (Array.isArray(skills) && skills.length > 0) {
  const values = skills.map((s, i) => `($1, $${i*2+2}, $${i*2+3})`).join(',')
  const params = [consultant.id, ...skills.flatMap(s => [s.skill_id, s.level ?? 'intermediate'])]
  await query(
    `INSERT INTO freelancehub.consultant_skills (consultant_id, skill_id, level)
     VALUES ${values}
     ON CONFLICT (consultant_id, skill_id) DO UPDATE SET level = EXCLUDED.level`,
    params
  )
}
```

---

### 2. N+1 dans `/consultant/slots/bulk/route.ts` — Vérification en boucle
**Fichier** : `portal/app/api/freelancehub/consultant/slots/bulk/route.ts:42-61`

**Problème** :
À chaque itération (jusqu'à 70 slots), une requête SELECT pour vérifier les doublons puis un INSERT. Potentiel : 140 queries pour 70 slots.

**Risque** : Timeout, coûts DB, latence API (2-3s au lieu de 100ms).

**Fix** :
```typescript
const existing = await query<{ slot_date: string; slot_time: string }>(
  `SELECT slot_date, slot_time FROM freelancehub.slots
   WHERE consultant_id = $1 AND status != 'cancelled'`,
  [consultant_id]
)
const existingSet = new Set(existing.map(e => `${e.slot_date}|${e.slot_time}`))
const toInsert = slots.filter(s => !existingSet.has(`${s.slot_date}|${s.slot_time}`))

if (toInsert.length > 0) {
  const values = toInsert.map((_, i) => `($1, $${i*3+2}, $${i*3+3}, $${i*3+4})`).join(',')
  const params = [consultant_id, ...toInsert.flatMap(s => [s.slot_date, s.slot_time, s.duration_min ?? 60])]
  await query(
    `INSERT INTO freelancehub.slots (consultant_id, slot_date, slot_time, duration_min) VALUES ${values}`,
    params
  )
}
```

---

### 3. Exposition de consultant_id dans matching sans anonymisation
**Fichier** : `portal/lib/freelancehub/matching.ts:39-85`

**Problème** :
Le matching expose `consultant.id` (vrai ID DB) au client même avant révélation. Un client peut utiliser cet ID pour interroger d'autres endpoints.

**Risque** : IDOR indirect (Information Disclosure). Confidentialité pré-révélation compromise.

**Fix** : Retourner un opaque token ou hash non réversible à la place du vrai ID jusqu'à `revealed_at`.

---

### 4. `e.message` exposé au client dans `/client/bookings/route.ts`
**Fichier** : `portal/app/api/freelancehub/client/bookings/route.ts:83-89`

**Problème** :
```typescript
const message = e.message ?? 'Erreur interne.'
if (status < 500) return NextResponse.json({ error: message }, { status })
```
Si `e.message` contient du debug SQL ou des détails internes, il fuira au client.

**Risque** : Information Disclosure (OWASP A05).

**Fix** :
```typescript
const userMessages: Record<number, string> = {
  404: 'Ressource non trouvée.',
  409: 'Conflit — impossible de créer cette réservation.',
  403: 'Accès refusé.',
}
return NextResponse.json({ error: userMessages[status] ?? 'Erreur interne.' }, { status })
```

---

### 5. Rate limiting absent sur `/auth/register` et waitlist
**Fichiers** : `portal/app/api/freelancehub/auth/register/route.ts`, `portal/components/WaitlistModal.tsx`

**Problème** : Pas de rate limiting sur l'inscription → brute-force d'énumération d'emails possible.

**Risque** : Account enumeration, spam, DDoS sur API VPS.

**Fix** : Ajouter `Ratelimit` Vercel ou Redis-based limit (ex: 5 req/IP/min sur register, 3/IP/h sur waitlist).

---

## 🟠 Hautes (sprint courant)

### 1. Double SELECT dans `/client/bookings/[id]/pay/route.ts`
**Fichier** : `portal/app/api/freelancehub/client/bookings/[id]/pay/route.ts:19-96`

**Problème** : 3 requêtes séparées pour la même réservation (booking, booking details, emails). Fusionner en un seul SELECT avec JOINs.

---

### 2. Fire-and-forget emails sans fallback
**Fichier** : `portal/app/api/freelancehub/client/bookings/[id]/pay/route.ts:79-149`

**Problème** : Erreurs email loggées mais ignorées. Clients ne reçoivent pas les confirmations sans aucun signal.

**Fix** : Au minimum logger dans une table `email_failures` ou alerter l'admin.

---

### 3. Magic numbers hardcodés
**Fichiers** : `kyc/route.ts:7`, `matching.ts:28`, plusieurs routes paiement

**Problème** : `EARLY_ADOPTER_LIMIT = 20`, `DEFAULT_HOURLY_RATE = 85`, commission `0.85` éparpillés.

**Fix** : Centraliser dans `lib/freelancehub/constants.ts`.

---

## 🟡 Moyennes (backlog)

### 1. Export CSV sans pagination
**Fichier** : `portal/app/api/freelancehub/admin/export-csv/route.ts`

**Problème** : Exporte tous les bookings sans limite → OOM si 100k+ lignes.

**Fix** : Paramètre `?limit=1000&offset=0` et/ou streaming progressif.

---

### 2. Timezone emails reminders
**Fichier** : `portal/app/api/freelancehub/cron/reminders/route.ts:83`

**Problème** : `new Date(b.slot_date + 'T00:00:00Z')` force UTC mais consultants peuvent être en fuseau différent → affichage "demain" incorrect.

**Fix** : Stocker timezone consultant en DB, utiliser lors du rendu email.

---

### 3. Validation de date fragile
**Fichier** : `portal/app/api/freelancehub/consultant/slots/route.ts:58`

**Fix** : Ajouter `new Date(slot_date).toISOString().split('T')[0] !== slot_date` pour validation stricte.

---

## 🟢 Faibles / améliorations

### 1. Pas d'audit logging pour actions sensibles
KYC validation/refus, paiements admin → aucune trace. Recommandé pour conformité RGPD.

### 2. Pas de scan antivirus sur les uploads KYC
`portal/app/api/freelancehub/consultant/kyc/route.ts` : accepte PDF/JPG sans scan malware.

### 3. CORS non configuré explicitement
L'API Next.js accepte tous les origines par défaut. Ajouter restriction aux origines connues.

---

## Bonnes pratiques observées ✓

- ✓ Requêtes paramétrées partout (`$1, $2`) — pas d'injection SQL
- ✓ Vérification d'ownership systématique (user_id / consultant_id)
- ✓ Transactions ACID pour bookings (SELECT FOR UPDATE)
- ✓ Auth middleware RBAC Edge Runtime (middleware.ts)
- ✓ Bcrypt 12 rounds pour les mots de passe
- ✓ JWT sessions via NextAuth v5
- ✓ Soft delete pour RGPD
- ✓ Webhook signature Stripe validée
- ✓ `revealed_at` anonymisation respectée dans les queries

---

## Résumé des actions prioritaires

| # | Action | Impact | Effort |
|---|--------|--------|--------|
| 1 | Fixer N+1 skills insertion (`/consultant/profile`) | Perf critique | 30 min |
| 2 | Fixer N+1 slots bulk (`/consultant/slots/bulk`) | Perf critique | 45 min |
| 3 | Masquer error.message au client (`/bookings POST`) | Sec OWASP | 15 min |
| 4 | Anonymiser consultant IDs dans matching | Sec OWASP | 20 min |
| 5 | Rate limiting sur `/auth/register` | Sec OWASP | 60 min |
| 6 | Fusionner SELECT dans `/pay` route | Perf | 30 min |
| 7 | Retry logic emails | Fiabilité | 45 min |
| 8 | Centraliser magic numbers | Maintenabilité | 30 min |
| 9 | Export CSV paginé | Stabilité | 40 min |
| 10 | Audit logging KYC/paiements | Conformité RGPD | 90 min |

---

**Confiance** : 85% (analyse statique sans exécution)
**Date** : 2026-04-20
**Prochaine revue** : 2026-04-21
