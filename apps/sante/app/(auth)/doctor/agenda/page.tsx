import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { queryOne } from '@app-store/core-db'
import SaNav from '@/components/sante/SaNav'
import DoctorAgendaCalendar from '@/components/sante/DoctorAgendaCalendar'
import type { SanteRole } from '@/lib/sante/types'

export default async function DoctorAgendaPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'doctor') redirect('/login')

  const doctor = await queryOne<{ user_id: string }>(
    `SELECT user_id FROM sante.doctors WHERE user_id = $1`,
    [session.user.id]
  )

  return (
    <main className="sa-dash">
      <SaNav user={{
        name:  session.user.name  ?? null,
        email: session.user.email ?? '',
        role:  (session.user.role ?? 'doctor') as SanteRole,
      }} />

      <div className="sa-dash-body">
        <div className="sa-agenda-header">
          <div>
            <h1 className="sa-dash-title">Mes disponibilités</h1>
            <p className="sa-dash-sub">
              Cliquez sur une case pour ajouter ou supprimer un créneau de 30 min.
              Utilisez &quot;Dupliquer →&quot; pour copier toute la semaine.
            </p>
          </div>
          <a href="/doctor/dashboard" className="sa-btn-back">← Tableau de bord</a>
        </div>

        {!doctor ? (
          <div className="sa-notice sa-notice--warn">
            Profil médecin introuvable. Contactez l&apos;administration.
          </div>
        ) : (
          <DoctorAgendaCalendar doctorId={doctor.user_id} />
        )}
      </div>

      <style>{`
        .sa-dash { min-height: 100vh; background: var(--bg); display: flex; flex-direction: column; }
        .sa-dash-body { max-width: 960px; margin: 0 auto; padding: 2.5rem 1.5rem; width: 100%; display: flex; flex-direction: column; gap: 2rem; }
        .sa-agenda-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
        .sa-dash-title { font-family: 'Fraunces', serif; font-size: 1.8rem; font-weight: 700; color: var(--dark); }
        .sa-dash-sub { color: var(--text-mid); font-size: .92rem; margin-top: .2rem; max-width: 560px; }
        .sa-btn-back {
          padding: .5rem 1rem;
          background: var(--white); color: var(--text);
          border: 1.5px solid var(--border); border-radius: var(--radius-sm);
          font-size: .85rem; font-weight: 500; text-decoration: none;
          transition: border-color .15s; white-space: nowrap;
        }
        .sa-btn-back:hover { border-color: var(--c1); color: var(--c1); }
        .sa-notice { display: flex; align-items: flex-start; gap: .7rem; padding: .9rem 1.1rem; border-radius: var(--radius-sm); font-size: .88rem; }
        .sa-notice--warn { background: #fef3cd; color: #856404; border: 1px solid #ffc107; }
      `}</style>
    </main>
  )
}
