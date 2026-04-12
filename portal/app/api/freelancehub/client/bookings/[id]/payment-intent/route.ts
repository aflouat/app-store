import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { queryOne } from '@/lib/freelancehub/db'
import Stripe from 'stripe'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'client') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: bookingId } = await params

  const booking = await queryOne<{
    id: string; client_id: string; status: string; amount_ht: number
  }>(
    `SELECT id, client_id, status, amount_ht FROM freelancehub.bookings WHERE id = $1`,
    [bookingId]
  )

  if (!booking) {
    return NextResponse.json({ error: 'Réservation introuvable.' }, { status: 404 })
  }
  if (booking.client_id !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (booking.status !== 'pending') {
    return NextResponse.json({ error: 'Cette réservation ne peut plus être payée.' }, { status: 409 })
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: booking.amount_ht, // already in centimes (stored as integer cents)
      currency: 'eur',
      metadata: {
        booking_id: bookingId,
        client_id: session.user.id,
        platform: 'perform-learn.fr',
      },
      description: 'Honoraire consultant - perform-learn.fr',
    })

    return NextResponse.json({ client_secret: paymentIntent.client_secret })
  } catch (err) {
    console.error('[payment-intent] Stripe error:', err)
    return NextResponse.json({ error: 'Erreur Stripe.' }, { status: 500 })
  }
}
