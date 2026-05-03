'use client'

import { Suspense, useState, FormEvent } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import ChatWidget from '@/components/freelancehub/ChatWidget'
import LocaleSwitcher from '@/components/freelancehub/LocaleSwitcher'

const GOOGLE_ERROR_KEYS = ['AccessDenied', 'Callback', 'OAuthCallback', 'OAuthSignin', 'Configuration'] as const
type GoogleErrorKey = (typeof GOOGLE_ERROR_KEYS)[number]

function LoginForm() {
  const t = useTranslations('Login')
  const router       = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl  = searchParams.get('callbackUrl') || '/freelancehub'
  const errorParam   = searchParams.get('error')
  const resetSuccess = searchParams.get('reset') === '1'

  const getGoogleErrorMsg = (code: string): string =>
    GOOGLE_ERROR_KEYS.includes(code as GoogleErrorKey)
      ? t(`errors.${code as GoogleErrorKey}`)
      : t('errorDefault')

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState(errorParam ? getGoogleErrorMsg(errorParam) : '')
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await signIn('credentials', { email, password, redirect: false })
    setLoading(false)

    if (result?.error) {
      setError(t('errorInvalidCredentials'))
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
          <div style={{ marginLeft: 'auto' }}>
            <LocaleSwitcher />
          </div>
        </div>
        <h1 className="fh-login-title">{t('title')}</h1>
        <p className="fh-login-sub">{t('subtitle')}</p>

        <button
          type="button"
          className="fh-btn-google"
          onClick={() => signIn('google', { callbackUrl })}
          disabled={loading}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          {t('continueWithGoogle')}
        </button>

        <div className="fh-divider"><span>{t('or')}</span></div>

        <form onSubmit={handleSubmit} className="fh-login-form">
          <div className="fh-field">
            <label htmlFor="email">{t('emailLabel')}</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={t('emailPlaceholder')}
              required
              autoFocus
            />
          </div>

          <div className="fh-field">
            <label htmlFor="password">{t('passwordLabel')}</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {resetSuccess && <p className="fh-login-success">{t('resetSuccess')}</p>}
          {error && <p className="fh-login-error" role="alert">{error}</p>}

          <div className="fh-forgot-link">
            <a href="/freelancehub/forgot-password">{t('forgotPassword')}</a>
          </div>

          <button type="submit" className="fh-btn-primary" disabled={loading}>
            {loading ? t('submitting') : t('submit')}
          </button>
        </form>

        <p className="fh-login-register">
          {t('notRegistered')}{' '}
          <a href="/freelancehub/register" className="fh-login-register-link">{t('joinPlatform')}</a>
        </p>

        {process.env.NEXT_PUBLIC_DEMO_MODE === 'true' && (
          <p className="fh-login-demo">
            {t('demoAccounts')}&nbsp;: <code>consultant1@perform-learn.fr</code> · <code>client1@perform-learn.fr</code>
            <br /><code>admin@perform-learn.fr</code> — {t('demoPassword')}&nbsp;: <code>demo1234</code>
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
        .fh-forgot-link { text-align: right; margin-top: -.3rem; }
        .fh-forgot-link a { font-size: .82rem; color: var(--text-light); text-decoration: none; }
        .fh-forgot-link a:hover { color: var(--c1); text-decoration: underline; }
        .fh-login-success { color: #166534; font-size: .85rem; background: #f0fdf4; border: 1px solid #86efac; padding: .5rem .75rem; border-radius: 6px; }
        .fh-btn-google {
          display: flex; align-items: center; justify-content: center; gap: .6rem;
          width: 100%; padding: .72rem 1.2rem;
          background: var(--white); color: var(--dark);
          border: 1.5px solid var(--border); border-radius: var(--radius-sm);
          font-size: .95rem; font-weight: 500;
          cursor: pointer; transition: background .15s, border-color .15s;
          margin-bottom: .25rem;
        }
        .fh-btn-google:hover:not(:disabled) { background: var(--bg); border-color: #aaa; }
        .fh-btn-google:disabled { opacity: .6; cursor: not-allowed; }
        .fh-divider {
          display: flex; align-items: center; gap: .75rem;
          color: var(--text-light); font-size: .8rem; margin: .75rem 0;
        }
        .fh-divider::before, .fh-divider::after {
          content: ''; flex: 1; height: 1px; background: var(--border);
        }
      `}</style>
    </div>
  )
}

export default function LoginPage() {
  return (
    <>
      <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>…</div>}>
        <LoginForm />
      </Suspense>
      <ChatWidget />
    </>
  )
}
