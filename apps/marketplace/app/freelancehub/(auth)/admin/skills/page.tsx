import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import SkillsAdmin from '@/components/freelancehub/admin/SkillsAdmin'
import { query } from '@/lib/freelancehub/db'

export default async function AdminSkillsPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') redirect('/freelancehub/login')

  const skills = await query<{
    id: number; name: string; category: string | null; consultants_count: number
  }>(
    `SELECT s.id, s.name, s.category,
            (SELECT COUNT(*) FROM freelancehub.consultant_skills cs WHERE cs.skill_id = s.id)::int AS consultants_count
     FROM freelancehub.skills s
     ORDER BY s.category NULLS LAST, s.name`
  )

  return (
    <div className="fh-page">
      <header className="fh-page-header">
        <h1 className="fh-page-title">Gestion des expertises</h1>
        <p className="fh-page-sub">{skills.length} expertise{skills.length !== 1 ? 's' : ''} disponibles pour les consultants</p>
      </header>
      <SkillsAdmin initialSkills={skills} />
      <style>{`
        .fh-page { display: flex; flex-direction: column; gap: 1.5rem; max-width: 720px; }
        .fh-page-header { display: flex; flex-direction: column; gap: .3rem; }
        .fh-page-title { font-family: 'Fraunces', serif; font-size: 1.7rem; font-weight: 700; color: var(--dark); }
        .fh-page-sub { color: var(--text-mid); font-size: .9rem; }
      `}</style>
    </div>
  )
}
