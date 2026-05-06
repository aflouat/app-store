import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { query } from '@/lib/freelancehub/db'

export default async function ClientPaymentsPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'client') redirect('/freelancehub/login')

  const userId = session.user.id

  const payments = await query<{
    id: string
    amount: number
    status: string
    created_at: string
    stripe_payment_id: string | null
    authorized_at: string | null
    captured_at: string | null
    transferred_at: string | null
    skill_name: string | null
    slot_date: string
  }>(
    `SELECT p.id, p.amount, p.status, p.created_at,
            p.stripe_payment_id, p.authorized_at, p.captured_at, p.transferred_at,
            sk.name AS skill_name,
            s.slot_date::text
     FROM freelancehub.payments p
     JOIN freelancehub.bookings b ON b.id = p.booking_id
     JOIN freelancehub.slots s ON s.id = b.slot_id
     LEFT JOIN freelancehub.skills sk ON sk.id = b.skill_requested
     WHERE b.client_id = $1
     ORDER BY p.created_at DESC`,
    [userId]
  )

  const totalSpent = payments
    .filter(p => p.status === 'captured' || p.status === 'transferred')
    .reduce((sum, p) => sum + p.amount, 0) / 100

  const STATUS_PAY: Record<string, { label: string; color: string }> = {
    pending:    { label: 'En attente',  color: 'var(--text-mid)' },
    authorized: { label: 'Autorisé',   color: 'var(--c2)' },
    captured:   { label: 'Capturé',    color: 'var(--c1)' },
    transferred:{ label: 'Versé',      color: 'var(--c3)' },
    refunded:   { label: 'Remboursé',  color: 'var(--c4)' },
    failed:     { label: 'Échoué',     color: '#c0392b' },
  }

  return (
    <div className="fh-page">
      <header className="fh-page-header">
        <h1 className="fh-page-title">Mes paiements</h1>
        <div className="pay-total-chip">
          Total dépensé : <strong>{totalSpent.toFixed(0)} €</strong>
        </div>
      </header>

      {payments.length === 0 ? (
        <p className="fh-empty">Aucun paiement pour le moment.</p>
      ) : (
        <div className="pay-table-wrap">
          <table className="pay-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Expertise</th>
                <th>Référence</th>
                <th>Montant</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {payments.map(p => {
                const ps = STATUS_PAY[p.status] ?? STATUS_PAY.pending
                return (
                  <tr key={p.id}>
                    <td>{new Date(p.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td>{p.skill_name ?? '—'}</td>
                    <td><code className="pay-ref">{p.stripe_payment_id ?? p.id.slice(0,12) + '…'}</code></td>
                    <td className="pay-amount">{(p.amount / 100).toFixed(0)} €</td>
                    <td>
                      <span className="pay-badge" style={{ color: ps.color }}>
                        {ps.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <style>{`
        .fh-page { display: flex; flex-direction: column; gap: 1.5rem; max-width: 900px; }
        .fh-page-header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
        .fh-page-title { font-family: 'Fraunces', serif; font-size: 1.7rem; font-weight: 700; color: var(--dark); }
        .pay-total-chip { font-size: .9rem; color: var(--text-mid); background: var(--c4-pale); padding: .4em 1em; border-radius: 20px; }
        .pay-total-chip strong { color: var(--text); }
        .fh-empty { color: var(--text-light); font-size: .9rem; }
        .pay-table-wrap { overflow-x: auto; background: var(--white); border-radius: var(--radius); border: 1px solid var(--border); }
        .pay-table { width: 100%; border-collapse: collapse; font-size: .88rem; }
        .pay-table th { padding: .75rem 1rem; text-align: left; font-size: .75rem; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: var(--text-light); border-bottom: 1px solid var(--border); background: var(--bg); }
        .pay-table td { padding: .75rem 1rem; border-bottom: 1px solid var(--border); color: var(--text); }
        .pay-table tr:last-child td { border-bottom: none; }
        .pay-table tbody tr:hover { background: var(--bg); }
        .pay-ref { font-size: .78rem; color: var(--text-light); }
        .pay-amount { font-weight: 700; }
        .pay-badge { font-size: .82rem; font-weight: 600; }
      `}</style>
    </div>
  )
}
