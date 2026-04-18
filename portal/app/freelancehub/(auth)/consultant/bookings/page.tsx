import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { query, queryOne } from '@/lib/freelancehub/db'
import BookingAction from '@/components/freelancehub/consultant/BookingAction'

export default async function ConsultantBookingsPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'consultant') redirect('/freelancehub/login')

  const userId = session.user.id

  const consultant = await queryOne<{ id: string }>(
    `SELECT id FROM freelancehub.consultants WHERE user_id = $1`,
    [userId]
  )

  const ndaSigned = !!(await queryOne(
    `SELECT id FROM freelancehub.signatures
     WHERE user_id = $1 AND document_type = 'NDA' LIMIT 1`,
    [userId]
  ))

  if (!consultant) {
    return (
      <div className="fh-page">
        <h1 className="fh-page-title">Réservations</h1>
        <p className="fh-notice">Complétez d&apos;abord votre <a href="/freelancehub/consultant/profile">profil</a>.</p>
        <style>{`
          .fh-page { display: flex; flex-direction: column; gap: 1.5rem; max-width: 900px; }
          .fh-page-title { font-family: 'Fraunces', serif; font-size: 1.7rem; font-weight: 700; color: var(--dark); }
          .fh-notice { background: var(--c1-pale); color: var(--c1); padding: 1rem; border-radius: var(--radius-sm); font-size: .9rem; }
          .fh-notice a { color: var(--c1); font-weight: 600; }
        `}</style>
      </div>
    )
  }

  const bookings = await query<{
    id: string
    booking_number: number | null
    status: string
    created_at: string
    slot_date: string
    slot_time: string
    skill_name: string | null
    amount_ht: number | null
    consultant_amount: number | null
    notes: string | null
    revealed_at: string | null
  }>(
    `SELECT b.id, b.booking_number, b.status, b.created_at,
            s.slot_date::text, s.slot_time::text,
            sk.name AS skill_name,
            b.amount_ht, b.consultant_amount,
            b.notes, b.revealed_at
     FROM freelancehub.bookings b
     JOIN freelancehub.slots s ON s.id = b.slot_id
     LEFT JOIN freelancehub.skills sk ON sk.id = b.skill_requested
     WHERE b.consultant_id = $1
     ORDER BY s.slot_date DESC, s.slot_time DESC`,
    [consultant.id]
  )

  const STATUS_MAP: Record<string, { label: string; bg: string; color: string }> = {
    pending:     { label: 'En attente',  bg: 'var(--c2-pale)', color: 'var(--text-mid)' },
    confirmed:   { label: 'Confirmée',  bg: 'var(--c3-pale)', color: 'var(--c3)' },
    in_progress: { label: 'En cours',   bg: 'var(--c1-pale)', color: 'var(--c1)' },
    completed:   { label: 'Terminée',   bg: 'var(--c4-pale)', color: 'var(--c4)' },
    cancelled:   { label: 'Annulée',    bg: '#f5f5f5',        color: '#999' },
    disputed:    { label: 'Litige',     bg: '#fef0f0',        color: '#c0392b' },
  }

  return (
    <div className="fh-page">
      <header className="fh-page-header">
        <h1 className="fh-page-title">Réservations</h1>
        <p className="fh-page-sub">{bookings.length} réservation{bookings.length !== 1 ? 's' : ''} au total</p>
      </header>

      {!ndaSigned && (
        <div className="nda-banner">
          <span>⚠ Vous devez signer le NDA avant de pouvoir démarrer une mission.</span>
          <a href="/freelancehub/consultant/nda" className="nda-banner-cta">Lire et signer le NDA →</a>
        </div>
      )}

      {bookings.length === 0 ? (
        <p className="fh-empty">Aucune réservation pour le moment. Assurez-vous d&apos;avoir des créneaux disponibles.</p>
      ) : (
        <div className="bk-table-wrap">
          <table className="bk-table">
            <thead>
              <tr>
                <th>#N°</th>
                <th>Date</th>
                <th>Heure</th>
                <th>Expertise</th>
                <th>Montant (vous)</th>
                <th>Statut</th>
                <th>Action</th>
                <th>Note client</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map(b => {
                const s = STATUS_MAP[b.status] ?? STATUS_MAP.pending
                return (
                  <tr key={b.id}>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '.82rem', color: 'var(--text-mid)' }}>
                        #{b.booking_number ?? '—'}
                      </span>
                    </td>
                    <td>
                      {new Date(b.slot_date + 'T00:00:00').toLocaleDateString('fr-FR', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </td>
                    <td>{b.slot_time?.slice(0,5)}</td>
                    <td>{b.skill_name ?? '—'}</td>
                    <td>
                      {b.consultant_amount
                        ? `${(b.consultant_amount / 100).toFixed(0)} €`
                        : '—'}
                    </td>
                    <td>
                      <span
                        className="bk-badge"
                        style={{ background: s.bg, color: s.color }}
                      >
                        {s.label}
                      </span>
                    </td>
                    <td>
                      <BookingAction bookingId={b.id} currentStatus={b.status} />
                    </td>
                    <td className="bk-notes">{b.notes || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <style>{`
        .fh-page { display: flex; flex-direction: column; gap: 1.5rem; }
        .fh-page-header { display: flex; flex-direction: column; gap: .3rem; }
        .fh-page-title { font-family: 'Fraunces', serif; font-size: 1.7rem; font-weight: 700; color: var(--dark); }
        .fh-page-sub { color: var(--text-mid); font-size: .9rem; }
        .fh-empty { color: var(--text-light); font-size: .9rem; }
        .bk-table-wrap { overflow-x: auto; background: var(--white); border-radius: var(--radius); border: 1px solid var(--border); }
        .bk-table { width: 100%; border-collapse: collapse; font-size: .88rem; }
        .bk-table th { padding: .75rem 1rem; text-align: left; font-size: .75rem; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: var(--text-light); border-bottom: 1px solid var(--border); background: var(--bg); white-space: nowrap; }
        .bk-table td { padding: .75rem 1rem; border-bottom: 1px solid var(--border); color: var(--text); vertical-align: top; }
        .bk-table tr:last-child td { border-bottom: none; }
        .bk-table tbody tr:hover { background: var(--bg); }
        .bk-badge { font-size: .78rem; font-weight: 600; padding: .25em .7em; border-radius: 20px; white-space: nowrap; }
        .bk-notes { max-width: 200px; font-size: .82rem; color: var(--text-mid); white-space: pre-wrap; word-break: break-word; }
        .nda-banner { display: flex; align-items: center; gap: 1rem; padding: .75rem 1rem; background: #fffbeb; border: 1px solid #fde68a; border-radius: var(--radius-sm); font-size: .88rem; color: #d97706; font-weight: 500; flex-wrap: wrap; }
        .nda-banner-cta { font-weight: 700; color: #d97706; text-decoration: none; white-space: nowrap; }
        .nda-banner-cta:hover { text-decoration: underline; }
      `}</style>
    </div>
  )
}
