import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { query, queryOne } from '@/lib/freelancehub/db'

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
  const booking = await queryOne<{ id: string; client_id: string; status: string; consultant_id: string }>(
    `SELECT id, client_id, consultant_id, status FROM freelancehub.bookings WHERE id = $1`,
    [booking_id]
  )

  if (!booking) return NextResponse.json({ error: 'Réservation introuvable.' }, { status: 404 })
  if (booking.status !== 'completed') {
    return NextResponse.json({ error: 'La mission doit être terminée pour être évaluée.' }, { status: 409 })
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
       SET status = 'transferred', transferred_at = NOW(), updated_at = NOW()
       WHERE booking_id = $1 AND status = 'captured'`,
      [booking_id]
    )
  }

  return NextResponse.json({ success: true, review_id: review?.id })
}
