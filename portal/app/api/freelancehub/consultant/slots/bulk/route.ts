import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { query, queryOne } from '@/lib/freelancehub/db'

interface SlotInput {
  slot_date: string
  slot_time: string
  duration_min?: number
}

// POST /api/freelancehub/consultant/slots/bulk
// Body: { consultant_id: string, slots: SlotInput[] }
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'consultant') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { consultant_id, slots } = await req.json() as { consultant_id: string; slots: SlotInput[] }

  if (!Array.isArray(slots) || slots.length === 0) {
    return NextResponse.json({ error: 'Liste de créneaux vide.' }, { status: 400 })
  }
  if (slots.length > 70) {
    return NextResponse.json({ error: 'Maximum 70 créneaux par appel.' }, { status: 400 })
  }

  // Verify ownership
  const check = await queryOne<{ id: string }>(
    `SELECT id FROM freelancehub.consultants WHERE id = $1 AND user_id = $2`,
    [consultant_id, session.user.id]
  )
  if (!check) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/
  const today = new Date().toISOString().split('T')[0]

  const created: { id: string; slot_date: string; slot_time: string; duration_min: number; status: string }[] = []
  const skipped: string[] = []

  for (const s of slots) {
    if (!dateRegex.test(s.slot_date) || !timeRegex.test(s.slot_time)) { skipped.push(`${s.slot_date} ${s.slot_time}`); continue }
    if (s.slot_date < today) { skipped.push(`${s.slot_date} ${s.slot_time}`); continue }

    // Skip duplicates silently
    const existing = await queryOne<{ id: string }>(
      `SELECT id FROM freelancehub.slots
       WHERE consultant_id = $1 AND slot_date = $2 AND slot_time = $3 AND status != 'cancelled'`,
      [consultant_id, s.slot_date, s.slot_time]
    )
    if (existing) { skipped.push(`${s.slot_date} ${s.slot_time}`); continue }

    const row = await queryOne<{ id: string; slot_date: string; slot_time: string; duration_min: number; status: string }>(
      `INSERT INTO freelancehub.slots (consultant_id, slot_date, slot_time, duration_min)
       VALUES ($1, $2, $3, $4)
       RETURNING id, slot_date::text, slot_time::text, duration_min, status`,
      [consultant_id, s.slot_date, s.slot_time, s.duration_min ?? 60]
    )
    if (row) created.push(row)
  }

  return NextResponse.json({ created, skipped_count: skipped.length })
}
