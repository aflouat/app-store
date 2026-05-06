import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { queryOne } from '@/lib/freelancehub/db'
import AgendaCalendar from '@/components/freelancehub/consultant/AgendaCalendar'

export default async function ConsultantAgendaPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'consultant') redirect('/freelancehub/login')

  const userId = session.user.id

  const consultant = await queryOne<{ id: string }>(
    `SELECT id FROM freelancehub.consultants WHERE user_id = $1`,
    [userId]
  )

  if (!consultant) {
    return (
      <div className="fh-page">
        <h1 className="fh-page-title">Mon agenda</h1>
        <div className="fh-notice">
          Complétez d&apos;abord votre <a href="/freelancehub/consultant/profile">profil consultant</a> avant de gérer vos créneaux.
        </div>
        <style>{`
          .fh-page { display: flex; flex-direction: column; gap: 1.5rem; max-width: 780px; }
          .fh-page-title { font-family: 'Fraunces', serif; font-size: 1.7rem; font-weight: 700; color: var(--dark); }
          .fh-notice { background: var(--c1-pale); color: var(--c1); padding: 1rem 1.2rem; border-radius: var(--radius-sm); font-size: .92rem; }
          .fh-notice a { color: var(--c1); font-weight: 600; }
        `}</style>
      </div>
    )
  }

  return (
    <div className="fh-page">
      <header className="fh-page-header">
        <div>
          <h1 className="fh-page-title">Mon agenda</h1>
          <p className="fh-page-sub">Cliquez sur une case pour ajouter ou supprimer un créneau. Utilisez &quot;Dupliquer →&quot; pour copier la semaine entière.</p>
        </div>
      </header>
      <AgendaCalendar consultantId={consultant.id} />
      <style>{`
        .fh-page { display: flex; flex-direction: column; gap: 2rem; max-width: 900px; }
        .fh-page-header { display: flex; flex-direction: column; gap: .4rem; }
        .fh-page-title { font-family: 'Fraunces', serif; font-size: 1.7rem; font-weight: 700; color: var(--dark); }
        .fh-page-sub { color: var(--text-mid); font-size: .92rem; }
      `}</style>
    </div>
  )
}
