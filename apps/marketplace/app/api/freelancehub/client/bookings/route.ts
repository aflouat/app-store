import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { withTransaction, queryOneTx, queryTx } from '@/lib/freelancehub/db'
import { computePricing, DEFAULT_HOURLY_RATE } from '@/lib/freelancehub/matching'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'client') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const {
    client_id,
    consultant_id,
    slot_id,
    matching_score,
    notes,
  } = await req.json()

  if (client_id !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const booking = await withTransaction(async (client) => {
      // Lock the slot row to prevent concurrent bookings (SELECT FOR UPDATE)
      const slot = await queryOneTx<{ id: string; status: string }>(
        client,
        `SELECT id, status FROM freelancehub.slots
         WHERE id = $1 AND consultant_id = (SELECT id FROM freelancehub.consultants WHERE id = $2)
         FOR UPDATE`,
        [slot_id, consultant_id]
      )

      if (!slot) throw Object.assign(new Error('Créneau introuvable.'), { status: 404 })
      if (slot.status !== 'available') {
        throw Object.assign(new Error('Ce créneau n\'est plus disponible.'), { status: 409 })
      }

      // Fetch consultant daily_rate + referral discount from DB — never trust client-side amounts
      const consultantRow = await queryOneTx<{
        daily_rate: number | null
        skill_id: number | null
        referrer_commission_until: string | null
      }>(
        client,
        `SELECT c.daily_rate,
                (SELECT cs.skill_id FROM freelancehub.consultant_skills cs WHERE cs.consultant_id = c.id LIMIT 1) AS skill_id,
                u.referrer_commission_until
         FROM freelancehub.consultants c
         JOIN freelancehub.users u ON u.id = c.user_id
         WHERE c.id = $1`,
        [consultant_id]
      )
      if (!consultantRow) throw Object.assign(new Error('Consultant introuvable.'), { status: 404 })

      // Apply referral discount (-2% commission) if parrainage active
      const hasReferralDiscount = consultantRow.referrer_commission_until
        ? new Date(consultantRow.referrer_commission_until) > new Date()
        : false
      const commissionRate = hasReferralDiscount ? 0.13 : 0.15

      const { htCents, commCents, netCents } = computePricing(
        consultantRow.daily_rate ?? DEFAULT_HOURLY_RATE,
        commissionRate
      )

      // Create booking
      const newBooking = await queryOneTx<{ id: string }>(
        client,
        `INSERT INTO freelancehub.bookings
           (client_id, consultant_id, slot_id, skill_requested,
            matching_score, notes, amount_ht, commission_amount, consultant_amount, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
         RETURNING id`,
        [
          client_id,
          consultant_id,
          slot_id,
          consultantRow.skill_id ?? null,
          matching_score,
          notes || null,
          htCents,
          commCents,
          netCents,
        ]
      )

      if (!newBooking) throw Object.assign(new Error('Erreur création réservation.'), { status: 500 })

      // Mark slot as booked atomically
      await queryTx(
        client,
        `UPDATE freelancehub.slots SET status = 'booked' WHERE id = $1`,
        [slot_id]
      )

      return newBooking
    })

    return NextResponse.json({ booking_id: booking.id })
  } catch (err: unknown) {
    const e = err as Error & { status?: number }
    const status = e.status ?? 500
    const message = e.message ?? 'Erreur interne.'
    if (status < 500) return NextResponse.json({ error: message }, { status })
    console.error('[bookings POST]', err)
    return NextResponse.json({ error: 'Erreur interne.' }, { status: 500 })
  }
}
