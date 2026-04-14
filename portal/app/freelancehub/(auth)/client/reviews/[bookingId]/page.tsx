import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { queryOne } from '@/lib/freelancehub/db'
import ReviewForm from '@/components/freelancehub/ReviewForm'

export default async function ClientReviewPage({
  params,
}: {
  params: Promise<{ bookingId: string }>
}) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'client') redirect('/freelancehub/login')

  const { bookingId } = await params

  const booking = await queryOne<{
    id: string
    client_id: string
    consultant_id: string
    consultant_user_id: string
    status: string
    slot_date: string
    skill_name: string | null
    consultant_title: string | null
    already_reviewed: boolean
  }>(
    `SELECT b.id, b.client_id, b.consultant_id, c.user_id AS consultant_user_id, b.status,
            s.slot_date::text,
            sk.name AS skill_name,
            c.title AS consultant_title,
            EXISTS (
              SELECT 1 FROM freelancehub.reviews r
              WHERE r.booking_id = b.id AND r.reviewer_id = $2
            ) AS already_reviewed
     FROM freelancehub.bookings b
     JOIN freelancehub.slots s ON s.id = b.slot_id
     LEFT JOIN freelancehub.skills sk ON sk.id = b.skill_requested
     LEFT JOIN freelancehub.consultants c ON c.id = b.consultant_id
     WHERE b.id = $1`,
    [bookingId, session.user.id]
  )

  if (!booking || booking.client_id !== session.user.id) {
    redirect('/freelancehub/client/reviews')
  }

  if (booking.status !== 'completed') {
    return (
      <div className="fh-page">
        <h1 className="fh-page-title">Évaluation</h1>
        <p className="fh-notice">Cette mission n&apos;est pas encore terminée.</p>
        <style>{`.fh-page{display:flex;flex-direction:column;gap:1.5rem;max-width:600px} .fh-page-title{font-family:'Fraunces',serif;font-size:1.5rem;font-weight:700;color:var(--dark)} .fh-notice{color:var(--text-mid);font-size:.9rem;background:var(--bg);padding:1rem;border-radius:var(--radius-sm)}`}</style>
      </div>
    )
  }

  if (booking.already_reviewed) {
    redirect('/freelancehub/client/reviews')
  }

  return (
    <div className="fh-page">
      <header className="fh-page-header">
        <h1 className="fh-page-title">Évaluer cette mission</h1>
        <p className="fh-page-sub">
          {booking.skill_name ?? 'Mission'} ·{' '}
          {new Date(booking.slot_date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
        </p>
      </header>
      <ReviewForm
        bookingId={bookingId}
        reviewerId={session.user.id}
        reviewerRole="client"
        revieweeId={booking.consultant_user_id}
        redirectTo="/freelancehub/client/reviews"
        consultantTitle={booking.consultant_title}
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
