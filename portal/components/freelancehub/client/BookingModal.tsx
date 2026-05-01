'use client'

import { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import type { MatchingResult } from '@/lib/freelancehub/types'
import { trackEvent } from '@/lib/freelancehub/analytics'

interface AvailableSlot { id: string; slot_time: string; duration_min: number }

const MONTHS_FR = ['jan','fév','mar','avr','mai','jun','jul','aoû','sep','oct','nov','déc']

function fmtDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
}

const STRIPE_PK = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
const stripePromise = STRIPE_PK ? loadStripe(STRIPE_PK) : null

// ─── Calcul prix depuis le taux horaire consultant ───────────
function buildPricing(hourlyRateEur: number) {
  const htCents    = Math.round(hourlyRateEur * 100)
  const ttcCents   = Math.round(htCents * 1.20)
  const commCents  = Math.round(htCents * 0.15)
  const netCents   = htCents - commCents
  return {
    priceTTC:       +(ttcCents / 100).toFixed(2),
    priceHT:        +(htCents  / 100).toFixed(2),
    tva:            +((ttcCents - htCents) / 100).toFixed(2),
    commission:     +(commCents / 100).toFixed(2),
    consultantNet:  +(netCents  / 100).toFixed(2),
    priceTTCCents:  ttcCents,
    priceHTCents:   htCents,
    commissionCents:commCents,
    consultantCents:netCents,
  }
}

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
  priceTTC,
  onSuccess,
  onBack,
}: {
  bookingId: string
  priceTTC:  number
  onSuccess: () => void
  onBack:    () => void
}) {
  const stripe   = useStripe()
  const elements = useElements()
  const [paying,      setPaying]      = useState(false)
  const [error,       setError]       = useState('')
  const [stripeReady, setStripeReady] = useState(false)
  const [initTimeout, setInitTimeout] = useState(false)

  // Timeout 15s si Stripe ne s'initialise pas
  useEffect(() => {
    const t = setTimeout(() => {
      if (!stripeReady) setInitTimeout(true)
    }, 15000)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handlePay() {
    if (!stripe || !elements) return
    setError('')
    setPaying(true)

    try {
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
    } catch {
      setError('Erreur réseau. Veuillez réessayer.')
      setPaying(false)
    }
  }

  return (
    <>
      <h2 className="modal-title">Paiement sécurisé</h2>
      <div className="modal-payment-info">
        <p>Montant à régler : <strong>{priceTTC} € TTC</strong></p>
        <p className="modal-stripe-note">
          Les fonds sont sécurisés sur escrow jusqu&apos;à la fin de la mission.
        </p>
        <div className="modal-stripe-elements">
          <PaymentElement
            options={{ layout: 'tabs' }}
            onReady={() => setStripeReady(true)}
            onLoadError={() => setError('Formulaire de paiement indisponible. Rechargez la page.')}
          />
        </div>
      </div>
      {initTimeout && !stripeReady && (
        <p className="modal-error">
          Le formulaire de paiement n&apos;a pas pu se charger. Rechargez la page ou réessayez.
        </p>
      )}
      {error && <p className="modal-error">{error}</p>}
      <div className="modal-actions">
        <button className="modal-btn-ghost" onClick={onBack} disabled={paying}>Retour</button>
        <button className="fh-btn-primary" onClick={handlePay} disabled={paying || !stripeReady}>
          {paying ? 'Traitement…' : !stripeReady ? 'Chargement…' : `Payer ${priceTTC} € TTC`}
        </button>
      </div>
    </>
  )
}

export default function BookingModal({ match, clientId, notes, onClose, onBooked }: Props) {
  const { consultant: c } = match

  // Calcul prix depuis le taux horaire du consultant
  const pricing = buildPricing(c.daily_rate ?? 85)

  const [step,           setStep]           = useState<'slot' | 'confirm' | 'payment' | 'done'>('slot')
  const [selectedSlot,   setSelectedSlot]   = useState(match.slot)
  const [selectedDate,   setSelectedDate]   = useState(match.slot.slot_date)
  const [slotsByDate,    setSlotsByDate]    = useState<Record<string, AvailableSlot[]>>({})
  const [slotsLoading,   setSlotsLoading]   = useState(true)
  const [error,          setError]          = useState('')
  const [loading,        setLoading]        = useState(false)
  const [bookingId,      setBookingId]      = useState<string | null>(null)
  const [clientSecret,   setClientSecret]   = useState<string | null>(null)

  // Fetch available slots for this consultant
  useEffect(() => {
    setSlotsLoading(true)
    fetch(`/api/freelancehub/client/slots?consultant_id=${c.id}`)
      .then(r => r.json())
      .then(d => {
        setSlotsByDate(d.slots_by_date ?? {})
        // Pre-select first available date/slot
        const dates = Object.keys(d.slots_by_date ?? {}).sort()
        if (dates.length > 0) {
          setSelectedDate(dates[0])
          const firstSlots = d.slots_by_date[dates[0]]
          if (firstSlots?.length > 0) setSelectedSlot({ ...match.slot, ...firstSlots[0], slot_date: dates[0] })
        }
      })
      .catch(() => {})
      .finally(() => setSlotsLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c.id])

  const availableDates = Object.keys(slotsByDate).sort()
  const slotsForDate   = slotsByDate[selectedDate] ?? []

  function selectDate(date: string) {
    setSelectedDate(date)
    const first = slotsByDate[date]?.[0]
    if (first) setSelectedSlot({ ...match.slot, ...first, slot_date: date })
  }

  function selectTime(s: AvailableSlot) {
    setSelectedSlot({ ...match.slot, ...s, slot_date: selectedDate })
  }

  const nextDate = new Date(selectedSlot.slot_date + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  async function handleConfirm() {
    setError('')
    setLoading(true)

    try {
      // 1. Créer la réservation
      const bookingRes = await fetch('/api/freelancehub/client/bookings', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id:      clientId,
          consultant_id:  c.id,
          slot_id:        selectedSlot.id,
          matching_score: match.score,
          notes:          notes,
          amount_ht:      pricing.priceHTCents,
          commission:     pricing.commissionCents,
          consultant_net: pricing.consultantCents,
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
      if (!client_secret) {
        setError('Réponse de paiement invalide. Veuillez réessayer.')
        setLoading(false)
        return
      }

      setClientSecret(client_secret)
      setLoading(false)
      setStep('payment')
    } catch {
      setError('Erreur réseau. Veuillez vérifier votre connexion et réessayer.')
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box">
        <button className="modal-close" onClick={onClose} aria-label="Fermer">×</button>

        {step === 'slot' && (
          <>
            <h2 className="modal-title">Choisir un créneau</h2>
            <p className="modal-slot-sub">Sélectionnez une date et une heure pour votre consultation.</p>

            {slotsLoading ? (
              <div className="modal-slot-loading">Chargement des disponibilités…</div>
            ) : availableDates.length === 0 ? (
              <div className="modal-slot-empty">
                Ce consultant n&apos;a aucun créneau disponible pour les 60 prochains jours.
              </div>
            ) : (
              <>
                {/* Date chips */}
                <div className="modal-slot-section-label">Date</div>
                <div className="modal-date-chips">
                  {availableDates.map(d => (
                    <button
                      key={d}
                      className={`modal-date-chip${d === selectedDate ? ' modal-date-chip--active' : ''}`}
                      onClick={() => selectDate(d)}
                    >
                      {fmtDate(d)}
                    </button>
                  ))}
                </div>

                {/* Time chips */}
                <div className="modal-slot-section-label">Heure</div>
                <div className="modal-time-chips">
                  {slotsForDate.map(s => (
                    <button
                      key={s.id}
                      className={`modal-time-chip${s.id === selectedSlot.id ? ' modal-time-chip--active' : ''}`}
                      onClick={() => selectTime(s)}
                    >
                      {s.slot_time.slice(0, 5)}
                      <span className="modal-time-chip-dur">{s.duration_min} min</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            <div className="modal-actions">
              <button className="modal-btn-ghost" onClick={onClose}>Annuler</button>
              <button
                className="fh-btn-primary"
                onClick={() => setStep('confirm')}
                disabled={slotsLoading || availableDates.length === 0}
              >
                Continuer →
              </button>
            </div>
          </>
        )}

        {step === 'confirm' && (
          <>
            <h2 className="modal-title">Confirmation de réservation</h2>
            <div className="modal-summary">
              <Row label="Expertise"   value={c.title ?? 'Consultant Expert'} />
              <Row label="Date"        value={nextDate} />
              <Row label="Heure"       value={`${selectedSlot.slot_time.slice(0,5)} — ${selectedSlot.duration_min} min de consultation`} />
              <Row label="Score match" value={`${match.score} / 100`} />
              <hr className="modal-divider" />
              <div className="modal-price-block">
                <div className="modal-price-line">
                  <span>Montant HT</span><span>{pricing.priceHT} €</span>
                </div>
                <div className="modal-price-line modal-price-tva">
                  <span>TVA 20%</span><span>+ {pricing.tva} €</span>
                </div>
                <div className="modal-price-line modal-price-total">
                  <span>Total TTC</span><span>{pricing.priceTTC} €</span>
                </div>
              </div>
              <hr className="modal-divider" />
              <div className="modal-ventil">
                <p className="modal-ventil-title">Ventilation plateforme</p>
                <div className="modal-price-line">
                  <span>CA plateforme (15% HT)</span><span>{pricing.commission} €</span>
                </div>
                <div className="modal-price-line">
                  <span>Honoraire consultant</span><span>{pricing.consultantNet} €</span>
                </div>
              </div>
            </div>
            <p className="modal-anon-notice">
              🔒 L&apos;identité du consultant vous sera révélée après confirmation du paiement.
            </p>
            {error && <p className="modal-error">{error}</p>}
            <div className="modal-actions">
              <button className="modal-btn-ghost" onClick={() => setStep('slot')} disabled={loading}>Retour</button>
              <button className="fh-btn-primary" onClick={handleConfirm} disabled={loading}>
                {loading ? 'Chargement…' : 'Confirmer et payer'}
              </button>
            </div>
          </>
        )}

        {step === 'payment' && clientSecret && (
          !stripePromise ? (
            <div className="modal-error">
              Paiement indisponible — configuration manquante. Contactez le support.
            </div>
          ) : (
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
                priceTTC={pricing.priceTTC}
                onSuccess={() => { trackEvent('booking_paid', { amount_ht: pricing.priceHTCents }); setStep('done') }}
                onBack={() => setStep('confirm')}
              />
            </Elements>
          )
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
          .modal-price-block { display: flex; flex-direction: column; gap: .4rem; }
          .modal-price-line { display: flex; justify-content: space-between; font-size: .88rem; color: var(--text-mid); }
          .modal-price-tva { color: var(--text-light); font-size: .82rem; }
          .modal-price-total { font-weight: 700; font-size: 1rem; color: var(--dark); padding-top: .3rem; border-top: 1.5px solid var(--border); margin-top: .2rem; }
          .modal-ventil { display: flex; flex-direction: column; gap: .35rem; }
          .modal-ventil-title { font-size: .75rem; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: var(--text-light); margin-bottom: .1rem; }
          .modal-ventil .modal-price-line { font-size: .82rem; color: var(--text-light); }
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
          /* Slot picker */
          .modal-slot-sub { font-size: .88rem; color: var(--text-mid); margin-top: -.4rem; }
          .modal-slot-loading { font-size: .88rem; color: var(--text-light); padding: 1.5rem 0; text-align: center; }
          .modal-slot-empty { font-size: .88rem; color: var(--text-mid); background: var(--bg); padding: 1rem; border-radius: var(--radius-sm); text-align: center; }
          .modal-slot-section-label { font-size: .75rem; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: var(--text-light); }
          .modal-date-chips { display: flex; flex-wrap: wrap; gap: .5rem; }
          .modal-date-chip { padding: .42rem .85rem; border: 1.5px solid var(--border); border-radius: 20px; background: var(--white); font-size: .83rem; color: var(--text-mid); cursor: pointer; transition: border-color .12s, background .12s; white-space: nowrap; }
          .modal-date-chip:hover { border-color: var(--c1); color: var(--c1); }
          .modal-date-chip--active { border-color: var(--c1); background: var(--c1-pale); color: var(--c1); font-weight: 600; }
          .modal-time-chips { display: flex; flex-wrap: wrap; gap: .5rem; }
          .modal-time-chip { padding: .42rem .85rem; border: 1.5px solid var(--border); border-radius: var(--radius-sm); background: var(--white); font-size: .88rem; color: var(--text); cursor: pointer; display: flex; align-items: center; gap: .4rem; transition: border-color .12s, background .12s; }
          .modal-time-chip:hover { border-color: var(--c1); color: var(--c1); }
          .modal-time-chip--active { border-color: var(--c1); background: var(--c1-pale); color: var(--c1); font-weight: 600; }
          .modal-time-chip-dur { font-size: .73rem; color: var(--text-light); font-weight: 400; }
          .modal-time-chip--active .modal-time-chip-dur { color: var(--c1); }
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
