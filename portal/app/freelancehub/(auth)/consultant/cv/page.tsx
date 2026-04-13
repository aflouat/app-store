import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { query, queryOne } from '@/lib/freelancehub/db'
import type { Consultant, Skill } from '@/lib/freelancehub/types'
import ConsultantCV from '@/components/freelancehub/consultant/ConsultantCV'

export default async function ConsultantCVPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'consultant') redirect('/freelancehub/login')

  const consultant = await queryOne<Consultant & { name: string; email: string; bookings_count: number }>(
    `SELECT c.*, u.name, u.email,
            (SELECT COUNT(*) FROM freelancehub.bookings b
             WHERE b.consultant_id = c.id AND b.status IN ('confirmed','completed'))::int AS bookings_count
     FROM freelancehub.consultants c
     JOIN freelancehub.users u ON u.id = c.user_id
     WHERE c.user_id = $1`,
    [session.user.id]
  )

  if (!consultant) redirect('/freelancehub/consultant/profile')

  const skills = await query<Skill & { level: string }>(
    `SELECT s.id, s.name, s.category, cs.level
     FROM freelancehub.consultant_skills cs
     JOIN freelancehub.skills s ON s.id = cs.skill_id
     WHERE cs.consultant_id = $1
     ORDER BY s.category, s.name`,
    [consultant.id]
  )

  return <ConsultantCV consultant={consultant} skills={skills} />
}
