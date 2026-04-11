import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { query } from '@/lib/freelancehub/db'

export default async function AdminPaymentsPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') redirect('/freelancehub/login')

  const payments = await query<{
    id: string
    amount: number
    status: string
    created_at: string
    stripe_payment_id: string | null
    transferred_at: string | null
    client_name: string | null
    consultant_name: string | null
    booking_status: string
    commission: number | null
    consultant_net: number | null
  }>(
    `SELECT p.id, p.amount, p.status, p.created_at,
            p.stripe_payment_id, p.transferred_at,
            uc.name AS client_name,
            uc2.name AS consultant_name,
            b.status AS booking_status,
            b.commission_amount AS commission,
            b.consultant_amount AS consultant_net
     FROM freelancehub.payments p
     JOIN freelancehub.bookings b ON b.id = p.booking_id
     JOIN freelancehub.users uc  ON uc.id  = b.client_id
     JOIN freelancehub.consultants c ON c.id = b.consultant_id
     JOIN freelancehub.users uc2 ON uc2.id = c.user_id
     ORDER BY p.created_at DESC
     LIMIT 100`
  )

  const totalCaptured   = payments.filter(p => ['captured','transferred'].includes(p.status)).reduce((s, p) => s + p.amount, 0) / 100
  const totalCommission = payments.reduce((s, p) => s + (p.commission ?? 0), 0) / 100
  const pendingTransfer = payments.filter(p => p.status === 'captured' && !p.transferred_at).reduce((s, p) => s + (p.consultant_net ?? 0), 0) / 100

  const STATUS_PAY: Record<string, { label: string; color: string; bg: string }> = {
    pending:    { label: 'En attente',  color: 'var(--text-mid)', bg: 'var(--c2-pale)' },
    authorized: { label: 'Autorisé',   color: 'var(--c2)',        bg: 'var(--c2-pale)' },
    captured:   { label: 'Capturé',    color: 'var(--c1)',        bg: 'var(--c1-pale)' },
    transferred:{ label: 'Versé',      color: 'var(--c3)',        bg: 'var(--c3-pale)' },
    refunded:   { label: 'Remboursé',  color: 'var(--c4)',        bg: 'var(--c4-pale)' },
    failed:     { label: 'Échoué',     color: '#c0392b',          bg: '#fef0f0' },
  }

  return (
    <div className="fh-page">
      <header className="fh-page-header">
        <h1 className="fh-page-title">Paiements & Reversements</h1>
      </header>

      <div className="pay-kpi-grid">
        <KpiCard label="CA capturé"          value={`${totalCaptured.toFixed(0)} €`}   color="var(--c3)" />
        <KpiCard label="Commission plateforme" value={`${totalCommission.toFixed(0)} €`} color="var(--c1)" />
        <KpiCard label="À reverser (consultants)" value={`${pendingTransfer.toFixed(0)} €`} color="var(--c4)" />
      </div>

      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Référence</th>
              <th>Client</th>
              <th>Consultant</th>
              <th>Montant total</th>
              <th>Commission</th>
              <th>Net consultant</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {payments.map(p => {
              const ps = STATUS_PAY[p.status] ?? STATUS_PAY.pending
              return (
                <tr key={p.id}>
                  <td>{new Date(p.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</td>
                  <td><code className="pay-ref">{p.stripe_payment_id ?? p.id.slice(0,10) + '…'}</code></td>
                  <td>{p.client_name ?? '—'}</td>
                  <td>{p.consultant_name ?? '—'}</td>
                  <td className="pay-amount">{(p.amount / 100).toFixed(0)} €</td>
                  <td>{p.commission ? `${(p.commission / 100).toFixed(0)} €` : '—'}</td>
                  <td>{p.consultant_net ? `${(p.consultant_net / 100).toFixed(0)} €` : '—'}</td>
                  <td>
                    <span className="adm-badge" style={{ background: ps.bg, color: ps.color }}>
                      {ps.label}
                    </span>
                  </td>
                </tr>
              )
            })}
            {payments.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-light)', padding: '2rem' }}>Aucun paiement.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <style>{`
        .fh-page { display: flex; flex-direction: column; gap: 1.5rem; }
        .fh-page-header { display: flex; flex-direction: column; gap: .3rem; }
        .fh-page-title { font-family: 'Fraunces', serif; font-size: 1.7rem; font-weight: 700; color: var(--dark); }
        .pay-kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; }
        .adm-table-wrap { overflow-x: auto; background: var(--white); border-radius: var(--radius); border: 1px solid var(--border); }
        .adm-table { width: 100%; border-collapse: collapse; font-size: .86rem; }
        .adm-table th { padding: .65rem .9rem; text-align: left; font-size: .73rem; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: var(--text-light); border-bottom: 1px solid var(--border); background: var(--bg); white-space: nowrap; }
        .adm-table td { padding: .7rem .9rem; border-bottom: 1px solid var(--border); color: var(--text); vertical-align: middle; }
        .adm-table tr:last-child td { border-bottom: none; }
        .adm-table tbody tr:hover { background: var(--bg); }
        .pay-ref { font-size: .78rem; color: var(--text-light); }
        .pay-amount { font-weight: 700; }
        .adm-badge { font-size: .75rem; font-weight: 600; padding: .22em .65em; border-radius: 20px; white-space: nowrap; }
      `}</style>
    </div>
  )
}

function KpiCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: 'var(--white)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', borderTop: `3px solid ${color}`, padding: '1.2rem 1rem', display: 'flex', flexDirection: 'column', gap: '.3rem' }}>
      <span style={{ fontFamily: "'Fraunces', serif", fontSize: '1.6rem', fontWeight: 700, color: 'var(--dark)' }}>{value}</span>
      <span style={{ fontSize: '.78rem', color: 'var(--text-light)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</span>
    </div>
  )
}
