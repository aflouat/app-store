import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { queryOne } from '@/lib/freelancehub/db'

// Demo payment endpoint — in production this would use Stripe PaymentIntents
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'client') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: bookingId } = await params

  const booking = await queryOne<{ id: string; client_id: string; status: string }>(
    `SELECT id, client_id, status FROM freelancehub.bookings WHERE id = $1`,
    [bookingId]
  )

  if (!booking) return NextResponse.json({ error: 'Réservation introuvable.' }, { status: 404 })
  if (booking.client_id !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (booking.status !== 'pending') {
    return NextResponse.json({ error: 'Cette réservation ne peut plus être payée.' }, { status: 409 })
  }

  // Simulate Stripe payment capture — set status to confirmed + reveal consultant
  const updated = await queryOne<{ id: string }>(
    `UPDATE freelancehub.bookings
     SET status = 'confirmed', revealed_at = NOW(), updated_at = NOW()
     WHERE id = $1
     RETURNING id`,
    [bookingId]
  )

  if (!updated) return NextResponse.json({ error: 'Mise à jour impossible.' }, { status: 500 })

  // Create payment record
  await queryOne(
    `INSERT INTO freelancehub.payments
       (booking_id, stripe_payment_id, amount, status, authorized_at, captured_at)
     SELECT id, 'pi_demo_' || substr(id::text,1,8), amount_ht, 'captured', NOW(), NOW()
     FROM freelancehub.bookings WHERE id = $1`,
    [bookingId]
  )

  return NextResponse.json({ success: true, booking_id: bookingId })
}
