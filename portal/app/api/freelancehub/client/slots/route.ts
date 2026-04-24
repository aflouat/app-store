import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { query } from '@/lib/freelancehub/db'

// GET /api/freelancehub/client/slots?consultant_id=X
// Returns available slots for the next 60 days, grouped by date.
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'client') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const consultantId = searchParams.get('consultant_id')
  if (!consultantId) {
    return NextResponse.json({ error: 'consultant_id requis.' }, { status: 400 })
  }

  const today = new Date().toISOString().split('T')[0]
  const limit = new Date()
  limit.setDate(limit.getDate() + 60)
  const limitStr = limit.toISOString().split('T')[0]

  const rows = await query<{ id: string; slot_date: string; slot_time: string; duration_min: number }>(
    `SELECT s.id, s.slot_date::text, s.slot_time::text, s.duration_min
     FROM freelancehub.slots s
     JOIN freelancehub.consultants c ON c.id = s.consultant_id
     WHERE s.consultant_id = $1
       AND c.is_available = true
       AND s.status = 'available'
       AND s.slot_date >= $2
       AND s.slot_date <= $3
     ORDER BY s.slot_date, s.slot_time`,
    [consultantId, today, limitStr]
  )

  // Group by date
  const byDate: Record<string, { id: string; slot_time: string; duration_min: number }[]> = {}
  for (const r of rows) {
    if (!byDate[r.slot_date]) byDate[r.slot_date] = []
    byDate[r.slot_date].push({ id: r.id, slot_time: r.slot_time, duration_min: r.duration_min })
  }

  return NextResponse.json({ slots_by_date: byDate })
}
