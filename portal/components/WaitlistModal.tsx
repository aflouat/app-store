'use client'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { postWaitlist } from '@/lib/api'
import { useToast } from '@/hooks/useToast'
import { ToastContainer } from './ToastContainer'

interface WaitlistModalProps {
  isOpen: boolean
  onClose: () => void
  targetType: 'app' | 'service' | 'skill' | 'consultant'
  targetSlug: string
  targetLabel: string
}

export function WaitlistModal({
  isOpen,
  onClose,
  targetType,
  targetSlug,
  targetLabel,
}: WaitlistModalProps) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toasts, showToast } = useToast()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isOpen) return
    inputRef.current?.focus()
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const result = await postWaitlist({
      email,
      target_type: targetType,
      target_slug: targetSlug,
      target_label: targetLabel,
    })
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
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,0.4)',
        }}
        onClick={onClose}
        aria-modal="true"
        role="dialog"
        aria-labelledby="waitlist-modal-title"
      >
        <div
          style={{
            backgroundColor: '#fff',
            borderRadius: '14px',
            padding: '1.75rem',
            width: '100%',
            maxWidth: '420px',
            margin: '0 1rem',
            position: 'relative',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          }}
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            aria-label="Fermer"
            style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1.1rem',
              color: '#968e89',
              lineHeight: 1,
              padding: '0.25rem',
            }}
          >
            ✕
          </button>

          <h2
            id="waitlist-modal-title"
            style={{
              fontFamily: 'Fraunces, serif',
              fontSize: '1.2rem',
              fontWeight: 700,
              color: '#22201e',
              marginBottom: '0.35rem',
            }}
          >
            Rejoindre la liste
          </h2>
          <p style={{ fontSize: '0.875rem', color: '#5c5956', marginBottom: '1.25rem' }}>
            Soyez notifié dès que <strong>{targetLabel}</strong> est disponible.
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <input
              ref={inputRef}
              type="email"
              required
              placeholder="votre@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{
                border: '1px solid #e2deda',
                borderRadius: '10px',
                padding: '0.6rem 0.875rem',
                fontSize: '0.875rem',
                fontFamily: 'DM Sans, sans-serif',
                outline: 'none',
                color: '#2e2c2a',
              }}
            />
            {error && (
              <p style={{ fontSize: '0.8rem', color: '#712B13', margin: 0 }}>{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              style={{
                backgroundColor: '#B9958D',
                color: '#fff',
                border: 'none',
                borderRadius: '24px',
                padding: '0.65rem 1.25rem',
                fontSize: '0.875rem',
                fontFamily: 'DM Sans, sans-serif',
                fontWeight: 500,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.65 : 1,
                transition: 'opacity 0.15s',
              }}
            >
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
