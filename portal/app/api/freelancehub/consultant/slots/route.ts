import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { query, queryOne } from '@/lib/freelancehub/db'

// ─── GET /api/freelancehub/consultant/slots?week=YYYY-MM-DD ──
// Returns all non-cancelled slots for the week containing the given date.
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'consultant') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const consultant = await queryOne<{ id: string }>(
    `SELECT id FROM freelancehub.consultants WHERE user_id = $1`,
    [session.user.id]
  )
  if (!consultant) return NextResponse.json({ error: 'Profil consultant introuvable.' }, { status: 404 })

  // Compute Monday of the requested week
  const weekParam = new URL(req.url).searchParams.get('week')
  const ref = weekParam && /^\d{4}-\d{2}-\d{2}$/.test(weekParam)
    ? new Date(weekParam + 'T00:00:00')
    : new Date()
  const dayOfWeek = ref.getDay()
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  ref.setDate(ref.getDate() + diffToMonday)
  const weekStart = ref.toISOString().split('T')[0]
  const weekEndDate = new Date(ref)
  weekEndDate.setDate(weekEndDate.getDate() + 6)
  const weekEnd = weekEndDate.toISOString().split('T')[0]

  const slots = await query<{
    id: string; slot_date: string; slot_time: string; duration_min: number; status: string
  }>(
    `SELECT id, slot_date::text, slot_time::text, duration_min, status
     FROM freelancehub.slots
     WHERE consultant_id = $1
       AND slot_date >= $2 AND slot_date <= $3
       AND status != 'cancelled'
     ORDER BY slot_date, slot_time`,
    [consultant.id, weekStart, weekEnd]
  )

  return NextResponse.json({ slots, weekStart })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'consultant') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { consultant_id, slot_date, slot_time, duration_min } = await req.json()

  // Validate date and time formats
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/
  if (!slot_date || !dateRegex.test(slot_date) || isNaN(Date.parse(slot_date))) {
    return NextResponse.json({ error: 'Date invalide (format attendu : YYYY-MM-DD).' }, { status: 400 })
  }
  if (!slot_time || !timeRegex.test(slot_time)) {
    return NextResponse.json({ error: 'Heure invalide (format attendu : HH:MM).' }, { status: 400 })
  }
  if (duration_min !== undefined && (typeof duration_min !== 'number' || duration_min < 15 || duration_min > 480)) {
    return NextResponse.json({ error: 'Durée invalide (15–480 min).' }, { status: 400 })
  }
  if (new Date(slot_date) < new Date(new Date().toISOString().split('T')[0])) {
    return NextResponse.json({ error: 'Impossible de créer un créneau dans le passé.' }, { status: 400 })
  }

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
