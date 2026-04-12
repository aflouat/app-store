import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { query } from '@/lib/freelancehub/db'
import BookingStatusAction from '@/components/freelancehub/admin/BookingStatusAction'

export default async function AdminBookingsPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') redirect('/freelancehub/login')

  const bookings = await query<{
    id: string
    status: string
    created_at: string
    slot_date: string
    slot_time: string
    amount_ht: number | null
    commission_amount: number | null
    matching_score: number | null
    client_name: string | null
    client_email: string
    consultant_title: string | null
    consultant_name: string | null
    skill_name: string | null
  }>(
    `SELECT b.id, b.status, b.created_at,
            s.slot_date::text, s.slot_time::text,
            b.amount_ht, b.commission_amount, b.matching_score,
            uc.name AS client_name, uc.email AS client_email,
            c.title AS consultant_title, uc2.name AS consultant_name,
            sk.name AS skill_name
     FROM freelancehub.bookings b
     JOIN freelancehub.slots s ON s.id = b.slot_id
     JOIN freelancehub.users uc ON uc.id = b.client_id
     JOIN freelancehub.consultants c ON c.id = b.consultant_id
     JOIN freelancehub.users uc2 ON uc2.id = c.user_id
     LEFT JOIN freelancehub.skills sk ON sk.id = b.skill_requested
     ORDER BY b.created_at DESC
     LIMIT 100`
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 className="fh-page-title">Gestion des réservations</h1>
            <p className="fh-page-sub">{bookings.length} réservation{bookings.length !== 1 ? 's' : ''}</p>
          </div>
          <a
            href="/api/freelancehub/admin/export-csv"
            download
            className="adm-export-btn"
          >
            ↓ Export CSV
          </a>
        </div>
      </header>

      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Client</th>
              <th>Consultant</th>
              <th>Expertise</th>
              <th>Montant HT</th>
              <th>Commission</th>
              <th>Score</th>
              <th>Statut</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map(b => {
              const s = STATUS_MAP[b.status] ?? STATUS_MAP.pending
              return (
                <tr key={b.id}>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '.1rem' }}>
                      <span>{new Date(b.slot_date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                      <span style={{ fontSize: '.78rem', color: 'var(--text-light)' }}>{b.slot_time?.slice(0,5)}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '.1rem' }}>
                      <span style={{ fontWeight: 600 }}>{b.client_name ?? '—'}</span>
                      <span style={{ fontSize: '.75rem', color: 'var(--text-light)' }}>{b.client_email}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '.1rem' }}>
                      <span style={{ fontWeight: 600 }}>{b.consultant_name ?? '—'}</span>
                      <span style={{ fontSize: '.75rem', color: 'var(--text-light)' }}>{b.consultant_title ?? ''}</span>
                    </div>
                  </td>
                  <td>{b.skill_name ?? '—'}</td>
                  <td>{b.amount_ht ? `${(b.amount_ht / 100).toFixed(0)} €` : '—'}</td>
                  <td>{b.commission_amount ? `${(b.commission_amount / 100).toFixed(0)} €` : '—'}</td>
                  <td>{b.matching_score ? `${b.matching_score}` : '—'}</td>
                  <td>
                    <span className="adm-badge" style={{ background: s.bg, color: s.color }}>
                      {s.label}
                    </span>
                  </td>
                  <td>
                    <BookingStatusAction bookingId={b.id} currentStatus={b.status} />
                  </td>
                </tr>
              )
            })}
            {bookings.length === 0 && (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-light)', padding: '2rem' }}>
                  Aucune réservation.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <style>{`
        .fh-page { display: flex; flex-direction: column; gap: 1.5rem; }
        .fh-page-header { display: flex; flex-direction: column; gap: .3rem; }
        .adm-export-btn {
          font-size: .82rem; color: var(--c3); background: none;
          border: 1px solid var(--c3); border-radius: 6px;
          padding: .4em 1em; text-decoration: none; white-space: nowrap;
          transition: background .12s, color .12s;
        }
        .adm-export-btn:hover { background: var(--c3); color: #fff; }
        .fh-page-title { font-family: 'Fraunces', serif; font-size: 1.7rem; font-weight: 700; color: var(--dark); }
        .fh-page-sub { color: var(--text-mid); font-size: .9rem; }
        .adm-table-wrap { overflow-x: auto; background: var(--white); border-radius: var(--radius); border: 1px solid var(--border); }
        .adm-table { width: 100%; border-collapse: collapse; font-size: .86rem; }
        .adm-table th { padding: .65rem .85rem; text-align: left; font-size: .73rem; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: var(--text-light); border-bottom: 1px solid var(--border); background: var(--bg); white-space: nowrap; }
        .adm-table td { padding: .7rem .85rem; border-bottom: 1px solid var(--border); color: var(--text); vertical-align: middle; }
        .adm-table tr:last-child td { border-bottom: none; }
        .adm-table tbody tr:hover { background: var(--bg); }
        .adm-badge { font-size: .75rem; font-weight: 600; padding: .22em .65em; border-radius: 20px; white-space: nowrap; }
      `}</style>
    </div>
  )
}
