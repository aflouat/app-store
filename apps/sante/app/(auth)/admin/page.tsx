import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { query } from '@app-store/core-db'
import SaNav from '@/components/sante/SaNav'
import type { SanteRole } from '@/lib/sante/types'

interface UserRow {
  id: string
  email: string
  name: string | null
  role: string
  is_active: boolean
  created_at: string
}

export default async function AdminPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') redirect('/login')

  const users = await query<UserRow>(
    `SELECT u.id, u.email, u.name, u.role, u.is_active, u.created_at::text
     FROM sante.users u
     ORDER BY u.created_at DESC`
  )

  const counts = {
    total:   users.length,
    doctors: users.filter(u => u.role === 'doctor').length,
    patients: users.filter(u => u.role === 'patient').length,
    admins:  users.filter(u => u.role === 'admin').length,
  }

  return (
    <main className="sa-dash">
      <SaNav user={{
        name:  session.user.name  ?? null,
        email: session.user.email ?? '',
        role:  (session.user.role ?? 'admin') as SanteRole,
      }} />

      <div className="sa-dash-body">
        <h1 className="sa-dash-title">Administration</h1>
        <p className="sa-dash-sub">Vue globale des utilisateurs SantéApp.</p>

        <div className="sa-kpi-grid">
          <div className="sa-kpi-card">
            <div className="sa-kpi-icon">👥</div>
            <div className="sa-kpi-label">Utilisateurs total</div>
            <div className="sa-kpi-value">{counts.total}</div>
          </div>
          <div className="sa-kpi-card">
            <div className="sa-kpi-icon">🩺</div>
            <div className="sa-kpi-label">Médecins</div>
            <div className="sa-kpi-value">{counts.doctors}</div>
          </div>
          <div className="sa-kpi-card">
            <div className="sa-kpi-icon">🧑‍⚕️</div>
            <div className="sa-kpi-label">Patients</div>
            <div className="sa-kpi-value">{counts.patients}</div>
          </div>
        </div>

        <div className="sa-section">
          <h2 className="sa-section-title">Tous les utilisateurs</h2>
          <div className="sa-table-wrap">
            <table className="sa-table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Email</th>
                  <th>Rôle</th>
                  <th>Statut</th>
                  <th>Inscription</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>{u.name ?? <span className="sa-empty">—</span>}</td>
                    <td>{u.email}</td>
                    <td><span className={`sa-badge sa-badge--${u.role}`}>{u.role}</span></td>
                    <td>
                      <span className={`sa-badge ${u.is_active ? 'sa-badge--active' : 'sa-badge--inactive'}`}>
                        {u.is_active ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="sa-date">{new Date(u.created_at).toLocaleDateString('fr-FR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <style>{`
        .sa-dash { min-height: 100vh; background: var(--bg); display: flex; flex-direction: column; }
        .sa-dash-body { max-width: 960px; margin: 0 auto; padding: 2.5rem 1.5rem; width: 100%; display: flex; flex-direction: column; gap: 2rem; }
        .sa-dash-title { font-family: 'Fraunces', serif; font-size: 1.8rem; font-weight: 700; color: var(--dark); }
        .sa-dash-sub { color: var(--text-mid); font-size: .95rem; margin-top: .2rem; }
        .sa-kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
        @media (max-width: 640px) { .sa-kpi-grid { grid-template-columns: 1fr; } }
        .sa-kpi-card { background: var(--white); border: 1px solid var(--border); border-radius: var(--radius); padding: 1.4rem; display: flex; flex-direction: column; gap: .4rem; }
        .sa-kpi-icon { font-size: 1.4rem; }
        .sa-kpi-label { font-size: .8rem; color: var(--text-light); font-weight: 500; }
        .sa-kpi-value { font-size: 1.5rem; font-weight: 700; color: var(--dark); }
        .sa-section { display: flex; flex-direction: column; gap: 1rem; }
        .sa-section-title { font-family: 'Fraunces', serif; font-size: 1.15rem; font-weight: 700; color: var(--dark); }
        .sa-table-wrap { overflow-x: auto; border: 1px solid var(--border); border-radius: var(--radius); background: var(--white); }
        .sa-table { width: 100%; border-collapse: collapse; font-size: .88rem; }
        .sa-table th { padding: .75rem 1rem; text-align: left; font-size: .78rem; font-weight: 600; color: var(--text-light); text-transform: uppercase; letter-spacing: .04em; border-bottom: 1px solid var(--border); background: var(--bg); }
        .sa-table td { padding: .75rem 1rem; color: var(--text); border-bottom: 1px solid var(--border); }
        .sa-table tr:last-child td { border-bottom: none; }
        .sa-table tr:hover td { background: var(--bg); }
        .sa-badge { display: inline-block; padding: .2rem .55rem; border-radius: 4px; font-size: .75rem; font-weight: 600; }
        .sa-badge--doctor  { background: #e8f0ee; color: #3a6b64; }
        .sa-badge--patient { background: #f0ece8; color: #7a4f3a; }
        .sa-badge--admin   { background: #eaeee8; color: #4a5c40; }
        .sa-badge--active  { background: #dcfce7; color: #15803d; }
        .sa-badge--inactive { background: #fef2f2; color: #b91c1c; }
        .sa-date { color: var(--text-light); font-size: .83rem; }
        .sa-empty { color: var(--text-light); }
      `}</style>
    </main>
  )
}
