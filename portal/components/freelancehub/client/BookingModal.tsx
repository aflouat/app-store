'use client'

import { useState } from 'react'
import type { MatchingResult } from '@/lib/freelancehub/types'

interface Props {
  match:    MatchingResult
  clientId: string
  notes:    string
  onClose:  () => void
  onBooked: () => void
}

export default function BookingModal({ match, clientId, notes, onClose, onBooked }: Props) {
  const { consultant: c, slot } = match
  const [step,   setStep]  = useState<'confirm' | 'payment' | 'done'>('confirm')
  const [error,  setError] = useState('')
  const [bookingId, setBookingId] = useState<string | null>(null)

  // Price calculation (daily rate → hourly approx for demo)
  const durationH  = slot.duration_min / 60
  const tjm        = c.daily_rate ?? 500
  const amountHt   = Math.round(tjm * durationH)     // simplifié TJM×durée
  const commission = Math.round(amountHt * 0.15)
  const consultantNet = amountHt - commission

  async function createBooking() {
    setError('')
    const res = await fetch('/api/freelancehub/client/bookings', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id:       clientId,
        consultant_id:   c.id,
        slot_id:         slot.id,
        matching_score:  match.score,
        notes:           notes,
        amount_ht:       amountHt * 100,      // centimes
        commission:      commission * 100,
        consultant_net:  consultantNet * 100,
      }),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Erreur lors de la réservation.')
      return
    }
    const data = await res.json()
    setBookingId(data.booking_id)
    setStep('payment')
  }

  async function simulatePayment() {
    if (!bookingId) return
    setError('')
    const res = await fetch(`/api/freelancehub/client/bookings/${bookingId}/pay`, {
      method: 'POST',
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Erreur de paiement.')
      return
    }
    setStep('done')
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box">
        <button className="modal-close" onClick={onClose} aria-label="Fermer">×</button>

        {step === 'confirm' && (
          <>
            <h2 className="modal-title">Confirmation de réservation</h2>
            <div className="modal-summary">
              <Row label="Expertise"  value={c.title ?? 'Consultant Expert'} />
              <Row label="Date"       value={new Date(slot.slot_date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} />
              <Row label="Heure"      value={`${slot.slot_time.slice(0,5)} (${slot.duration_min} min)`} />
              <Row label="Score"      value={`${match.score} / 100`} />
              <hr className="modal-divider" />
              <Row label="Montant HT"     value={`${amountHt} €`} />
              <Row label="Commission (15%)" value={`${commission} €`} />
              <Row label="Net consultant"  value={`${consultantNet} €`} bold />
            </div>
            <p className="modal-anon-notice">
              🔒 L&apos;identité du consultant vous sera révélée après confirmation du paiement.
            </p>
            {error && <p className="modal-error">{error}</p>}
            <div className="modal-actions">
              <button className="modal-btn-ghost" onClick={onClose}>Annuler</button>
              <button className="fh-btn-primary" onClick={createBooking}>Confirmer et payer</button>
            </div>
          </>
        )}

        {step === 'payment' && (
          <>
            <h2 className="modal-title">Paiement sécurisé</h2>
            <div className="modal-payment-info">
              <p>Montant à régler : <strong>{amountHt} € HT</strong></p>
              <p className="modal-stripe-note">Les fonds sont sécurisés sur escrow jusqu&apos;à la fin de la mission.</p>
              <div className="modal-stripe-mock">
                <div className="stripe-field">
                  <label>Numéro de carte</label>
                  <input type="text" placeholder="4242 4242 4242 4242" maxLength={19} />
                </div>
                <div className="stripe-row">
                  <div className="stripe-field">
                    <label>Expiration</label>
                    <input type="text" placeholder="MM/AA" maxLength={5} />
                  </div>
                  <div className="stripe-field">
                    <label>CVC</label>
                    <input type="text" placeholder="123" maxLength={3} />
                  </div>
                </div>
              </div>
              <p className="stripe-demo-note">⚠️ Mode démo — aucune carte réelle débitée.</p>
            </div>
            {error && <p className="modal-error">{error}</p>}
            <div className="modal-actions">
              <button className="modal-btn-ghost" onClick={() => setStep('confirm')}>Retour</button>
              <button className="fh-btn-primary" onClick={simulatePayment}>Payer {amountHt} €</button>
            </div>
          </>
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
          .fh-btn-primary { padding: .68rem 1.3rem; background: var(--c1); color: #fff; border: none; border-radius: var(--radius-sm); font-size: .9rem; font-weight: 600; cursor: pointer; transition: background .15s; }
          .fh-btn-primary:hover { background: var(--c1-light); }
          /* Payment */
          .modal-payment-info { display: flex; flex-direction: column; gap: .9rem; }
          .modal-stripe-note { font-size: .84rem; color: var(--text-light); }
          .modal-stripe-mock { background: var(--bg); border-radius: var(--radius-sm); padding: 1.1rem; display: flex; flex-direction: column; gap: .8rem; }
          .stripe-field { display: flex; flex-direction: column; gap: .35rem; }
          .stripe-field label { font-size: .8rem; font-weight: 500; color: var(--text-mid); }
          .stripe-field input { padding: .55rem .8rem; border: 1.5px solid var(--border); border-radius: var(--radius-sm); font-size: .9rem; font-family: 'Courier New', monospace; background: var(--white); outline: none; }
          .stripe-field input:focus { border-color: var(--c1); }
          .stripe-row { display: grid; grid-template-columns: 1fr 1fr; gap: .8rem; }
          .stripe-demo-note { font-size: .78rem; color: var(--text-light); font-style: italic; }
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
