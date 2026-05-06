import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { query } from '@/lib/freelancehub/db'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body   = await req.json()

  const allowed = ['is_verified', 'is_available', 'is_early_adopter']
  const sets    = Object.entries(body)
    .filter(([k]) => allowed.includes(k))

  if (sets.length === 0) {
    return NextResponse.json({ error: 'No valid fields to update.' }, { status: 400 })
  }

  const setClauses = sets.map(([k], i) => `${k} = $${i + 2}`).join(', ')
  const values     = sets.map(([, v]) => v)

  await query(
    `UPDATE freelancehub.consultants SET ${setClauses}, updated_at = NOW() WHERE id = $1`,
    [id, ...values]
  )

  return NextResponse.json({ success: true })
}
