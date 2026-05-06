import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { query, queryOne } from '@/lib/freelancehub/db'

export default async function ConsultantEarningsPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'consultant') redirect('/freelancehub/login')

  const userId = session.user.id

  const consultant = await queryOne<{ id: string }>(
    `SELECT id FROM freelancehub.consultants WHERE user_id = $1`,
    [userId]
  )

  if (!consultant) {
    return (
      <div className="fh-page">
        <h1 className="fh-page-title">Mes gains</h1>
        <p className="fh-notice">Aucun profil consultant trouvé.</p>
        <style>{`.fh-page { display:flex;flex-direction:column;gap:1.5rem;max-width:900px; } .fh-page-title { font-family:'Fraunces',serif;font-size:1.7rem;font-weight:700;color:var(--dark); } .fh-notice { color:var(--text-light);font-size:.9rem; }`}</style>
      </div>
    )
  }

  const cid = consultant.id

  const [summary] = await query<{
    total_ht:    number
    total_net:   number
    count_done:  number
    pending_ht:  number
  }>(
    `SELECT
       COALESCE(SUM(amount_ht),         0) AS total_ht,
       COALESCE(SUM(consultant_amount), 0) AS total_net,
       COUNT(*) FILTER (WHERE status = 'completed') AS count_done,
       COALESCE(SUM(consultant_amount) FILTER (WHERE status IN ('confirmed','in_progress')), 0) AS pending_ht
     FROM freelancehub.bookings
     WHERE consultant_id = $1`,
    [cid]
  )

  // Monthly breakdown (last 6 months)
  const monthly = await query<{ month: string; net: number; count: number }>(
    `SELECT
       TO_CHAR(s.slot_date, 'YYYY-MM') AS month,
       COALESCE(SUM(b.consultant_amount), 0) AS net,
       COUNT(*) AS count
     FROM freelancehub.bookings b
     JOIN freelancehub.slots s ON s.id = b.slot_id
     WHERE b.consultant_id = $1
       AND b.status = 'completed'
       AND s.slot_date >= CURRENT_DATE - INTERVAL '6 months'
     GROUP BY month
     ORDER BY month DESC`,
    [cid]
  )

  const totalNet  = (summary?.total_net  ?? 0) / 100
  const totalHt   = (summary?.total_ht   ?? 0) / 100
  const pendingNet = (summary?.pending_ht ?? 0) / 100
  const commission = totalHt - totalNet

  return (
    <div className="fh-page">
      <header className="fh-page-header">
        <h1 className="fh-page-title">Mes gains</h1>
        <p className="fh-page-sub">Commission plateforme : 15 % — vous percevez 85 % du TJM.</p>
      </header>

      {/* KPIs */}
      <div className="earn-kpi-grid">
        <EarnCard
          label="Gains nets totaux"
          value={`${totalNet.toFixed(0)} €`}
          sub={`${summary?.count_done ?? 0} mission${(summary?.count_done ?? 0) > 1 ? 's' : ''} terminée${(summary?.count_done ?? 0) > 1 ? 's' : ''}`}
          color="var(--c3)"
        />
        <EarnCard
          label="En attente de versement"
          value={`${pendingNet.toFixed(0)} €`}
          sub="Missions confirmées / en cours"
          color="var(--c1)"
        />
        <EarnCard
          label="Commission plateforme"
          value={`${commission.toFixed(0)} €`}
          sub={`${totalHt.toFixed(0)} € CA brut`}
          color="var(--c4)"
        />
      </div>

      {/* Monthly breakdown */}
      <section className="earn-section">
        <h2 className="earn-section-title">Historique mensuel (6 derniers mois)</h2>
        {monthly.length === 0 ? (
          <p className="fh-empty">Aucune mission terminée sur cette période.</p>
        ) : (
          <div className="earn-table-wrap">
            <table className="earn-table">
              <thead>
                <tr>
                  <th>Mois</th>
                  <th>Missions</th>
                  <th>Gains nets</th>
                </tr>
              </thead>
              <tbody>
                {monthly.map(m => (
                  <tr key={m.month}>
                    <td>{new Date(m.month + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</td>
                    <td>{m.count}</td>
                    <td className="earn-amount">{(Number(m.net) / 100).toFixed(0)} €</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <style>{`
        .fh-page { display: flex; flex-direction: column; gap: 2rem; max-width: 780px; }
        .fh-page-header { display: flex; flex-direction: column; gap: .3rem; }
        .fh-page-title { font-family: 'Fraunces', serif; font-size: 1.7rem; font-weight: 700; color: var(--dark); }
        .fh-page-sub { color: var(--text-mid); font-size: .9rem; }
        .fh-empty { color: var(--text-light); font-size: .9rem; }
        .earn-kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; }
        .earn-section { display: flex; flex-direction: column; gap: .8rem; }
        .earn-section-title { font-size: 1rem; font-weight: 600; color: var(--text); }
        .earn-table-wrap { overflow-x: auto; background: var(--white); border-radius: var(--radius); border: 1px solid var(--border); }
        .earn-table { width: 100%; border-collapse: collapse; font-size: .9rem; }
        .earn-table th { padding: .7rem 1rem; text-align: left; font-size: .75rem; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: var(--text-light); border-bottom: 1px solid var(--border); background: var(--bg); }
        .earn-table td { padding: .75rem 1rem; border-bottom: 1px solid var(--border); color: var(--text); }
        .earn-table tr:last-child td { border-bottom: none; }
        .earn-amount { font-weight: 700; color: var(--c3); }
      `}</style>
    </div>
  )
}

function EarnCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div style={{
      background: 'var(--white)', borderRadius: 'var(--radius)',
      border: '1px solid var(--border)', borderTop: `3px solid ${color}`,
      padding: '1.2rem 1rem', display: 'flex', flexDirection: 'column', gap: '.3rem',
    }}>
      <span style={{ fontFamily: "'Fraunces', serif", fontSize: '1.7rem', fontWeight: 700, color: 'var(--dark)' }}>{value}</span>
      <span style={{ fontSize: '.78rem', color: 'var(--text-light)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</span>
      {sub && <span style={{ fontSize: '.78rem', color: 'var(--text-light)', marginTop: '.1rem' }}>{sub}</span>}
    </div>
  )
}
