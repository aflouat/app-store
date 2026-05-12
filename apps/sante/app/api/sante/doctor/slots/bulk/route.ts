import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { queryOne } from '@app-store/core-db'

interface SlotInput {
  slot_date: string
  slot_time: string
  duration_min?: number
}

// POST /api/sante/doctor/slots/bulk
// Body: { slots: SlotInput[] }
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'doctor') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Corps invalide.' }, { status: 400 })

  const { slots } = body as { slots: SlotInput[] }

  if (!Array.isArray(slots) || slots.length === 0) {
    return NextResponse.json({ error: 'Liste de créneaux vide.' }, { status: 400 })
  }
  if (slots.length > 70) {
    return NextResponse.json({ error: 'Maximum 70 créneaux par appel.' }, { status: 400 })
  }

  const doctor = await queryOne<{ user_id: string }>(
    `SELECT user_id FROM sante.doctors WHERE user_id = $1`,
    [session.user.id]
  )
  if (!doctor) return NextResponse.json({ error: 'Profil médecin introuvable.' }, { status: 403 })

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/
  const today = new Date().toISOString().split('T')[0]

  const created: { id: string; slot_date: string; slot_time: string; duration_min: number; status: string }[] = []
  let skipped_count = 0

  for (const s of slots) {
    if (!dateRegex.test(s.slot_date) || !timeRegex.test(s.slot_time)) { skipped_count++; continue }
    if (s.slot_date < today) { skipped_count++; continue }

    const existing = await queryOne<{ id: string }>(
      `SELECT id FROM sante.doctor_slots
       WHERE doctor_id = $1 AND slot_date = $2 AND slot_time = $3 AND status != 'cancelled'`,
      [session.user.id, s.slot_date, s.slot_time]
    )
    if (existing) { skipped_count++; continue }

    const row = await queryOne<{ id: string; slot_date: string; slot_time: string; duration_min: number; status: string }>(
      `INSERT INTO sante.doctor_slots (doctor_id, slot_date, slot_time, duration_min)
       VALUES ($1, $2, $3, $4)
       RETURNING id, slot_date::text, slot_time::text, duration_min, status`,
      [session.user.id, s.slot_date, s.slot_time, s.duration_min ?? 30]
    )
    if (row) created.push(row)
  }

  return NextResponse.json({ created, skipped_count })
}
