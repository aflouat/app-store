import { NextRequest, NextResponse } from 'next/server'
import { getLogs, insertLog } from '@/lib/govern/queries'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const artifactId = searchParams.get('artifact_id') ?? undefined
  const limit = parseInt(searchParams.get('limit') ?? '50')
  const logs = await getLogs(artifactId, limit)
  return NextResponse.json(logs)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  await insertLog(body)
  return NextResponse.json({ success: true }, { status: 201 })
}