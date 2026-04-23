'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'

const SUBJECTS = [
  { value: 'technique', label: 'Problème technique' },
  { value: 'paiement',  label: 'Paiement' },
  { value: 'compte',    label: 'Mon compte' },
  { value: 'autre',     label: 'Autre' },
]

type Status = 'idle' | 'sending' | 'sent' | 'error'

export default function SupportPage() {
  const { data: session } = useSession()

  const [subject,      setSubject]      = useState('technique')
  const [message,      setMessage]      = useState('')
  const [contactEmail, setContactEmail] = useState(session?.user?.email ?? '')
  const [status,       setStatus]       = useState<Status>('idle')
  const [errorMsg,     setErrorMsg]     = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending')
    setErrorMsg('')
    try {
      const res = await fetch('/api/freelancehub/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, message, contactEmail }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Erreur serveur')
      }
      setStatus('sent')
      setMessage('')
    } catch (err) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Erreur inattendue')
    }
  }

  return (
    <div className="fh-page">
      <header className="fh-page-header">
        <h1 className="fh-page-title">Support</h1>
        <p className="fh-page-sub">Notre équipe vous répond sous 24h ouvrées.</p>
      </header>

      <div className="sup-card">
        {status === 'sent' ? (
          <div className="sup-success">
            <span className="sup-success-icon">✓</span>
            <div>
              <p className="sup-success-title">Message envoyé</p>
              <p className="sup-success-sub">
                Nous vous répondrons à <strong>{contactEmail}</strong> dans les meilleurs délais.
              </p>
            </div>
            <button className="sup-btn-ghost" onClick={() => setStatus('idle')}>
              Nouveau message
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="sup-form">
            <div className="sup-field">
              <label className="sup-label" htmlFor="subject">Sujet</label>
              <select
                id="subject"
                className="sup-select"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                required
              >
                {SUBJECTS.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            <div className="sup-field">
              <label className="sup-label" htmlFor="contactEmail">Email de contact</label>
              <input
                id="contactEmail"
                type="email"
                className="sup-input"
                value={contactEmail}
                onChange={e => setContactEmail(e.target.value)}
                required
              />
            </div>

            <div className="sup-field">
              <label className="sup-label" htmlFor="message">
                Message
                <span className="sup-counter">{message.length}/2000</span>
              </label>
              <textarea
                id="message"
                className="sup-textarea"
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Décrivez votre problème ou votre question…"
                maxLength={2000}
                rows={6}
                required
              />
            </div>

            {status === 'error' && (
              <p className="sup-error">{errorMsg}</p>
            )}

            <button
              type="submit"
              className="sup-btn"
              disabled={status === 'sending' || !message.trim()}
            >
              {status === 'sending' ? 'Envoi…' : 'Envoyer'}
            </button>
          </form>
        )}
      </div>

      <style>{`
        .fh-page { display: flex; flex-direction: column; gap: 1.5rem; max-width: 600px; }
        .fh-page-header { display: flex; flex-direction: column; gap: .3rem; }
        .fh-page-title { font-family: 'Fraunces', serif; font-size: 1.7rem; font-weight: 700; color: var(--dark); }
        .fh-page-sub { color: var(--text-mid); font-size: .9rem; }

        .sup-card {
          background: var(--white);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 1.75rem;
        }

        .sup-form { display: flex; flex-direction: column; gap: 1.1rem; }

        .sup-field { display: flex; flex-direction: column; gap: .35rem; }

        .sup-label {
          font-size: .82rem; font-weight: 600;
          color: var(--text-mid);
          display: flex; justify-content: space-between; align-items: center;
        }
        .sup-counter { font-weight: 400; color: var(--text-light); font-size: .78rem; }

        .sup-input, .sup-select, .sup-textarea {
          width: 100%; box-sizing: border-box;
          font-size: .92rem; color: var(--dark);
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: .6rem .85rem;
          transition: border-color .15s;
          font-family: inherit;
        }
        .sup-input:focus, .sup-select:focus, .sup-textarea:focus {
          outline: none;
          border-color: var(--c1);
        }
        .sup-textarea { resize: vertical; min-height: 120px; }

        .sup-btn {
          align-self: flex-start;
          background: var(--c1); color: #fff;
          font-size: .9rem; font-weight: 600;
          padding: .6em 1.6em;
          border: none; border-radius: 8px;
          cursor: pointer; transition: opacity .15s;
        }
        .sup-btn:hover:not(:disabled) { opacity: .88; }
        .sup-btn:disabled { opacity: .5; cursor: not-allowed; }

        .sup-btn-ghost {
          align-self: flex-start;
          background: none; color: var(--c1);
          font-size: .85rem; font-weight: 600;
          padding: .4em .9em;
          border: 1px solid var(--c1); border-radius: 6px;
          cursor: pointer; transition: background .12s, color .12s;
          margin-top: .5rem;
        }
        .sup-btn-ghost:hover { background: var(--c1); color: #fff; }

        .sup-error {
          font-size: .85rem; color: #c0392b;
          background: #fff0ee; border-radius: 6px;
          padding: .5rem .9rem; margin: 0;
        }

        .sup-success {
          display: flex; flex-direction: column; gap: .7rem;
        }
        .sup-success-icon {
          display: inline-flex; align-items: center; justify-content: center;
          width: 40px; height: 40px;
          background: #e8f7ee; color: #27ae60;
          border-radius: 50%; font-size: 1.2rem; font-weight: 700;
        }
        .sup-success-title { font-size: 1rem; font-weight: 700; color: var(--dark); margin: 0; }
        .sup-success-sub   { font-size: .88rem; color: var(--text-mid); margin: .2rem 0 0; }
      `}</style>
    </div>
  )
}
