import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { query } from '@/lib/freelancehub/db'

export default async function AdminMatchingPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') redirect('/freelancehub/login')

  // Stats on matching quality
  const [stats] = await query<{
    avg_score: number | null
    min_score: number | null
    max_score: number | null
    count_with_score: number
    count_converted: number
  }>(
    `SELECT
       ROUND(AVG(matching_score), 1) AS avg_score,
       MIN(matching_score)           AS min_score,
       MAX(matching_score)           AS max_score,
       COUNT(*) FILTER (WHERE matching_score IS NOT NULL)::int AS count_with_score,
       COUNT(*) FILTER (WHERE matching_score IS NOT NULL AND status NOT IN ('pending','cancelled'))::int AS count_converted
     FROM freelancehub.bookings`
  )

  // Top skills requested
  const topSkills = await query<{ name: string; count: number; avg_score: number | null }>(
    `SELECT sk.name, COUNT(*)::int AS count,
            ROUND(AVG(b.matching_score), 1) AS avg_score
     FROM freelancehub.bookings b
     JOIN freelancehub.skills sk ON sk.id = b.skill_requested
     WHERE b.skill_requested IS NOT NULL
     GROUP BY sk.name
     ORDER BY count DESC
     LIMIT 8`
  )

  // Score distribution
  const distribution = await query<{ range: string; count: number }>(
    `SELECT
       CASE
         WHEN matching_score >= 80 THEN '80-100 (Excellent)'
         WHEN matching_score >= 60 THEN '60-79  (Bon)'
         WHEN matching_score >= 40 THEN '40-59  (Moyen)'
         ELSE                           '0-39   (Faible)'
       END AS range,
       COUNT(*)::int AS count
     FROM freelancehub.bookings
     WHERE matching_score IS NOT NULL
     GROUP BY range
     ORDER BY range`
  )

  const conversionRate = stats?.count_with_score
    ? Math.round((stats.count_converted / stats.count_with_score) * 100)
    : 0

  return (
    <div className="fh-page">
      <header className="fh-page-header">
        <h1 className="fh-page-title">Matching Engine</h1>
        <p className="fh-page-sub">
          Algorithme : 40% compétence · 30% réputation · 20% disponibilité · 10% prix
        </p>
      </header>

      <div className="match-kpi-grid">
        <KpiCard label="Score moyen"         value={stats?.avg_score ? `${stats.avg_score}/100` : '—'} color="var(--c1)" />
        <KpiCard label="Score max"           value={stats?.max_score ? `${stats.max_score}` : '—'}     color="var(--c3)" />
        <KpiCard label="Taux de conversion"  value={`${conversionRate}%`}                               color="var(--c2)" />
        <KpiCard label="Matchings effectués" value={String(stats?.count_with_score ?? 0)}               color="var(--c4)" />
      </div>

      <div className="match-grid-2">
        {/* Skills distribution */}
        <section className="match-section">
          <h2 className="match-section-title">Compétences les plus demandées</h2>
          <div className="match-skill-bars">
            {topSkills.length === 0 ? (
              <p className="fh-empty">Aucune donnée.</p>
            ) : (
              topSkills.map(s => {
                const max = topSkills[0].count
                const pct = Math.round((s.count / max) * 100)
                return (
                  <div key={s.name} className="match-bar-row">
                    <span className="match-bar-label">{s.name}</span>
                    <div className="match-bar-track">
                      <div className="match-bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="match-bar-count">{s.count}</span>
                    <span className="match-bar-avg">{s.avg_score ? `Ø ${s.avg_score}` : ''}</span>
                  </div>
                )
              })
            )}
          </div>
        </section>

        {/* Score distribution */}
        <section className="match-section">
          <h2 className="match-section-title">Distribution des scores</h2>
          <div className="match-dist-list">
            {distribution.length === 0 ? (
              <p className="fh-empty">Aucune donnée.</p>
            ) : (
              distribution.map(d => (
                <div key={d.range} className="match-dist-row">
                  <code className="match-dist-range">{d.range}</code>
                  <span className="match-dist-count">{d.count} matching{d.count > 1 ? 's' : ''}</span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Algorithm explanation */}
      <section className="match-algo-card">
        <h2 className="match-section-title">Formule de scoring</h2>
        <pre className="match-algo-formula">{`score = 0.40 × skill_match
      + 0.30 × rating_score
      + 0.20 × availability_score
      + 0.10 × price_competitiveness`}</pre>
        <div className="match-algo-legend">
          <LegendItem label="skill_match"           desc="Score basé sur le niveau de compétence (junior=40, expert=100)" />
          <LegendItem label="rating_score"          desc="Note consultant normalisée sur 100 (rating / 5 × 100)" />
          <LegendItem label="availability_score"    desc="Nombre de créneaux disponibles × 10, plafonné à 100" />
          <LegendItem label="price_competitiveness" desc="TJM relatif : consultant le moins cher = 100, le plus cher = 0" />
        </div>
      </section>

      <style>{`
        .fh-page { display: flex; flex-direction: column; gap: 2rem; }
        .fh-page-header { display: flex; flex-direction: column; gap: .3rem; }
        .fh-page-title { font-family: 'Fraunces', serif; font-size: 1.7rem; font-weight: 700; color: var(--dark); }
        .fh-page-sub { color: var(--text-mid); font-size: .9rem; }
        .fh-empty { color: var(--text-light); font-size: .9rem; }
        .match-kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 1rem; }
        .match-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
        @media (max-width: 700px) { .match-grid-2 { grid-template-columns: 1fr; } }
        .match-section { background: var(--white); border: 1px solid var(--border); border-radius: var(--radius); padding: 1.3rem; display: flex; flex-direction: column; gap: 1rem; }
        .match-section-title { font-size: .95rem; font-weight: 600; color: var(--text); }
        .match-bar-row { display: grid; grid-template-columns: 130px 1fr 30px 50px; align-items: center; gap: .6rem; font-size: .82rem; }
        .match-bar-label { color: var(--text-mid); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .match-bar-track { background: var(--border); border-radius: 10px; height: 6px; overflow: hidden; }
        .match-bar-fill { height: 100%; background: var(--c1); border-radius: 10px; transition: width .3s; }
        .match-bar-count { font-weight: 700; color: var(--text); text-align: right; }
        .match-bar-avg { font-size: .75rem; color: var(--text-light); }
        .match-dist-list { display: flex; flex-direction: column; gap: .6rem; }
        .match-dist-row { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: .5rem .75rem; background: var(--bg); border-radius: var(--radius-sm); font-size: .85rem; }
        .match-dist-range { font-family: 'Courier New', monospace; font-size: .8rem; color: var(--text); }
        .match-dist-count { color: var(--text-mid); }
        .match-algo-card { background: var(--white); border: 1px solid var(--border); border-radius: var(--radius); padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
        .match-algo-formula { background: var(--bg); border-radius: var(--radius-sm); padding: 1rem 1.2rem; font-size: .88rem; color: var(--text); font-family: 'Courier New', monospace; line-height: 1.8; }
        .match-algo-legend { display: flex; flex-direction: column; gap: .5rem; }
        .legend-row { display: flex; gap: .7rem; font-size: .85rem; }
        .legend-key { font-family: 'Courier New', monospace; font-size: .8rem; color: var(--c1); background: var(--c1-pale); padding: .1em .5em; border-radius: 4px; white-space: nowrap; align-self: flex-start; }
        .legend-desc { color: var(--text-mid); line-height: 1.4; }
      `}</style>
    </div>
  )
}

function KpiCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: 'var(--white)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', borderTop: `3px solid ${color}`, padding: '1.2rem 1rem', display: 'flex', flexDirection: 'column', gap: '.3rem' }}>
      <span style={{ fontFamily: "'Fraunces', serif", fontSize: '1.6rem', fontWeight: 700, color: 'var(--dark)' }}>{value}</span>
      <span style={{ fontSize: '.78rem', color: 'var(--text-light)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</span>
    </div>
  )
}

function LegendItem({ label, desc }: { label: string; desc: string }) {
  return (
    <div className="legend-row">
      <span className="legend-key">{label}</span>
      <span className="legend-desc">{desc}</span>
    </div>
  )
}
