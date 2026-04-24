import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { queryOne } from '@/lib/freelancehub/db'
import { sendBookingConfirmation } from '@/lib/freelancehub/email'
import { createNotification } from '@/lib/freelancehub/notifications'
import Stripe from 'stripe'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'client') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: bookingId } = await params
  const { payment_intent_id } = await req.json().catch(() => ({}))

  if (!payment_intent_id) {
    return NextResponse.json({ error: 'payment_intent_id manquant.' }, { status: 400 })
  }

  // Verify booking ownership
  const booking = await queryOne<{ id: string; client_id: string; status: string; amount_ht: number | null }>(
    `SELECT id, client_id, status, amount_ht FROM freelancehub.bookings WHERE id = $1`,
    [bookingId]
  )

  if (!booking) return NextResponse.json({ error: 'Réservation introuvable.' }, { status: 404 })
  if (booking.client_id !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (booking.status !== 'pending') {
    return NextResponse.json({ error: 'Cette réservation ne peut plus être payée.' }, { status: 409 })
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

  // Verify PaymentIntent with Stripe
  let paymentIntent: Stripe.PaymentIntent
  try {
    paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id)
  } catch (err) {
    console.error('[pay] Stripe retrieve error:', err)
    return NextResponse.json({ error: 'PaymentIntent introuvable.' }, { status: 400 })
  }

  if (paymentIntent.status !== 'succeeded') {
    return NextResponse.json(
      { error: `Paiement non finalisé (statut: ${paymentIntent.status}).` },
      { status: 402 }
    )
  }

  // Verify metadata matches this booking (prevents replay attacks)
  if (paymentIntent.metadata.booking_id !== bookingId) {
    return NextResponse.json({ error: 'PaymentIntent invalide pour cette réservation.' }, { status: 400 })
  }

  // Verify amount matches booking (prevents amount manipulation)
  const expectedTtcCents = Math.round(Number(booking.amount_ht ?? 0) * 1.20)
  if (expectedTtcCents > 0 && paymentIntent.amount !== expectedTtcCents) {
    console.error(`[pay] amount mismatch: PI=${paymentIntent.amount} expected=${expectedTtcCents}`)
    return NextResponse.json({ error: 'Montant du paiement incohérent.' }, { status: 400 })
  }

  // Update booking: confirmed + reveal consultant identity
  const updated = await queryOne<{ id: string }>(
    `UPDATE freelancehub.bookings
     SET status = 'confirmed', revealed_at = NOW(), updated_at = NOW()
     WHERE id = $1
     RETURNING id`,
    [bookingId]
  )

  if (!updated) return NextResponse.json({ error: 'Mise à jour impossible.' }, { status: 500 })

  // Create payment record with real Stripe PaymentIntent ID
  await queryOne(
    `INSERT INTO freelancehub.payments
       (booking_id, stripe_payment_id, amount, status, authorized_at, captured_at)
     SELECT id, $2, amount_ht, 'captured', NOW(), NOW()
     FROM freelancehub.bookings WHERE id = $1`,
    [bookingId, payment_intent_id]
  )

  // Send confirmation emails (fire-and-forget)
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
  } catch (emailErr) { console.error('[pay] email error:', emailErr) }

  // In-app notifications (fire-and-forget)
  try {
    const p = await queryOne<{
      client_id: string; consultant_user_id: string; skill_name: string | null;
      slot_date: string; slot_time: string;
    }>(
      `SELECT b.client_id, c.user_id AS consultant_user_id,
              sk.name AS skill_name, s.slot_date::text, s.slot_time::text
       FROM freelancehub.bookings b
       JOIN freelancehub.consultants c ON c.id = b.consultant_id
       JOIN freelancehub.slots s ON s.id = b.slot_id
       LEFT JOIN freelancehub.skills sk ON sk.id = b.skill_requested
       WHERE b.id = $1`,
      [bookingId]
    )
    if (p) {
      const skill   = p.skill_name ?? 'Expertise'
      const dateStr = new Date(p.slot_date + 'T00:00:00Z')
        .toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
      const timeStr = p.slot_time.slice(0, 5)

      await createNotification(
        p.client_id,
        'booking_confirmed',
        'Réservation confirmée',
        `${skill} le ${dateStr} à ${timeStr} — votre expert a été révélé.`,
        { booking_id: bookingId }
      )
      await createNotification(
        p.consultant_user_id,
        'new_booking',
        'Nouvelle mission',
        `${skill} le ${dateStr} à ${timeStr}.`,
        { booking_id: bookingId }
      )
    }
  } catch (notifErr) { console.error('[pay] notification error:', notifErr) }

  return NextResponse.json({ success: true, booking_id: bookingId })
}
