import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { queryOne } from '@/lib/freelancehub/db'

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending:     ['confirmed', 'cancelled'],
  confirmed:   ['in_progress', 'cancelled'],
  in_progress: ['completed', 'disputed'],
  completed:   [],
  cancelled:   [],
  disputed:    ['completed', 'cancelled'],
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id }     = await params
  const { status } = await req.json()

  const booking = await queryOne<{ id: string; status: string }>(
    `SELECT id, status FROM freelancehub.bookings WHERE id = $1`,
    [id]
  )

  if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const allowed = VALID_TRANSITIONS[booking.status] ?? []
  if (!allowed.includes(status)) {
    return NextResponse.json(
      { error: `Transition ${booking.status} → ${status} non autorisée.` },
      { status: 400 }
    )
  }

  await queryOne(
    `UPDATE freelancehub.bookings SET status = $1, updated_at = NOW() WHERE id = $2`,
    [status, id]
  )

  return NextResponse.json({ success: true })
}
