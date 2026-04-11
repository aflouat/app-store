import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { query } from '@/lib/freelancehub/db'
import Link from 'next/link'

export default async function ClientReviewsPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'client') redirect('/freelancehub/login')

  const userId = session.user.id

  // Bookings that are completed and awaiting review from this client
  const pendingReviews = await query<{
    booking_id: string
    slot_date: string
    skill_name: string | null
    consultant_title: string | null
  }>(
    `SELECT b.id AS booking_id, s.slot_date::text,
            sk.name AS skill_name,
            c.title AS consultant_title
     FROM freelancehub.bookings b
     JOIN freelancehub.slots s ON s.id = b.slot_id
     LEFT JOIN freelancehub.skills sk ON sk.id = b.skill_requested
     LEFT JOIN freelancehub.consultants c ON c.id = b.consultant_id
     WHERE b.client_id = $1
       AND b.status = 'completed'
       AND NOT EXISTS (
         SELECT 1 FROM freelancehub.reviews r
         WHERE r.booking_id = b.id AND r.reviewer_id = $1
       )
     ORDER BY s.slot_date DESC`,
    [userId]
  )

  const myReviews = await query<{
    id: string
    rating: number
    comment: string | null
    created_at: string
    is_validated: boolean
    skill_name: string | null
    slot_date: string
  }>(
    `SELECT r.id, r.rating, r.comment, r.created_at, r.is_validated,
            sk.name AS skill_name, s.slot_date::text
     FROM freelancehub.reviews r
     JOIN freelancehub.bookings b ON b.id = r.booking_id
     JOIN freelancehub.slots s ON s.id = b.slot_id
     LEFT JOIN freelancehub.skills sk ON sk.id = b.skill_requested
     WHERE r.reviewer_id = $1 AND r.reviewer_role = 'client'
     ORDER BY r.created_at DESC`,
    [userId]
  )

  return (
    <div className="fh-page">
      <header className="fh-page-header">
        <h1 className="fh-page-title">Mes évaluations</h1>
      </header>

      {pendingReviews.length > 0 && (
        <section className="rev-section">
          <h2 className="rev-section-title">
            Évaluations en attente ({pendingReviews.length})
          </h2>
          <div className="rev-pending-list">
            {pendingReviews.map(b => (
              <div key={b.booking_id} className="rev-pending-card">
                <div className="rev-pending-info">
                  <span className="rev-skill">{b.skill_name ?? 'Mission'}</span>
                  <span className="rev-date">
                    {new Date(b.slot_date + 'T00:00:00').toLocaleDateString('fr-FR', {
                      day: 'numeric', month: 'long', year: 'numeric',
                    })}
                  </span>
                  {b.consultant_title && <span className="rev-consult">{b.consultant_title}</span>}
                </div>
                <Link
                  href={`/freelancehub/client/reviews/${b.booking_id}`}
                  className="rev-btn"
                >
                  Évaluer →
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rev-section">
        <h2 className="rev-section-title">Mes avis publiés ({myReviews.length})</h2>
        {myReviews.length === 0 ? (
          <p className="fh-empty">Aucun avis publié pour le moment.</p>
        ) : (
          <div className="rev-list">
            {myReviews.map(r => (
              <div key={r.id} className="rev-card">
                <div className="rev-stars">
                  {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                  <span className="rev-score">{r.rating}/5</span>
                </div>
                <p className="rev-comment">{r.comment || <em>Aucun commentaire</em>}</p>
                <div className="rev-meta">
                  <span>{r.skill_name ?? 'Mission'}</span>
                  <span>·</span>
                  <span>{new Date(r.created_at).toLocaleDateString('fr-FR')}</span>
                  {!r.is_validated && <span className="rev-pending-badge">En attente de validation</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <style>{`
        .fh-page { display: flex; flex-direction: column; gap: 2rem; max-width: 780px; }
        .fh-page-header { display: flex; flex-direction: column; gap: .4rem; }
        .fh-page-title { font-family: 'Fraunces', serif; font-size: 1.7rem; font-weight: 700; color: var(--dark); }
        .fh-empty { color: var(--text-light); font-size: .9rem; }
        .rev-section { display: flex; flex-direction: column; gap: .8rem; }
        .rev-section-title { font-size: 1rem; font-weight: 600; color: var(--text); }
        .rev-pending-list { display: flex; flex-direction: column; gap: .6rem; }
        .rev-pending-card { background: var(--c1-pale); border: 1px solid var(--c1); border-radius: var(--radius-sm); padding: .9rem 1.1rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
        .rev-pending-info { display: flex; flex-direction: column; gap: .2rem; }
        .rev-skill { font-weight: 600; font-size: .9rem; color: var(--dark); }
        .rev-date { font-size: .82rem; color: var(--text-mid); }
        .rev-consult { font-size: .8rem; color: var(--c1); }
        .rev-btn { background: var(--c1); color: #fff; padding: .45rem 1rem; border-radius: var(--radius-sm); font-size: .85rem; font-weight: 600; text-decoration: none; white-space: nowrap; transition: background .15s; }
        .rev-btn:hover { background: var(--c1-light); }
        .rev-list { display: flex; flex-direction: column; gap: .7rem; }
        .rev-card { background: var(--white); border: 1px solid var(--border); border-radius: var(--radius); padding: 1.1rem 1.3rem; display: flex; flex-direction: column; gap: .5rem; }
        .rev-stars { font-size: 1.1rem; color: #e8b84b; letter-spacing: .05em; }
        .rev-score { font-size: .82rem; color: var(--text-mid); margin-left: .5rem; }
        .rev-comment { font-size: .9rem; color: var(--text-mid); line-height: 1.55; }
        .rev-meta { display: flex; gap: .6rem; font-size: .8rem; color: var(--text-light); align-items: center; }
        .rev-pending-badge { background: var(--c2-pale); color: var(--text-mid); font-size: .75rem; padding: .2em .6em; border-radius: 10px; }
      `}</style>
    </div>
  )
}
