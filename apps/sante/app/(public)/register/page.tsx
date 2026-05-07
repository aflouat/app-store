'use client'
import { useState, FormEvent } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

type Role = 'patient' | 'doctor' | null

export default function RegisterPage() {
  const router = useRouter()
  const [role,     setRole]     = useState<Role>(null)
  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!role) return
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/register', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name, email, password, role }),
    })

    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Une erreur est survenue. Réessayez.')
      setLoading(false)
      return
    }

    const result = await signIn('credentials', { email, password, redirect: false })
    setLoading(false)

    if (result?.error) {
      router.push('/login')
      return
    }

    router.push(role === 'doctor' ? '/doctor/dashboard' : '/patient/dashboard')
    router.refresh()
  }

  return (
    <div className="sa-reg-page">
      <div className="sa-reg-inner">
        <div className="sa-reg-brand">
          <span className="sa-logo-mark">SA</span>
          <span className="sa-logo-text">SantéApp</span>
        </div>

        <h1 className="sa-reg-title">Créer un compte</h1>
        <p className="sa-reg-sub">Rejoignez SantéApp — gratuit, sans engagement.</p>

        <div className="sa-reg-panels">
          <div
            className={`sa-reg-panel${role === 'patient' ? ' sa-reg-panel--active' : ''}`}
            onClick={() => { setRole('patient'); setError('') }}
          >
            <div className="sa-reg-panel-icon">🧑‍⚕️</div>
            <h2 className="sa-reg-panel-title">Je suis patient</h2>
            <p className="sa-reg-panel-desc">Prenez rendez-vous avec un médecin</p>
            <ul className="sa-reg-panel-list">
              <li>Agenda en temps réel</li>
              <li>Rappels automatiques</li>
              <li>Historique des consultations</li>
            </ul>
            <span className={`sa-reg-panel-btn${role === 'patient' ? ' active' : ''}`}>
              {role === 'patient' ? '✓ Sélectionné' : 'Choisir'}
            </span>
          </div>

          <div
            className={`sa-reg-panel${role === 'doctor' ? ' sa-reg-panel--active' : ''}`}
            onClick={() => { setRole('doctor'); setError('') }}
          >
            <div className="sa-reg-panel-icon">🩺</div>
            <h2 className="sa-reg-panel-title">Je suis médecin</h2>
            <p className="sa-reg-panel-desc">Gérez votre cabinet en ligne</p>
            <ul className="sa-reg-panel-list">
              <li>Agenda patients centralisé</li>
              <li>Vérification RPPS</li>
              <li>Zéro double réservation</li>
            </ul>
            <span className={`sa-reg-panel-btn${role === 'doctor' ? ' active' : ''}`}>
              {role === 'doctor' ? '✓ Sélectionné' : 'Choisir'}
            </span>
          </div>
        </div>

        {role && (
          <form onSubmit={handleSubmit} className="sa-reg-form">
            <h3 className="sa-reg-form-title">
              {role === 'doctor' ? 'Informations médecin' : 'Informations patient'}
            </h3>

            <div className="sa-field">
              <label htmlFor="name">Nom complet</label>
              <input
                id="name" type="text" value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Dr Marie Dupont" autoFocus
              />
            </div>

            <div className="sa-field">
              <label htmlFor="email">Adresse e-mail <span className="req">*</span></label>
              <input
                id="email" type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="vous@exemple.fr" required
              />
            </div>

            <div className="sa-field">
              <label htmlFor="password">
                Mot de passe <span className="req">*</span>{' '}
                <span className="sa-hint">8 caractères minimum</span>
              </label>
              <input
                id="password" type="password" value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required minLength={8}
              />
            </div>

            {error && <p className="sa-reg-error">{error}</p>}

            <button type="submit" className="sa-btn-primary" disabled={loading}>
              {loading ? 'Création…' : 'Créer mon compte'}
            </button>
          </form>
        )}

        <p className="sa-reg-login-link">
          Déjà inscrit ?{' '}
          <a href="/login">Se connecter</a>
        </p>
      </div>

      <style>{`
        .sa-reg-page {
          min-height: 100vh; background: var(--bg);
          display: flex; align-items: flex-start; justify-content: center;
          padding: 2.5rem 1rem 4rem;
        }
        .sa-reg-inner {
          width: 100%; max-width: 740px;
          display: flex; flex-direction: column; gap: 1.8rem;
        }
        .sa-reg-brand { display: flex; align-items: center; gap: .6rem; }
        .sa-logo-mark {
          width: 36px; height: 36px; background: var(--c1); color: #fff;
          border-radius: 10px; display: flex; align-items: center;
          justify-content: center; font-weight: 700; font-size: .85rem;
        }
        .sa-logo-text {
          font-family: 'Fraunces', serif; font-weight: 700;
          font-size: 1.15rem; color: var(--dark);
        }
        .sa-reg-title {
          font-family: 'Fraunces', serif; font-size: 2rem;
          font-weight: 700; color: var(--dark);
        }
        .sa-reg-sub { color: var(--text-mid); font-size: .95rem; margin-top: -.8rem; }
        .sa-reg-panels {
          display: grid; grid-template-columns: 1fr 1fr; gap: 1.2rem;
        }
        @media (max-width: 560px) { .sa-reg-panels { grid-template-columns: 1fr; } }
        .sa-reg-panel {
          background: var(--white); border: 2px solid var(--border);
          border-radius: var(--radius); padding: 1.6rem; cursor: pointer;
          display: flex; flex-direction: column; gap: .7rem;
          transition: border-color .15s, box-shadow .15s;
        }
        .sa-reg-panel:hover { border-color: var(--c1); box-shadow: 0 4px 16px rgba(0,0,0,.07); }
        .sa-reg-panel--active {
          border-color: var(--c1); background: var(--c1-pale);
          box-shadow: 0 4px 16px rgba(59,130,196,.12);
        }
        .sa-reg-panel-icon { font-size: 2rem; }
        .sa-reg-panel-title {
          font-family: 'Fraunces', serif; font-size: 1.1rem;
          font-weight: 700; color: var(--dark);
        }
        .sa-reg-panel-desc { font-size: .88rem; color: var(--text-mid); }
        .sa-reg-panel-list {
          list-style: none; padding: 0; margin: 0;
          display: flex; flex-direction: column; gap: .3rem;
        }
        .sa-reg-panel-list li {
          font-size: .84rem; color: var(--text-mid);
          padding-left: 1.2rem; position: relative;
        }
        .sa-reg-panel-list li::before {
          content: '✓'; position: absolute; left: 0;
          color: var(--c3); font-weight: 700; font-size: .78rem;
        }
        .sa-reg-panel-btn {
          display: inline-block; margin-top: .5rem;
          padding: .55rem 1.1rem; background: var(--c1); color: #fff;
          border-radius: var(--radius-sm); font-size: .85rem;
          font-weight: 600; text-align: center; transition: background .15s;
        }
        .sa-reg-panel-btn.active { background: var(--c3); }
        .sa-reg-panel:hover .sa-reg-panel-btn:not(.active) { background: var(--c1-light); }
        .sa-reg-form {
          background: var(--white); border: 1px solid var(--border);
          border-radius: var(--radius); padding: 1.8rem;
          display: flex; flex-direction: column; gap: 1rem;
        }
        .sa-reg-form-title { font-size: 1rem; font-weight: 600; color: var(--text); }
        .sa-field { display: flex; flex-direction: column; gap: .35rem; }
        .sa-field label { font-size: .85rem; font-weight: 500; color: var(--text); }
        .req { color: var(--c1); }
        .sa-hint { font-weight: 400; color: var(--text-light); font-size: .78rem; }
        .sa-field input {
          padding: .65rem .9rem; border: 1.5px solid var(--border);
          border-radius: var(--radius-sm); font-size: .95rem; color: var(--text);
          background: var(--white); outline: none; transition: border-color .15s;
        }
        .sa-field input:focus { border-color: var(--c1); }
        .sa-reg-error {
          color: #c0392b; font-size: .85rem; background: #fdf0ef;
          padding: .5rem .75rem; border-radius: 6px;
        }
        .sa-btn-primary {
          padding: .78rem 1.5rem; background: var(--c1); color: #fff;
          border: none; border-radius: var(--radius-sm);
          font-size: .95rem; font-weight: 600; cursor: pointer;
          transition: background .15s; margin-top: .3rem;
        }
        .sa-btn-primary:hover:not(:disabled) { background: var(--c1-light); }
        .sa-btn-primary:disabled { opacity: .6; cursor: not-allowed; }
        .sa-reg-login-link {
          text-align: center; font-size: .88rem; color: var(--text-mid);
        }
        .sa-reg-login-link a {
          color: var(--c1); font-weight: 600; text-decoration: none;
        }
        .sa-reg-login-link a:hover { text-decoration: underline; }
      `}</style>
    </div>
  )
}
