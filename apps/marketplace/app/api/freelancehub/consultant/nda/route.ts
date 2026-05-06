import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { queryOne } from '@/lib/freelancehub/db'

// GET — check if consultant has signed NDA
export async function GET() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'consultant') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sig = await queryOne<{ signed_at: string }>(
    `SELECT signed_at FROM freelancehub.signatures
     WHERE user_id = $1 AND document_type = 'NDA'
     ORDER BY signed_at DESC LIMIT 1`,
    [session.user.id]
  )

  return NextResponse.json({ signed: !!sig, signed_at: sig?.signed_at ?? null })
}

// POST — sign NDA
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'consultant') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const existing = await queryOne(
    `SELECT id FROM freelancehub.signatures
     WHERE user_id = $1 AND document_type = 'NDA'`,
    [session.user.id]
  )
  if (existing) {
    return NextResponse.json({ success: true, already_signed: true })
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
  const ua = req.headers.get('user-agent') ?? null

  await queryOne(
    `INSERT INTO freelancehub.signatures (user_id, document_type, document_version, ip_address, user_agent, provider)
     VALUES ($1, 'NDA', '1.0', $2, $3, 'checkbox')`,
    [session.user.id, ip, ua]
  )

  return NextResponse.json({ success: true })
}
