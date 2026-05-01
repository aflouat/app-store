'use client'

import { useState, FormEvent, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function ResetForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const token        = searchParams.get('token') ?? ''

  const [password,  setPassword]  = useState('')
  const [password2, setPassword2] = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (password !== password2) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }
    setLoading(true)
    setError('')

    const res = await fetch('/api/freelancehub/auth/reset-password', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ token, password }),
    })

    setLoading(false)

    if (res.ok) {
      router.push('/freelancehub/login?reset=1')
    } else {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Erreur lors de la réinitialisation.')
    }
  }

  if (!token) {
    return (
      <div className="rp-error-state">
        <p>Lien invalide ou manquant.</p>
        <a href="/freelancehub/forgot-password">Faire une nouvelle demande →</a>
      </div>
    )
  }

  return (
    <>
      <p className="rp-sub">Choisissez un nouveau mot de passe (8 caractères min.)</p>
      <form onSubmit={handleSubmit} className="rp-form">
        <div className="rp-field">
          <label htmlFor="password">Nouveau mot de passe</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            minLength={8}
            autoFocus
          />
        </div>
        <div className="rp-field">
          <label htmlFor="password2">Confirmer le mot de passe</label>
          <input
            id="password2"
            type="password"
            value={password2}
            onChange={e => setPassword2(e.target.value)}
            placeholder="••••••••"
            required
            minLength={8}
          />
        </div>
        {error && <p className="rp-error">{error}</p>}
        <button type="submit" className="rp-btn" disabled={loading}>
          {loading ? 'Enregistrement…' : 'Enregistrer le nouveau mot de passe'}
        </button>
      </form>
    </>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="rp-page">
      <div className="rp-card">
        <div className="rp-brand">
          <span className="rp-logo-mark">FH</span>
          <span className="rp-logo-text">FreelanceHub</span>
        </div>
        <h1 className="rp-title">Nouveau mot de passe</h1>
        <Suspense fallback={<p style={{ color: 'var(--text-light)', fontSize: '.9rem' }}>Chargement…</p>}>
          <ResetForm />
        </Suspense>
        <a href="/freelancehub/login" className="rp-back">← Retour à la connexion</a>
      </div>

      <style>{`
        .rp-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--bg); padding: 1.5rem; }
        .rp-card { background: var(--white); border-radius: var(--radius); border: 1px solid var(--border); padding: 2.5rem 2rem; width: 100%; max-width: 400px; box-shadow: 0 4px 24px rgba(0,0,0,.06); display: flex; flex-direction: column; gap: 1rem; }
        .rp-brand { display: flex; align-items: center; gap: .6rem; }
        .rp-logo-mark { width: 36px; height: 36px; background: var(--c1); color: #fff; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: .85rem; }
        .rp-logo-text { font-family: 'Fraunces', serif; font-weight: 700; font-size: 1.15rem; color: var(--dark); }
        .rp-title { font-family: 'Fraunces', serif; font-size: 1.6rem; font-weight: 700; color: var(--dark); }
        .rp-sub { color: var(--text-mid); font-size: .9rem; }
        .rp-form { display: flex; flex-direction: column; gap: 1rem; }
        .rp-field { display: flex; flex-direction: column; gap: .4rem; }
        .rp-field label { font-size: .85rem; font-weight: 500; color: var(--text); }
        .rp-field input { padding: .65rem .9rem; border: 1.5px solid var(--border); border-radius: var(--radius-sm); font-size: .95rem; color: var(--text); background: var(--white); outline: none; transition: border-color .15s; }
        .rp-field input:focus { border-color: var(--c1); }
        .rp-error { color: #c0392b; font-size: .85rem; background: #fdf0ef; padding: .5rem .75rem; border-radius: 6px; }
        .rp-btn { padding: .75rem 1.2rem; background: var(--c1); color: #fff; border: none; border-radius: var(--radius-sm); font-size: .95rem; font-weight: 600; cursor: pointer; transition: background .15s; }
        .rp-btn:hover:not(:disabled) { background: var(--c1-light); }
        .rp-btn:disabled { opacity: .6; cursor: not-allowed; }
        .rp-back { font-size: .88rem; color: var(--c1); text-decoration: none; text-align: center; }
        .rp-back:hover { text-decoration: underline; }
        .rp-error-state { display: flex; flex-direction: column; gap: .6rem; }
        .rp-error-state p { color: var(--text-mid); font-size: .9rem; }
        .rp-error-state a { color: var(--c1); font-size: .88rem; }
      `}</style>
    </div>
  )
}
