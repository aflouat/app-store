import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { findMatches } from '@/lib/freelancehub/matching'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role === 'consultant') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { skill_id, client_budget } = await req.json()

  if (!skill_id) {
    return NextResponse.json({ error: 'skill_id est obligatoire.' }, { status: 400 })
  }

  const matches = await findMatches({
    skill_id:      Number(skill_id),
    client_budget: client_budget ? Number(client_budget) : null,
  })

  return NextResponse.json({ matches })
}
