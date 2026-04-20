import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { queryOne } from '@/lib/freelancehub/db'
import { createNotification } from '@/lib/freelancehub/notifications'

// POST /api/webhooks/stripe
// Must receive raw body for signature verification — use req.text()
export async function POST(req: NextRequest) {
  const sig    = req.headers.get('stripe-signature')
  const secret = process.env.STRIPE_WEBHOOK_SECRET

  if (!secret) {
    console.error('[stripe-webhook] STRIPE_WEBHOOK_SECRET not set')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  const body = await req.text()
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig ?? '', secret)
  } catch (err) {
    console.error('[stripe-webhook] Invalid signature:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent
        const payment = await queryOne<{ id: string; booking_id: string; client_id: string }>(
          `SELECT p.id, p.booking_id, b.client_id
           FROM freelancehub.payments p
           JOIN freelancehub.bookings b ON b.id = p.booking_id
           WHERE p.stripe_payment_id = $1`,
          [pi.id]
        )
        if (payment) {
          await queryOne(
            `UPDATE freelancehub.payments SET status = 'captured', updated_at = NOW() WHERE id = $1 AND status != 'captured'`,
            [payment.id]
          )
          await createNotification(
            payment.client_id,
            'booking_confirmed',
            'Paiement confirmé',
            'Votre paiement a été reçu. Votre réservation est confirmée.'
          )
        }
        break
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent
        await queryOne(
          `UPDATE freelancehub.payments SET status = 'failed', updated_at = NOW()
           WHERE stripe_payment_id = $1 AND status = 'pending'`,
          [pi.id]
        )
        console.warn('[stripe-webhook] payment_intent.payment_failed:', pi.id)
        break
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        console.log('[stripe-webhook] charge.refunded:', charge.id)
        break
      }
    }
  } catch (err) {
    console.error('[stripe-webhook] handler error:', err)
    return NextResponse.json({ error: 'Handler error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
