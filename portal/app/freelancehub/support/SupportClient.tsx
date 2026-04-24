'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────
interface ChatMessage { role: 'user' | 'assistant'; content: string }

type FormStatus = 'idle' | 'sending' | 'sent' | 'error'

const SUBJECTS = [
  { value: 'technique', label: 'Problème technique' },
  { value: 'paiement',  label: 'Paiement' },
  { value: 'compte',    label: 'Mon compte' },
  { value: 'autre',     label: 'Autre' },
]

interface Props {
  isAuthenticated: boolean
  userEmail:       string
}

// ─── Client Component Support ─────────────────────────────────
// Accessible connecté ET non connecté.
// - Non connecté : chat via API publique + CTA inscription
// - Connecté     : chat via API protégée + formulaire email support
export default function SupportClient({ isAuthenticated, userEmail }: Props) {
  // Chat state
  const [messages,    setMessages]    = useState<ChatMessage[]>([])
  const [input,       setInput]       = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const formRef        = useRef<HTMLDivElement>(null)

  // Form state (utilisateurs connectés uniquement)
  const [subject,      setSubject]      = useState('technique')
  const [message,      setMessage]      = useState('')
  const [contactEmail, setContactEmail] = useState(userEmail)
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

    // Route vers l'API appropriée selon l'état de connexion
    const apiUrl = isAuthenticated
      ? '/api/freelancehub/support/chat'
      : '/api/freelancehub/support/chat/public'

    try {
      const res = await fetch(apiUrl, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ messages: next }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.message }])

      if (data.escalate && isAuthenticated) {
        setSubject(data.subject ?? 'autre')
        setTimeout(() => {
          formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 400)
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Une erreur est survenue. Merci de réessayer ou de nous contacter à contact@perform-learn.fr.',
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

  // ── Form submit (connectés uniquement) ───────────────────────
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
    <div className={isAuthenticated ? 'fh-page' : 'sup-pub-page'}>

      {/* ── Header minimal (non connecté uniquement) ── */}
      {!isAuthenticated && (
        <header className="sup-pub-header">
          <Link href="/freelancehub/login" className="sup-pub-brand">
            <span className="sup-pub-logo">FH</span>
            <span className="sup-pub-name">FreelanceHub</span>
          </Link>
        </header>
      )}

      {/* ── Contenu ── */}
      <div className={isAuthenticated ? '' : 'sup-pub-main'}>

        {/* ── Intro (selon état connexion) ── */}
        {isAuthenticated ? (
          <header className="fh-page-header">
            <h1 className="fh-page-title">Support</h1>
            <p className="fh-page-sub">
              Posez votre question à notre assistant — il répond instantanément aux questions fréquentes.
            </p>
          </header>
        ) : (
          <div className="sup-pub-intro">
            <h1 className="sup-pub-title">Comment pouvons-nous vous aider ?</h1>
            <p className="sup-pub-sub">
              Notre assistant répond instantanément à vos questions sur la plateforme — 24h/24.
            </p>
          </div>
        )}

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
                {isAuthenticated
                  ? 'Bonjour ! Je suis l’assistant FreelanceHub. Comment puis-je vous aider ?'
                  : 'Bonjour ! Je suis l’assistant FreelanceHub. Je peux vous présenter la plateforme et répondre à vos questions.'
                }
                <div className="chat-suggestions">
                  {(isAuthenticated
                    ? ['Comment fonctionne le paiement ?', 'Quand sont libérés mes fonds ?', 'Comment soumettre mon KYC ?']
                    : ['Comment fonctionne la plateforme ?', 'Je veux proposer mes services', 'Comment trouver un consultant ?', 'Comment fonctionne le paiement ?']
                  ).map(q => (
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

        {/* ── CTA non connecté ── */}
        {!isAuthenticated && (
          <>
            <div className="sup-pub-cta">
              <p className="sup-pub-cta-text">Prêt à rejoindre la plateforme ?</p>
              <div className="sup-pub-cta-buttons">
                <Link href="/freelancehub/login" className="sup-pub-btn-ghost">
                  Se connecter
                </Link>
                <Link href="/freelancehub/register" className="sup-pub-btn-primary">
                  Créer un compte
                </Link>
              </div>
            </div>
            <p className="sup-pub-email-note">
              Besoin d&apos;une réponse personnalisée ?{' '}
              <a href="mailto:contact@perform-learn.fr" className="sup-pub-link">
                contact@perform-learn.fr
              </a>
              {' '}— réponse sous 24h ouvrées.
            </p>
          </>
        )}

        {/* ── Formulaire email (connectés uniquement) ── */}
        {isAuthenticated && (
          <>
            <div className="sup-divider" ref={formRef}>
              <span>Besoin d&apos;une réponse personnalisée&nbsp;?</span>
            </div>

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
          </>
        )}
      </div>

      <style>{`
        /* ── Layout connecté ── */
        .fh-page { display: flex; flex-direction: column; gap: 1.5rem; max-width: 640px; }
        .fh-page-header { display: flex; flex-direction: column; gap: .3rem; }
        .fh-page-title { font-family: 'Fraunces', serif; font-size: 1.7rem; font-weight: 700; color: var(--dark); }
        .fh-page-sub { color: var(--text-mid); font-size: .9rem; }

        /* ── Layout non connecté ── */
        .sup-pub-page {
          min-height: 100vh;
          background: var(--bg, #f7f5f3);
          display: flex;
          flex-direction: column;
        }
        .sup-pub-header {
          height: 56px;
          background: var(--white, #fff);
          border-bottom: 1px solid var(--border, #e2deda);
          display: flex;
          align-items: center;
          padding: 0 1.5rem;
        }
        .sup-pub-brand {
          display: flex; align-items: center; gap: .55rem; text-decoration: none;
        }
        .sup-pub-logo {
          width: 32px; height: 32px;
          background: var(--c1, #B9958D); color: #fff;
          border-radius: 9px;
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: .8rem;
        }
        .sup-pub-name {
          font-family: 'Fraunces', serif;
          font-weight: 700; font-size: 1.05rem;
          color: var(--dark, #22201e);
        }
        .sup-pub-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
          padding: 2.5rem 1.5rem 3rem;
        }
        .sup-pub-intro { text-align: center; max-width: 540px; }
        .sup-pub-title {
          font-family: 'Fraunces', serif;
          font-size: 1.7rem; font-weight: 700;
          color: var(--dark, #22201e);
          margin: 0 0 .5rem;
        }
        .sup-pub-sub {
          color: var(--text-mid, #5c5956); font-size: .92rem; margin: 0; line-height: 1.55;
        }

        /* ── Chat card ── */
        .sup-card {
          background: var(--white, #fff);
          border: 1px solid var(--border, #e2deda);
          border-radius: var(--radius, 12px);
          padding: 1.5rem;
          width: 100%;
          max-width: 640px;
        }
        /* Mode connecté : pas de max-width supplémentaire (hérite de .fh-page) */
        .fh-page .sup-card { max-width: 100%; }

        .chat-header {
          display: flex; align-items: center; gap: .75rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--border, #e2deda);
          margin-bottom: 1rem;
        }
        .chat-avatar {
          width: 36px; height: 36px; min-width: 36px;
          background: var(--c1, #B9958D); color: #fff;
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: .75rem; font-weight: 700;
        }
        .chat-title    { font-size: .9rem; font-weight: 700; color: var(--dark, #22201e); margin: 0; }
        .chat-subtitle { font-size: .75rem; color: var(--text-light, #968e89); margin: 0; }

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
          background: var(--bg, #f7f5f3);
          border: 1px solid var(--border, #e2deda);
          color: var(--dark, #22201e);
          border-bottom-left-radius: 4px;
        }
        .chat-bubble.user {
          align-self: flex-end;
          background: var(--c1, #B9958D);
          color: #fff;
          border-bottom-right-radius: 4px;
        }

        .chat-suggestions {
          display: flex; flex-wrap: wrap; gap: .4rem;
          margin-top: .6rem;
        }
        .chat-chip {
          font-size: .78rem; color: var(--c1, #B9958D);
          background: var(--c1-pale, #faf4f2);
          border: 1px solid var(--c1, #B9958D);
          border-radius: 20px; padding: .25em .75em;
          cursor: pointer; transition: background .12s, color .12s;
          text-align: left;
        }
        .chat-chip:hover { background: var(--c1, #B9958D); color: #fff; }

        .chat-typing {
          display: flex; align-items: center; gap: 5px;
          padding: .7rem 1rem;
        }
        .chat-typing span {
          width: 7px; height: 7px;
          background: var(--text-light, #968e89);
          border-radius: 50%;
          animation: bounce 1.2s infinite;
        }
        .chat-typing span:nth-child(2) { animation-delay: .2s; }
        .chat-typing span:nth-child(3) { animation-delay: .4s; }
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30%            { transform: translateY(-5px); }
        }

        .chat-input-row { display: flex; gap: .5rem; align-items: flex-end; }
        .chat-input {
          flex: 1;
          font-size: .88rem; color: var(--dark, #22201e);
          background: var(--bg, #f7f5f3);
          border: 1px solid var(--border, #e2deda);
          border-radius: 10px;
          padding: .55rem .85rem;
          resize: none; font-family: inherit;
          transition: border-color .15s; line-height: 1.45;
        }
        .chat-input:focus { outline: none; border-color: var(--c1, #B9958D); }
        .chat-send {
          flex-shrink: 0;
          width: 38px; height: 38px;
          background: var(--c1, #B9958D); color: #fff;
          border: none; border-radius: 10px;
          cursor: pointer; display: flex;
          align-items: center; justify-content: center;
          transition: opacity .15s;
        }
        .chat-send:hover:not(:disabled) { opacity: .85; }
        .chat-send:disabled { opacity: .4; cursor: not-allowed; }

        /* ── CTA non connecté ── */
        .sup-pub-cta {
          display: flex; flex-direction: column;
          align-items: center; gap: .9rem;
          padding: 1.4rem 1.5rem;
          background: var(--white, #fff);
          border: 1px solid var(--border, #e2deda);
          border-radius: var(--radius, 12px);
          width: 100%; max-width: 640px;
        }
        .sup-pub-cta-text {
          font-size: .95rem; font-weight: 600;
          color: var(--dark, #22201e); margin: 0;
        }
        .sup-pub-cta-buttons {
          display: flex; gap: .75rem; flex-wrap: wrap; justify-content: center;
        }
        .sup-pub-btn-primary {
          display: inline-flex; align-items: center;
          padding: .6em 1.6em;
          background: var(--c1, #B9958D); color: #fff;
          font-size: .92rem; font-weight: 600;
          border-radius: 8px; text-decoration: none; transition: opacity .15s;
        }
        .sup-pub-btn-primary:hover { opacity: .88; }
        .sup-pub-btn-ghost {
          display: inline-flex; align-items: center;
          padding: .6em 1.6em;
          background: none; color: var(--c1, #B9958D);
          font-size: .92rem; font-weight: 600;
          border: 1.5px solid var(--c1, #B9958D);
          border-radius: 8px; text-decoration: none;
          transition: background .12s, color .12s;
        }
        .sup-pub-btn-ghost:hover { background: var(--c1, #B9958D); color: #fff; }
        .sup-pub-email-note {
          font-size: .84rem; color: var(--text-mid, #5c5956); text-align: center; margin: 0;
        }
        .sup-pub-link {
          color: var(--c1, #B9958D); font-weight: 600; text-decoration: none;
        }
        .sup-pub-link:hover { text-decoration: underline; }

        /* ── Divider (connecté) ── */
        .sup-divider {
          display: flex; align-items: center; gap: 1rem;
          color: var(--text-light, #968e89); font-size: .82rem;
        }
        .sup-divider::before, .sup-divider::after {
          content: ''; flex: 1;
          border-top: 1px solid var(--border, #e2deda);
        }

        /* ── Form (connecté) ── */
        .sup-form-intro { font-size: .85rem; color: var(--text-mid, #5c5956); margin: 0 0 1.1rem; }
        .sup-form { display: flex; flex-direction: column; gap: 1rem; }
        .sup-field { display: flex; flex-direction: column; gap: .35rem; }
        .sup-label {
          font-size: .82rem; font-weight: 600; color: var(--text-mid, #5c5956);
          display: flex; justify-content: space-between; align-items: center;
        }
        .sup-counter { font-weight: 400; color: var(--text-light, #968e89); font-size: .78rem; }
        .sup-input, .sup-select, .sup-textarea {
          width: 100%; box-sizing: border-box;
          font-size: .92rem; color: var(--dark, #22201e);
          background: var(--bg, #f7f5f3);
          border: 1px solid var(--border, #e2deda);
          border-radius: 8px; padding: .6rem .85rem;
          transition: border-color .15s; font-family: inherit;
        }
        .sup-input:focus, .sup-select:focus, .sup-textarea:focus {
          outline: none; border-color: var(--c1, #B9958D);
        }
        .sup-textarea { resize: vertical; min-height: 100px; }

        .sup-btn {
          align-self: flex-start;
          background: var(--c1, #B9958D); color: #fff;
          font-size: .9rem; font-weight: 600;
          padding: .6em 1.6em; border: none; border-radius: 8px;
          cursor: pointer; transition: opacity .15s;
        }
        .sup-btn:hover:not(:disabled) { opacity: .88; }
        .sup-btn:disabled { opacity: .5; cursor: not-allowed; }

        .sup-btn-ghost {
          align-self: flex-start;
          background: none; color: var(--c1, #B9958D);
          font-size: .85rem; font-weight: 600;
          padding: .4em .9em;
          border: 1px solid var(--c1, #B9958D); border-radius: 6px;
          cursor: pointer; transition: background .12s, color .12s;
          margin-top: .5rem;
        }
        .sup-btn-ghost:hover { background: var(--c1, #B9958D); color: #fff; }

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
        .sup-success-title { font-size: 1rem; font-weight: 700; color: var(--dark, #22201e); margin: 0; }
        .sup-success-sub   { font-size: .88rem; color: var(--text-mid, #5c5956); margin: .2rem 0 0; }
      `}</style>
    </div>
  )
}
