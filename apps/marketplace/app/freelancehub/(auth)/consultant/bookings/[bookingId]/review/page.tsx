import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { queryOne } from '@/lib/freelancehub/db'
import ReviewForm from '@/components/freelancehub/ReviewForm'

export default async function ConsultantReviewPage({
  params,
}: {
  params: Promise<{ bookingId: string }>
}) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'consultant') redirect('/freelancehub/login')

  const { bookingId } = await params
  const userId = session.user.id

  const booking = await queryOne<{
    id: string
    client_id: string
    client_name: string | null
    status: string
    slot_date: string
    skill_name: string | null
    consultant_user_id: string
    already_reviewed: boolean
  }>(
    `SELECT b.id, b.client_id, uc.name AS client_name, b.status,
            s.slot_date::text,
            sk.name AS skill_name,
            c.user_id AS consultant_user_id,
            EXISTS (
              SELECT 1 FROM freelancehub.reviews r
              WHERE r.booking_id = b.id AND r.reviewer_id = $2
            ) AS already_reviewed
     FROM freelancehub.bookings b
     JOIN freelancehub.consultants c ON c.id = b.consultant_id
     JOIN freelancehub.slots s ON s.id = b.slot_id
     JOIN freelancehub.users uc ON uc.id = b.client_id
     LEFT JOIN freelancehub.skills sk ON sk.id = b.skill_requested
     WHERE b.id = $1 AND c.user_id = $2`,
    [bookingId, userId]
  )

  if (!booking) redirect('/freelancehub/consultant/bookings')
  if (booking.status !== 'completed' || booking.already_reviewed) {
    redirect('/freelancehub/consultant/bookings')
  }

  return (
    <div className="fh-page">
      <header className="fh-page-header">
        <h1 className="fh-page-title">Évaluer le client</h1>
        <p className="fh-page-sub">
          {booking.skill_name ?? 'Mission'} ·{' '}
          {new Date(booking.slot_date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
        </p>
      </header>
      <ReviewForm
        bookingId={bookingId}
        reviewerId={userId}
        reviewerRole="consultant"
        revieweeId={booking.client_id}
        redirectTo="/freelancehub/consultant/bookings"
      />
      <style>{`
        .fh-page { display: flex; flex-direction: column; gap: 1.5rem; max-width: 600px; }
        .fh-page-header { display: flex; flex-direction: column; gap: .3rem; }
        .fh-page-title { font-family: 'Fraunces', serif; font-size: 1.5rem; font-weight: 700; color: var(--dark); }
        .fh-page-sub { color: var(--text-mid); font-size: .9rem; }
      `}</style>
    </div>
  )
}
