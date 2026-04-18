import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { query } from '@/lib/freelancehub/db'

export default async function ConsultantDashboard() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'consultant') redirect('/freelancehub/login')

  const userId = session.user.id

  // Fetch consultant summary stats
  const [profile] = await query<{
    title: string | null
    daily_rate: number | null
    rating: number
    rating_count: number
    is_verified: boolean
    kyc_status: string
  }>(
    `SELECT c.title, c.daily_rate, c.rating, c.rating_count, c.is_verified, c.kyc_status
     FROM freelancehub.consultants c
     WHERE c.user_id = $1`,
    [userId]
  )

  const [stats] = await query<{
    total: number
    confirmed: number
    completed: number
    pending: number
  }>(
    `SELECT
       COUNT(*)                                           AS total,
       COUNT(*) FILTER (WHERE status = 'confirmed')      AS confirmed,
       COUNT(*) FILTER (WHERE status = 'completed')      AS completed,
       COUNT(*) FILTER (WHERE status = 'pending')        AS pending
     FROM freelancehub.bookings b
     JOIN freelancehub.consultants c ON c.id = b.consultant_id
     WHERE c.user_id = $1`,
    [userId]
  )

  const earningsRow = await query<{ total_ht: number | null }>(
    `SELECT COALESCE(SUM(b.consultant_amount), 0) AS total_ht
     FROM freelancehub.bookings b
     JOIN freelancehub.consultants c ON c.id = b.consultant_id
     WHERE c.user_id = $1 AND b.status = 'completed'`,
    [userId]
  )
  const totalEarnings = (earningsRow[0]?.total_ht ?? 0) / 100

  const upcomingSlots = await query<{ slot_date: string; slot_time: string; status: string }>(
    `SELECT s.slot_date, s.slot_time, s.status
     FROM freelancehub.slots s
     JOIN freelancehub.consultants c ON c.id = s.consultant_id
     WHERE c.user_id = $1 AND s.slot_date >= CURRENT_DATE
     ORDER BY s.slot_date, s.slot_time
     LIMIT 5`,
    [userId]
  )

  const name = session.user.name || session.user.email

  return (
    <div className="fh-page">
      <header className="fh-page-header">
        <div>
          <h1 className="fh-page-title">Bonjour, {name.split(' ')[0]} 👋</h1>
          <p className="fh-page-sub">
            {profile?.title ?? 'Complétez votre profil pour attirer des clients'}
            {profile?.is_verified && (
              <span className="fh-verified-badge">✓ Vérifié</span>
            )}
          </p>
        </div>
        {profile?.daily_rate && (
          <div className="fh-rate-chip">TJM : {profile.daily_rate} €</div>
        )}
      </header>

      {/* KYC Banner */}
      {profile && profile.kyc_status !== 'validated' && (
        <KycBanner status={profile.kyc_status} />
      )}

      {/* KPI Cards */}
      <div className="fh-kpi-grid">
        <KpiCard label="Réservations totales" value={String(stats?.total ?? 0)} color="var(--c3)" />
        <KpiCard label="En attente"           value={String(stats?.pending ?? 0)}    color="var(--c1)" />
        <KpiCard label="Confirmées"           value={String(stats?.confirmed ?? 0)}  color="var(--c2)" />
        <KpiCard label="Gains cumulés"        value={`${totalEarnings.toFixed(0)} €`} color="var(--c4)" />
      </div>

      {/* Rating */}
      {profile && (
        <section className="fh-section">
          <h2 className="fh-section-title">Ma note</h2>
          <div className="fh-rating-row">
            <StarRating rating={profile.rating} />
            <span className="fh-rating-count">
              {Number(profile.rating).toFixed(1)} / 5 ({profile.rating_count} avis)
            </span>
          </div>
        </section>
      )}

      {/* Upcoming slots */}
      <section className="fh-section">
        <h2 className="fh-section-title">Prochains créneaux</h2>
        {upcomingSlots.length === 0 ? (
          <p className="fh-empty">Aucun créneau à venir. <a href="/freelancehub/consultant/agenda">Ajouter des disponibilités →</a></p>
        ) : (
          <div className="fh-slot-list">
            {upcomingSlots.map((s, i) => (
              <div key={i} className={`fh-slot-item fh-slot-${s.status}`}>
                <span className="fh-slot-date">
                  {new Date(s.slot_date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                </span>
                <span className="fh-slot-time">{s.slot_time.slice(0,5)}</span>
                <span className={`fh-slot-status`}>{s.status === 'available' ? 'Libre' : s.status === 'booked' ? 'Réservé' : 'Annulé'}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <style>{`
        .fh-page { display: flex; flex-direction: column; gap: 2rem; max-width: 900px; }
        .fh-page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
        .fh-page-title { font-family: 'Fraunces', serif; font-size: 1.7rem; font-weight: 700; color: var(--dark); }
        .fh-page-sub { color: var(--text-mid); font-size: .95rem; margin-top: .3rem; display: flex; align-items: center; gap: .5rem; }
        .fh-verified-badge { background: var(--c3-pale); color: var(--c3); font-size: .75rem; font-weight: 600; padding: .2em .6em; border-radius: 20px; }
        .fh-rate-chip { background: var(--c1-pale); color: var(--c1); font-size: .88rem; font-weight: 600; padding: .4em 1em; border-radius: 20px; white-space: nowrap; }
        .fh-kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 1rem; }
        .fh-section { display: flex; flex-direction: column; gap: .8rem; }
        .fh-section-title { font-size: 1rem; font-weight: 600; color: var(--text); }
        .fh-empty { color: var(--text-light); font-size: .9rem; }
        .fh-empty a { color: var(--c1); text-decoration: none; }
        .fh-rating-row { display: flex; align-items: center; gap: .8rem; }
        .fh-rating-count { color: var(--text-mid); font-size: .9rem; }
        .fh-slot-list { display: flex; flex-direction: column; gap: .5rem; }
        .fh-slot-item { display: flex; align-items: center; gap: 1rem; padding: .6rem 1rem; background: var(--white); border: 1px solid var(--border); border-radius: var(--radius-sm); }
        .fh-slot-date { font-size: .88rem; color: var(--text); flex: 1; text-transform: capitalize; }
        .fh-slot-time { font-weight: 600; font-size: .88rem; }
        .fh-slot-status { font-size: .78rem; padding: .2em .6em; border-radius: 20px; font-weight: 500; }
        .fh-slot-available .fh-slot-status { background: var(--c3-pale); color: var(--c3); }
        .fh-slot-booked .fh-slot-status { background: var(--c1-pale); color: var(--c1); }
        .fh-slot-cancelled .fh-slot-status { background: var(--c4-pale); color: var(--text-light); }
      `}</style>
    </div>
  )
}

function KycBanner({ status }: { status: string }) {
  const config = {
    none:     { bg: '#fffbeb', color: '#d97706', border: '#fde68a', msg: '⚠ Complétez votre KYC pour apparaître dans les résultats de recherche.', cta: 'Soumettre mon KYC →' },
    submitted:{ bg: '#f0f9ff', color: '#0369a1', border: '#bae6fd', msg: '⏳ Votre dossier KYC est en cours de validation (24-48h ouvrées).', cta: null },
    rejected: { bg: '#fdf0ef', color: '#c0392b', border: '#fca5a5', msg: '✗ Votre KYC a été refusé. Consultez les détails et soumettez un nouveau document.', cta: 'Voir les détails →' },
  }[status] ?? null

  if (!config) return null

  return (
    <div className="kyc-banner" style={{ background: config.bg, borderColor: config.border, color: config.color }}>
      <span>{config.msg}</span>
      {config.cta && (
        <a href="/freelancehub/consultant/kyc" className="kyc-banner-link" style={{ color: config.color }}>
          {config.cta}
        </a>
      )}
      <style>{`
        .kyc-banner { display: flex; align-items: center; gap: 1rem; padding: .75rem 1rem; border: 1px solid; border-radius: var(--radius-sm); font-size: .88rem; font-weight: 500; flex-wrap: wrap; }
        .kyc-banner-link { font-weight: 700; text-decoration: none; white-space: nowrap; }
        .kyc-banner-link:hover { text-decoration: underline; }
      `}</style>
    </div>
  )
}

function KpiCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="fh-kpi-card" style={{ borderTop: `3px solid ${color}` }}>
      <span className="fh-kpi-value">{value}</span>
      <span className="fh-kpi-label">{label}</span>
      <style>{`
        .fh-kpi-card { background: var(--white); border-radius: var(--radius); border: 1px solid var(--border); padding: 1.2rem 1rem; display: flex; flex-direction: column; gap: .3rem; }
        .fh-kpi-value { font-family: 'Fraunces', serif; font-size: 1.8rem; font-weight: 700; color: var(--dark); }
        .fh-kpi-label { font-size: .8rem; color: var(--text-light); font-weight: 500; text-transform: uppercase; letter-spacing: .04em; }
      `}</style>
    </div>
  )
}

function StarRating({ rating }: { rating: number }) {
  const r = Number(rating)
  return (
    <div style={{ display: 'flex', gap: '2px' }}>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ color: i <= Math.round(r) ? '#e8b84b' : '#e2deda', fontSize: '1.2rem' }}>★</span>
      ))}
    </div>
  )
}
