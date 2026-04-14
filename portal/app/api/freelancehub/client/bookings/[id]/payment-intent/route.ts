import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { queryOne } from '@/lib/freelancehub/db'
import { computePricing, DEFAULT_HOURLY_RATE } from '@/lib/freelancehub/matching'
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

  // Relire le montant depuis la DB — ne jamais faire confiance au client (règle sécurité)
  const booking = await queryOne<{
    id: string; client_id: string; status: string; amount_ht: number | null; consultant_amount: number | null; commission_amount: number | null
  }>(
    `SELECT id, client_id, status, amount_ht, consultant_amount, commission_amount
     FROM freelancehub.bookings WHERE id = $1`,
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

  // Recalculer TTC depuis HT stocké en DB (fallback : taux par défaut)
  const htCents  = booking.amount_ht ?? computePricing(DEFAULT_HOURLY_RATE).htCents
  const ttcCents = Math.round(htCents * 1.20)
  const commCents = booking.commission_amount ?? Math.round(htCents * 0.15)
  const netCents  = booking.consultant_amount  ?? (htCents - commCents)
  const tvaCents  = ttcCents - htCents

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount:   ttcCents,
      currency: 'eur',
      metadata: {
        booking_id:          bookingId,
        client_id:           session.user.id,
        platform:            'perform-learn.fr',
        amount_ttc:          ttcCents,
        amount_ht:           htCents,
        tva:                 tvaCents,
        platform_commission: commCents,
        consultant_net:      netCents,
      },
      description: 'Consultation 1h — perform-learn.fr',
    })

    return NextResponse.json({ client_secret: paymentIntent.client_secret })
  } catch (err) {
    console.error('[payment-intent] Stripe error:', err)
    return NextResponse.json({ error: 'Erreur Stripe.' }, { status: 500 })
  }
}
