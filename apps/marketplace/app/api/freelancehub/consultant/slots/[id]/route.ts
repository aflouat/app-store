import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { queryOne } from '@/lib/freelancehub/db'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'consultant') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  // Verify ownership and that slot is still available
  const slot = await queryOne<{ id: string; status: string }>(
    `SELECT s.id, s.status
     FROM freelancehub.slots s
     JOIN freelancehub.consultants c ON c.id = s.consultant_id
     WHERE s.id = $1 AND c.user_id = $2`,
    [id, session.user.id]
  )

  if (!slot) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (slot.status === 'booked') {
    return NextResponse.json({ error: 'Impossible de supprimer un créneau réservé.' }, { status: 409 })
  }

  await queryOne(
    `UPDATE freelancehub.slots SET status = 'cancelled' WHERE id = $1`,
    [id]
  )

  return NextResponse.json({ success: true })
}
