import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { query } from '@/lib/freelancehub/db'

export default async function ClientDashboard() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'client') redirect('/freelancehub/login')

  const userId = session.user.id

  const [stats] = await query<{
    total: number
    pending: number
    confirmed: number
    completed: number
  }>(
    `SELECT
       COUNT(*)                                          AS total,
       COUNT(*) FILTER (WHERE status = 'pending')       AS pending,
       COUNT(*) FILTER (WHERE status = 'confirmed')     AS confirmed,
       COUNT(*) FILTER (WHERE status = 'completed')     AS completed
     FROM freelancehub.bookings
     WHERE client_id = $1`,
    [userId]
  )

  const recentBookings = await query<{
    id: string
    status: string
    slot_date: string
    slot_time: string
    amount_ht: number | null
    skill_name: string | null
    revealed_at: string | null
  }>(
    `SELECT b.id, b.status, s.slot_date, s.slot_time,
            b.amount_ht, sk.name AS skill_name, b.revealed_at
     FROM freelancehub.bookings b
     JOIN freelancehub.slots s ON s.id = b.slot_id
     LEFT JOIN freelancehub.skills sk ON sk.id = b.skill_requested
     WHERE b.client_id = $1
     ORDER BY b.created_at DESC
     LIMIT 5`,
    [userId]
  )

  const name = session.user.name || session.user.email

  return (
    <div className="fh-page">
      <header className="fh-page-header">
        <div>
          <h1 className="fh-page-title">Bonjour, {name.split(' ')[0]} 👋</h1>
          <p className="fh-page-sub">Trouvez l&apos;expert idéal pour votre projet.</p>
        </div>
        <Link href="/freelancehub/client/search" className="fh-cta-btn">
          + Trouver un expert
        </Link>
      </header>

      <div className="fh-kpi-grid">
        <KpiCard label="Réservations"  value={String(stats?.total ?? 0)}     color="var(--c1)" />
        <KpiCard label="En attente"    value={String(stats?.pending ?? 0)}    color="var(--c2)" />
        <KpiCard label="Confirmées"    value={String(stats?.confirmed ?? 0)}  color="var(--c3)" />
        <KpiCard label="Terminées"     value={String(stats?.completed ?? 0)}  color="var(--c4)" />
      </div>

      <section className="fh-section">
        <h2 className="fh-section-title">Réservations récentes</h2>
        {recentBookings.length === 0 ? (
          <div className="fh-empty-state">
            <p>Aucune réservation pour le moment.</p>
            <Link href="/freelancehub/client/search" className="fh-link-btn">
              Parcourir les experts →
            </Link>
          </div>
        ) : (
          <div className="fh-booking-list">
            {recentBookings.map(b => (
              <div key={b.id} className="fh-booking-row">
                <div className="fh-booking-info">
                  <span className="fh-booking-skill">{b.skill_name ?? 'Expertise'}</span>
                  <span className="fh-booking-date">
                    {new Date(b.slot_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                    {' '}{b.slot_time?.slice(0,5)}
                  </span>
                </div>
                <div className="fh-booking-meta">
                  {b.amount_ht && (
                    <span className="fh-booking-amount">{(b.amount_ht / 100).toFixed(0)} €</span>
                  )}
                  <StatusBadge status={b.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <style>{`
        .fh-page { display: flex; flex-direction: column; gap: 2rem; max-width: 900px; }
        .fh-page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
        .fh-page-title { font-family: 'Fraunces', serif; font-size: 1.7rem; font-weight: 700; color: var(--dark); }
        .fh-page-sub { color: var(--text-mid); font-size: .95rem; margin-top: .3rem; }
        .fh-cta-btn { background: var(--c1); color: #fff; padding: .6rem 1.3rem; border-radius: var(--radius-sm); font-size: .9rem; font-weight: 600; text-decoration: none; white-space: nowrap; transition: background .15s; }
        .fh-cta-btn:hover { background: var(--c1-light); }
        .fh-kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 1rem; }
        .fh-section { display: flex; flex-direction: column; gap: .8rem; }
        .fh-section-title { font-size: 1rem; font-weight: 600; color: var(--text); }
        .fh-empty-state { color: var(--text-light); font-size: .9rem; display: flex; flex-direction: column; gap: .5rem; }
        .fh-link-btn { color: var(--c1); text-decoration: none; font-size: .9rem; }
        .fh-booking-list { display: flex; flex-direction: column; gap: .5rem; }
        .fh-booking-row { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: .75rem 1rem; background: var(--white); border: 1px solid var(--border); border-radius: var(--radius-sm); }
        .fh-booking-info { display: flex; flex-direction: column; gap: .15rem; }
        .fh-booking-skill { font-weight: 600; font-size: .9rem; color: var(--text); }
        .fh-booking-date { font-size: .82rem; color: var(--text-light); }
        .fh-booking-meta { display: flex; align-items: center; gap: .8rem; }
        .fh-booking-amount { font-size: .88rem; font-weight: 600; color: var(--text); }
      `}</style>
    </div>
  )
}

function KpiCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: 'var(--white)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', borderTop: `3px solid ${color}`, padding: '1.2rem 1rem', display: 'flex', flexDirection: 'column', gap: '.3rem' }}>
      <span style={{ fontFamily: "'Fraunces', serif", fontSize: '1.8rem', fontWeight: 700, color: 'var(--dark)' }}>{value}</span>
      <span style={{ fontSize: '.8rem', color: 'var(--text-light)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</span>
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
