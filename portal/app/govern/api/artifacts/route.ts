import { NextRequest, NextResponse } from 'next/server'
import { getArtifactContext, createArtifact, insertLog } from '@/lib/govern/queries'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const project = searchParams.get('project') ?? 'perform-learn'
  const statuses = searchParams.getAll('status')
  const artifacts = await getArtifactContext(project, statuses.length ? statuses : undefined)
  return NextResponse.json(artifacts)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const artifact = await createArtifact(body)
  if (!artifact) return NextResponse.json({ error: 'Création échouée' }, { status: 500 })
  await insertLog({ artifact_id: artifact.id, actor_id: body.created_by, action: 'created', new_value: { title: body.title } })
  return NextResponse.json(artifact, { status: 201 })
}