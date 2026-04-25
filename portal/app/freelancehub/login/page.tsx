'use client'

import { Suspense, useState, FormEvent } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import ChatWidget from '@/components/freelancehub/ChatWidget'

function LoginForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl  = searchParams.get('callbackUrl') || '/freelancehub'

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError('Email ou mot de passe incorrect.')
      return
    }

    router.push(callbackUrl)
    router.refresh()
  }

  return (
    <div className="fh-login-page">
      <div className="fh-login-card">
        <div className="fh-login-brand">
          <span className="fh-logo-mark">FH</span>
          <span className="fh-logo-text">FreelanceHub</span>
        </div>
        <h1 className="fh-login-title">Connexion</h1>
        <p className="fh-login-sub">Connectez-vous à votre espace</p>

        <form onSubmit={handleSubmit} className="fh-login-form">
          <div className="fh-field">
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

          <div className="fh-field">
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

          {error && <p className="fh-login-error">{error}</p>}

          <button type="submit" className="fh-btn-primary" disabled={loading}>
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <p className="fh-login-register">
          Pas encore inscrit ?{' '}
          <a href="/freelancehub/register" className="fh-login-register-link">Rejoindre la plateforme</a>
        </p>

        {process.env.NEXT_PUBLIC_DEMO_MODE === 'true' && (
          <p className="fh-login-demo">
            Comptes démo&nbsp;: <code>consultant1@perform-learn.fr</code> · <code>client1@perform-learn.fr</code>
            <br /><code>admin@perform-learn.fr</code> — mot de passe&nbsp;: <code>demo1234</code>
          </p>
        )}
      </div>

      <style>{`
        .fh-login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg);
          padding: 1.5rem;
        }
        .fh-login-card {
          background: var(--white);
          border-radius: var(--radius);
          border: 1px solid var(--border);
          padding: 2.5rem 2rem;
          width: 100%;
          max-width: 400px;
          box-shadow: 0 4px 24px rgba(0,0,0,.06);
        }
        .fh-login-brand {
          display: flex;
          align-items: center;
          gap: .6rem;
          margin-bottom: 1.8rem;
        }
        .fh-logo-mark {
          width: 36px; height: 36px;
          background: var(--c1);
          color: #fff;
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: .85rem; letter-spacing: .05em;
        }
        .fh-logo-text {
          font-family: 'Fraunces', serif;
          font-weight: 700; font-size: 1.15rem;
          color: var(--dark);
        }
        .fh-login-title {
          font-family: 'Fraunces', serif;
          font-size: 1.6rem; font-weight: 700;
          color: var(--dark); margin-bottom: .3rem;
        }
        .fh-login-sub {
          color: var(--text-mid); font-size: .9rem; margin-bottom: 1.8rem;
        }
        .fh-login-form { display: flex; flex-direction: column; gap: 1rem; }
        .fh-field { display: flex; flex-direction: column; gap: .4rem; }
        .fh-field label { font-size: .85rem; font-weight: 500; color: var(--text); }
        .fh-field input {
          padding: .65rem .9rem;
          border: 1.5px solid var(--border);
          border-radius: var(--radius-sm);
          font-size: .95rem; color: var(--text);
          background: var(--white);
          outline: none; transition: border-color .15s;
        }
        .fh-field input:focus { border-color: var(--c1); }
        .fh-login-error {
          color: #c0392b; font-size: .85rem;
          background: #fdf0ef; border-radius: 6px;
          padding: .5rem .75rem;
        }
        .fh-btn-primary {
          padding: .75rem 1.2rem;
          background: var(--c1); color: #fff;
          border: none; border-radius: var(--radius-sm);
          font-size: .95rem; font-weight: 600;
          cursor: pointer; transition: background .15s;
          margin-top: .4rem;
        }
        .fh-btn-primary:hover:not(:disabled) { background: var(--c1-light); }
        .fh-btn-primary:disabled { opacity: .6; cursor: not-allowed; }
        .fh-login-demo {
          margin-top: 1.6rem; font-size: .78rem;
          color: var(--text-light); line-height: 1.7;
          border-top: 1px solid var(--border); padding-top: 1.2rem;
        }
        .fh-login-demo code {
          background: var(--bg); padding: .1em .35em;
          border-radius: 4px; font-size: .82rem;
        }
        .fh-login-register {
          text-align: center; font-size: .88rem;
          color: var(--text-mid); margin-top: .5rem;
        }
        .fh-login-register-link {
          color: var(--c1); font-weight: 600; text-decoration: none;
        }
        .fh-login-register-link:hover { text-decoration: underline; }
      `}</style>
    </div>
  )
}

export default function LoginPage() {
  return (
    <>
      <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Chargement…</div>}>
        <LoginForm />
      </Suspense>
      <ChatWidget />
    </>
  )
}
