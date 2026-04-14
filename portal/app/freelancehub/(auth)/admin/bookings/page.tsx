import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { query } from '@/lib/freelancehub/db'
import BookingsTable from '@/components/freelancehub/admin/BookingsTable'
import type { BookingRow } from '@/components/freelancehub/admin/BookingsTable'

export default async function AdminBookingsPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') redirect('/freelancehub/login')

  const bookings = await query<BookingRow>(
    `SELECT b.id, b.booking_number, b.status, b.created_at,
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
     LIMIT 500`
  )

  return (
    <div className="fh-page">
      <header className="fh-page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 className="fh-page-title">Transactions comptables</h1>
            <p className="fh-page-sub">{bookings.length} réservation{bookings.length !== 1 ? 's' : ''} chargées</p>
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

      <BookingsTable bookings={bookings} />

      <style>{`
        .fh-page { display: flex; flex-direction: column; gap: 1.5rem; }
        .fh-page-header { display: flex; flex-direction: column; gap: .3rem; }
        .fh-page-title { font-family: 'Fraunces', serif; font-size: 1.7rem; font-weight: 700; color: var(--dark); }
        .fh-page-sub { color: var(--text-mid); font-size: .9rem; }
        .adm-export-btn {
          font-size: .82rem; color: var(--c3); background: none;
          border: 1px solid var(--c3); border-radius: 6px;
          padding: .4em 1em; text-decoration: none; white-space: nowrap;
          transition: background .12s, color .12s;
        }
        .adm-export-btn:hover { background: var(--c3); color: #fff; }
      `}</style>
    </div>
  )
}
