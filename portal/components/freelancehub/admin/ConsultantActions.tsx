'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  consultantId: string
  isVerified:   boolean
  isAvailable:  boolean
}

export default function ConsultantActions({ consultantId, isVerified, isAvailable }: Props) {
  const router   = useRouter()
  const [loading, setLoading] = useState(false)

  async function toggle(field: 'is_verified' | 'is_available', value: boolean) {
    setLoading(true)
    await fetch(`/api/freelancehub/admin/consultants/${consultantId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ [field]: value }),
    })
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="ca-actions">
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
        .ca-actions { display: flex; flex-direction: column; gap: .3rem; }
        .ca-btn { padding: .3em .7em; border-radius: 6px; font-size: .78rem; font-weight: 600; cursor: pointer; border: none; transition: background .12s, opacity .12s; }
        .ca-btn:disabled { opacity: .5; cursor: not-allowed; }
        .ca-set   { background: var(--c3-pale); color: var(--c3); }
        .ca-set:hover { background: var(--c3-light); color: #fff; }
        .ca-unset { background: #fef0f0; color: #c0392b; }
        .ca-unset:hover { background: #c0392b; color: #fff; }
      `}</style>
    </div>
  )
}
