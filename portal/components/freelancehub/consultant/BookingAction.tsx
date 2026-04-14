'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  bookingId:     string
  currentStatus: string
}

const NEXT_STATUS: Record<string, { label: string; next: string; color: string }> = {
  confirmed:   { label: 'Démarrer',  next: 'in_progress', color: '#5b6af0' },
  in_progress: { label: 'Terminer',  next: 'completed',   color: '#27ae60' },
}

export default function BookingAction({ bookingId, currentStatus }: Props) {
  const router  = useRouter()
  const [busy,  setBusy]  = useState(false)
  const [error, setError] = useState('')

  const action = NEXT_STATUS[currentStatus]
  if (!action) return null

  async function handleClick() {
    setBusy(true)
    setError('')
    const res = await fetch(`/api/freelancehub/consultant/bookings/${bookingId}/status`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ status: action.next }),
    })
    setBusy(false)
    if (res.ok) {
      router.refresh()
    } else {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Erreur.')
    }
  }

  return (
    <div className="bka-wrap">
      <button
        className="bka-btn"
        style={{ '--bka-color': action.color } as React.CSSProperties}
        onClick={handleClick}
        disabled={busy}
        title={action.label}
      >
        {busy ? '…' : action.label}
      </button>
      {error && <span className="bka-error">{error}</span>}
      <style>{`
        .bka-wrap { display: flex; flex-direction: column; gap: .2rem; }
        .bka-btn {
          padding: .32rem .75rem;
          background: var(--bka-color, var(--c1));
          color: #fff;
          border: none;
          border-radius: var(--radius-sm);
          font-size: .78rem;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: opacity .15s;
        }
        .bka-btn:hover:not(:disabled) { opacity: .85; }
        .bka-btn:disabled { opacity: .5; cursor: not-allowed; }
        .bka-error { font-size: .72rem; color: #c0392b; }
      `}</style>
    </div>
  )
}
