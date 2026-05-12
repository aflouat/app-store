import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { query, queryOne } from '@app-store/core-db'

// GET /api/sante/doctor/slots?week=YYYY-MM-DD
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'doctor') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const doctor = await queryOne<{ user_id: string }>(
    `SELECT user_id FROM sante.doctors WHERE user_id = $1`,
    [session.user.id]
  )
  if (!doctor) return NextResponse.json({ error: 'Profil médecin introuvable.' }, { status: 404 })

  const weekParam = new URL(req.url).searchParams.get('week')
  const ref = weekParam && /^\d{4}-\d{2}-\d{2}$/.test(weekParam)
    ? new Date(weekParam + 'T00:00:00Z')
    : new Date()
  const dayOfWeek = ref.getDay()
  ref.setDate(ref.getDate() + (dayOfWeek === 0 ? -6 : 1 - dayOfWeek))
  const weekStart = ref.toISOString().split('T')[0]
  const weekEndDate = new Date(ref)
  weekEndDate.setDate(weekEndDate.getDate() + 6)
  const weekEnd = weekEndDate.toISOString().split('T')[0]

  const slots = await query<{
    id: string; slot_date: string; slot_time: string; duration_min: number; status: string
  }>(
    `SELECT id, slot_date::text, slot_time::text, duration_min, status
     FROM sante.doctor_slots
     WHERE doctor_id = $1
       AND slot_date >= $2 AND slot_date <= $3
       AND status != 'cancelled'
     ORDER BY slot_date, slot_time`,
    [session.user.id, weekStart, weekEnd]
  )

  return NextResponse.json({ slots, weekStart })
}

// POST /api/sante/doctor/slots
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'doctor') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Corps invalide.' }, { status: 400 })

  const { slot_date, slot_time, duration_min } = body as Record<string, unknown>

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/

  if (!slot_date || typeof slot_date !== 'string' || !dateRegex.test(slot_date) || isNaN(Date.parse(slot_date))) {
    return NextResponse.json({ error: 'Date invalide (format attendu : YYYY-MM-DD).' }, { status: 400 })
  }
  if (!slot_time || typeof slot_time !== 'string' || !timeRegex.test(slot_time)) {
    return NextResponse.json({ error: 'Heure invalide (format attendu : HH:MM).' }, { status: 400 })
  }
  if (duration_min !== undefined && (typeof duration_min !== 'number' || duration_min < 15 || duration_min > 480)) {
    return NextResponse.json({ error: 'Durée invalide (15–480 min).' }, { status: 400 })
  }
  if (slot_date < new Date().toISOString().split('T')[0]) {
    return NextResponse.json({ error: 'Impossible de créer un créneau dans le passé.' }, { status: 400 })
  }

  const doctor = await queryOne<{ user_id: string }>(
    `SELECT user_id FROM sante.doctors WHERE user_id = $1`,
    [session.user.id]
  )
  if (!doctor) return NextResponse.json({ error: 'Profil médecin introuvable.' }, { status: 403 })

  const existing = await queryOne<{ id: string }>(
    `SELECT id FROM sante.doctor_slots
     WHERE doctor_id = $1 AND slot_date = $2 AND slot_time = $3 AND status != 'cancelled'`,
    [session.user.id, slot_date, slot_time]
  )
  if (existing) {
    return NextResponse.json({ error: 'Un créneau existe déjà à cette date et heure.' }, { status: 409 })
  }

  const slot = await queryOne<{
    id: string; slot_date: string; slot_time: string; duration_min: number; status: string
  }>(
    `INSERT INTO sante.doctor_slots (doctor_id, slot_date, slot_time, duration_min)
     VALUES ($1, $2, $3, $4)
     RETURNING id, slot_date::text, slot_time::text, duration_min, status`,
    [session.user.id, slot_date, slot_time, duration_min ?? 30]
  )

  return NextResponse.json({ slot }, { status: 201 })
}
