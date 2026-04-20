import { NextResponse } from 'next/server'
import { queryOne } from '@/lib/freelancehub/db'

export async function GET() {
  try {
    await queryOne('SELECT 1')
    return NextResponse.json({ status: 'ok', db: true, ts: new Date().toISOString() })
  } catch {
    return NextResponse.json({ status: 'error', db: false }, { status: 503 })
  }
}
