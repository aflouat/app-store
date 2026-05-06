'use client'

import { useState } from 'react'
import Link from 'next/link'

type FormStatus = 'idle' | 'sending' | 'sent' | 'error'

const SUBJECTS = [
  { value: 'technique', label: 'Problème technique' },
  { value: 'paiement',  label: 'Paiement' },
  { value: 'compte',    label: 'Mon compte' },
  { value: 'autre',     label: 'Autre' },
]

interface Props { isAuthenticated: boolean; userEmail: string }

export default function SupportClient({ isAuthenticated, userEmail }: Props) {
  const [subject,      setSubject]      = useState('technique')
  const [message,      setMessage]      = useState('')
  const [contactEmail, setContactEmail] = useState(userEmail)
  const [status,       setStatus]       = useState<FormStatus>('idle')
  const [errorMsg,     setErrorMsg]     = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending')
    setErrorMsg('')
    try {
      const res = await fetch('/api/freelancehub/support', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ subject, message, contactEmail }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Erreur serveur')
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
        <p className="fh-page-sub">
          Utilisez le{' '}
          <strong>chat</strong> (bulle en bas à droite) pour une réponse instantanée,
          ou envoyez-nous un message ci-dessous.
        </p>
      </header>

      <div className="sup-card">
        {!isAuthenticated ? (
          <div className="sup-unauth">
            <p>Connectez-vous pour contacter notre équipe support.</p>
            <div className="sup-unauth-actions">
              <Link href="/freelancehub/login"    className="sup-btn-ghost">Se connecter</Link>
              <Link href="/freelancehub/register" className="sup-btn">Créer un compte</Link>
            </div>
            <p className="sup-email-note">
              Ou écrivez-nous directement :{' '}
              <a href="mailto:contact@perform-learn.fr" className="sup-link">contact@perform-learn.fr</a>
            </p>
          </div>
        ) : status === 'sent' ? (
          <div className="sup-success">
            <span className="sup-success-icon">✓</span>
            <div>
              <p className="sup-success-title">Message envoyé</p>
              <p className="sup-success-sub">
                Réponse à <strong>{contactEmail}</strong> sous 24h ouvrées.
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
              <select id="subject" className="sup-select" value={subject}
                onChange={e => setSubject(e.target.value)} required>
                {SUBJECTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div className="sup-field">
              <label className="sup-label" htmlFor="contactEmail">Email de contact</label>
              <input id="contactEmail" type="email" className="sup-input"
                value={contactEmail} onChange={e => setContactEmail(e.target.value)} required />
            </div>
            <div className="sup-field">
              <label className="sup-label" htmlFor="message">
                Message <span className="sup-counter">{message.length}/2000</span>
              </label>
              <textarea id="message" className="sup-textarea" rows={5}
                value={message} onChange={e => setMessage(e.target.value)}
                placeholder="Décrivez votre problème…" maxLength={2000} required />
            </div>
            {status === 'error' && <p className="sup-error">{errorMsg}</p>}
            <button type="submit" className="sup-btn"
              disabled={status === 'sending' || !message.trim()}>
              {status === 'sending' ? 'Envoi…' : 'Envoyer au support'}
            </button>
          </form>
        )}
      </div>

      <style>{`
        .fh-page { display: flex; flex-direction: column; gap: 1.5rem; max-width: 560px; }
        .fh-page-header { display: flex; flex-direction: column; gap: .3rem; }
        .fh-page-title { font-family: 'Fraunces', serif; font-size: 1.7rem; font-weight: 700; color: var(--dark); }
        .fh-page-sub { color: var(--text-mid); font-size: .9rem; line-height: 1.55; }

        .sup-card {
          background: var(--white); border: 1px solid var(--border);
          border-radius: var(--radius); padding: 1.75rem;
        }

        .sup-form { display: flex; flex-direction: column; gap: 1.1rem; }
        .sup-field { display: flex; flex-direction: column; gap: .35rem; }
        .sup-label {
          font-size: .82rem; font-weight: 600; color: var(--text-mid);
          display: flex; justify-content: space-between;
        }
        .sup-counter { font-weight: 400; color: var(--text-light); font-size: .78rem; }
        .sup-input, .sup-select, .sup-textarea {
          width: 100%; box-sizing: border-box; font-family: inherit;
          font-size: .92rem; color: var(--dark); background: var(--bg);
          border: 1px solid var(--border); border-radius: 8px; padding: .6rem .85rem;
          transition: border-color .15s;
        }
        .sup-input:focus, .sup-select:focus, .sup-textarea:focus {
          outline: none; border-color: var(--c1);
        }
        .sup-textarea { resize: vertical; min-height: 100px; }
        .sup-btn {
          align-self: flex-start;
          background: var(--c1); color: #fff; font-size: .9rem; font-weight: 600;
          padding: .6em 1.6em; border: none; border-radius: 8px;
          cursor: pointer; transition: opacity .15s;
        }
        .sup-btn:hover:not(:disabled) { opacity: .88; }
        .sup-btn:disabled { opacity: .5; cursor: not-allowed; }
        .sup-btn-ghost {
          display: inline-flex; align-items: center;
          background: none; color: var(--c1); font-size: .88rem; font-weight: 600;
          padding: .5em 1.2em; border: 1.5px solid var(--c1); border-radius: 8px;
          cursor: pointer; text-decoration: none; transition: background .12s, color .12s;
        }
        .sup-btn-ghost:hover { background: var(--c1); color: #fff; }
        .sup-error {
          font-size: .85rem; color: #c0392b; background: #fff0ee;
          border-radius: 6px; padding: .5rem .9rem; margin: 0;
        }
        .sup-success { display: flex; flex-direction: column; gap: .6rem; }
        .sup-success-icon {
          display: inline-flex; align-items: center; justify-content: center;
          width: 38px; height: 38px; background: #e8f7ee; color: #27ae60;
          border-radius: 50%; font-size: 1.1rem; font-weight: 700;
        }
        .sup-success-title { font-size: 1rem; font-weight: 700; color: var(--dark); margin: 0; }
        .sup-success-sub { font-size: .88rem; color: var(--text-mid); margin: .2rem 0 0; }

        .sup-unauth { display: flex; flex-direction: column; gap: 1rem; }
        .sup-unauth p { font-size: .9rem; color: var(--text-mid); margin: 0; }
        .sup-unauth-actions { display: flex; gap: .75rem; flex-wrap: wrap; }
        .sup-email-note { font-size: .83rem; color: var(--text-light); }
        .sup-link { color: var(--c1); font-weight: 600; text-decoration: none; }
        .sup-link:hover { text-decoration: underline; }
      `}</style>
    </div>
  )
}
