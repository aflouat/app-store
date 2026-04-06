'use client'
import { useState } from 'react'
import type { ArtifactStatus } from '@/lib/govern/types'

interface ArtifactFormProps {
  initialStatus?: ArtifactStatus
  artifactId: string
  actorId?: string
  onSuccess?: () => void
}

const STATUSES: ArtifactStatus[] = ['draft', 'ready', 'in_progress', 'done', 'cancelled', 'blocked']
const STATUS_LABELS: Record<ArtifactStatus, string> = {
  draft: 'Brouillon',
  ready: 'Prêt',
  in_progress: 'En cours',
  done: 'Terminé',
  cancelled: 'Annulé',
  blocked: 'Bloqué',
}

export function ArtifactForm({ initialStatus, artifactId, actorId, onSuccess }: ArtifactFormProps) {
  const [status, setStatus] = useState<ArtifactStatus>(initialStatus ?? 'draft')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/govern/api/artifacts/${artifactId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          actor_id: actorId ?? '00000000-0000-0000-0000-000000000001',
          note: note || undefined,
        }),
      })
      if (!res.ok) throw new Error('Erreur serveur')
      setNote('')
      onSuccess?.()
    } catch {
      setError('Impossible de mettre à jour le statut')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Statut</label>
        <select
          value={status}
          onChange={e => setStatus(e.target.value as ArtifactStatus)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
          style={{ '--tw-ring-color': '#B9958D' } as React.CSSProperties}
        >
          {STATUSES.map(s => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Note (optionnel)</label>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Raison du changement de statut…"
          rows={2}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2"
          style={{ '--tw-ring-color': '#B9958D' } as React.CSSProperties}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        style={{ backgroundColor: '#B9958D' }}
      >
        {loading ? 'Mise à jour…' : 'Enregistrer'}
      </button>
    </form>
  )
}
