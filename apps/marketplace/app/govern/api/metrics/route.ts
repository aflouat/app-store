import { NextRequest, NextResponse } from 'next/server'
import { getMetrics } from '@/lib/govern/queries'
import { query } from '@/lib/govern/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const artifactId = searchParams.get('artifact_id')
  if (!artifactId) {
    return NextResponse.json({ error: 'artifact_id requis' }, { status: 400 })
  }
  const metrics = await getMetrics(artifactId)
  return NextResponse.json(metrics)
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, actual, status, measured_at } = body
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

  const fields: [string, unknown][] = []
  if (actual !== undefined) fields.push(['actual', actual])
  if (status !== undefined) fields.push(['status', status])
  if (measured_at !== undefined) fields.push(['measured_at', measured_at])
  fields.push(['updated_at', new Date().toISOString()])

  const sets = fields.map(([k], i) => `${k} = $${i + 2}`).join(', ')
  const vals = fields.map(([, v]) => v)

  await query(
    `UPDATE governance.metrics SET ${sets} WHERE id = $1`,
    [id, ...vals]
  )
  return NextResponse.json({ success: true })
}
