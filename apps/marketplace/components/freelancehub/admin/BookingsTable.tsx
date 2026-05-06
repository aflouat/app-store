'use client'

import { useState, useMemo } from 'react'
import BookingStatusAction from './BookingStatusAction'

export interface BookingRow {
  id: string
  booking_number: number | null
  status: string
  created_at: string
  slot_date: string
  slot_time: string
  amount_ht: number | null
  commission_amount: number | null
  matching_score: number | null
  client_name: string | null
  client_email: string
  consultant_title: string | null
  consultant_name: string | null
  skill_name: string | null
}

interface Props {
  bookings: BookingRow[]
}

const STATUS_MAP: Record<string, { label: string; bg: string; color: string }> = {
  pending:     { label: 'En attente',  bg: 'var(--c2-pale)', color: 'var(--text-mid)' },
  confirmed:   { label: 'Confirmée',  bg: 'var(--c3-pale)', color: 'var(--c3)' },
  in_progress: { label: 'En cours',   bg: 'var(--c1-pale)', color: 'var(--c1)' },
  completed:   { label: 'Terminée',   bg: 'var(--c4-pale)', color: 'var(--c4)' },
  cancelled:   { label: 'Annulée',    bg: '#f5f5f5',        color: '#999' },
  disputed:    { label: 'Litige',     bg: '#fef0f0',        color: '#c0392b' },
}

export default function BookingsTable({ bookings }: Props) {
  const [filterStatus,      setFilterStatus]      = useState('')
  const [filterConsultant,  setFilterConsultant]  = useState('')
  const [filterClient,      setFilterClient]      = useState('')
  const [filterDateFrom,    setFilterDateFrom]    = useState('')
  const [filterDateTo,      setFilterDateTo]      = useState('')
  const [filterAmountMin,   setFilterAmountMin]   = useState('')
  const [filterAmountMax,   setFilterAmountMax]   = useState('')

  const filtered = useMemo(() => {
    return bookings.filter(b => {
      if (filterStatus && b.status !== filterStatus) return false
      if (filterConsultant) {
        const q = filterConsultant.toLowerCase()
        const match = (b.consultant_name ?? '').toLowerCase().includes(q) ||
                      (b.consultant_title ?? '').toLowerCase().includes(q)
        if (!match) return false
      }
      if (filterClient) {
        const q = filterClient.toLowerCase()
        const match = (b.client_name ?? '').toLowerCase().includes(q) ||
                      b.client_email.toLowerCase().includes(q)
        if (!match) return false
      }
      if (filterDateFrom && b.slot_date < filterDateFrom) return false
      if (filterDateTo   && b.slot_date > filterDateTo)   return false
      if (filterAmountMin) {
        const min = Number(filterAmountMin) * 100
        if ((b.amount_ht ?? 0) < min) return false
      }
      if (filterAmountMax) {
        const max = Number(filterAmountMax) * 100
        if ((b.amount_ht ?? 0) > max) return false
      }
      return true
    })
  }, [bookings, filterStatus, filterConsultant, filterClient, filterDateFrom, filterDateTo, filterAmountMin, filterAmountMax])

  // Totaux sur les résultats filtrés
  const totalHT   = filtered.reduce((s, b) => s + (b.amount_ht ?? 0), 0)
  const totalComm = filtered.reduce((s, b) => s + (b.commission_amount ?? 0), 0)
  const totalTTC  = Math.round(totalHT * 1.20)

  function resetFilters() {
    setFilterStatus('')
    setFilterConsultant('')
    setFilterClient('')
    setFilterDateFrom('')
    setFilterDateTo('')
    setFilterAmountMin('')
    setFilterAmountMax('')
  }

  const hasFilters = filterStatus || filterConsultant || filterClient ||
                     filterDateFrom || filterDateTo || filterAmountMin || filterAmountMax

  return (
    <div className="bkt-wrap">
      {/* ── Barre de filtres ── */}
      <div className="bkt-filters">
        <div className="bkt-filter-row">
          <div className="bkt-filter-group">
            <label>Statut</label>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">Tous</option>
              {Object.entries(STATUS_MAP).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <div className="bkt-filter-group">
            <label>Date de</label>
            <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} />
          </div>
          <div className="bkt-filter-group">
            <label>Date à</label>
            <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} />
          </div>
          <div className="bkt-filter-group">
            <label>Consultant</label>
            <input
              type="text"
              value={filterConsultant}
              onChange={e => setFilterConsultant(e.target.value)}
              placeholder="Nom ou titre…"
            />
          </div>
          <div className="bkt-filter-group">
            <label>Client</label>
            <input
              type="text"
              value={filterClient}
              onChange={e => setFilterClient(e.target.value)}
              placeholder="Nom ou email…"
            />
          </div>
          <div className="bkt-filter-group">
            <label>Montant HT min (€)</label>
            <input type="number" value={filterAmountMin} onChange={e => setFilterAmountMin(e.target.value)} placeholder="0" min={0} />
          </div>
          <div className="bkt-filter-group">
            <label>Montant HT max (€)</label>
            <input type="number" value={filterAmountMax} onChange={e => setFilterAmountMax(e.target.value)} placeholder="∞" min={0} />
          </div>
          {hasFilters && (
            <button className="bkt-reset-btn" onClick={resetFilters} title="Réinitialiser les filtres">
              ✕ Réinitialiser
            </button>
          )}
        </div>

        {/* ── Totaux ── */}
        <div className="bkt-totals">
          <span className="bkt-total-item">
            <span className="bkt-total-label">Résultats</span>
            <span className="bkt-total-value">{filtered.length}</span>
          </span>
          <span className="bkt-total-sep" />
          <span className="bkt-total-item">
            <span className="bkt-total-label">Total HT</span>
            <span className="bkt-total-value">{(totalHT / 100).toFixed(0)} €</span>
          </span>
          <span className="bkt-total-item">
            <span className="bkt-total-label">TTC estimé</span>
            <span className="bkt-total-value">{(totalTTC / 100).toFixed(0)} €</span>
          </span>
          <span className="bkt-total-item">
            <span className="bkt-total-label">Commission plateforme</span>
            <span className="bkt-total-value bkt-total-comm">{(totalComm / 100).toFixed(0)} €</span>
          </span>
        </div>
      </div>

      {/* ── Tableau ── */}
      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th>#N°</th>
              <th>Date</th>
              <th>Client</th>
              <th>Consultant</th>
              <th>Expertise</th>
              <th>Montant HT</th>
              <th>Commission</th>
              <th>Score</th>
              <th>Statut</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(b => {
              const s = STATUS_MAP[b.status] ?? STATUS_MAP.pending
              return (
                <tr key={b.id}>
                  <td>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '.82rem', color: 'var(--text-mid)' }}>
                      #{b.booking_number ?? '—'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '.1rem' }}>
                      <span>{new Date(b.slot_date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                      <span style={{ fontSize: '.78rem', color: 'var(--text-light)' }}>{b.slot_time?.slice(0,5)}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '.1rem' }}>
                      <span style={{ fontWeight: 600 }}>{b.client_name ?? '—'}</span>
                      <span style={{ fontSize: '.75rem', color: 'var(--text-light)' }}>{b.client_email}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '.1rem' }}>
                      <span style={{ fontWeight: 600 }}>{b.consultant_name ?? '—'}</span>
                      <span style={{ fontSize: '.75rem', color: 'var(--text-light)' }}>{b.consultant_title ?? ''}</span>
                    </div>
                  </td>
                  <td>{b.skill_name ?? '—'}</td>
                  <td>{b.amount_ht ? `${(b.amount_ht / 100).toFixed(0)} €` : '—'}</td>
                  <td>{b.commission_amount ? `${(b.commission_amount / 100).toFixed(0)} €` : '—'}</td>
                  <td>{b.matching_score ? `${b.matching_score}` : '—'}</td>
                  <td>
                    <span className="adm-badge" style={{ background: s.bg, color: s.color }}>
                      {s.label}
                    </span>
                  </td>
                  <td>
                    <BookingStatusAction bookingId={b.id} currentStatus={b.status} />
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', color: 'var(--text-light)', padding: '2rem' }}>
                  {bookings.length === 0 ? 'Aucune réservation.' : 'Aucun résultat pour ces filtres.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <style>{`
        .bkt-wrap { display: flex; flex-direction: column; gap: 1rem; }

        /* Filtres */
        .bkt-filters { display: flex; flex-direction: column; gap: .8rem; background: var(--white); border: 1px solid var(--border); border-radius: var(--radius); padding: 1rem 1.2rem; }
        .bkt-filter-row { display: flex; flex-wrap: wrap; gap: .75rem; align-items: flex-end; }
        .bkt-filter-group { display: flex; flex-direction: column; gap: .25rem; min-width: 130px; }
        .bkt-filter-group label { font-size: .72rem; font-weight: 600; color: var(--text-light); text-transform: uppercase; letter-spacing: .04em; }
        .bkt-filter-group input, .bkt-filter-group select {
          padding: .38rem .65rem;
          border: 1.5px solid var(--border);
          border-radius: var(--radius-sm);
          font-size: .85rem;
          color: var(--text);
          background: var(--bg);
          outline: none;
          transition: border-color .12s;
          font-family: inherit;
        }
        .bkt-filter-group input:focus, .bkt-filter-group select:focus { border-color: var(--c1); background: var(--white); }
        .bkt-reset-btn {
          padding: .38rem .85rem;
          background: none;
          border: 1.5px solid var(--border);
          border-radius: var(--radius-sm);
          font-size: .8rem;
          color: var(--text-mid);
          cursor: pointer;
          align-self: flex-end;
          transition: border-color .12s, color .12s;
          white-space: nowrap;
        }
        .bkt-reset-btn:hover { border-color: #c0392b; color: #c0392b; }

        /* Totaux */
        .bkt-totals { display: flex; align-items: center; gap: 1.2rem; flex-wrap: wrap; padding-top: .5rem; border-top: 1px solid var(--border); }
        .bkt-total-sep { width: 1px; height: 20px; background: var(--border); }
        .bkt-total-item { display: flex; flex-direction: column; gap: .1rem; }
        .bkt-total-label { font-size: .7rem; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; color: var(--text-light); }
        .bkt-total-value { font-size: .92rem; font-weight: 700; color: var(--text); }
        .bkt-total-comm  { color: var(--c3); }

        /* Tableau */
        .adm-table-wrap { overflow-x: auto; background: var(--white); border-radius: var(--radius); border: 1px solid var(--border); }
        .adm-table { width: 100%; border-collapse: collapse; font-size: .86rem; }
        .adm-table th { padding: .65rem .85rem; text-align: left; font-size: .73rem; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: var(--text-light); border-bottom: 1px solid var(--border); background: var(--bg); white-space: nowrap; }
        .adm-table td { padding: .7rem .85rem; border-bottom: 1px solid var(--border); color: var(--text); vertical-align: middle; }
        .adm-table tr:last-child td { border-bottom: none; }
        .adm-table tbody tr:hover { background: var(--bg); }
        .adm-badge { font-size: .75rem; font-weight: 600; padding: .22em .65em; border-radius: 20px; white-space: nowrap; }
      `}</style>
    </div>
  )
}
