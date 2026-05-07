'use client'
import { signIn } from 'next-auth/react'
import { useState, FormEvent, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function LoginForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl  = searchParams.get('callbackUrl') || '/'

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await signIn('credentials', { email, password, redirect: false })
    setLoading(false)

    if (result?.error) {
      setError('Email ou mot de passe incorrect.')
      return
    }

    router.push(callbackUrl)
    router.refresh()
  }

  return (
    <div className="sa-login-page">
      <div className="sa-login-card">
        <div className="sa-login-brand">
          <span className="sa-logo-mark">SA</span>
          <span className="sa-logo-text">SantéApp</span>
        </div>

        <h1 className="sa-login-title">Connexion</h1>
        <p className="sa-login-sub">Accédez à votre espace santé sécurisé.</p>

        <form onSubmit={handleSubmit} className="sa-login-form">
          <div className="sa-field">
            <label htmlFor="email">Adresse e-mail</label>
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

          <div className="sa-field">
            <label htmlFor="password">Mot de passe</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && <p className="sa-login-error" role="alert">{error}</p>}

          <button type="submit" className="sa-btn-primary" disabled={loading}>
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <p className="sa-login-register">
          Pas encore de compte ?{' '}
          <a href="/register" className="sa-login-register-link">Créer un compte</a>
        </p>
      </div>

      <style>{`
        .sa-login-page {
          min-height: 100vh;
          display: flex; align-items: center; justify-content: center;
          background: var(--bg); padding: 1.5rem;
        }
        .sa-login-card {
          background: var(--white);
          border-radius: var(--radius);
          border: 1px solid var(--border);
          padding: 2.5rem 2rem;
          width: 100%; max-width: 400px;
          box-shadow: 0 4px 24px rgba(0,0,0,.06);
        }
        .sa-login-brand {
          display: flex; align-items: center; gap: .6rem; margin-bottom: 1.8rem;
        }
        .sa-logo-mark {
          width: 36px; height: 36px; background: var(--c1); color: #fff;
          border-radius: 10px; display: flex; align-items: center;
          justify-content: center; font-weight: 700; font-size: .85rem;
        }
        .sa-logo-text {
          font-family: 'Fraunces', serif; font-weight: 700;
          font-size: 1.15rem; color: var(--dark);
        }
        .sa-login-title {
          font-family: 'Fraunces', serif; font-size: 1.6rem;
          font-weight: 700; color: var(--dark); margin-bottom: .3rem;
        }
        .sa-login-sub { color: var(--text-mid); font-size: .9rem; margin-bottom: 1.8rem; }
        .sa-login-form { display: flex; flex-direction: column; gap: 1rem; }
        .sa-field { display: flex; flex-direction: column; gap: .4rem; }
        .sa-field label { font-size: .85rem; font-weight: 500; color: var(--text); }
        .sa-field input {
          padding: .65rem .9rem;
          border: 1.5px solid var(--border);
          border-radius: var(--radius-sm);
          font-size: .95rem; color: var(--text); background: var(--white);
          outline: none; transition: border-color .15s;
        }
        .sa-field input:focus { border-color: var(--c1); }
        .sa-login-error {
          color: #c0392b; font-size: .85rem;
          background: #fdf0ef; border-radius: 6px; padding: .5rem .75rem;
        }
        .sa-btn-primary {
          padding: .75rem 1.2rem; background: var(--c1); color: #fff;
          border: none; border-radius: var(--radius-sm);
          font-size: .95rem; font-weight: 600; cursor: pointer;
          transition: background .15s; margin-top: .4rem;
        }
        .sa-btn-primary:hover:not(:disabled) { background: var(--c1-light); }
        .sa-btn-primary:disabled { opacity: .6; cursor: not-allowed; }
        .sa-login-register {
          text-align: center; font-size: .88rem;
          color: var(--text-mid); margin-top: 1.2rem;
        }
        .sa-login-register-link {
          color: var(--c1); font-weight: 600; text-decoration: none;
        }
        .sa-login-register-link:hover { text-decoration: underline; }
      `}</style>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>…</div>}>
      <LoginForm />
    </Suspense>
  )
}
