import { auth } from '@/auth'
import { redirect } from 'next/navigation'

export default async function PatientDashboard() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return (
    <main className="sa-dash">
      <nav className="sa-nav">
        <div className="sa-nav-brand">
          <span className="sa-logo-mark">SA</span>
          <span className="sa-logo-text">SantéApp</span>
        </div>
        <div className="sa-nav-user">
          <span className="sa-nav-name">{session.user.name ?? session.user.email}</span>
          <span className="sa-nav-badge">Patient</span>
        </div>
      </nav>

      <div className="sa-dash-body">
        <h1 className="sa-dash-title">Bonjour{session.user.name ? `, ${session.user.name.split(' ')[0]}` : ''} 👋</h1>
        <p className="sa-dash-sub">Gérez vos rendez-vous médicaux depuis votre espace personnel.</p>

        <div className="sa-kpi-grid">
          <div className="sa-kpi-card">
            <div className="sa-kpi-icon">📅</div>
            <div className="sa-kpi-label">Prochain RDV</div>
            <div className="sa-kpi-value sa-kpi-empty">Aucun planifié</div>
          </div>
          <div className="sa-kpi-card">
            <div className="sa-kpi-icon">🏥</div>
            <div className="sa-kpi-label">Consultations totales</div>
            <div className="sa-kpi-value">0</div>
          </div>
          <div className="sa-kpi-card">
            <div className="sa-kpi-icon">⭐</div>
            <div className="sa-kpi-label">Médecins favoris</div>
            <div className="sa-kpi-value">0</div>
          </div>
        </div>

        <div className="sa-section">
          <div className="sa-section-header">
            <h2 className="sa-section-title">Prochains rendez-vous</h2>
            <button className="sa-btn-primary sa-btn-sm">+ Prendre RDV</button>
          </div>
          <div className="sa-empty-state">
            <div className="sa-empty-icon">🩺</div>
            <p>Aucun rendez-vous planifié.</p>
            <p className="sa-empty-sub">Trouvez un médecin disponible et réservez en quelques clics.</p>
          </div>
        </div>
      </div>

      <style>{`
        .sa-dash { min-height: 100vh; background: var(--bg); display: flex; flex-direction: column; }
        .sa-nav {
          height: var(--nav-h); background: var(--white);
          border-bottom: 1px solid var(--border);
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 2rem; position: sticky; top: 0; z-index: 10;
        }
        .sa-nav-brand { display: flex; align-items: center; gap: .6rem; }
        .sa-logo-mark {
          width: 32px; height: 32px; background: var(--c1); color: #fff;
          border-radius: 8px; display: flex; align-items: center;
          justify-content: center; font-weight: 700; font-size: .8rem;
        }
        .sa-logo-text { font-family: 'Fraunces', serif; font-weight: 700; font-size: 1.05rem; color: var(--dark); }
        .sa-nav-user { display: flex; align-items: center; gap: .6rem; }
        .sa-nav-name { font-size: .88rem; color: var(--text-mid); }
        .sa-nav-badge {
          font-size: .75rem; font-weight: 600;
          background: var(--c1-pale); color: var(--c1);
          padding: .2rem .6rem; border-radius: 20px;
        }
        .sa-dash-body { max-width: 960px; margin: 0 auto; padding: 2.5rem 1.5rem; width: 100%; display: flex; flex-direction: column; gap: 2rem; }
        .sa-dash-title { font-family: 'Fraunces', serif; font-size: 1.8rem; font-weight: 700; color: var(--dark); }
        .sa-dash-sub { color: var(--text-mid); font-size: .95rem; margin-top: .2rem; }
        .sa-kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
        @media (max-width: 640px) { .sa-kpi-grid { grid-template-columns: 1fr; } }
        .sa-kpi-card {
          background: var(--white); border: 1px solid var(--border);
          border-radius: var(--radius); padding: 1.4rem;
          display: flex; flex-direction: column; gap: .4rem;
        }
        .sa-kpi-icon { font-size: 1.4rem; }
        .sa-kpi-label { font-size: .8rem; color: var(--text-light); font-weight: 500; }
        .sa-kpi-value { font-size: 1.3rem; font-weight: 700; color: var(--dark); }
        .sa-kpi-empty { font-size: .9rem; font-weight: 400; color: var(--text-light); }
        .sa-section { display: flex; flex-direction: column; gap: 1rem; }
        .sa-section-header { display: flex; align-items: center; justify-content: space-between; }
        .sa-section-title { font-family: 'Fraunces', serif; font-size: 1.15rem; font-weight: 700; color: var(--dark); }
        .sa-btn-primary {
          padding: .72rem 1.2rem; background: var(--c1); color: #fff;
          border: none; border-radius: var(--radius-sm);
          font-size: .9rem; font-weight: 600; cursor: pointer;
          transition: background .15s;
        }
        .sa-btn-sm { padding: .48rem .9rem; font-size: .83rem; }
        .sa-btn-primary:hover { background: var(--c1-light); }
        .sa-empty-state {
          background: var(--white); border: 1px solid var(--border);
          border-radius: var(--radius); padding: 3rem;
          text-align: center; display: flex; flex-direction: column;
          align-items: center; gap: .6rem;
          color: var(--text-mid); font-size: .92rem;
        }
        .sa-empty-icon { font-size: 2.5rem; }
        .sa-empty-sub { font-size: .84rem; color: var(--text-light); }
      `}</style>
    </main>
  )
}
