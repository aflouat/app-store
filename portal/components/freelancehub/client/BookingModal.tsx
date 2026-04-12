'use client'

import { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import type { MatchingResult } from '@/lib/freelancehub/types'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface Props {
  match:    MatchingResult
  clientId: string
  notes:    string
  onClose:  () => void
  onBooked: () => void
}

// Sub-component rendered inside <Elements> so useStripe/useElements are available
function StripeForm({
  bookingId,
  amountHt,
  onSuccess,
  onBack,
}: {
  bookingId: string
  amountHt:  number
  onSuccess: () => void
  onBack:    () => void
}) {
  const stripe   = useStripe()
  const elements = useElements()
  const [paying, setPaying] = useState(false)
  const [error,  setError]  = useState('')

  async function handlePay() {
    if (!stripe || !elements) return
    setError('')
    setPaying(true)

    // Finalize Elements form validation
    const { error: submitError } = await elements.submit()
    if (submitError) {
      setError(submitError.message ?? 'Erreur de validation.')
      setPaying(false)
      return
    }

    // Confirm payment client-side (no redirect for card payments)
    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/freelancehub/client/bookings`,
      },
      redirect: 'if_required',
    })

    if (confirmError) {
      setError(confirmError.message ?? 'Paiement refusé.')
      setPaying(false)
      return
    }

    if (!paymentIntent || paymentIntent.status !== 'succeeded') {
      setError('Le paiement n\'a pas pu être finalisé.')
      setPaying(false)
      return
    }

    // Notify server: verify PaymentIntent + confirm booking
    const res = await fetch(`/api/freelancehub/client/bookings/${bookingId}/pay`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ payment_intent_id: paymentIntent.id }),
    })

    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Erreur lors de la confirmation.')
      setPaying(false)
      return
    }

    onSuccess()
  }

  return (
    <>
      <h2 className="modal-title">Paiement sécurisé</h2>
      <div className="modal-payment-info">
        <p>Montant à régler : <strong>{amountHt} € HT</strong></p>
        <p className="modal-stripe-note">
          Les fonds sont sécurisés sur escrow jusqu&apos;à la fin de la mission.
        </p>
        <div className="modal-stripe-elements">
          <PaymentElement options={{ layout: 'tabs' }} />
        </div>
        <p className="stripe-test-note">
          Mode test — utilisez la carte <strong>4242 4242 4242 4242</strong>, date future, CVC quelconque.
        </p>
      </div>
      {error && <p className="modal-error">{error}</p>}
      <div className="modal-actions">
        <button className="modal-btn-ghost" onClick={onBack} disabled={paying}>Retour</button>
        <button className="fh-btn-primary" onClick={handlePay} disabled={paying || !stripe}>
          {paying ? 'Traitement…' : `Payer ${amountHt} €`}
        </button>
      </div>
    </>
  )
}

export default function BookingModal({ match, clientId, notes, onClose, onBooked }: Props) {
  const { consultant: c, slot } = match
  const [step,         setStep]         = useState<'confirm' | 'payment' | 'done'>('confirm')
  const [error,        setError]        = useState('')
  const [loading,      setLoading]      = useState(false)
  const [bookingId,    setBookingId]    = useState<string | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)

  // Price calculation (TJM × duration in hours)
  const durationH      = slot.duration_min / 60
  const tjm            = c.daily_rate ?? 500
  const amountHt       = Math.round(tjm * durationH)
  const commission     = Math.round(amountHt * 0.15)
  const consultantNet  = amountHt - commission

  async function handleConfirm() {
    setError('')
    setLoading(true)

    // 1. Create booking
    const bookingRes = await fetch('/api/freelancehub/client/bookings', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id:      clientId,
        consultant_id:  c.id,
        slot_id:        slot.id,
        matching_score: match.score,
        notes:          notes,
        amount_ht:      amountHt * 100,     // centimes
        commission:     commission * 100,
        consultant_net: consultantNet * 100,
      }),
    })

    if (!bookingRes.ok) {
      const d = await bookingRes.json().catch(() => ({}))
      setError(d.error ?? 'Erreur lors de la réservation.')
      setLoading(false)
      return
    }

    const { booking_id } = await bookingRes.json()
    setBookingId(booking_id)

    // 2. Create PaymentIntent
    const piRes = await fetch(`/api/freelancehub/client/bookings/${booking_id}/payment-intent`, {
      method: 'POST',
    })

    if (!piRes.ok) {
      const d = await piRes.json().catch(() => ({}))
      setError(d.error ?? 'Erreur lors de l\'initialisation du paiement.')
      setLoading(false)
      return
    }

    const { client_secret } = await piRes.json()
    setClientSecret(client_secret)
    setLoading(false)
    setStep('payment')
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box">
        <button className="modal-close" onClick={onClose} aria-label="Fermer">×</button>

        {step === 'confirm' && (
          <>
            <h2 className="modal-title">Confirmation de réservation</h2>
            <div className="modal-summary">
              <Row label="Expertise"        value={c.title ?? 'Consultant Expert'} />
              <Row label="Date"             value={new Date(slot.slot_date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} />
              <Row label="Heure"            value={`${slot.slot_time.slice(0,5)} (${slot.duration_min} min)`} />
              <Row label="Score"            value={`${match.score} / 100`} />
              <hr className="modal-divider" />
              <Row label="Montant HT"           value={`${amountHt} €`} />
              <Row label="Commission (15%)"     value={`${commission} €`} />
              <Row label="Net consultant"       value={`${consultantNet} €`} bold />
            </div>
            <p className="modal-anon-notice">
              🔒 L&apos;identité du consultant vous sera révélée après confirmation du paiement.
            </p>
            {error && <p className="modal-error">{error}</p>}
            <div className="modal-actions">
              <button className="modal-btn-ghost" onClick={onClose} disabled={loading}>Annuler</button>
              <button className="fh-btn-primary" onClick={handleConfirm} disabled={loading}>
                {loading ? 'Chargement…' : 'Confirmer et payer'}
              </button>
            </div>
          </>
        )}

        {step === 'payment' && clientSecret && (
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: {
                theme: 'stripe',
                variables: { colorPrimary: '#5b6af0', borderRadius: '8px' },
              },
            }}
          >
            <StripeForm
              bookingId={bookingId!}
              amountHt={amountHt}
              onSuccess={() => setStep('done')}
              onBack={() => setStep('confirm')}
            />
          </Elements>
        )}

        {step === 'done' && (
          <>
            <div className="modal-success">
              <div className="modal-success-icon">✓</div>
              <h2 className="modal-title">Réservation confirmée !</h2>
              <p>Le paiement a été reçu. Votre consultant est maintenant révélé :</p>
              <div className="modal-reveal-card">
                <div className="reveal-avatar">{(c.title ?? 'C')[0]}</div>
                <div className="reveal-info">
                  <p className="reveal-name">Consultant #{match.slot.id.slice(0,6).toUpperCase()}</p>
                  <p className="reveal-title">{c.title}</p>
                  {c.location && <p className="reveal-location">📍 {c.location}</p>}
                </div>
              </div>
              <p className="modal-reveal-note">
                Un email de confirmation vous a été envoyé avec les détails de contact.
              </p>
            </div>
            <button className="fh-btn-primary" style={{ alignSelf: 'center' }} onClick={onBooked}>
              Voir mes réservations
            </button>
          </>
        )}

        <style>{`
          .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.45); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; }
          .modal-box { background: var(--white); border-radius: var(--radius); padding: 2rem; max-width: 480px; width: 100%; position: relative; display: flex; flex-direction: column; gap: 1.2rem; max-height: 90vh; overflow-y: auto; }
          .modal-close { position: absolute; top: 1rem; right: 1rem; background: none; border: none; font-size: 1.4rem; color: var(--text-light); cursor: pointer; line-height: 1; }
          .modal-close:hover { color: var(--text); }
          .modal-title { font-family: 'Fraunces', serif; font-size: 1.35rem; font-weight: 700; color: var(--dark); }
          .modal-summary { display: flex; flex-direction: column; gap: .6rem; background: var(--bg); border-radius: var(--radius-sm); padding: 1.1rem; }
          .modal-divider { border: none; border-top: 1px solid var(--border); margin: .2rem 0; }
          .modal-anon-notice { font-size: .85rem; color: var(--text-mid); background: var(--c1-pale); padding: .75rem; border-radius: var(--radius-sm); line-height: 1.5; }
          .modal-error { color: #c0392b; font-size: .85rem; background: #fdf0ef; padding: .5rem .75rem; border-radius: 6px; }
          .modal-actions { display: flex; gap: .8rem; justify-content: flex-end; }
          .modal-btn-ghost { padding: .65rem 1.1rem; background: none; border: 1.5px solid var(--border); border-radius: var(--radius-sm); font-size: .9rem; cursor: pointer; color: var(--text-mid); transition: border-color .15s; }
          .modal-btn-ghost:hover { border-color: var(--text-mid); }
          .modal-btn-ghost:disabled { opacity: .5; cursor: not-allowed; }
          .fh-btn-primary { padding: .68rem 1.3rem; background: var(--c1); color: #fff; border: none; border-radius: var(--radius-sm); font-size: .9rem; font-weight: 600; cursor: pointer; transition: background .15s; }
          .fh-btn-primary:hover:not(:disabled) { background: var(--c1-light); }
          .fh-btn-primary:disabled { opacity: .6; cursor: not-allowed; }
          /* Payment */
          .modal-payment-info { display: flex; flex-direction: column; gap: .9rem; }
          .modal-stripe-note { font-size: .84rem; color: var(--text-light); }
          .modal-stripe-elements { background: var(--bg); border-radius: var(--radius-sm); padding: 1.1rem; }
          .stripe-test-note { font-size: .78rem; color: var(--text-light); font-style: italic; }
          /* Success */
          .modal-success { display: flex; flex-direction: column; align-items: center; gap: .8rem; text-align: center; }
          .modal-success-icon { width: 56px; height: 56px; border-radius: 50%; background: var(--c3-pale); color: var(--c3); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: 700; }
          .modal-reveal-card { display: flex; align-items: center; gap: 1rem; background: var(--bg); border-radius: var(--radius-sm); padding: 1rem 1.3rem; width: 100%; }
          .reveal-avatar { width: 44px; height: 44px; border-radius: 50%; background: var(--c1-pale); color: var(--c1); display: flex; align-items: center; justify-content: center; font-family: 'Fraunces', serif; font-size: 1.1rem; font-weight: 700; flex-shrink: 0; }
          .reveal-info { display: flex; flex-direction: column; gap: .15rem; text-align: left; }
          .reveal-name { font-weight: 700; font-size: .95rem; color: var(--dark); }
          .reveal-title { font-size: .85rem; color: var(--text-mid); }
          .reveal-location { font-size: .8rem; color: var(--text-light); }
          .modal-reveal-note { font-size: .82rem; color: var(--text-light); }
        `}</style>
      </div>
    </div>
  )
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '.88rem' }}>
      <span style={{ color: 'var(--text-mid)' }}>{label}</span>
      <span style={{ fontWeight: bold ? 700 : 500, color: 'var(--text)' }}>{value}</span>
    </div>
  )
}
