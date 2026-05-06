import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { query, queryOne } from '@/lib/freelancehub/db'

export async function GET() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const skills = await query<{
    id: number; name: string; category: string | null; consultants_count: number
  }>(
    `SELECT s.id, s.name, s.category,
            (SELECT COUNT(*) FROM freelancehub.consultant_skills cs WHERE cs.skill_id = s.id)::int AS consultants_count
     FROM freelancehub.skills s
     ORDER BY s.category NULLS LAST, s.name`
  )

  return NextResponse.json({ skills })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { name, category } = await req.json()

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Nom obligatoire.' }, { status: 400 })
  }

  const existing = await queryOne<{ id: number }>(
    `SELECT id FROM freelancehub.skills WHERE name = $1`,
    [name.trim()]
  )
  if (existing) {
    return NextResponse.json({ error: 'Cette expertise existe déjà.' }, { status: 409 })
  }

  const skill = await queryOne<{ id: number; name: string; category: string | null }>(
    `INSERT INTO freelancehub.skills (name, category) VALUES ($1, $2) RETURNING id, name, category`,
    [name.trim(), category?.trim() || null]
  )

  return NextResponse.json({ skill }, { status: 201 })
}
