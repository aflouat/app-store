import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function LandingPage() {
  const session = await auth()
  if (session?.user?.role === 'doctor')  redirect('/doctor/dashboard')
  if (session?.user?.role === 'patient') redirect('/patient/dashboard')
  if (session?.user?.role === 'admin')   redirect('/admin')

  return (
    <main className="sa-landing">
      <div className="sa-landing-card">
        <div className="sa-brand">
          <span className="sa-logo-mark">SA</span>
          <span className="sa-logo-text">SantéApp</span>
        </div>

        <h1 className="sa-landing-title">Votre santé,<br />simplifiée.</h1>
        <p className="sa-landing-sub">
          Prenez rendez-vous avec un médecin en quelques clics.
          Consultations en cabinet ou en visio.
        </p>

        <div className="sa-landing-actions">
          <Link href="/login" className="sa-btn-primary">Se connecter</Link>
          <Link href="/register" className="sa-btn-secondary">Créer un compte</Link>
        </div>

        <div className="sa-landing-features">
          <div className="sa-feature">
            <span className="sa-feature-icon">🩺</span>
            <span>Médecins vérifiés RPPS</span>
          </div>
          <div className="sa-feature">
            <span className="sa-feature-icon">📅</span>
            <span>Agenda en temps réel</span>
          </div>
          <div className="sa-feature">
            <span className="sa-feature-icon">🔒</span>
            <span>Données RGPD protégées</span>
          </div>
        </div>
      </div>

      <style>{`
        .sa-landing {
          min-height: 100vh;
          display: flex; align-items: center; justify-content: center;
          background: var(--bg); padding: 1.5rem;
        }
        .sa-landing-card {
          background: var(--white);
          border-radius: var(--radius);
          border: 1px solid var(--border);
          padding: 3rem 2.5rem;
          width: 100%; max-width: 440px;
          box-shadow: 0 4px 24px rgba(0,0,0,.06);
          display: flex; flex-direction: column; gap: 1.6rem;
        }
        .sa-brand { display: flex; align-items: center; gap: .6rem; }
        .sa-logo-mark {
          width: 36px; height: 36px;
          background: var(--c1); color: #fff;
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: .85rem; letter-spacing: .05em;
        }
        .sa-logo-text {
          font-family: 'Fraunces', serif;
          font-weight: 700; font-size: 1.15rem; color: var(--dark);
        }
        .sa-landing-title {
          font-family: 'Fraunces', serif;
          font-size: 2.2rem; font-weight: 700;
          color: var(--dark); line-height: 1.15;
        }
        .sa-landing-sub { color: var(--text-mid); font-size: .95rem; line-height: 1.6; }
        .sa-landing-actions { display: flex; flex-direction: column; gap: .75rem; }
        .sa-btn-primary {
          display: block; text-align: center;
          padding: .78rem 1.5rem;
          background: var(--c1); color: #fff;
          border-radius: var(--radius-sm);
          font-size: .95rem; font-weight: 600;
          text-decoration: none; transition: background .15s;
        }
        .sa-btn-primary:hover { background: var(--c1-light); }
        .sa-btn-secondary {
          display: block; text-align: center;
          padding: .75rem 1.5rem;
          background: var(--white); color: var(--c1);
          border: 1.5px solid var(--c1);
          border-radius: var(--radius-sm);
          font-size: .95rem; font-weight: 600;
          text-decoration: none; transition: background .15s, color .15s;
        }
        .sa-btn-secondary:hover { background: var(--c1-pale); }
        .sa-landing-features {
          display: flex; flex-direction: column; gap: .6rem;
          border-top: 1px solid var(--border); padding-top: 1.4rem;
        }
        .sa-feature {
          display: flex; align-items: center; gap: .7rem;
          font-size: .88rem; color: var(--text-mid);
        }
        .sa-feature-icon { font-size: 1.1rem; }
      `}</style>
    </main>
  )
}
