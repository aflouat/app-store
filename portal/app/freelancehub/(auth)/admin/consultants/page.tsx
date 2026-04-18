import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { query } from '@/lib/freelancehub/db'
import ConsultantActions from '@/components/freelancehub/admin/ConsultantActions'

export default async function AdminConsultantsPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') redirect('/freelancehub/login')

  const consultants = await query<{
    id: string
    user_id: string
    name: string | null
    email: string
    title: string | null
    daily_rate: number | null
    experience_years: number
    rating: number
    rating_count: number
    is_verified: boolean
    is_available: boolean
    location: string | null
    created_at: string
    skills_count: number
    bookings_count: number
    kyc_status: string
    kyc_document_url: string | null
    kyc_document_name: string | null
  }>(
    `SELECT c.id, c.user_id, u.name, u.email, c.title,
            c.daily_rate, c.experience_years, c.rating, c.rating_count,
            c.is_verified, c.is_available, c.location, u.created_at,
            c.kyc_status, c.kyc_document_url, c.kyc_document_name,
            (SELECT COUNT(*) FROM freelancehub.consultant_skills cs WHERE cs.consultant_id = c.id)::int AS skills_count,
            (SELECT COUNT(*) FROM freelancehub.bookings b WHERE b.consultant_id = c.id)::int AS bookings_count
     FROM freelancehub.consultants c
     JOIN freelancehub.users u ON u.id = c.user_id
     ORDER BY c.kyc_status = 'submitted' DESC, u.created_at DESC`
  )

  return (
    <div className="fh-page">
      <header className="fh-page-header">
        <h1 className="fh-page-title">Gestion des consultants</h1>
        <p className="fh-page-sub">{consultants.length} consultant{consultants.length !== 1 ? 's' : ''} inscrits</p>
      </header>

      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th>Consultant</th>
              <th>Titre</th>
              <th>THM</th>
              <th>Note</th>
              <th>Compétences</th>
              <th>Missions</th>
              <th>KYC</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {consultants.map(c => (
              <tr key={c.id}>
                <td>
                  <div className="adm-user-cell">
                    <span className="adm-name">{c.name ?? '—'}</span>
                    <span className="adm-email">{c.email}</span>
                  </div>
                </td>
                <td>{c.title ?? '—'}</td>
                <td>{c.daily_rate ? `${c.daily_rate} €` : '—'}</td>
                <td>
                  <span style={{ color: '#e8b84b' }}>{'★'.repeat(Math.round(Number(c.rating)))}</span>
                  <span className="adm-rating-num">{Number(c.rating).toFixed(1)}</span>
                </td>
                <td>{c.skills_count}</td>
                <td>{c.bookings_count}</td>
                <td>
                  <KycBadge status={c.kyc_status} docUrl={c.kyc_document_url} docName={c.kyc_document_name} />
                </td>
                <td>
                  <div className="adm-status-badges">
                    <span className={`adm-badge ${c.is_verified ? 'verified' : 'unverified'}`}>
                      {c.is_verified ? '✓ Vérifié' : '○ Non vérifié'}
                    </span>
                    <span className={`adm-badge ${c.is_available ? 'available' : 'unavailable'}`}>
                      {c.is_available ? 'Dispo' : 'Indispo'}
                    </span>
                  </div>
                </td>
                <td>
                  <ConsultantActions
                    consultantId={c.id}
                    isVerified={c.is_verified}
                    isAvailable={c.is_available}
                    kycStatus={c.kyc_status}
                    kycDocumentUrl={c.kyc_document_url}
                  />
                </td>
              </tr>
            ))}
            {consultants.length === 0 && (
              <tr>
                <td colSpan={8} className="adm-empty-row">Aucun consultant enregistré.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <style>{`
        .fh-page { display: flex; flex-direction: column; gap: 1.5rem; }
        .fh-page-header { display: flex; flex-direction: column; gap: .3rem; }
        .fh-page-title { font-family: 'Fraunces', serif; font-size: 1.7rem; font-weight: 700; color: var(--dark); }
        .fh-page-sub { color: var(--text-mid); font-size: .9rem; }
        .adm-table-wrap { overflow-x: auto; background: var(--white); border-radius: var(--radius); border: 1px solid var(--border); }
        .adm-table { width: 100%; border-collapse: collapse; font-size: .87rem; }
        .adm-table th { padding: .7rem .9rem; text-align: left; font-size: .74rem; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: var(--text-light); border-bottom: 1px solid var(--border); background: var(--bg); white-space: nowrap; }
        .adm-table td { padding: .75rem .9rem; border-bottom: 1px solid var(--border); color: var(--text); vertical-align: middle; }
        .adm-table tr:last-child td { border-bottom: none; }
        .adm-table tbody tr:hover { background: var(--bg); }
        .adm-user-cell { display: flex; flex-direction: column; gap: .1rem; }
        .adm-name { font-weight: 600; }
        .adm-email { font-size: .78rem; color: var(--text-light); }
        .adm-rating-num { font-size: .78rem; color: var(--text-light); margin-left: .3rem; }
        .adm-status-badges { display: flex; flex-direction: column; gap: .3rem; }
        .adm-badge { font-size: .73rem; font-weight: 600; padding: .2em .55em; border-radius: 10px; white-space: nowrap; }
        .adm-badge.verified    { background: var(--c3-pale); color: var(--c3); }
        .adm-badge.unverified  { background: var(--c2-pale); color: var(--text-mid); }
        .adm-badge.available   { background: var(--c4-pale); color: var(--c4); }
        .adm-badge.unavailable { background: #f5f5f5; color: #999; }
        .adm-empty-row { text-align: center; color: var(--text-light); padding: 2rem; }
        .adm-kyc-badge { font-size: .73rem; font-weight: 600; padding: .2em .55em; border-radius: 10px; white-space: nowrap; display: inline-block; }
        .adm-kyc-none      { background: #f5f5f5; color: #999; }
        .adm-kyc-submitted { background: #fffbeb; color: #d97706; }
        .adm-kyc-validated { background: var(--c3-pale); color: var(--c3); }
        .adm-kyc-rejected  { background: #fdf0ef; color: #c0392b; }
        .adm-kyc-doc-link  { font-size: .72rem; color: var(--c1); text-decoration: none; display: block; margin-top: .2rem; }
        .adm-kyc-doc-link:hover { text-decoration: underline; }
      `}</style>
    </div>
  )
}

function KycBadge({ status, docUrl, docName }: { status: string; docUrl: string | null; docName: string | null }) {
  const labels: Record<string, string> = {
    none: '○ Non soumis',
    submitted: '⚡ En attente',
    validated: '✓ Validé',
    rejected: '✗ Refusé',
  }
  return (
    <div>
      <span className={`adm-kyc-badge adm-kyc-${status}`}>{labels[status] ?? status}</span>
      {docUrl && docName && (
        <a href={docUrl} target="_blank" rel="noreferrer" className="adm-kyc-doc-link">
          Voir document
        </a>
      )}
    </div>
  )
}
