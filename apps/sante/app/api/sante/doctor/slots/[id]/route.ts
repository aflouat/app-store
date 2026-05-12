import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { queryOne } from '@app-store/core-db'

// DELETE /api/sante/doctor/slots/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'doctor') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const slot = await queryOne<{ id: string; status: string }>(
    `SELECT s.id, s.status
     FROM sante.doctor_slots s
     JOIN sante.doctors d ON d.user_id = s.doctor_id
     WHERE s.id = $1 AND d.user_id = $2`,
    [id, session.user.id]
  )

  if (!slot) return NextResponse.json({ error: 'Créneau introuvable.' }, { status: 404 })
  if (slot.status === 'booked') {
    return NextResponse.json({ error: 'Impossible de supprimer un créneau réservé.' }, { status: 409 })
  }

  await queryOne(
    `UPDATE sante.doctor_slots SET status = 'cancelled' WHERE id = $1`,
    [id]
  )

  return NextResponse.json({ success: true })
}
