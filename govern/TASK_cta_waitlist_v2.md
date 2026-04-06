# TASK.md — CTAs actifs : waitlist contextuelle + toast "bientôt disponible"

> **Session Claude Code** — Cycle 2 / Portail Perform-Learn.fr
> **User Story BDD** : `a5000000-0ca0-0000-0000-000000000001`
> **Règle absolue** : chaque tâche commence par un `UPDATE status = 'in_progress'` et se termine par `UPDATE status = 'done'` + `execution_log`. Aucun code sans artefact tracé.

---

## Contexte métier

Perform-Learn.fr est un Digital Service Hub mettant en relation consultants et entreprises.
Le portail Next.js (App Router, Tailwind, Vercel) est le point d'entrée. Les boutons CTA sont actuellement statiques — cette US les rend fonctionnels.

**Charte couleurs** : CTA principal Terracotta `#B9958D` · Succès Sauge `#96AEAA` · Tailwind uniquement.

---

## Séquence obligatoire avant de toucher au code

```sql
-- 1. Marquer la US en cours
UPDATE governance.artifacts
SET status = 'in_progress', updated_at = NOW()
WHERE id = 'a5000000-0ca0-0000-0000-000000000001';

INSERT INTO governance.execution_logs
    (artifact_id, actor_id, actor_type, action, new_value, note)
VALUES (
    'a5000000-0ca0-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002', 'agent',
    'status_changed', '{"status": "in_progress"}',
    'Démarrage session Claude Code — CTAs actifs'
);
```

---

## Tâches à exécuter dans l'ordre

### Tâche 1 — `postWaitlist()` dans `lib/api.ts`
**BDD** : `a7000000-0ca0-0000-0000-000000000001`

```sql
UPDATE governance.artifacts SET status = 'in_progress', updated_at = NOW()
WHERE id = 'a7000000-0ca0-0000-0000-000000000001';
```

Ajouter dans le fichier existant `lib/api.ts` :

```typescript
export async function postWaitlist(payload: {
  email: string
  target_type: 'app' | 'service' | 'skill' | 'consultant'
  target_slug: string
  target_label: string
}): Promise<{ success: boolean; message?: string }> {
  const base = process.env.NEXT_PUBLIC_API_URL
  if (!base) {
    console.warn('NEXT_PUBLIC_API_URL non défini — mode mock')
    return { success: true }
  }
  try {
    const res = await fetch(`${base}/api/waitlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return { success: false, message: err.message ?? 'Erreur serveur' }
    }
    return { success: true }
  } catch {
    return { success: false, message: 'Impossible de joindre le serveur' }
  }
}
```

```sql
UPDATE governance.artifacts SET status = 'done', updated_at = NOW()
WHERE id = 'a7000000-0ca0-0000-0000-000000000001';
INSERT INTO governance.execution_logs (artifact_id, actor_id, actor_type, action, new_value, note)
VALUES ('a7000000-0ca0-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'agent',
        'status_changed', '{"status": "done"}', 'postWaitlist() ajouté dans lib/api.ts');
```

---

### Tâche 2 — `hooks/useToast.ts`
**BDD** : `a7000000-0ca0-0000-0000-000000000002`

```sql
UPDATE governance.artifacts SET status = 'in_progress', updated_at = NOW()
WHERE id = 'a7000000-0ca0-0000-0000-000000000002';
```

Vérifier d'abord si `sonner`, `react-hot-toast` ou équivalent est dans `package.json`.
- Si oui → créer un wrapper minimal qui expose `showToast(message, type)`.
- Si non → implémenter nativement :

```typescript
'use client'
import { useState, useCallback } from 'react'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: number
  message: string
  type: ToastType
}

let toastId = 0

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++toastId
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3000)
  }, [])

  return { toasts, showToast }
}
```

Créer également `components/ToastContainer.tsx` (rendu des toasts, bas droite, z-50).

```sql
UPDATE governance.artifacts SET status = 'done', updated_at = NOW()
WHERE id = 'a7000000-0ca0-0000-0000-000000000002';
INSERT INTO governance.execution_logs (artifact_id, actor_id, actor_type, action, new_value, note)
VALUES ('a7000000-0ca0-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'agent',
        'status_changed', '{"status": "done"}', 'useToast créé ou branché sur lib existante');
```

---

### Tâche 3 — `components/WaitlistModal.tsx`
**BDD** : `a7000000-0ca0-0000-0000-000000000003`

```sql
UPDATE governance.artifacts SET status = 'in_progress', updated_at = NOW()
WHERE id = 'a7000000-0ca0-0000-0000-000000000003';
```

```typescript
'use client'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { postWaitlist } from '@/lib/api'
import { useToast } from '@/hooks/useToast'

interface WaitlistModalProps {
  isOpen: boolean
  onClose: () => void
  targetType: 'app' | 'service' | 'skill' | 'consultant'
  targetSlug: string
  targetLabel: string
}

export function WaitlistModal({ isOpen, onClose, targetType, targetSlug, targetLabel }: WaitlistModalProps) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { showToast } = useToast()
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus trap + Escape
  useEffect(() => {
    if (!isOpen) return
    inputRef.current?.focus()
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const result = await postWaitlist({ email, target_type: targetType, target_slug: targetSlug, target_label: targetLabel })
    setLoading(false)
    if (result.success) {
      showToast('Inscription enregistrée', 'success')
      onClose()
      setEmail('')
    } else {
      setError(result.message ?? 'Une erreur est survenue')
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
      aria-labelledby="waitlist-title"
    >
      <div
        className="bg-white rounded-xl p-6 w-full max-w-md mx-4 relative"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          aria-label="Fermer"
        >✕</button>

        <h2 id="waitlist-title" className="text-lg font-medium mb-1" style={{ color: '#712B13' }}>
          Rejoindre la liste
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Soyez notifié dès que <strong>{targetLabel}</strong> est disponible.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            ref={inputRef}
            type="email"
            required
            placeholder="votre@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2"
            style={{ '--tw-ring-color': '#B9958D' } as React.CSSProperties}
          />
          {error && <p className="text-sm" style={{ color: '#993C1D' }}>{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            style={{ backgroundColor: '#B9958D' }}
          >
            {loading ? 'Inscription...' : "M'inscrire"}
          </button>
        </form>
      </div>
    </div>,
    document.body
  )
}
```

```sql
UPDATE governance.artifacts SET status = 'done', updated_at = NOW()
WHERE id = 'a7000000-0ca0-0000-0000-000000000003';
INSERT INTO governance.execution_logs (artifact_id, actor_id, actor_type, action, new_value, note)
VALUES ('a7000000-0ca0-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'agent',
        'status_changed', '{"status": "done"}', 'WaitlistModal.tsx créé avec createPortal et trap focus');
```

---

### Tâche 4 — Brancher `AppCard.tsx`
**BDD** : `a7000000-0ca0-0000-0000-000000000004`

```sql
UPDATE governance.artifacts SET status = 'in_progress', updated_at = NOW()
WHERE id = 'a7000000-0ca0-0000-0000-000000000004';
```

Localiser les deux boutons statiques. Les remplacer :

- Bouton **"Ouvrir l'app"** → `onClick={() => showToast('Bientôt disponible', 'info')}`
- Bouton **"Rejoindre la waitlist"** → ouvre `WaitlistModal` avec `targetType="app"`, `targetSlug={app.slug}`, `targetLabel={app.name}`

Ajouter le state local `const [waitlistOpen, setWaitlistOpen] = useState(false)` dans le composant.

```sql
UPDATE governance.artifacts SET status = 'done', updated_at = NOW()
WHERE id = 'a7000000-0ca0-0000-0000-000000000004';
INSERT INTO governance.execution_logs (artifact_id, actor_id, actor_type, action, new_value, note)
VALUES ('a7000000-0ca0-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', 'agent',
        'status_changed', '{"status": "done"}', 'AppCard.tsx — boutons branchés sur WaitlistModal et toast');
```

---

### Tâche 5 — Brancher `WaitlistBanner.tsx`
**BDD** : `a7000000-0ca0-0000-0000-000000000005`

```sql
UPDATE governance.artifacts SET status = 'in_progress', updated_at = NOW()
WHERE id = 'a7000000-0ca0-0000-0000-000000000005';
```

Même pattern qu'AppCard. Props fixes :
- `targetType="service"` · `targetSlug="platform"` · `targetLabel="Perform-Learn"`

```sql
UPDATE governance.artifacts SET status = 'done', updated_at = NOW()
WHERE id = 'a7000000-0ca0-0000-0000-000000000005';
INSERT INTO governance.execution_logs (artifact_id, actor_id, actor_type, action, new_value, note)
VALUES ('a7000000-0ca0-0000-0000-000000000005', '00000000-0000-0000-0000-000000000002', 'agent',
        'status_changed', '{"status": "done"}', 'WaitlistBanner.tsx — branché sur WaitlistModal plateforme');
```

---

### Tâche 6 — `.env.example`
**BDD** : `a7000000-0ca0-0000-0000-000000000006`

```sql
UPDATE governance.artifacts SET status = 'in_progress', updated_at = NOW()
WHERE id = 'a7000000-0ca0-0000-0000-000000000006';
```

Vérifier `.env.local` → ajouter `NEXT_PUBLIC_API_URL=https://<domaine-vps>` si absent.
Ajouter dans `.env.example` :
```
# URL de l'API VPS Perform-Learn
NEXT_PUBLIC_API_URL=https://your-vps-domain.com
```

```sql
UPDATE governance.artifacts SET status = 'done', updated_at = NOW()
WHERE id = 'a7000000-0ca0-0000-0000-000000000006';
INSERT INTO governance.execution_logs (artifact_id, actor_id, actor_type, action, new_value, note)
VALUES ('a7000000-0ca0-0000-0000-000000000006', '00000000-0000-0000-0000-000000000002', 'agent',
        'status_changed', '{"status": "done"}', 'NEXT_PUBLIC_API_URL documenté dans .env.example');
```

---

## Clôture de la User Story

Après validation de tous les tests manuels ci-dessous :

```sql
UPDATE governance.artifacts
SET status = 'done', updated_at = NOW()
WHERE id = 'a5000000-0ca0-0000-0000-000000000001';

INSERT INTO governance.execution_logs (artifact_id, actor_id, actor_type, action, new_value, note)
VALUES (
    'a5000000-0ca0-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002', 'agent',
    'status_changed', '{"status": "done"}',
    'US CTAs actifs — 6 tâches done, tests manuels validés'
);
```

---

## Checklist tests manuels

- [ ] Clic "Rejoindre la waitlist" sur AppCard → modal avec bon `targetLabel`
- [ ] Email valide → appel API → toast success "Inscription enregistrée" → modal fermé
- [ ] Email invalide → validation HTML5 bloque
- [ ] Escape / clic overlay → modal fermé sans soumission
- [ ] Clic "Ouvrir l'app" → toast info "Bientôt disponible" 3s
- [ ] Erreur API simulée → message inline, modal reste ouvert
- [ ] Clic WaitlistBanner → modal avec targetLabel="Perform-Learn"
- [ ] `NEXT_PUBLIC_API_URL` présent dans `.env.example`
