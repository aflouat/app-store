'use client'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { postWaitlist } from '@/lib/api'
import { useToast } from '@/hooks/useToast'
import { ToastContainer } from './ToastContainer'

interface WaitlistModalProps {
  isOpen: boolean
  onClose: () => void
  source?: string
}

export function WaitlistModal({ isOpen, onClose, source = 'landing' }: WaitlistModalProps) {
  const [email, setEmail] = useState('')
  const [userType, setUserType] = useState<'client' | 'freelance'>('client')
  const [consent, setConsent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toasts, showToast } = useToast()
  const inputRef = useRef<HTMLInputElement>(null)

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
    if (!consent) { setError('Veuillez accepter de recevoir nos actualités.'); return }
    setLoading(true)
    setError(null)
    const result = await postWaitlist({ email, user_type: userType, marketing_consent: consent, source })
    setLoading(false)
    if (result.success) {
      showToast('Inscription enregistrée — à bientôt !', 'success')
      onClose()
      setEmail('')
      setConsent(false)
    } else {
      setError(result.message ?? 'Une erreur est survenue')
    }
  }

  const inputStyle = {
    border: '1px solid #e2deda', borderRadius: '10px',
    padding: '0.6rem 0.875rem', fontSize: '0.875rem',
    fontFamily: 'DM Sans, sans-serif', outline: 'none', color: '#2e2c2a', width: '100%',
  }

  return createPortal(
    <>
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex',
          alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)' }}
        onClick={onClose} aria-modal="true" role="dialog" aria-labelledby="waitlist-title"
      >
        <div
          style={{ backgroundColor: '#fff', borderRadius: '14px', padding: '1.75rem',
            width: '100%', maxWidth: '420px', margin: '0 1rem', position: 'relative',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
          onClick={e => e.stopPropagation()}
        >
          <button onClick={onClose} aria-label="Fermer"
            style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none',
              border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: '#968e89' }}>
            ✕
          </button>

          <h2 id="waitlist-title" style={{ fontFamily: 'Fraunces, serif', fontSize: '1.2rem',
            fontWeight: 700, color: '#22201e', marginBottom: '0.35rem' }}>
            Rejoindre le lancement
          </h2>
          <p style={{ fontSize: '0.875rem', color: '#5c5956', marginBottom: '1.25rem' }}>
            Accès en avant-première le <strong>30 avril 2026</strong>.
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

            {/* Role toggle */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {(['client', 'freelance'] as const).map(t => (
                <button key={t} type="button" onClick={() => setUserType(t)}
                  style={{ flex: 1, padding: '0.55rem', borderRadius: '8px', fontSize: '0.8rem',
                    fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                    border: userType === t ? '2px solid #B9958D' : '2px solid #e2deda',
                    backgroundColor: userType === t ? '#faf4f2' : '#fff',
                    color: userType === t ? '#B9958D' : '#968e89' }}>
                  {t === 'client' ? '🏢 Je cherche un expert' : '💼 Je suis freelance'}
                </button>
              ))}
            </div>

            <input ref={inputRef} type="email" required placeholder="votre@email.com"
              value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />

            {/* RGPD consent */}
            <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start',
              cursor: 'pointer', fontSize: '0.78rem', color: '#5c5956', lineHeight: 1.5 }}>
              <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}
                style={{ marginTop: '2px', accentColor: '#B9958D', flexShrink: 0 }} />
              J&apos;accepte de recevoir les actualités de perform-learn.fr.
              Je peux me désinscrire à tout moment.
            </label>

            {error && <p style={{ fontSize: '0.8rem', color: '#712B13', margin: 0 }}>{error}</p>}

            <button type="submit" disabled={loading || !consent}
              style={{ backgroundColor: consent ? '#B9958D' : '#d4c5c1', color: '#fff',
                border: 'none', borderRadius: '24px', padding: '0.65rem 1.25rem',
                fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
                cursor: loading || !consent ? 'not-allowed' : 'pointer', transition: 'all 0.15s' }}>
              {loading ? 'Inscription…' : "M'inscrire"}
            </button>
          </form>
        </div>
      </div>
      <ToastContainer toasts={toasts} />
    </>,
    document.body
  )
}
