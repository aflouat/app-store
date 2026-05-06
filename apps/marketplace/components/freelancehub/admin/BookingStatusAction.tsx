'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  bookingId:     string
  currentStatus: string
}

const TRANSITIONS: Record<string, string[]> = {
  pending:     ['confirmed', 'cancelled'],
  confirmed:   ['in_progress', 'cancelled'],
  in_progress: ['completed', 'disputed'],
  completed:   [],
  cancelled:   [],
  disputed:    ['completed', 'cancelled'],
}

const STATUS_LABELS: Record<string, string> = {
  confirmed:   'Confirmer',
  in_progress: 'Démarrer',
  completed:   'Terminer',
  cancelled:   'Annuler',
  disputed:    'Litige',
}

export default function BookingStatusAction({ bookingId, currentStatus }: Props) {
  const router  = useRouter()
  const [loading, setLoading] = useState(false)

  const next = TRANSITIONS[currentStatus] ?? []
  if (next.length === 0) return <span style={{ fontSize: '.78rem', color: 'var(--text-light)' }}>—</span>

  async function updateStatus(status: string) {
    setLoading(true)
    await fetch(`/api/freelancehub/admin/bookings/${bookingId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ status }),
    })
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="bsa-wrap">
      {next.map(s => (
        <button
          key={s}
          className={`bsa-btn ${s === 'cancelled' || s === 'disputed' ? 'bsa-danger' : 'bsa-ok'}`}
          onClick={() => updateStatus(s)}
          disabled={loading}
        >
          {STATUS_LABELS[s] ?? s}
        </button>
      ))}
      <style>{`
        .bsa-wrap { display: flex; flex-direction: column; gap: .3rem; }
        .bsa-btn { padding: .28em .65em; border-radius: 6px; font-size: .77rem; font-weight: 600; cursor: pointer; border: none; transition: background .12s; }
        .bsa-btn:disabled { opacity: .5; cursor: not-allowed; }
        .bsa-ok     { background: var(--c3-pale); color: var(--c3); }
        .bsa-ok:hover { background: var(--c3); color: #fff; }
        .bsa-danger { background: #fef0f0; color: #c0392b; }
        .bsa-danger:hover { background: #c0392b; color: #fff; }
      `}</style>
    </div>
  )
}
