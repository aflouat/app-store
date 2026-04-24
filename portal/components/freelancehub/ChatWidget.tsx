'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'

interface Message { role: 'user' | 'assistant'; content: string }
interface Props { userEmail?: string }

const CHIPS = [
  'Comment fonctionne la plateforme ?',
  'Comment réserver un consultant ?',
  'Quand reçois-je mon paiement ?',
]

export default function ChatWidget({ userEmail = '' }: Props) {
  const [open,    setOpen]    = useState(false)
  const [msgs,    setMsgs]    = useState<Message[]>([])
  const [input,   setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const [escalated, setEscalated] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs, loading])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  async function send(text?: string) {
    const content = (text ?? input).trim()
    if (!content || loading) return
    setInput('')

    const next: Message[] = [...msgs, { role: 'user', content }]
    setMsgs(next)
    setLoading(true)

    try {
      const res  = await fetch('/api/freelancehub/support/chat/public', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ messages: next }),
      })
      const data = await res.json()
      setMsgs(prev => [...prev, { role: 'assistant', content: data.message ?? 'Erreur inattendue.' }])
      if (data.escalate) setEscalated(true)
    } catch {
      setMsgs(prev => [...prev, { role: 'assistant', content: 'Une erreur est survenue. Réessayez ou écrivez-nous à contact@perform-learn.fr.' }])
    } finally {
      setLoading(false)
    }
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <>
      {/* ── Panel ── */}
      {open && (
        <div className="cw-panel">
          {/* Header */}
          <div className="cw-header">
            <div className="cw-header-left">
              <div className="cw-avatar">FH</div>
              <div>
                <div className="cw-agent-name">Assistant FreelanceHub</div>
                <div className="cw-status"><span className="cw-dot" />En ligne</div>
              </div>
            </div>
            <button className="cw-close" onClick={() => setOpen(false)} aria-label="Fermer">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="cw-messages">
            {/* Message de bienvenue */}
            <div className="cw-msg cw-msg-bot">
              <div className="cw-bubble cw-bubble-bot">
                Bonjour ! Je suis votre assistant FreelanceHub. Comment puis-je vous aider ?
                {msgs.length === 0 && (
                  <div className="cw-chips">
                    {CHIPS.map(q => (
                      <button key={q} className="cw-chip" onClick={() => send(q)}>{q}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {msgs.map((m, i) => (
              <div key={i} className={`cw-msg ${m.role === 'user' ? 'cw-msg-user' : 'cw-msg-bot'}`}>
                <div className={`cw-bubble ${m.role === 'user' ? 'cw-bubble-user' : 'cw-bubble-bot'}`}>
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="cw-msg cw-msg-bot">
                <div className="cw-bubble cw-bubble-bot cw-typing">
                  <span /><span /><span />
                </div>
              </div>
            )}

            {/* Escalade */}
            {escalated && (
              <div className="cw-escalade">
                <p className="cw-escalade-text">Besoin d&apos;une aide personnalisée ?</p>
                {userEmail ? (
                  <Link href="/freelancehub/support" className="cw-escalade-btn" onClick={() => setOpen(false)}>
                    Contacter le support →
                  </Link>
                ) : (
                  <div className="cw-escalade-actions">
                    <Link href="/freelancehub/login"    className="cw-escalade-ghost">Se connecter</Link>
                    <Link href="/freelancehub/register" className="cw-escalade-btn">Créer un compte</Link>
                  </div>
                )}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="cw-footer">
            <textarea
              ref={inputRef}
              className="cw-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder="Écrivez votre message…"
              rows={1}
              maxLength={1000}
              disabled={loading}
            />
            <button className="cw-send" onClick={() => send()} disabled={loading || !input.trim()} aria-label="Envoyer">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>

          <div className="cw-powered">Propulsé par FreelanceHub IA</div>
        </div>
      )}

      {/* ── Bubble ── */}
      <button className="cw-bubble-btn" onClick={() => setOpen(o => !o)} aria-label="Support">
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        )}
      </button>

      <style>{`
        /* ── Bulle ── */
        .cw-bubble-btn {
          position: fixed;
          bottom: 24px; right: 24px;
          width: 54px; height: 54px;
          border-radius: 50%;
          background: linear-gradient(135deg, #B9958D, #96AEAA);
          color: #fff;
          border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 20px rgba(0,0,0,.18);
          z-index: 9999;
          transition: transform .15s, box-shadow .15s;
        }
        .cw-bubble-btn:hover {
          transform: scale(1.07);
          box-shadow: 0 6px 24px rgba(0,0,0,.24);
        }

        /* ── Panel ── */
        .cw-panel {
          position: fixed;
          bottom: 90px; right: 24px;
          width: 360px;
          max-height: 540px;
          border-radius: 16px;
          background: #fff;
          box-shadow: 0 8px 40px rgba(0,0,0,.18), 0 2px 8px rgba(0,0,0,.08);
          display: flex; flex-direction: column;
          z-index: 9998;
          overflow: hidden;
          animation: cw-slide-up .22s ease;
        }
        @keyframes cw-slide-up {
          from { opacity: 0; transform: translateY(16px) scale(.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @media (max-width: 420px) {
          .cw-panel { width: calc(100vw - 24px); right: 12px; bottom: 80px; }
          .cw-bubble-btn { bottom: 16px; right: 16px; }
        }

        /* ── Header ── */
        .cw-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 1rem 1.1rem;
          background: linear-gradient(135deg, #B9958D 0%, #96AEAA 100%);
          color: #fff;
          flex-shrink: 0;
        }
        .cw-header-left { display: flex; align-items: center; gap: .7rem; }
        .cw-avatar {
          width: 38px; height: 38px; border-radius: 50%;
          background: rgba(255,255,255,.25);
          display: flex; align-items: center; justify-content: center;
          font-size: .78rem; font-weight: 800; letter-spacing: .03em;
        }
        .cw-agent-name { font-size: .9rem; font-weight: 700; line-height: 1.2; }
        .cw-status {
          display: flex; align-items: center; gap: .3rem;
          font-size: .72rem; opacity: .88; margin-top: .1rem;
        }
        .cw-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: #4ade80; display: inline-block;
        }
        .cw-close {
          background: rgba(255,255,255,.18);
          border: none; border-radius: 8px;
          width: 30px; height: 30px;
          display: flex; align-items: center; justify-content: center;
          color: #fff; cursor: pointer;
          transition: background .12s;
          flex-shrink: 0;
        }
        .cw-close:hover { background: rgba(255,255,255,.3); }

        /* ── Messages ── */
        .cw-messages {
          flex: 1; overflow-y: auto;
          padding: 1rem .9rem;
          display: flex; flex-direction: column; gap: .55rem;
          background: #f7f5f3;
        }
        .cw-msg { display: flex; }
        .cw-msg-bot  { justify-content: flex-start; }
        .cw-msg-user { justify-content: flex-end; }

        .cw-bubble {
          max-width: 82%;
          padding: .6rem .85rem;
          border-radius: 14px;
          font-size: .855rem; line-height: 1.55;
          white-space: pre-wrap; word-break: break-word;
        }
        .cw-bubble-bot {
          background: #fff;
          color: #22201e;
          border-radius: 14px 14px 14px 4px;
          box-shadow: 0 1px 3px rgba(0,0,0,.07);
        }
        .cw-bubble-user {
          background: linear-gradient(135deg, #B9958D, #96AEAA);
          color: #fff;
          border-radius: 14px 14px 4px 14px;
        }

        /* Chips */
        .cw-chips {
          display: flex; flex-direction: column; gap: .35rem;
          margin-top: .65rem;
        }
        .cw-chip {
          text-align: left;
          background: #f7f5f3; color: #B9958D;
          border: 1px solid #B9958D;
          border-radius: 20px; padding: .3em .85em;
          font-size: .78rem; cursor: pointer;
          transition: background .12s, color .12s;
        }
        .cw-chip:hover { background: #B9958D; color: #fff; }

        /* Typing */
        .cw-typing {
          display: flex; align-items: center; gap: 5px;
          padding: .55rem .85rem !important;
        }
        .cw-typing span {
          width: 7px; height: 7px; border-radius: 50%;
          background: #B9958D; opacity: .6;
          animation: cw-bounce 1.2s infinite;
        }
        .cw-typing span:nth-child(2) { animation-delay: .18s; }
        .cw-typing span:nth-child(3) { animation-delay: .36s; }
        @keyframes cw-bounce {
          0%,60%,100% { transform: translateY(0); }
          30%          { transform: translateY(-5px); }
        }

        /* Escalade */
        .cw-escalade {
          background: #fff; border-radius: 12px;
          padding: .9rem 1rem;
          box-shadow: 0 1px 3px rgba(0,0,0,.07);
          display: flex; flex-direction: column; gap: .6rem;
          align-self: stretch;
        }
        .cw-escalade-text {
          font-size: .82rem; font-weight: 600;
          color: #22201e; margin: 0;
        }
        .cw-escalade-actions { display: flex; gap: .5rem; flex-wrap: wrap; }
        .cw-escalade-btn {
          display: inline-flex; align-items: center;
          padding: .4em 1.1em;
          background: linear-gradient(135deg, #B9958D, #96AEAA);
          color: #fff; font-size: .82rem; font-weight: 600;
          border-radius: 8px; text-decoration: none;
          transition: opacity .12s;
        }
        .cw-escalade-btn:hover { opacity: .88; }
        .cw-escalade-ghost {
          display: inline-flex; align-items: center;
          padding: .4em 1.1em;
          background: none; color: #B9958D;
          font-size: .82rem; font-weight: 600;
          border: 1.5px solid #B9958D; border-radius: 8px;
          text-decoration: none; transition: background .12s, color .12s;
        }
        .cw-escalade-ghost:hover { background: #B9958D; color: #fff; }

        /* ── Footer / Input ── */
        .cw-footer {
          display: flex; align-items: flex-end; gap: .5rem;
          padding: .75rem .9rem;
          border-top: 1px solid #e2deda;
          background: #fff;
          flex-shrink: 0;
        }
        .cw-input {
          flex: 1; resize: none; overflow: hidden;
          border: 1.5px solid #e2deda; border-radius: 10px;
          padding: .5rem .75rem;
          font-size: .875rem; font-family: inherit;
          color: #22201e; background: #f7f5f3;
          line-height: 1.4; max-height: 100px; overflow-y: auto;
          transition: border-color .15s;
        }
        .cw-input:focus { outline: none; border-color: #B9958D; background: #fff; }
        .cw-send {
          flex-shrink: 0;
          width: 36px; height: 36px;
          background: linear-gradient(135deg, #B9958D, #96AEAA);
          color: #fff; border: none; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: opacity .15s;
        }
        .cw-send:hover:not(:disabled) { opacity: .85; }
        .cw-send:disabled { opacity: .35; cursor: not-allowed; }

        /* ── Powered by ── */
        .cw-powered {
          text-align: center; font-size: .7rem;
          color: #aaa; padding: .4rem;
          background: #fff; border-top: 1px solid #f0eeec;
          flex-shrink: 0;
        }
      `}</style>
    </>
  )
}
