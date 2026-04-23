'use client'

import { useState, useRef, useEffect } from 'react'
import { useSession } from 'next-auth/react'

// ─── Types ────────────────────────────────────────────────────
interface ChatMessage { role: 'user' | 'assistant'; content: string }

type FormStatus = 'idle' | 'sending' | 'sent' | 'error'

const SUBJECTS = [
  { value: 'technique', label: 'Problème technique' },
  { value: 'paiement',  label: 'Paiement' },
  { value: 'compte',    label: 'Mon compte' },
  { value: 'autre',     label: 'Autre' },
]

// ─── Page ─────────────────────────────────────────────────────
export default function SupportPage() {
  const { data: session } = useSession()

  // Chat state
  const [messages,    setMessages]    = useState<ChatMessage[]>([])
  const [input,       setInput]       = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const formRef        = useRef<HTMLDivElement>(null)

  // Form state
  const [subject,      setSubject]      = useState('technique')
  const [message,      setMessage]      = useState('')
  const [contactEmail, setContactEmail] = useState(session?.user?.email ?? '')
  const [formStatus,   setFormStatus]   = useState<FormStatus>('idle')
  const [errorMsg,     setErrorMsg]     = useState('')

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Chat send ────────────────────────────────────────────────
  async function sendMessage(override?: string) {
    const text = (override ?? input).trim()
    if (!text || chatLoading) return

    const next: ChatMessage[] = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setInput('')
    setChatLoading(true)

    try {
      const res = await fetch('/api/freelancehub/support/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ messages: next }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.message }])

      if (data.escalate) {
        setSubject(data.subject ?? 'autre')
        setTimeout(() => {
          formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 400)
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Une erreur est survenue. Merci d\'utiliser le formulaire ci-dessous pour contacter notre équipe.',
      }])
    } finally {
      setChatLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // ── Form submit ──────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormStatus('sending')
    setErrorMsg('')
    try {
      const res = await fetch('/api/freelancehub/support', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ subject, message, contactEmail }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Erreur serveur')
      }
      setFormStatus('sent')
      setMessage('')
    } catch (err) {
      setFormStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Erreur inattendue')
    }
  }

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="fh-page">
      <header className="fh-page-header">
        <h1 className="fh-page-title">Support</h1>
        <p className="fh-page-sub">
          Posez votre question à notre assistant — il répond instantanément aux questions fréquentes.
        </p>
      </header>

      {/* ── Chat widget ── */}
      <div className="sup-card">
        <div className="chat-header">
          <span className="chat-avatar">FH</span>
          <div>
            <p className="chat-title">Assistant FreelanceHub</p>
            <p className="chat-subtitle">Répond instantanément · 24h/24</p>
          </div>
        </div>

        <div className="chat-messages">
          {messages.length === 0 && (
            <div className="chat-bubble assistant">
              Bonjour ! Je suis l&apos;assistant FreelanceHub. Comment puis-je vous aider ?
              <div className="chat-suggestions">
                {['Comment fonctionne le paiement ?', 'Quand sont libérés mes fonds ?', 'Comment soumettre mon KYC ?'].map(q => (
                  <button key={q} className="chat-chip" onClick={() => sendMessage(q)}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`chat-bubble ${m.role}`}>
              {m.content}
            </div>
          ))}
          {chatLoading && (
            <div className="chat-bubble assistant chat-typing">
              <span /><span /><span />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-row">
          <textarea
            className="chat-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Posez votre question… (Entrée pour envoyer)"
            rows={2}
            disabled={chatLoading}
            maxLength={1000}
          />
          <button
            className="chat-send"
            onClick={() => sendMessage()}
            disabled={chatLoading || !input.trim()}
            aria-label="Envoyer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="sup-divider" ref={formRef}>
        <span>Besoin d&apos;une réponse personnalisée ?</span>
      </div>

      {/* ── Email form ── */}
      <div className="sup-card">
        <p className="sup-form-intro">
          Notre équipe vous répond à <strong>contact@perform-learn.fr</strong> sous 24h ouvrées.
        </p>

        {formStatus === 'sent' ? (
          <div className="sup-success">
            <span className="sup-success-icon">✓</span>
            <div>
              <p className="sup-success-title">Message envoyé</p>
              <p className="sup-success-sub">
                Nous vous répondrons à <strong>{contactEmail}</strong> dans les meilleurs délais.
              </p>
            </div>
            <button className="sup-btn-ghost" onClick={() => setFormStatus('idle')}>
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
                rows={5}
                required
              />
            </div>

            {formStatus === 'error' && (
              <p className="sup-error">{errorMsg}</p>
            )}

            <button
              type="submit"
              className="sup-btn"
              disabled={formStatus === 'sending' || !message.trim()}
            >
              {formStatus === 'sending' ? 'Envoi…' : 'Envoyer au support'}
            </button>
          </form>
        )}
      </div>

      <style>{`
        .fh-page { display: flex; flex-direction: column; gap: 1.5rem; max-width: 640px; }
        .fh-page-header { display: flex; flex-direction: column; gap: .3rem; }
        .fh-page-title { font-family: 'Fraunces', serif; font-size: 1.7rem; font-weight: 700; color: var(--dark); }
        .fh-page-sub { color: var(--text-mid); font-size: .9rem; }

        .sup-card {
          background: var(--white);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 1.5rem;
        }

        /* ── Chat ── */
        .chat-header {
          display: flex; align-items: center; gap: .75rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--border);
          margin-bottom: 1rem;
        }
        .chat-avatar {
          width: 36px; height: 36px; min-width: 36px;
          background: var(--c1); color: #fff;
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: .75rem; font-weight: 700;
        }
        .chat-title    { font-size: .9rem; font-weight: 700; color: var(--dark); margin: 0; }
        .chat-subtitle { font-size: .75rem; color: var(--text-light); margin: 0; }

        .chat-messages {
          display: flex; flex-direction: column; gap: .6rem;
          min-height: 120px; max-height: 340px;
          overflow-y: auto;
          margin-bottom: 1rem;
          padding-right: .25rem;
        }

        .chat-bubble {
          max-width: 85%; padding: .65rem .9rem;
          border-radius: 12px; font-size: .88rem; line-height: 1.55;
          white-space: pre-wrap;
        }
        .chat-bubble.assistant {
          align-self: flex-start;
          background: var(--bg);
          border: 1px solid var(--border);
          color: var(--dark);
          border-bottom-left-radius: 4px;
        }
        .chat-bubble.user {
          align-self: flex-end;
          background: var(--c1);
          color: #fff;
          border-bottom-right-radius: 4px;
        }

        .chat-suggestions {
          display: flex; flex-wrap: wrap; gap: .4rem;
          margin-top: .6rem;
        }
        .chat-chip {
          font-size: .78rem; color: var(--c1);
          background: var(--c1-pale, #faf4f2);
          border: 1px solid var(--c1);
          border-radius: 20px; padding: .25em .75em;
          cursor: pointer; transition: background .12s, color .12s;
          text-align: left;
        }
        .chat-chip:hover { background: var(--c1); color: #fff; }

        .chat-typing {
          display: flex; align-items: center; gap: 5px;
          padding: .7rem 1rem;
        }
        .chat-typing span {
          width: 7px; height: 7px;
          background: var(--text-light);
          border-radius: 50%;
          animation: bounce 1.2s infinite;
        }
        .chat-typing span:nth-child(2) { animation-delay: .2s; }
        .chat-typing span:nth-child(3) { animation-delay: .4s; }
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30%            { transform: translateY(-5px); }
        }

        .chat-input-row {
          display: flex; gap: .5rem; align-items: flex-end;
        }
        .chat-input {
          flex: 1;
          font-size: .88rem; color: var(--dark);
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: .55rem .85rem;
          resize: none;
          font-family: inherit;
          transition: border-color .15s;
          line-height: 1.45;
        }
        .chat-input:focus { outline: none; border-color: var(--c1); }
        .chat-send {
          flex-shrink: 0;
          width: 38px; height: 38px;
          background: var(--c1); color: #fff;
          border: none; border-radius: 10px;
          cursor: pointer; display: flex;
          align-items: center; justify-content: center;
          transition: opacity .15s;
        }
        .chat-send:hover:not(:disabled) { opacity: .85; }
        .chat-send:disabled { opacity: .4; cursor: not-allowed; }

        /* ── Divider ── */
        .sup-divider {
          display: flex; align-items: center; gap: 1rem;
          color: var(--text-light); font-size: .82rem;
        }
        .sup-divider::before, .sup-divider::after {
          content: ''; flex: 1;
          border-top: 1px solid var(--border);
        }

        /* ── Form ── */
        .sup-form-intro { font-size: .85rem; color: var(--text-mid); margin: 0 0 1.1rem; }
        .sup-form { display: flex; flex-direction: column; gap: 1rem; }
        .sup-field { display: flex; flex-direction: column; gap: .35rem; }
        .sup-label {
          font-size: .82rem; font-weight: 600; color: var(--text-mid);
          display: flex; justify-content: space-between; align-items: center;
        }
        .sup-counter { font-weight: 400; color: var(--text-light); font-size: .78rem; }
        .sup-input, .sup-select, .sup-textarea {
          width: 100%; box-sizing: border-box;
          font-size: .92rem; color: var(--dark);
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 8px; padding: .6rem .85rem;
          transition: border-color .15s; font-family: inherit;
        }
        .sup-input:focus, .sup-select:focus, .sup-textarea:focus {
          outline: none; border-color: var(--c1);
        }
        .sup-textarea { resize: vertical; min-height: 100px; }

        .sup-btn {
          align-self: flex-start;
          background: var(--c1); color: #fff;
          font-size: .9rem; font-weight: 600;
          padding: .6em 1.6em; border: none; border-radius: 8px;
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

        .sup-success { display: flex; flex-direction: column; gap: .6rem; }
        .sup-success-icon {
          display: inline-flex; align-items: center; justify-content: center;
          width: 38px; height: 38px;
          background: #e8f7ee; color: #27ae60;
          border-radius: 50%; font-size: 1.1rem; font-weight: 700;
        }
        .sup-success-title { font-size: 1rem; font-weight: 700; color: var(--dark); margin: 0; }
        .sup-success-sub   { font-size: .88rem; color: var(--text-mid); margin: .2rem 0 0; }
      `}</style>
    </div>
  )
}
