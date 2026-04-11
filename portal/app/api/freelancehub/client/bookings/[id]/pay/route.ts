import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { queryOne } from '@/lib/freelancehub/db'
import { sendBookingConfirmation } from '@/lib/freelancehub/email'

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

  // Send confirmation emails (fire-and-forget — don't block response)
  try {
    const details = await queryOne<{
      client_name: string | null; client_email: string
      consultant_name: string | null; consultant_email: string
      skill_name: string | null; slot_date: string; slot_time: string; amount_ht: number
    }>(
      `SELECT uc.name AS client_name, uc.email AS client_email,
              uc2.name AS consultant_name, uc2.email AS consultant_email,
              sk.name AS skill_name, s.slot_date::text, s.slot_time::text, b.amount_ht
       FROM freelancehub.bookings b
       JOIN freelancehub.users uc ON uc.id = b.client_id
       JOIN freelancehub.consultants c ON c.id = b.consultant_id
       JOIN freelancehub.users uc2 ON uc2.id = c.user_id
       JOIN freelancehub.slots s ON s.id = b.slot_id
       LEFT JOIN freelancehub.skills sk ON sk.id = b.skill_requested
       WHERE b.id = $1`,
      [bookingId]
    )
    if (details && process.env.RESEND_API_KEY) {
      await sendBookingConfirmation({
        bookingId,
        clientName:      details.client_name ?? 'Client',
        clientEmail:     details.client_email,
        consultantName:  details.consultant_name ?? 'Consultant',
        consultantEmail: details.consultant_email,
        skillName:       details.skill_name ?? 'Expertise',
        slotDate:        details.slot_date,
        slotTime:        details.slot_time.slice(0, 5),
        amountHt:        details.amount_ht,
      })
    }
  } catch (_) { /* email failure is non-blocking */ }

  return NextResponse.json({ success: true, booking_id: bookingId })
}
