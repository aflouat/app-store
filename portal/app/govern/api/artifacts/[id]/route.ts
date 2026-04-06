import { NextRequest, NextResponse } from 'next/server'
import { getArtifactById, getArtifactChildren, updateArtifactStatus } from '@/lib/govern/queries'
import { query } from '@/lib/govern/db'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const [artifact, children] = await Promise.all([
    getArtifactById(params.id),
    getArtifactChildren(params.id),
  ])
  if (!artifact) return NextResponse.json({ error: 'Non trouvé' }, { status: 404 })
  return NextResponse.json({ artifact, children })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const { status, actor_id, note, ...fields } = body

  if (status) {
    await updateArtifactStatus(params.id, status, actor_id, note)
  }

  const updatable = ['title', 'description', 'body', 'priority', 'due_date', 'tags', 'metadata', 'assignee_id']
  const toUpdate = Object.entries(fields).filter(([k]) => updatable.includes(k))
  if (toUpdate.length) {
    const sets = toUpdate.map(([k], i) => `${k} = $${i + 2}`).join(', ')
    const vals = toUpdate.map(([, v]) => v)
    await query(`UPDATE governance.artifacts SET ${sets}, updated_at = NOW() WHERE id = $1`, [params.id, ...vals])
  }

  return NextResponse.json({ success: true })
}