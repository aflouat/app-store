'use client'

import { useState, FormEvent } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

type Role = 'consultant' | 'client' | null

export default function RegisterPage() {
  const router = useRouter()
  const [activeRole, setActiveRole] = useState<Role>(null)
  const [name,       setName]       = useState('')
  const [email,      setEmail]      = useState('')
  const [password,   setPassword]   = useState('')
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!activeRole) return
    setLoading(true)
    setError('')

    const res = await fetch('/api/freelancehub/auth/register', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name, email, password, role: activeRole }),
    })

    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Erreur lors de l\'inscription.')
      setLoading(false)
      return
    }

    // Auto-login after registration
    const result = await signIn('credentials', { email, password, redirect: false })
    setLoading(false)

    if (result?.error) {
      // Fallback: redirect to login
      router.push('/freelancehub/login')
      return
    }

    router.push(`/freelancehub/${activeRole}`)
    router.refresh()
  }

  return (
    <div className="reg-page">
      <div className="reg-inner">
        <div className="reg-brand">
          <span className="reg-logo-mark">FH</span>
          <span className="reg-logo-text">FreelanceHub</span>
        </div>
        <h1 className="reg-title">Rejoindre la plateforme</h1>
        <p className="reg-sub">Choisissez votre profil pour démarrer</p>

        {/* Two panels */}
        <div className="reg-panels">
          <div
            className={`reg-panel${activeRole === 'consultant' ? ' reg-panel--active' : ''}`}
            onClick={() => { setActiveRole('consultant'); setError('') }}
          >
            <div className="reg-panel-icon">💼</div>
            <h2 className="reg-panel-title">Consultant Expert</h2>
            <p className="reg-panel-desc">Proposez vos expertises à la demande</p>
            <ul className="reg-panel-list">
              <li>Agenda en ligne géré par vous</li>
              <li>Paiement sécurisé par séquestre</li>
              <li>Commission 15 % seulement</li>
              <li>CV vidéo YouTube intégré</li>
            </ul>
            <span className={`reg-panel-btn${activeRole === 'consultant' ? ' active' : ''}`}>
              {activeRole === 'consultant' ? '✓ Sélectionné' : 'Rejoindre en tant que consultant'}
            </span>
          </div>

          <div
            className={`reg-panel${activeRole === 'client' ? ' reg-panel--active' : ''}`}
            onClick={() => { setActiveRole('client'); setError('') }}
          >
            <div className="reg-panel-icon">🏢</div>
            <h2 className="reg-panel-title">Entreprise / Client</h2>
            <p className="reg-panel-desc">Accédez aux meilleurs experts en quelques clics</p>
            <ul className="reg-panel-list">
              <li>Matching algorithmique instantané</li>
              <li>Consultation dès 85 € TTC / 1h</li>
              <li>Identité révélée après paiement</li>
              <li>Paiement escrow sécurisé</li>
            </ul>
            <span className={`reg-panel-btn${activeRole === 'client' ? ' active' : ''}`}>
              {activeRole === 'client' ? '✓ Sélectionné' : 'Rejoindre en tant que client'}
            </span>
          </div>
        </div>

        {/* Registration form — shown when a role is selected */}
        {activeRole && (
          <form onSubmit={handleSubmit} className="reg-form">
            <h3 className="reg-form-title">
              Créer mon compte {activeRole === 'consultant' ? 'consultant' : 'client'}
            </h3>

            <div className="reg-field">
              <label htmlFor="name">Nom complet</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Jean Dupont"
                autoFocus
              />
            </div>
            <div className="reg-field">
              <label htmlFor="email">Email <span className="req">*</span></label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="vous@exemple.fr"
                required
              />
            </div>
            <div className="reg-field">
              <label htmlFor="password">Mot de passe <span className="req">*</span> <span className="reg-hint">(8 caractères min.)</span></label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
              />
            </div>

            {error && <p className="reg-error">{error}</p>}

            <button type="submit" className="reg-submit-btn" disabled={loading}>
              {loading ? 'Création du compte…' : 'Créer mon compte et accéder à la plateforme'}
            </button>

            <p className="reg-cgu">
              En créant un compte, vous acceptez les{' '}
              <a href="/freelancehub/cgu" target="_blank">CGU</a> et la{' '}
              <a href="/freelancehub/privacy" target="_blank">politique de confidentialité</a>.
            </p>
          </form>
        )}

        <p className="reg-login-link">
          Déjà inscrit ? <a href="/freelancehub/login">Se connecter</a>
        </p>
      </div>

      <style>{`
        .reg-page { min-height: 100vh; background: var(--bg); display: flex; align-items: flex-start; justify-content: center; padding: 2.5rem 1rem 4rem; }
        .reg-inner { width: 100%; max-width: 780px; display: flex; flex-direction: column; gap: 1.8rem; }
        .reg-brand { display: flex; align-items: center; gap: .6rem; }
        .reg-logo-mark { width: 36px; height: 36px; background: var(--c1); color: #fff; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: .85rem; }
        .reg-logo-text { font-family: 'Fraunces', serif; font-weight: 700; font-size: 1.15rem; color: var(--dark); }
        .reg-title { font-family: 'Fraunces', serif; font-size: 2rem; font-weight: 700; color: var(--dark); }
        .reg-sub { color: var(--text-mid); font-size: .95rem; margin-top: -.8rem; }

        /* Panels */
        .reg-panels { display: grid; grid-template-columns: 1fr 1fr; gap: 1.2rem; }
        @media (max-width: 580px) { .reg-panels { grid-template-columns: 1fr; } }
        .reg-panel { background: var(--white); border: 2px solid var(--border); border-radius: var(--radius); padding: 1.6rem; cursor: pointer; display: flex; flex-direction: column; gap: .7rem; transition: border-color .15s, box-shadow .15s; }
        .reg-panel:hover { border-color: var(--c1); box-shadow: 0 4px 16px rgba(0,0,0,.07); }
        .reg-panel--active { border-color: var(--c1); background: var(--c1-pale); box-shadow: 0 4px 16px rgba(91,106,240,.12); }
        .reg-panel-icon { font-size: 2rem; }
        .reg-panel-title { font-family: 'Fraunces', serif; font-size: 1.1rem; font-weight: 700; color: var(--dark); }
        .reg-panel-desc { font-size: .88rem; color: var(--text-mid); }
        .reg-panel-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: .3rem; }
        .reg-panel-list li { font-size: .84rem; color: var(--text-mid); padding-left: 1.2rem; position: relative; }
        .reg-panel-list li::before { content: '✓'; position: absolute; left: 0; color: var(--c3); font-weight: 700; font-size: .78rem; }
        .reg-panel-btn { display: inline-block; margin-top: .5rem; padding: .55rem 1.1rem; background: var(--c1); color: #fff; border-radius: var(--radius-sm); font-size: .85rem; font-weight: 600; text-align: center; transition: background .15s; }
        .reg-panel-btn.active { background: var(--c3); }
        .reg-panel:hover .reg-panel-btn:not(.active) { background: var(--c1-light); }

        /* Form */
        .reg-form { background: var(--white); border: 1px solid var(--border); border-radius: var(--radius); padding: 1.8rem; display: flex; flex-direction: column; gap: 1rem; }
        .reg-form-title { font-size: 1rem; font-weight: 600; color: var(--text); margin-bottom: .2rem; }
        .reg-field { display: flex; flex-direction: column; gap: .35rem; }
        .reg-field label { font-size: .85rem; font-weight: 500; color: var(--text); }
        .req { color: var(--c1); }
        .reg-hint { font-weight: 400; color: var(--text-light); font-size: .78rem; }
        .reg-field input { padding: .65rem .9rem; border: 1.5px solid var(--border); border-radius: var(--radius-sm); font-size: .95rem; color: var(--text); background: var(--white); outline: none; transition: border-color .15s; }
        .reg-field input:focus { border-color: var(--c1); }
        .reg-error { color: #c0392b; font-size: .85rem; background: #fdf0ef; padding: .5rem .75rem; border-radius: 6px; }
        .reg-submit-btn { padding: .78rem 1.5rem; background: var(--c1); color: #fff; border: none; border-radius: var(--radius-sm); font-size: .95rem; font-weight: 600; cursor: pointer; transition: background .15s; margin-top: .3rem; }
        .reg-submit-btn:hover:not(:disabled) { background: var(--c1-light); }
        .reg-submit-btn:disabled { opacity: .6; cursor: not-allowed; }
        .reg-cgu { font-size: .75rem; color: var(--text-light); text-align: center; line-height: 1.6; }
        .reg-cgu a { color: var(--c1); text-decoration: none; }
        .reg-cgu a:hover { text-decoration: underline; }

        .reg-login-link { text-align: center; font-size: .88rem; color: var(--text-mid); }
        .reg-login-link a { color: var(--c1); font-weight: 600; text-decoration: none; }
        .reg-login-link a:hover { text-decoration: underline; }
      `}</style>
    </div>
  )
}
