// GET /api/freelancehub/admin/export-csv
// Streams all bookings as CSV. Admin only.
// Optional query param: ?status=confirmed,completed

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { query } from '@/lib/freelancehub/db'

function esc(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return ''
  const s = String(v)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const statusParam = searchParams.get('status')
  const statusFilter = statusParam
    ? statusParam.split(',').map(s => s.trim()).filter(Boolean)
    : null

  const rows = await query<{
    id: string
    created_at: string
    slot_date: string
    slot_time: string
    status: string
    client_name: string | null
    client_email: string
    consultant_name: string | null
    consultant_email: string
    skill_name: string | null
    amount_ht: number | null
    commission_amount: number | null
    consultant_amount: number | null
    matching_score: number | null
    revealed_at: string | null
  }>(
    `SELECT
       b.id, b.created_at::text, b.status, b.revealed_at::text,
       s.slot_date::text, s.slot_time::text,
       uc.name  AS client_name,  uc.email  AS client_email,
       uc2.name AS consultant_name, uc2.email AS consultant_email,
       sk.name  AS skill_name,
       b.amount_ht, b.commission_amount, b.consultant_amount,
       b.matching_score
     FROM freelancehub.bookings b
     JOIN freelancehub.slots s       ON s.id = b.slot_id
     JOIN freelancehub.users uc      ON uc.id = b.client_id
     JOIN freelancehub.consultants c ON c.id = b.consultant_id
     JOIN freelancehub.users uc2     ON uc2.id = c.user_id
     LEFT JOIN freelancehub.skills sk ON sk.id = b.skill_requested
     ${statusFilter ? `WHERE b.status = ANY($1::text[])` : ''}
     ORDER BY b.created_at DESC`,
    statusFilter ? [statusFilter] : []
  )

  const HEADERS = [
    'ID', 'Date création', 'Date slot', 'Heure slot', 'Statut',
    'Client', 'Email client',
    'Consultant', 'Email consultant',
    'Expertise', 'Montant HT (€)', 'Commission (€)', 'Net consultant (€)',
    'Score matching', 'Révélé le',
  ]

  const lines: string[] = [HEADERS.join(',')]

  for (const r of rows) {
    lines.push([
      esc(r.id),
      esc(r.created_at?.slice(0, 19)),
      esc(r.slot_date),
      esc(r.slot_time?.slice(0, 5)),
      esc(r.status),
      esc(r.client_name),
      esc(r.client_email),
      esc(r.consultant_name),
      esc(r.consultant_email),
      esc(r.skill_name),
      esc(r.amount_ht     != null ? (r.amount_ht     / 100).toFixed(2) : null),
      esc(r.commission_amount != null ? (r.commission_amount / 100).toFixed(2) : null),
      esc(r.consultant_amount != null ? (r.consultant_amount / 100).toFixed(2) : null),
      esc(r.matching_score),
      esc(r.revealed_at?.slice(0, 19)),
    ].join(','))
  }

  const csv  = lines.join('\r\n')
  const date = new Date().toISOString().slice(0, 10)

  return new NextResponse(csv, {
    headers: {
      'Content-Type':        'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="freelancehub-bookings-${date}.csv"`,
    },
  })
}
