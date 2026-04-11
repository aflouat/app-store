import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { query, queryOne } from '@/lib/freelancehub/db'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'consultant') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const {
    user_id,
    title,
    bio,
    daily_rate,
    experience_years,
    location,
    linkedin_url,
    skills,
  } = body

  // Verify the user_id matches the session
  if (user_id !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Upsert consultant profile
  const consultant = await queryOne<{ id: string }>(
    `INSERT INTO freelancehub.consultants
       (user_id, title, bio, daily_rate, experience_years, location, linkedin_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (user_id) DO UPDATE SET
       title            = EXCLUDED.title,
       bio              = EXCLUDED.bio,
       daily_rate       = EXCLUDED.daily_rate,
       experience_years = EXCLUDED.experience_years,
       location         = EXCLUDED.location,
       linkedin_url     = EXCLUDED.linkedin_url,
       updated_at       = NOW()
     RETURNING id`,
    [user_id, title, bio, daily_rate, experience_years, location, linkedin_url]
  )

  if (!consultant) {
    return NextResponse.json({ error: 'Upsert failed' }, { status: 500 })
  }

  // Sync skills: delete old, insert new
  await query(
    `DELETE FROM freelancehub.consultant_skills WHERE consultant_id = $1`,
    [consultant.id]
  )

  if (Array.isArray(skills) && skills.length > 0) {
    for (const s of skills) {
      await query(
        `INSERT INTO freelancehub.consultant_skills (consultant_id, skill_id, level)
         VALUES ($1, $2, $3)
         ON CONFLICT (consultant_id, skill_id) DO UPDATE SET level = EXCLUDED.level`,
        [consultant.id, s.skill_id, s.level ?? 'intermediate']
      )
    }
  }

  return NextResponse.json({ success: true, consultant_id: consultant.id })
}
