import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { queryOne } from '@/lib/freelancehub/db'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  // Refuse if skill is used by consultants
  const inUse = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM freelancehub.consultant_skills WHERE skill_id = $1`,
    [id]
  )
  if (inUse && Number(inUse.count) > 0) {
    return NextResponse.json(
      { error: `Impossible de supprimer : ${inUse.count} consultant(s) utilisent cette expertise.` },
      { status: 409 }
    )
  }

  await queryOne(`DELETE FROM freelancehub.skills WHERE id = $1`, [id])

  return NextResponse.json({ success: true })
}
