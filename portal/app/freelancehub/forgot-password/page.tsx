'use client'

import { useState, FormEvent } from 'react'

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/freelancehub/auth/forgot-password', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email }),
    })

    setLoading(false)
    if (res.ok) {
      setSent(true)
    } else {
      setError('Une erreur est survenue. Réessayez.')
    }
  }

  return (
    <div className="fp-page">
      <div className="fp-card">
        <div className="fp-brand">
          <span className="fp-logo-mark">FH</span>
          <span className="fp-logo-text">FreelanceHub</span>
        </div>
        <h1 className="fp-title">Mot de passe oublié</h1>

        {sent ? (
          <div className="fp-success">
            <p>Si un compte existe pour <strong>{email}</strong>, vous recevrez un email dans quelques minutes.</p>
            <p className="fp-hint">Vérifiez vos spams si vous ne le recevez pas.</p>
            <a href="/freelancehub/login" className="fp-back">← Retour à la connexion</a>
          </div>
        ) : (
          <>
            <p className="fp-sub">Saisissez votre email pour recevoir un lien de réinitialisation.</p>
            <form onSubmit={handleSubmit} className="fp-form">
              <div className="fp-field">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="vous@exemple.fr"
                  required
                  autoFocus
                />
              </div>
              {error && <p className="fp-error">{error}</p>}
              <button type="submit" className="fp-btn" disabled={loading}>
                {loading ? 'Envoi…' : 'Envoyer le lien de réinitialisation'}
              </button>
            </form>
            <a href="/freelancehub/login" className="fp-back">← Retour à la connexion</a>
          </>
        )}
      </div>

      <style>{`
        .fp-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--bg); padding: 1.5rem; }
        .fp-card { background: var(--white); border-radius: var(--radius); border: 1px solid var(--border); padding: 2.5rem 2rem; width: 100%; max-width: 400px; box-shadow: 0 4px 24px rgba(0,0,0,.06); display: flex; flex-direction: column; gap: 1rem; }
        .fp-brand { display: flex; align-items: center; gap: .6rem; }
        .fp-logo-mark { width: 36px; height: 36px; background: var(--c1); color: #fff; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: .85rem; }
        .fp-logo-text { font-family: 'Fraunces', serif; font-weight: 700; font-size: 1.15rem; color: var(--dark); }
        .fp-title { font-family: 'Fraunces', serif; font-size: 1.6rem; font-weight: 700; color: var(--dark); }
        .fp-sub { color: var(--text-mid); font-size: .9rem; }
        .fp-form { display: flex; flex-direction: column; gap: 1rem; }
        .fp-field { display: flex; flex-direction: column; gap: .4rem; }
        .fp-field label { font-size: .85rem; font-weight: 500; color: var(--text); }
        .fp-field input { padding: .65rem .9rem; border: 1.5px solid var(--border); border-radius: var(--radius-sm); font-size: .95rem; color: var(--text); background: var(--white); outline: none; transition: border-color .15s; }
        .fp-field input:focus { border-color: var(--c1); }
        .fp-error { color: #c0392b; font-size: .85rem; background: #fdf0ef; padding: .5rem .75rem; border-radius: 6px; }
        .fp-btn { padding: .75rem 1.2rem; background: var(--c1); color: #fff; border: none; border-radius: var(--radius-sm); font-size: .95rem; font-weight: 600; cursor: pointer; transition: background .15s; }
        .fp-btn:hover:not(:disabled) { background: var(--c1-light); }
        .fp-btn:disabled { opacity: .6; cursor: not-allowed; }
        .fp-back { font-size: .88rem; color: var(--c1); text-decoration: none; text-align: center; }
        .fp-back:hover { text-decoration: underline; }
        .fp-success { display: flex; flex-direction: column; gap: .8rem; }
        .fp-success p { font-size: .92rem; color: var(--text); line-height: 1.6; }
        .fp-hint { color: var(--text-light) !important; font-size: .82rem !important; }
      `}</style>
    </div>
  )
}
