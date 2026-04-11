import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { queryOne } from '@/lib/freelancehub/db'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'consultant') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { consultant_id, slot_date, slot_time, duration_min } = await req.json()

  // Verify the consultant belongs to this user
  const check = await queryOne<{ id: string }>(
    `SELECT id FROM freelancehub.consultants WHERE id = $1 AND user_id = $2`,
    [consultant_id, session.user.id]
  )
  if (!check) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Prevent duplicate slots
  const existing = await queryOne<{ id: string }>(
    `SELECT id FROM freelancehub.slots
     WHERE consultant_id = $1 AND slot_date = $2 AND slot_time = $3 AND status != 'cancelled'`,
    [consultant_id, slot_date, slot_time]
  )
  if (existing) {
    return NextResponse.json({ error: 'Un créneau existe déjà à cette date et heure.' }, { status: 409 })
  }

  const slot = await queryOne<{
    id: string; slot_date: string; slot_time: string; duration_min: number; status: string
  }>(
    `INSERT INTO freelancehub.slots (consultant_id, slot_date, slot_time, duration_min)
     VALUES ($1, $2, $3, $4)
     RETURNING id, slot_date::text, slot_time::text, duration_min, status`,
    [consultant_id, slot_date, slot_time, duration_min ?? 60]
  )

  return NextResponse.json({ slot })
}
