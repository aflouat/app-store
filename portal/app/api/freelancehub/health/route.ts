import { NextResponse } from 'next/server'
import { queryOne } from '@/lib/freelancehub/db'

export async function GET() {
  try {
    const row = await queryOne<{ exists: boolean }>(
      `SELECT EXISTS (
         SELECT FROM information_schema.tables
         WHERE table_schema = 'freelancehub' AND table_name = 'users'
       ) AS exists`
    )
    if (!row?.exists) throw new Error('schema freelancehub.users manquant')
    return NextResponse.json({ status: 'ok', db: true, ts: new Date().toISOString() })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[health] KO:', msg)
    return NextResponse.json({ status: 'error', db: false, error: msg }, { status: 503 })
  }
}
