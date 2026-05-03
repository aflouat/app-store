'use client'

import { useState, FormEvent } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import ChatWidget from '@/components/freelancehub/ChatWidget'
import LocaleSwitcher from '@/components/freelancehub/LocaleSwitcher'
import { trackEvent } from '@/lib/freelancehub/analytics'

type Role = 'consultant' | 'client' | null

export default function RegisterPage() {
  const t = useTranslations('Register')
  const router = useRouter()
  const searchParams = useSearchParams()
  const ref = searchParams.get('ref') ?? undefined
  const [activeRole, setActiveRole] = useState<Role>(null)
  const [name,       setName]       = useState('')
  const [email,      setEmail]      = useState('')
  const [password,   setPassword]   = useState('')
  const [loading,          setLoading]          = useState(false)
  const [error,            setError]            = useState('')
  const [cguAccepted,      setCguAccepted]      = useState(false)
  const [marketingConsent, setMarketingConsent] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!activeRole) return
    setLoading(true)
    setError('')

    const res = await fetch('/api/freelancehub/auth/register', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name, email, password, role: activeRole, cgu_accepted: true, marketing_consent: marketingConsent, ref }),
    })

    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? t('errorDefault'))
      setLoading(false)
      return
    }

    const result = await signIn('credentials', { email, password, redirect: false })
    setLoading(false)

    if (result?.error) {
      router.push('/freelancehub/login')
      return
    }

    trackEvent('register', { role: activeRole })
    router.push(`/freelancehub/${activeRole}`)
    router.refresh()
  }

  const consultantFeatures = [
    t('consultantFeature1'), t('consultantFeature2'),
    t('consultantFeature3'), t('consultantFeature4'),
  ]
  const clientFeatures = [
    t('clientFeature1'), t('clientFeature2'),
    t('clientFeature3'), t('clientFeature4'),
  ]

  return (
    <div className="reg-page">
      <div className="reg-inner">
        <div className="reg-brand">
          <span className="reg-logo-mark">FH</span>
          <span className="reg-logo-text">FreelanceHub</span>
          <div style={{ marginLeft: 'auto' }}>
            <LocaleSwitcher />
          </div>
        </div>
        <h1 className="reg-title">{t('title')}</h1>
        <p className="reg-sub">{t('subtitle')}</p>

        {ref && (
          <div className="reg-referral-banner">
            {t('referralBanner')}
          </div>
        )}

        <div className="reg-panels">
          <div
            className={`reg-panel${activeRole === 'consultant' ? ' reg-panel--active' : ''}`}
            onClick={() => { setActiveRole('consultant'); setError('') }}
          >
            <div className="reg-panel-icon">💼</div>
            <h2 className="reg-panel-title">{t('consultantTitle')}</h2>
            <p className="reg-panel-desc">{t('consultantDesc')}</p>
            <ul className="reg-panel-list">
              {consultantFeatures.map((f, i) => <li key={i}>{f}</li>)}
            </ul>
            <span className={`reg-panel-btn${activeRole === 'consultant' ? ' active' : ''}`}>
              {activeRole === 'consultant' ? t('selected') : t('selectConsultant')}
            </span>
          </div>

          <div
            className={`reg-panel${activeRole === 'client' ? ' reg-panel--active' : ''}`}
            onClick={() => { setActiveRole('client'); setError('') }}
          >
            <div className="reg-panel-icon">🏢</div>
            <h2 className="reg-panel-title">{t('clientTitle')}</h2>
            <p className="reg-panel-desc">{t('clientDesc')}</p>
            <ul className="reg-panel-list">
              {clientFeatures.map((f, i) => <li key={i}>{f}</li>)}
            </ul>
            <span className={`reg-panel-btn${activeRole === 'client' ? ' active' : ''}`}>
              {activeRole === 'client' ? t('selected') : t('selectClient')}
            </span>
          </div>
        </div>

        {activeRole && (
          <form onSubmit={handleSubmit} className="reg-form">
            <h3 className="reg-form-title">
              {activeRole === 'consultant' ? t('formTitleConsultant') : t('formTitleClient')}
            </h3>

            <div className="reg-field">
              <label htmlFor="name">{t('nameLabel')}</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={t('namePlaceholder')}
                autoFocus
              />
            </div>
            <div className="reg-field">
              <label htmlFor="email">{t('emailLabel')} <span className="req">*</span></label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={t('emailPlaceholder')}
                required
              />
            </div>
            <div className="reg-field">
              <label htmlFor="password">
                {t('passwordLabel')} <span className="req">*</span>{' '}
                <span className="reg-hint">{t('passwordHint')}</span>
              </label>
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

            <div className="reg-consents">
              <label className="reg-consent-row">
                <input
                  type="checkbox"
                  checked={cguAccepted}
                  onChange={e => setCguAccepted(e.target.checked)}
                  required
                />
                <span>
                  {t('cguAccept')}{' '}
                  <a href="/freelancehub/cgu" target="_blank">{t('cguLink')}</a>
                  {' '}{t('cguAnd')}{' '}
                  <a href="/freelancehub/privacy" target="_blank">{t('privacyLink')}</a>
                  {' '}<span className="req">*</span>
                </span>
              </label>
              <label className="reg-consent-row">
                <input
                  type="checkbox"
                  checked={marketingConsent}
                  onChange={e => setMarketingConsent(e.target.checked)}
                />
                <span>{t('marketingConsent')}</span>
              </label>
            </div>

            <button type="submit" className="reg-submit-btn" disabled={loading || !cguAccepted}>
              {loading ? t('submitting') : t('submit')}
            </button>
          </form>
        )}

        <p className="reg-login-link">
          {t('alreadyRegistered')} <a href="/freelancehub/login">{t('loginLink')}</a>
        </p>
      </div>

      <ChatWidget />
      <style>{`
        .reg-page { min-height: 100vh; background: var(--bg); display: flex; align-items: flex-start; justify-content: center; padding: 2.5rem 1rem 4rem; }
        .reg-inner { width: 100%; max-width: 780px; display: flex; flex-direction: column; gap: 1.8rem; }
        .reg-brand { display: flex; align-items: center; gap: .6rem; }
        .reg-logo-mark { width: 36px; height: 36px; background: var(--c1); color: #fff; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: .85rem; }
        .reg-logo-text { font-family: 'Fraunces', serif; font-weight: 700; font-size: 1.15rem; color: var(--dark); }
        .reg-title { font-family: 'Fraunces', serif; font-size: 2rem; font-weight: 700; color: var(--dark); }
        .reg-sub { color: var(--text-mid); font-size: .95rem; margin-top: -.8rem; }
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
        .reg-consents { display: flex; flex-direction: column; gap: .6rem; padding: .8rem; background: var(--bg); border-radius: var(--radius-sm); border: 1px solid var(--border); }
        .reg-consent-row { display: flex; align-items: flex-start; gap: .6rem; cursor: pointer; }
        .reg-consent-row input[type="checkbox"] { margin-top: .15rem; flex-shrink: 0; accent-color: var(--c1); width: 15px; height: 15px; }
        .reg-consent-row span { font-size: .83rem; color: var(--text); line-height: 1.5; }
        .reg-consent-row a { color: var(--c1); text-decoration: none; }
        .reg-consent-row a:hover { text-decoration: underline; }
        .reg-login-link { text-align: center; font-size: .88rem; color: var(--text-mid); }
        .reg-login-link a { color: var(--c1); font-weight: 600; text-decoration: none; }
        .reg-login-link a:hover { text-decoration: underline; }
        .reg-referral-banner { background: #f0fdf4; border: 1px solid #86efac; color: #166534; border-radius: var(--radius-sm); padding: .65rem 1rem; font-size: .88rem; }
      `}</style>
    </div>
  )
}
