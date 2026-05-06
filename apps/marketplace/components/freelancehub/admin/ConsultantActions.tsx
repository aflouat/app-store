'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  consultantId:    string
  isVerified:      boolean
  isAvailable:     boolean
  isEarlyAdopter?: boolean
  kycStatus?:      string
  kycDocumentUrl?: string | null
}

export default function ConsultantActions({ consultantId, isVerified, isAvailable, isEarlyAdopter, kycStatus, kycDocumentUrl }: Props) {
  const router      = useRouter()
  const [loading,   setLoading]   = useState(false)
  const [rejectMode, setRejectMode] = useState(false)
  const [notes,     setNotes]     = useState('')

  async function toggle(field: 'is_verified' | 'is_available' | 'is_early_adopter', value: boolean) {
    setLoading(true)
    await fetch(`/api/freelancehub/admin/consultants/${consultantId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ [field]: value }),
    })
    setLoading(false)
    router.refresh()
  }

  async function handleKyc(action: 'validate' | 'reject') {
    if (action === 'reject' && !notes.trim()) return
    setLoading(true)
    await fetch(`/api/freelancehub/admin/consultants/${consultantId}/kyc`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action, notes: notes.trim() }),
    })
    setLoading(false)
    setRejectMode(false)
    setNotes('')
    router.refresh()
  }

  return (
    <div className="ca-actions">
      {kycStatus === 'submitted' && !rejectMode && (
        <>
          <button className="ca-btn ca-set" onClick={() => handleKyc('validate')} disabled={loading}>
            Valider KYC
          </button>
          <button className="ca-btn ca-warn" onClick={() => setRejectMode(true)} disabled={loading}>
            Refuser KYC
          </button>
        </>
      )}
      {kycStatus === 'submitted' && rejectMode && (
        <div className="ca-reject-form">
          <textarea
            className="ca-reject-textarea"
            placeholder="Motif du refus…"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
          />
          <div className="ca-reject-btns">
            <button className="ca-btn ca-unset" onClick={() => handleKyc('reject')} disabled={loading || !notes.trim()}>
              Confirmer refus
            </button>
            <button className="ca-btn ca-neutral" onClick={() => { setRejectMode(false); setNotes('') }}>
              Annuler
            </button>
          </div>
        </div>
      )}
      <button
        className={`ca-btn ${isEarlyAdopter ? 'ca-unset' : 'ca-early'}`}
        onClick={() => toggle('is_early_adopter', !isEarlyAdopter)}
        disabled={loading}
        title={isEarlyAdopter ? 'Retirer badge Fondateur (commission repasse à 15%)' : 'Attribuer badge Fondateur (commission 10%)'}
      >
        {isEarlyAdopter ? '★ Retirer Fondateur' : '★ Badge Fondateur'}
      </button>
      <button
        className={`ca-btn ${isVerified ? 'ca-unset' : 'ca-set'}`}
        onClick={() => toggle('is_verified', !isVerified)}
        disabled={loading}
      >
        {isVerified ? 'Révoquer' : 'Vérifier'}
      </button>
      <button
        className={`ca-btn ${isAvailable ? 'ca-unset' : 'ca-set'}`}
        onClick={() => toggle('is_available', !isAvailable)}
        disabled={loading}
      >
        {isAvailable ? 'Suspendre' : 'Réactiver'}
      </button>

      <style>{`
        .ca-actions { display: flex; flex-direction: column; gap: .3rem; min-width: 120px; }
        .ca-btn { padding: .3em .7em; border-radius: 6px; font-size: .78rem; font-weight: 600; cursor: pointer; border: none; transition: background .12s, opacity .12s; }
        .ca-btn:disabled { opacity: .5; cursor: not-allowed; }
        .ca-set     { background: var(--c3-pale); color: var(--c3); }
        .ca-set:hover { background: var(--c3-light); color: #fff; }
        .ca-unset   { background: #fef0f0; color: #c0392b; }
        .ca-unset:hover { background: #c0392b; color: #fff; }
        .ca-warn    { background: #fffbeb; color: #d97706; }
        .ca-warn:hover { background: #d97706; color: #fff; }
        .ca-early   { background: #fef9ec; color: #b45309; }
        .ca-early:hover { background: #b45309; color: #fff; }
        .ca-neutral { background: var(--bg); color: var(--text-mid); border: 1px solid var(--border); }
        .ca-reject-form { display: flex; flex-direction: column; gap: .3rem; }
        .ca-reject-textarea { font-size: .78rem; padding: .35rem .5rem; border: 1.5px solid var(--border); border-radius: 6px; resize: vertical; font-family: inherit; color: var(--text); width: 100%; }
        .ca-reject-textarea:focus { outline: none; border-color: #c0392b; }
        .ca-reject-btns { display: flex; gap: .3rem; flex-wrap: wrap; }
      `}</style>
    </div>
  )
}
