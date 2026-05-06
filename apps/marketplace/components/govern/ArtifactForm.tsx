'use client'
import { useState } from 'react'
import type { ArtifactStatus, ValueType } from '@/lib/govern/types'

interface ArtifactFormProps {
  initialStatus?: ArtifactStatus
  initialBusinessValue?: number | null
  initialValueType?: ValueType | null
  initialValueNote?: string | null
  artifactId: string
  typeSlug?: string
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

const VALUE_TYPES: { value: ValueType; label: string }[] = [
  { value: 'user_acquisition',      label: 'Acquisition utilisateurs' },
  { value: 'revenue_impact',        label: 'Impact revenu' },
  { value: 'cost_reduction',        label: 'Réduction de coût' },
  { value: 'risk_mitigation',       label: 'Mitigation de risque' },
  { value: 'strategic_positioning', label: 'Positionnement stratégique' },
]

const SHOW_VALUE_FOR = ['epic', 'user_story', 'okr', 'roadmap_cycle']

export function ArtifactForm({
  initialStatus,
  initialBusinessValue,
  initialValueType,
  initialValueNote,
  artifactId,
  typeSlug,
  actorId,
  onSuccess,
}: ArtifactFormProps) {
  const [status, setStatus]             = useState<ArtifactStatus>(initialStatus ?? 'draft')
  const [note, setNote]                 = useState('')
  const [businessValue, setBusinessValue] = useState<number | ''>(initialBusinessValue ?? '')
  const [valueType, setValueType]       = useState<ValueType | ''>(initialValueType ?? '')
  const [valueNote, setValueNote]       = useState(initialValueNote ?? '')
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState<string | null>(null)

  const showValueFields = !typeSlug || SHOW_VALUE_FOR.includes(typeSlug)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const body: Record<string, unknown> = {
        status,
        actor_id: actorId ?? '00000000-0000-0000-0000-000000000001',
        note: note || undefined,
      }
      if (showValueFields) {
        if (businessValue !== '') body.business_value = Number(businessValue)
        if (valueType)            body.value_type     = valueType
        if (valueNote)            body.value_note     = valueNote
      }
      const res = await fetch(`/govern/api/artifacts/${artifactId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Erreur serveur')
      setNote('')
      onSuccess?.()
    } catch {
      setError('Impossible de mettre à jour')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {/* Statut */}
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

      {/* Note de changement de statut */}
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

      {/* Valeur business — visible sur epics et user stories */}
      {showValueFields && (
        <>
          <div className="border-t border-gray-100 pt-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Valeur business
            </p>

            {/* Score 0-100 */}
            <div className="mb-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Score (0–100)
                {businessValue !== '' && (
                  <span
                    className="ml-2 font-bold"
                    style={{ color: Number(businessValue) >= 75 ? '#96AEAA' : Number(businessValue) >= 50 ? '#B9958D' : '#AAB1AF' }}
                  >
                    {businessValue}
                  </span>
                )}
              </label>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={businessValue === '' ? 50 : businessValue}
                onChange={e => setBusinessValue(Number(e.target.value))}
                className="w-full accent-[#B9958D]"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                <span>0 Nul</span>
                <span>50 Moyen</span>
                <span>100 Critique</span>
              </div>
            </div>

            {/* Type de valeur */}
            <div className="mb-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Type de valeur</label>
              <select
                value={valueType}
                onChange={e => setValueType(e.target.value as ValueType | '')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': '#96AEAA' } as React.CSSProperties}
              >
                <option value="">— Non spécifié —</option>
                {VALUE_TYPES.map(vt => (
                  <option key={vt.value} value={vt.value}>{vt.label}</option>
                ))}
              </select>
            </div>

            {/* Rationale */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Rationale (optionnel)</label>
              <textarea
                value={valueNote}
                onChange={e => setValueNote(e.target.value)}
                placeholder="Pourquoi cette valeur ? Impact attendu…"
                rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': '#96AEAA' } as React.CSSProperties}
              />
            </div>
          </div>
        </>
      )}

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
