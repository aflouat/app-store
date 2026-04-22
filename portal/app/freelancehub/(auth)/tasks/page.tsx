import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { query } from '@/lib/freelancehub/db'
import type { UserRole } from '@/lib/freelancehub/types'

type Priority = 'high' | 'medium' | 'low'

type Task = {
  id: string
  icon: string
  title: string
  description: string
  href: string
  cta: string
  priority: Priority
}

function fmtDate(d: string | Date) {
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
}

async function getClientTasks(userId: string): Promise<Task[]> {
  const tasks: Task[] = []

  const [pending] = await query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM freelancehub.bookings WHERE client_id = $1 AND status = 'pending'`,
    [userId]
  )
  if (Number(pending?.count) > 0) {
    const n = Number(pending.count)
    tasks.push({
      id: 'payment_pending',
      icon: '💳',
      title: `${n} réservation${n > 1 ? 's' : ''} en attente de paiement`,
      description: 'Finalisez votre réservation en procédant au paiement pour confirmer votre créneau.',
      href: '/freelancehub/client/bookings',
      cta: 'Voir mes réservations',
      priority: 'high',
    })
  }

  const pendingReviews = await query<{ id: string; skill_name: string | null; slot_date: string }>(
    `SELECT b.id, sk.name AS skill_name, s.slot_date
     FROM freelancehub.bookings b
     JOIN freelancehub.slots s ON s.id = b.slot_id
     LEFT JOIN freelancehub.skills sk ON sk.id = b.skill_requested
     WHERE b.client_id = $1
       AND b.status = 'completed'
       AND NOT EXISTS (
         SELECT 1 FROM freelancehub.reviews r
         WHERE r.booking_id = b.id AND r.reviewer_id = $1
       )
     ORDER BY s.slot_date DESC`,
    [userId]
  )
  for (const b of pendingReviews) {
    tasks.push({
      id: `review_${b.id}`,
      icon: '⭐',
      title: `Évaluez votre mission${b.skill_name ? ` — ${b.skill_name}` : ''}`,
      description: `Mission du ${fmtDate(b.slot_date)}. Votre avis libère les fonds du consultant.`,
      href: `/freelancehub/client/reviews/${b.id}`,
      cta: 'Laisser une évaluation',
      priority: 'medium',
    })
  }

  return tasks
}

async function getConsultantTasks(userId: string): Promise<Task[]> {
  const tasks: Task[] = []

  const [profile] = await query<{ id: string | null; title: string | null; daily_rate: number | null }>(
    `SELECT id, title, daily_rate FROM freelancehub.consultants WHERE user_id = $1`,
    [userId]
  )

  if (!profile || !profile.title || !profile.daily_rate) {
    tasks.push({
      id: 'profile_incomplete',
      icon: '📝',
      title: 'Complétez votre profil',
      description: 'Un profil complet avec titre, tarif et compétences augmente vos chances d\'être sélectionné.',
      href: '/freelancehub/consultant/profile',
      cta: 'Compléter mon profil',
      priority: 'high',
    })
  }

  if (profile?.id) {
    const [slots] = await query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM freelancehub.slots
       WHERE consultant_id = $1 AND status = 'available' AND slot_date >= CURRENT_DATE`,
      [profile.id]
    )
    if (Number(slots?.count) === 0) {
      tasks.push({
        id: 'no_slots',
        icon: '📅',
        title: 'Aucun créneau disponible',
        description: 'Sans créneaux dans votre agenda, vous n\'apparaissez pas dans les résultats de recherche.',
        href: '/freelancehub/consultant/agenda',
        cta: 'Gérer mon agenda',
        priority: 'high',
      })
    }

    const pendingReviews = await query<{ id: string; skill_name: string | null; slot_date: string }>(
      `SELECT b.id, sk.name AS skill_name, s.slot_date
       FROM freelancehub.bookings b
       JOIN freelancehub.slots s ON s.id = b.slot_id
       LEFT JOIN freelancehub.skills sk ON sk.id = b.skill_requested
       WHERE b.consultant_id = $1
         AND b.status = 'completed'
         AND NOT EXISTS (
           SELECT 1 FROM freelancehub.reviews r
           WHERE r.booking_id = b.id AND r.reviewer_id = $2
         )
       ORDER BY s.slot_date DESC`,
      [profile.id, userId]
    )
    for (const b of pendingReviews) {
      tasks.push({
        id: `review_${b.id}`,
        icon: '⭐',
        title: `Évaluez votre client${b.skill_name ? ` — ${b.skill_name}` : ''}`,
        description: `Mission du ${fmtDate(b.slot_date)}. Les deux évaluations déclenchent le versement de vos fonds.`,
        href: `/freelancehub/consultant/bookings/${b.id}/review`,
        cta: 'Laisser une évaluation',
        priority: 'medium',
      })
    }
  }

  return tasks
}

async function getAdminTasks(): Promise<Task[]> {
  const tasks: Task[] = []

  const [m] = await query<{
    pending_bookings: string
    disputed_bookings: string
    unverified_consultants: string
    captured_payments: string
  }>(`SELECT
       (SELECT COUNT(*) FROM freelancehub.bookings    WHERE status = 'pending')      AS pending_bookings,
       (SELECT COUNT(*) FROM freelancehub.bookings    WHERE status = 'disputed')     AS disputed_bookings,
       (SELECT COUNT(*) FROM freelancehub.consultants WHERE is_verified = false)     AS unverified_consultants,
       (SELECT COUNT(*) FROM freelancehub.payments    WHERE status = 'captured')     AS captured_payments`)

  const n = (k: keyof typeof m) => Number(m?.[k] ?? 0)

  if (n('pending_bookings') > 0) {
    const c = n('pending_bookings')
    tasks.push({
      id: 'booking_pending',
      icon: '📋',
      title: `${c} réservation${c > 1 ? 's' : ''} en attente`,
      description: 'Des clients attendent la confirmation ou le traitement de leur réservation.',
      href: '/freelancehub/admin/bookings',
      cta: 'Gérer les réservations',
      priority: 'high',
    })
  }
  if (n('disputed_bookings') > 0) {
    const c = n('disputed_bookings')
    tasks.push({
      id: 'booking_disputed',
      icon: '⚠️',
      title: `${c} litige${c > 1 ? 's' : ''} en cours`,
      description: 'Des réservations en litige nécessitent votre arbitrage.',
      href: '/freelancehub/admin/bookings',
      cta: 'Voir les litiges',
      priority: 'high',
    })
  }
  if (n('unverified_consultants') > 0) {
    const c = n('unverified_consultants')
    tasks.push({
      id: 'consultant_unverified',
      icon: '✅',
      title: `${c} consultant${c > 1 ? 's' : ''} à vérifier`,
      description: 'Des profils consultants sont en attente de vérification pour apparaître dans le matching.',
      href: '/freelancehub/admin/consultants',
      cta: 'Vérifier les profils',
      priority: 'medium',
    })
  }
  if (n('captured_payments') > 0) {
    const c = n('captured_payments')
    tasks.push({
      id: 'payment_captured',
      icon: '💰',
      title: `${c} paiement${c > 1 ? 's' : ''} en attente de transfert`,
      description: 'Des paiements capturés sont prêts à être transférés aux consultants.',
      href: '/freelancehub/admin/payments',
      cta: 'Voir les paiements',
      priority: 'medium',
    })
  }

  return tasks
}

const PRIORITY_COLOR: Record<Priority, string> = {
  high:   'var(--c2)',
  medium: 'var(--c1)',
  low:    'var(--c4)',
}

export default async function TasksPage() {
  const session = await auth()
  if (!session?.user) redirect('/freelancehub/login')

  const role = session.user.role as UserRole
  const userId = session.user.id

  let tasks: Task[] = []
  if (role === 'client')     tasks = await getClientTasks(userId)
  else if (role === 'consultant') tasks = await getConsultantTasks(userId)
  else if (role === 'admin')  tasks = await getAdminTasks()

  const highCount = tasks.filter(t => t.priority === 'high').length

  return (
    <div className="tp-wrap">
      <header className="tp-header">
        <div>
          <h1 className="tp-title">Mes tâches</h1>
          <p className="tp-sub">
            {tasks.length > 0
              ? `${tasks.length} action${tasks.length > 1 ? 's' : ''} en attente${highCount > 0 ? ` · ${highCount} prioritaire${highCount > 1 ? 's' : ''}` : ''}`
              : 'Tout est à jour — rien à faire pour l\'instant.'}
          </p>
        </div>
      </header>

      {tasks.length > 0 ? (
        <div className="tp-list">
          {tasks.map(task => (
            <div
              key={task.id}
              className="tp-card"
              style={{ borderLeftColor: PRIORITY_COLOR[task.priority] }}
            >
              <div className="tp-icon">{task.icon}</div>
              <div className="tp-body">
                <div className="tp-card-title">{task.title}</div>
                <div className="tp-card-desc">{task.description}</div>
              </div>
              <Link href={task.href} className="tp-cta">
                {task.cta} →
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <div className="tp-sea">
          <img
            src="https://images.unsplash.com/photo-1505118380757-91f5f5632de0?auto=format&fit=crop&w=1400&q=80"
            alt="La mer"
            className="tp-sea-img"
          />
          <div className="tp-sea-overlay">
            <p className="tp-sea-msg">Aucune tâche en cours</p>
            <p className="tp-sea-hint">Profitez — revenez plus tard.</p>
          </div>
        </div>
      )}

      <style>{`
        .tp-wrap   { display: flex; flex-direction: column; gap: 2rem; max-width: 860px; }
        .tp-header { display: flex; align-items: flex-start; justify-content: space-between; }
        .tp-title  { font-family: 'Fraunces', serif; font-size: 1.7rem; font-weight: 700; color: var(--dark); }
        .tp-sub    { color: var(--text-mid); font-size: .95rem; margin-top: .3rem; }

        .tp-list { display: flex; flex-direction: column; gap: .7rem; }
        .tp-card {
          display: flex; align-items: center; gap: 1rem;
          background: var(--white);
          border: 1px solid var(--border);
          border-left: 4px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 1rem 1.2rem;
          transition: box-shadow .15s;
        }
        .tp-card:hover { box-shadow: 0 2px 10px rgba(0,0,0,.07); }
        .tp-icon { font-size: 1.4rem; flex-shrink: 0; width: 34px; text-align: center; }
        .tp-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: .2rem; }
        .tp-card-title { font-weight: 600; font-size: .92rem; color: var(--dark); }
        .tp-card-desc  { font-size: .82rem; color: var(--text-light); line-height: 1.4; }
        .tp-cta {
          flex-shrink: 0; white-space: nowrap;
          font-size: .84rem; font-weight: 600; color: var(--c1);
          text-decoration: none;
          padding: .42rem .9rem;
          border: 1.5px solid var(--c1);
          border-radius: var(--radius-sm);
          transition: background .12s, color .12s;
        }
        .tp-cta:hover { background: var(--c1); color: #fff; }

        .tp-sea     { position: relative; border-radius: var(--radius); overflow: hidden; height: 440px; }
        .tp-sea-img { width: 100%; height: 100%; object-fit: cover; display: block; filter: brightness(.75) saturate(1.1); }
        .tp-sea-overlay {
          position: absolute; inset: 0;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: .6rem; text-align: center; padding: 2rem;
        }
        .tp-sea-msg  { font-family: 'Fraunces', serif; font-size: 1.8rem; font-weight: 700; color: #fff; text-shadow: 0 2px 12px rgba(0,0,0,.4); }
        .tp-sea-hint { font-size: .95rem; color: rgba(255,255,255,.82); text-shadow: 0 1px 6px rgba(0,0,0,.3); }

        @media (max-width: 600px) {
          .tp-card { flex-wrap: wrap; }
          .tp-cta  { width: 100%; text-align: center; }
        }
      `}</style>
    </div>
  )
}
