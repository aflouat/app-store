import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { query, queryOne } from '@/lib/freelancehub/db'
import AgendaManager from '@/components/freelancehub/consultant/AgendaManager'

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

  const slots = await query<{
    id: string
    slot_date: string
    slot_time: string
    duration_min: number
    status: string
  }>(
    `SELECT id, slot_date::text, slot_time::text, duration_min, status
     FROM freelancehub.slots
     WHERE consultant_id = $1 AND slot_date >= CURRENT_DATE
     ORDER BY slot_date, slot_time
     LIMIT 60`,
    [consultant.id]
  )

  return (
    <div className="fh-page">
      <header className="fh-page-header">
        <div>
          <h1 className="fh-page-title">Mon agenda</h1>
          <p className="fh-page-sub">Gérez vos disponibilités. Les créneaux libres seront proposés aux clients.</p>
        </div>
      </header>
      <AgendaManager consultantId={consultant.id} initialSlots={slots} />
      <style>{`
        .fh-page { display: flex; flex-direction: column; gap: 2rem; max-width: 900px; }
        .fh-page-header { display: flex; flex-direction: column; gap: .4rem; }
        .fh-page-title { font-family: 'Fraunces', serif; font-size: 1.7rem; font-weight: 700; color: var(--dark); }
        .fh-page-sub { color: var(--text-mid); font-size: .92rem; }
      `}</style>
    </div>
  )
}
