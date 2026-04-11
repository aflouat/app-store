import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { findMatches } from '@/lib/freelancehub/matching'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role === 'consultant') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { skill_id, slot_date, slot_time, client_budget } = await req.json()

  if (!skill_id || !slot_date || !slot_time) {
    return NextResponse.json({ error: 'skill_id, slot_date et slot_time sont obligatoires.' }, { status: 400 })
  }

  const matches = await findMatches({ skill_id, slot_date, slot_time, client_budget })

  return NextResponse.json({ matches })
}
