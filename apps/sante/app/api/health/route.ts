import { NextResponse } from 'next/server'
import { queryOne } from '@app-store/core-db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await queryOne('SELECT 1')
    return NextResponse.json({ status: 'ok', db: true, app: 'sante' })
  } catch {
    return NextResponse.json({ status: 'error', db: false, app: 'sante' }, { status: 503 })
  }
}
