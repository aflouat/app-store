import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { query, queryOne } from '@/lib/freelancehub/db'
import { sendReviewRequest, sendFundRelease } from '@/lib/freelancehub/email'
import { createNotification } from '@/lib/freelancehub/notifications'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { booking_id, reviewer_id, reviewee_id, reviewer_role, rating, comment } = await req.json()

  if (reviewer_id !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Note invalide (1-5).' }, { status: 400 })
  }

  // Verify booking is completed and reviewer is a participant
  const booking = await queryOne<{
    id: string; client_id: string; status: string; consultant_id: string; consultant_user_id: string
  }>(
    `SELECT b.id, b.client_id, b.consultant_id, b.status, c.user_id AS consultant_user_id
     FROM freelancehub.bookings b
     JOIN freelancehub.consultants c ON c.id = b.consultant_id
     WHERE b.id = $1`,
    [booking_id]
  )

  if (!booking) return NextResponse.json({ error: 'Réservation introuvable.' }, { status: 404 })
  if (booking.status !== 'completed') {
    return NextResponse.json({ error: 'La mission doit être terminée pour être évaluée.' }, { status: 409 })
  }

  // Ensure the session user is actually a participant in this booking
  const isParticipant =
    (reviewer_role === 'client'      && session.user.id === booking.client_id) ||
    (reviewer_role === 'consultant'  && session.user.id === booking.consultant_user_id)
  if (!isParticipant) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Check not already reviewed
  const existing = await queryOne<{ id: string }>(
    `SELECT id FROM freelancehub.reviews WHERE booking_id = $1 AND reviewer_id = $2`,
    [booking_id, reviewer_id]
  )
  if (existing) {
    return NextResponse.json({ error: 'Vous avez déjà évalué cette mission.' }, { status: 409 })
  }

  // Insert review
  const review = await queryOne<{ id: string }>(
    `INSERT INTO freelancehub.reviews
       (booking_id, reviewer_id, reviewee_id, reviewer_role, rating, comment)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [booking_id, reviewer_id, reviewee_id, reviewer_role, rating, comment ?? null]
  )

  // Update consultant rating if this is a client review
  if (reviewer_role === 'client') {
    await query(
      `UPDATE freelancehub.consultants c
       SET rating       = (
             SELECT ROUND(AVG(r.rating)::numeric, 2)
             FROM freelancehub.reviews r
             WHERE r.reviewee_id = c.user_id AND r.reviewer_role = 'client' AND r.is_validated = true
           ),
           rating_count = (
             SELECT COUNT(*)
             FROM freelancehub.reviews r
             WHERE r.reviewee_id = c.user_id AND r.reviewer_role = 'client' AND r.is_validated = true
           )
       WHERE c.user_id = $1`,
      [reviewee_id]
    )
  }

  // Auto-validate immediately (in production: 48h window)
  await query(
    `UPDATE freelancehub.reviews SET is_validated = true WHERE id = $1`,
    [review?.id]
  )

  // If both parties have reviewed, trigger fund release
  const reviewCount = await queryOne<{ count: number }>(
    `SELECT COUNT(*)::int AS count FROM freelancehub.reviews WHERE booking_id = $1`,
    [booking_id]
  )
  if ((reviewCount?.count ?? 0) >= 2) {
    await query(
      `UPDATE freelancehub.payments
       SET status = 'transferred', transferred_at = NOW(), updated_at = NOW(),
           notes = COALESCE(notes, 'payout_pending_manual')
       WHERE booking_id = $1 AND status = 'captured'`,
      [booking_id]
    )
    // Notify consultant of fund release (fire-and-forget)
    try {
      const fundInfo = await queryOne<{
        consultant_email: string; consultant_name: string | null; consultant_net: number
      }>(
        `SELECT uc2.email AS consultant_email, uc2.name AS consultant_name,
                b.consultant_amount AS consultant_net
         FROM freelancehub.bookings b
         JOIN freelancehub.consultants c ON c.id = b.consultant_id
         JOIN freelancehub.users uc2 ON uc2.id = c.user_id
         WHERE b.id = $1`,
        [booking_id]
      )
      if (fundInfo) {
        if (process.env.RESEND_API_KEY) {
          await sendFundRelease(
            fundInfo.consultant_email,
            fundInfo.consultant_name ?? 'Consultant',
            fundInfo.consultant_net,
            booking_id
          )
        }
        await createNotification(
          booking.consultant_user_id,
          'fund_released',
          'Paiement versé',
          `${(fundInfo.consultant_net / 100).toFixed(0)} € transférés sur votre compte.`,
          { booking_id }
        )
      }
    } catch (emailErr) { console.error('[reviews] fund/notif error:', emailErr) }
  } else {
    // Send review request to the other party (fire-and-forget)
    try {
      const otherUserId  = reviewer_role === 'client' ? booking.consultant_user_id : booking.client_id
      const otherUser = await queryOne<{ id: string; email: string; name: string | null; role: string }>(
        `SELECT u.id, u.email, u.name,
                CASE WHEN u.id = (SELECT user_id FROM freelancehub.consultants WHERE id = $2)
                  THEN 'consultant' ELSE 'client' END AS role
         FROM freelancehub.users u WHERE u.id = $1`,
        [otherUserId, booking.consultant_id]
      )
      if (otherUser) {
        const otherRole = otherUser.role as 'client' | 'consultant'
        if (process.env.RESEND_API_KEY) {
          await sendReviewRequest(booking_id, otherUser.email, otherUser.name ?? '', otherRole)
        }
        await createNotification(
          otherUser.id,
          'review_request',
          'Évaluez votre mission',
          'Votre mission est terminée. Partagez votre expérience.',
          { booking_id }
        )
      }
    } catch (emailErr) { console.error('[reviews] email error:', emailErr) }
  }

  return NextResponse.json({ success: true, review_id: review?.id })
}
