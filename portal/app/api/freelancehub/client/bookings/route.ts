import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { query, queryOne } from '@/lib/freelancehub/db'

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
    amount_ht,
    commission,
    consultant_net,
  } = await req.json()

  if (client_id !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Verify slot is still available
  const slot = await queryOne<{ id: string; status: string }>(
    `SELECT id, status FROM freelancehub.slots WHERE id = $1 AND consultant_id = (
       SELECT id FROM freelancehub.consultants WHERE id = $2
     )`,
    [slot_id, consultant_id]
  )

  if (!slot) return NextResponse.json({ error: 'Créneau introuvable.' }, { status: 404 })
  if (slot.status !== 'available') {
    return NextResponse.json({ error: 'Ce créneau n\'est plus disponible.' }, { status: 409 })
  }

  // Get skill_requested from matching context (optional — look it up from consultant skills)
  const [skillRow] = await query<{ skill_id: number }>(
    `SELECT skill_id FROM freelancehub.consultant_skills WHERE consultant_id = $1 LIMIT 1`,
    [consultant_id]
  )

  // Create booking
  const booking = await queryOne<{ id: string }>(
    `INSERT INTO freelancehub.bookings
       (client_id, consultant_id, slot_id, skill_requested,
        matching_score, notes, amount_ht, commission_amount, consultant_amount, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
     RETURNING id`,
    [
      client_id,
      consultant_id,
      slot_id,
      skillRow?.skill_id ?? null,
      matching_score,
      notes || null,
      amount_ht,
      commission,
      consultant_net,
    ]
  )

  if (!booking) return NextResponse.json({ error: 'Erreur création réservation.' }, { status: 500 })

  // Mark slot as booked
  await query(
    `UPDATE freelancehub.slots SET status = 'booked' WHERE id = $1`,
    [slot_id]
  )

  return NextResponse.json({ booking_id: booking.id })
}
