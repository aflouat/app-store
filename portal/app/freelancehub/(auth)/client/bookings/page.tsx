import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { query } from '@/lib/freelancehub/db'
import Link from 'next/link'

export default async function ClientBookingsPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'client') redirect('/freelancehub/login')

  const userId = session.user.id

  const bookings = await query<{
    id: string
    booking_number: number | null
    status: string
    created_at: string
    slot_date: string
    slot_time: string
    skill_name: string | null
    amount_ht: number | null
    revealed_at: string | null
    matching_score: number | null
    notes: string | null
    consultant_title: string | null
    consultant_location: string | null
  }>(
    `SELECT b.id, b.booking_number, b.status, b.created_at,
            s.slot_date::text, s.slot_time::text,
            sk.name AS skill_name,
            b.amount_ht, b.revealed_at,
            b.matching_score, b.notes,
            c.title AS consultant_title,
            c.location AS consultant_location
     FROM freelancehub.bookings b
     JOIN freelancehub.slots s ON s.id = b.slot_id
     LEFT JOIN freelancehub.skills sk ON sk.id = b.skill_requested
     LEFT JOIN freelancehub.consultants c ON c.id = b.consultant_id
     WHERE b.client_id = $1
     ORDER BY b.created_at DESC`,
    [userId]
  )

  const STATUS_MAP: Record<string, { label: string; bg: string; color: string }> = {
    pending:     { label: 'En attente de paiement', bg: 'var(--c2-pale)', color: 'var(--text-mid)' },
    confirmed:   { label: 'Confirmée',   bg: 'var(--c3-pale)', color: 'var(--c3)' },
    in_progress: { label: 'En cours',    bg: 'var(--c1-pale)', color: 'var(--c1)' },
    completed:   { label: 'Terminée',    bg: 'var(--c4-pale)', color: 'var(--c4)' },
    cancelled:   { label: 'Annulée',     bg: '#f5f5f5',        color: '#999' },
    disputed:    { label: 'Litige',      bg: '#fef0f0',        color: '#c0392b' },
  }

  return (
    <div className="fh-page">
      <header className="fh-page-header">
        <div>
          <h1 className="fh-page-title">Mes réservations</h1>
          <p className="fh-page-sub">{bookings.length} réservation{bookings.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/freelancehub/client/search" className="fh-cta-btn">
          + Nouvelle réservation
        </Link>
      </header>

      {bookings.length === 0 ? (
        <div className="bk-empty">
          <p>Aucune réservation pour le moment.</p>
          <Link href="/freelancehub/client/search" className="fh-link">Trouver un expert →</Link>
        </div>
      ) : (
        <div className="bk-list">
          {bookings.map(b => {
            const s = STATUS_MAP[b.status] ?? STATUS_MAP.pending
            const isRevealed = !!b.revealed_at
            return (
              <div key={b.id} className="bk-card">
                <div className="bk-card-left">
                  <div className="bk-ref">
                    {b.booking_number ? `#${b.booking_number}` : ''}
                  </div>
                  <div className="bk-skill">{b.skill_name ?? 'Expertise'}</div>
                  <div className="bk-date">
                    {new Date(b.slot_date + 'T00:00:00').toLocaleDateString('fr-FR', {
                      weekday: 'long', day: 'numeric', month: 'long',
                    })}
                    {' '}{b.slot_time?.slice(0,5)}
                  </div>
                  {isRevealed && b.consultant_title && (
                    <div className="bk-consultant">
                      👤 {b.consultant_title}
                      {b.consultant_location && ` — ${b.consultant_location}`}
                    </div>
                  )}
                  {!isRevealed && b.status !== 'cancelled' && (
                    <div className="bk-anon">🔒 Consultant anonyme (identité révélée après paiement)</div>
                  )}
                  {b.matching_score && (
                    <div className="bk-score">Score de matching : {b.matching_score}/100</div>
                  )}
                </div>
                <div className="bk-card-right">
                  <span className="bk-badge" style={{ background: s.bg, color: s.color }}>
                    {s.label}
                  </span>
                  {b.amount_ht && (
                    <span className="bk-amount">{(b.amount_ht / 100).toFixed(0)} €</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <style>{`
        .fh-page { display: flex; flex-direction: column; gap: 1.5rem; max-width: 900px; }
        .fh-page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
        .fh-page-title { font-family: 'Fraunces', serif; font-size: 1.7rem; font-weight: 700; color: var(--dark); }
        .fh-page-sub { color: var(--text-mid); font-size: .9rem; margin-top: .2rem; }
        .fh-cta-btn { background: var(--c1); color: #fff; padding: .6rem 1.3rem; border-radius: var(--radius-sm); font-size: .88rem; font-weight: 600; text-decoration: none; white-space: nowrap; transition: background .15s; }
        .fh-cta-btn:hover { background: var(--c1-light); }
        .fh-link { color: var(--c1); text-decoration: none; font-size: .9rem; }
        .bk-empty { color: var(--text-light); font-size: .9rem; display: flex; flex-direction: column; gap: .5rem; }
        .bk-list { display: flex; flex-direction: column; gap: .8rem; }
        .bk-card { background: var(--white); border: 1px solid var(--border); border-radius: var(--radius); padding: 1.1rem 1.3rem; display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
        .bk-card-left { display: flex; flex-direction: column; gap: .3rem; flex: 1; }
        .bk-skill { font-weight: 600; font-size: .95rem; color: var(--text); }
        .bk-date { font-size: .85rem; color: var(--text-mid); text-transform: capitalize; }
        .bk-consultant { font-size: .83rem; color: var(--c3); }
        .bk-anon { font-size: .8rem; color: var(--text-light); font-style: italic; }
        .bk-ref { font-family: monospace; font-size: .78rem; font-weight: 700; color: var(--text-light); }
        .bk-score { font-size: .8rem; color: var(--text-light); }
        .bk-card-right { display: flex; flex-direction: column; align-items: flex-end; gap: .5rem; flex-shrink: 0; }
        .bk-badge { font-size: .78rem; font-weight: 600; padding: .25em .75em; border-radius: 20px; white-space: nowrap; }
        .bk-amount { font-size: .9rem; font-weight: 700; color: var(--text); }
      `}</style>
    </div>
  )
}
