import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { query } from '@/lib/freelancehub/db'

export default async function AdminDashboard() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') redirect('/freelancehub/login')

  const [platform] = await query<{
    total_consultants: number
    verified_consultants: number
    total_clients: number
    total_bookings: number
    pending_bookings: number
    completed_bookings: number
    total_revenue_ht: number | null
    platform_commission: number | null
  }>(
    `SELECT
       (SELECT COUNT(*) FROM freelancehub.users WHERE role = 'consultant')::int  AS total_consultants,
       (SELECT COUNT(*) FROM freelancehub.consultants WHERE is_verified = true)::int AS verified_consultants,
       (SELECT COUNT(*) FROM freelancehub.users WHERE role = 'client')::int      AS total_clients,
       (SELECT COUNT(*) FROM freelancehub.bookings)::int                         AS total_bookings,
       (SELECT COUNT(*) FROM freelancehub.bookings WHERE status = 'pending')::int AS pending_bookings,
       (SELECT COUNT(*) FROM freelancehub.bookings WHERE status = 'completed')::int AS completed_bookings,
       (SELECT COALESCE(SUM(amount_ht), 0)          FROM freelancehub.bookings WHERE status = 'completed') AS total_revenue_ht,
       (SELECT COALESCE(SUM(commission_amount), 0)  FROM freelancehub.bookings WHERE status = 'completed') AS platform_commission`
  )

  const recentBookings = await query<{
    id: string
    status: string
    created_at: string
    client_name: string | null
    skill_name: string | null
    amount_ht: number | null
  }>(
    `SELECT b.id, b.status, b.created_at,
            u.name AS client_name,
            sk.name AS skill_name,
            b.amount_ht
     FROM freelancehub.bookings b
     JOIN freelancehub.users u ON u.id = b.client_id
     LEFT JOIN freelancehub.skills sk ON sk.id = b.skill_requested
     ORDER BY b.created_at DESC
     LIMIT 8`
  )

  const revenue = ((platform?.total_revenue_ht ?? 0) as number) / 100
  const commission = ((platform?.platform_commission ?? 0) as number) / 100

  return (
    <div className="fh-page">
      <header className="fh-page-header">
        <div>
          <h1 className="fh-page-title">Dashboard Admin</h1>
          <p className="fh-page-sub">Vue d&apos;ensemble de la plateforme FreelanceHub</p>
        </div>
      </header>

      {/* KPI Grid */}
      <div className="fh-kpi-grid-admin">
        <KpiCard label="Consultants"         value={String(platform?.total_consultants ?? 0)}  sub={`${platform?.verified_consultants ?? 0} vérifiés`} color="var(--c3)" />
        <KpiCard label="Clients"             value={String(platform?.total_clients ?? 0)}       sub=""                                                  color="var(--c1)" />
        <KpiCard label="Réservations"        value={String(platform?.total_bookings ?? 0)}      sub={`${platform?.pending_bookings ?? 0} en attente`}   color="var(--c2)" />
        <KpiCard label="CA total (HT)"       value={`${revenue.toFixed(0)} €`}                  sub={`Commission : ${commission.toFixed(0)} €`}          color="var(--c4)" />
      </div>

      {/* Recent bookings */}
      <section className="fh-section">
        <h2 className="fh-section-title">Réservations récentes</h2>
        <div className="fh-admin-table-wrap">
          <table className="fh-admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Client</th>
                <th>Expertise</th>
                <th>Montant HT</th>
                <th>Statut</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {recentBookings.map(b => (
                <tr key={b.id}>
                  <td><code className="fh-id">{b.id.slice(0,8)}…</code></td>
                  <td>{b.client_name ?? '—'}</td>
                  <td>{b.skill_name ?? '—'}</td>
                  <td>{b.amount_ht ? `${(b.amount_ht / 100).toFixed(0)} €` : '—'}</td>
                  <td><StatusBadge status={b.status} /></td>
                  <td>{new Date(b.created_at).toLocaleDateString('fr-FR')}</td>
                </tr>
              ))}
              {recentBookings.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-light)', padding: '1.5rem' }}>Aucune réservation</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <style>{`
        .fh-page { display: flex; flex-direction: column; gap: 2rem; }
        .fh-page-header { display: flex; align-items: flex-start; justify-content: space-between; }
        .fh-page-title { font-family: 'Fraunces', serif; font-size: 1.7rem; font-weight: 700; color: var(--dark); }
        .fh-page-sub { color: var(--text-mid); font-size: .95rem; margin-top: .3rem; }
        .fh-kpi-grid-admin { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; }
        .fh-section { display: flex; flex-direction: column; gap: .8rem; }
        .fh-section-title { font-size: 1rem; font-weight: 600; color: var(--text); }
        .fh-admin-table-wrap { overflow-x: auto; background: var(--white); border-radius: var(--radius); border: 1px solid var(--border); }
        .fh-admin-table { width: 100%; border-collapse: collapse; font-size: .88rem; }
        .fh-admin-table th { padding: .75rem 1rem; text-align: left; font-size: .78rem; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; color: var(--text-light); border-bottom: 1px solid var(--border); background: var(--bg); }
        .fh-admin-table td { padding: .75rem 1rem; border-bottom: 1px solid var(--border); color: var(--text); }
        .fh-admin-table tr:last-child td { border-bottom: none; }
        .fh-admin-table tbody tr:hover { background: var(--bg); }
        .fh-id { font-size: .78rem; color: var(--text-light); }
      `}</style>
    </div>
  )
}

function KpiCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div style={{ background: 'var(--white)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', borderTop: `3px solid ${color}`, padding: '1.3rem 1.1rem', display: 'flex', flexDirection: 'column', gap: '.25rem' }}>
      <span style={{ fontFamily: "'Fraunces', serif", fontSize: '1.9rem', fontWeight: 700, color: 'var(--dark)' }}>{value}</span>
      <span style={{ fontSize: '.8rem', color: 'var(--text-light)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</span>
      {sub && <span style={{ fontSize: '.78rem', color: 'var(--text-light)', marginTop: '.15rem' }}>{sub}</span>}
    </div>
  )
}

const STATUS_MAP: Record<string, { label: string; bg: string; color: string }> = {
  pending:     { label: 'En attente',  bg: 'var(--c2-pale)', color: 'var(--text-mid)' },
  confirmed:   { label: 'Confirmée',  bg: 'var(--c3-pale)', color: 'var(--c3)' },
  in_progress: { label: 'En cours',   bg: 'var(--c1-pale)', color: 'var(--c1)' },
  completed:   { label: 'Terminée',   bg: 'var(--c4-pale)', color: 'var(--c4)' },
  cancelled:   { label: 'Annulée',    bg: '#f5f5f5',        color: '#999' },
  disputed:    { label: 'Litige',     bg: '#fef0f0',        color: '#c0392b' },
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? STATUS_MAP.pending
  return (
    <span style={{ fontSize: '.78rem', fontWeight: 600, padding: '.2em .7em', borderRadius: '20px', background: s.bg, color: s.color }}>
      {s.label}
    </span>
  )
}
