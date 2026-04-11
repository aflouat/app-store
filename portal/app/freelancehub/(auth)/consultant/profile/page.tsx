import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { query, queryOne } from '@/lib/freelancehub/db'
import ProfileForm from '@/components/freelancehub/consultant/ProfileForm'
import type { Consultant, Skill } from '@/lib/freelancehub/types'

export default async function ConsultantProfilePage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'consultant') redirect('/freelancehub/login')

  const userId = session.user.id

  const consultant = await queryOne<Consultant & { id: string }>(
    `SELECT c.*, u.name, u.email, u.avatar_url
     FROM freelancehub.consultants c
     JOIN freelancehub.users u ON u.id = c.user_id
     WHERE c.user_id = $1`,
    [userId]
  )

  const allSkills = await query<Skill>(
    `SELECT id, name, category FROM freelancehub.skills ORDER BY category, name`
  )

  const consultantSkills = consultant
    ? await query<{ skill_id: number; level: string }>(
        `SELECT skill_id, level FROM freelancehub.consultant_skills WHERE consultant_id = $1`,
        [consultant.id]
      )
    : []

  return (
    <div className="fh-page">
      <header className="fh-page-header">
        <div>
          <h1 className="fh-page-title">Mon profil</h1>
          <p className="fh-page-sub">Ces informations sont présentées aux clients (de façon anonyme jusqu&apos;au paiement).</p>
        </div>
      </header>
      <ProfileForm
        userId={userId}
        consultant={consultant}
        allSkills={allSkills}
        consultantSkills={consultantSkills}
      />
      <style>{`
        .fh-page { display: flex; flex-direction: column; gap: 2rem; max-width: 780px; }
        .fh-page-header { display: flex; flex-direction: column; gap: .4rem; }
        .fh-page-title { font-family: 'Fraunces', serif; font-size: 1.7rem; font-weight: 700; color: var(--dark); }
        .fh-page-sub { color: var(--text-mid); font-size: .92rem; }
      `}</style>
    </div>
  )
}
