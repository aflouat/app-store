# CLAUDE.md — SantéApp

> Appli santé du monorepo app-store. Stack identique à marketplace (Next.js 16, NextAuth 5, pg).
> Règles transverses dans `../../CLAUDE.md`. Ce fichier couvre le domaine santé uniquement.

---

## Stack

- Next.js 16 App Router · TypeScript strict · Tailwind CSS
- Auth : NextAuth 5 (JWT) — roles : `patient` · `doctor` · `admin`
- DB : PostgreSQL schéma `sante.*` (migrations dans `../../migrations/sante/`)
- Packages partagés : `@app-store/core-db` · `@app-store/core-auth` · `@app-store/core-email` · `@app-store/core-ui`

## Règles import — OBLIGATOIRE

```typescript
// ✅ Correct — importer depuis core partagé
import { query, queryOne } from '@app-store/core-db'
import { sendEmail }       from '@app-store/core-email'
import { useToast }        from '@app-store/core-ui'

// ❌ Interdit — jamais copier depuis marketplace
// import { query } from '../../marketplace/lib/freelancehub/db'
```

## Sécurité RGPD — règles immuables

| Règle | Raison |
|---|---|
| Ne jamais exposer les données médicales sans authentification | Sensibilité RGPD |
| Numéro RPPS médecin : vérification admin obligatoire avant `is_verified = true` | Conformité |
| Notes de consultation : champ `notes` chiffré en base (à implémenter) | Données de santé catégorie 1 |
| Aucun logging de données patient dans les routes API | RGPD Art. 32 |

## Rôles et redirections

| Rôle | Route home |
|---|---|
| `patient` | `/patient/dashboard` |
| `doctor`  | `/doctor/dashboard` |
| `admin`   | `/admin` |

## Séquence DEV obligatoire

1. Lire ce fichier + `../../CLAUDE.md §7` (sécurité)
2. `cd apps/sante && npm run build && npm test` avant tout commit
3. Ne jamais `git add -A` — toujours lister les fichiers explicitement
4. Commit : `feat(sante):` · `fix(sante):` · `chore(sante):`

## Ajouter un nouveau package core

Si tu as besoin d'une lib absente de `@app-store/core-*` :
1. La créer dans `../../packages/core-{nom}/`
2. L'ajouter à `transpilePackages` dans `next.config.mjs` (ici et dans marketplace)
3. Ne JAMAIS dupliquer du code entre `apps/sante` et `apps/marketplace`
