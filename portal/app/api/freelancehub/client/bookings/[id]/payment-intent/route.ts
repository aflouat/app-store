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

  try {
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
    const htCents   = Number(booking.amount_ht ?? computePricing(DEFAULT_HOURLY_RATE).htCents)
    const ttcCents  = Math.round(htCents * 1.20)
    const commCents = Math.round(Number(booking.commission_amount ?? Math.round(htCents * 0.15)))
    const netCents  = Math.round(Number(booking.consultant_amount  ?? (htCents - commCents)))
    const tvaCents  = ttcCents - htCents

    if (ttcCents < 50) {
      console.error('[payment-intent] montant invalide:', { htCents, ttcCents })
      return NextResponse.json({ error: 'Montant de réservation invalide.' }, { status: 422 })
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

    // Return existing PI if one is already pending for this booking (avoid double-charge)
    const existingPi = await queryOne<{ stripe_payment_id: string }>(
      `SELECT stripe_payment_id FROM freelancehub.payments
       WHERE booking_id = $1 AND status IN ('pending', 'authorized')
       LIMIT 1`,
      [bookingId]
    )
    if (existingPi?.stripe_payment_id) {
      try {
        const pi = await stripe.paymentIntents.retrieve(existingPi.stripe_payment_id)
        if (pi.status === 'requires_payment_method' || pi.status === 'requires_confirmation') {
          return NextResponse.json({ client_secret: pi.client_secret })
        }
      } catch { /* PI expired or not found — fall through to create a new one */ }
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount:   ttcCents,
      currency: 'eur',
      metadata: {
        booking_id:          bookingId,
        client_id:           session.user.id,
        platform:            'perform-learn.fr',
        amount_ttc:          String(ttcCents),
        amount_ht:           String(htCents),
        tva:                 String(tvaCents),
        platform_commission: String(commCents),
        consultant_net:      String(netCents),
      },
      description: 'Consultation 1h — perform-learn.fr',
    })

    return NextResponse.json({ client_secret: paymentIntent.client_secret })
  } catch (err) {
    console.error('[payment-intent] error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Erreur lors de l\'initialisation du paiement.' }, { status: 500 })
  }
}
