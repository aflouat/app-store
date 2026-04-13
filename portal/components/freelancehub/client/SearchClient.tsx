'use client'

import { useState, useEffect } from 'react'
import type { Skill, MatchingResult } from '@/lib/freelancehub/types'
import BookingModal from './BookingModal'

type AvailFilter = 'all' | 'week' | 'month'

interface Props {
  skills:   Skill[]
  clientId: string
}

// Prix fixe plateforme
const PRICE_TTC = 85

export default function SearchClient({ skills, clientId }: Props) {
  const [skillId,     setSkillId]     = useState('')
  const [budget,      setBudget]      = useState('')
  const [notes,       setNotes]       = useState('')
  const [loading,     setLoading]     = useState(false)
  const [results,     setResults]     = useState<MatchingResult[] | null>(null)
  const [error,       setError]       = useState('')
  const [selected,    setSelected]    = useState<MatchingResult | null>(null)
  const [availFilter, setAvailFilter] = useState<AvailFilter>('all')

  async function handleSearch() {
    if (!skillId) return
    setLoading(true)
    setError('')
    setResults(null)

    const res = await fetch('/api/freelancehub/matching', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        skill_id:      Number(skillId),
        client_budget: budget ? Number(budget) : null,
      }),
    })

    setLoading(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Erreur lors de la recherche.')
      return
    }
    const data = await res.json()
    setResults(data.matches ?? [])
  }

  // Grouper les compétences par catégorie
  const byCategory: Record<string, Skill[]> = {}
  skills.forEach(s => {
    const cat = s.category ?? 'Autre'
    if (!byCategory[cat]) byCategory[cat] = []
    byCategory[cat].push(s)
  })

  const budgetInsuffisant = budget && Number(budget) < PRICE_TTC

  const today = new Date()
  const filteredResults = results?.filter(r => {
    if (availFilter === 'all') return true
    const slotDate = new Date(r.slot.slot_date + 'T00:00:00')
    const daysUntil = Math.ceil((slotDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return availFilter === 'week' ? daysUntil <= 7 : daysUntil <= 30
  }) ?? []

  return (
    <div className="srch-wrap">
      {/* Formulaire */}
      <div className="srch-form-card">
        <div className="srch-form-header">
          <h2 className="srch-form-title">Trouver un expert</h2>
          <span className="srch-price-badge">💶 {PRICE_TTC} € TTC / consultation (1h)</span>
        </div>

        <div className="srch-form-grid">
          <div className="srch-field srch-field-wide">
            <label>Expertise recherchée <span className="req">*</span></label>
            <select value={skillId} onChange={e => setSkillId(e.target.value)}>
              <option value="">— Sélectionnez une compétence —</option>
              {Object.entries(byCategory).map(([cat, catSkills]) => (
                <optgroup key={cat} label={cat}>
                  {catSkills.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="srch-field">
            <label>Budget max (€ TTC)</label>
            <input
              type="number"
              value={budget}
              onChange={e => setBudget(e.target.value)}
              placeholder={`Min. ${PRICE_TTC} €`}
              min={0}
            />
            {budgetInsuffisant && (
              <span className="srch-budget-warn">
                Le tarif minimum est {PRICE_TTC} € TTC
              </span>
            )}
          </div>
        </div>

        <div className="srch-field">
          <label>Contexte / description du besoin</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            placeholder="Décrivez votre projet, vos attentes, le contexte de la consultation…"
          />
        </div>

        {error && <p className="srch-error">{error}</p>}

        <button
          className="fh-btn-primary"
          onClick={handleSearch}
          disabled={loading || !skillId || !!budgetInsuffisant}
        >
          {loading ? 'Recherche en cours…' : 'Rechercher un expert disponible'}
        </button>
      </div>

      {/* Résultats */}
      {results !== null && (
        <div className="srch-results">
          {results.length === 0 ? (
            <div className="srch-no-result">
              <p>Aucun expert disponible pour cette compétence.</p>
              <p className="srch-hint">
                Essayez une autre expertise ou revenez plus tard — les consultants mettent à jour leurs disponibilités régulièrement.
              </p>
            </div>
          ) : (
            <>
              <div className="srch-results-header">
                <div>
                  <h2 className="srch-results-title">
                    {results.length} expert{results.length > 1 ? 's' : ''} disponible{results.length > 1 ? 's' : ''}
                  </h2>
                  <p className="srch-results-sub">
                    Identité anonyme jusqu&apos;au paiement · Consultation 1h à <strong>{PRICE_TTC} € TTC</strong>
                  </p>
                </div>
                {/* Availability filter */}
                <div className="srch-avail-filters">
                  {([['all','Tous'],['week','Cette semaine'],['month','Ce mois']] as [AvailFilter,string][]).map(([v,l]) => (
                    <button
                      key={v}
                      className={`srch-avail-btn${availFilter === v ? ' active' : ''}`}
                      onClick={() => setAvailFilter(v)}
                    >{l}</button>
                  ))}
                </div>
              </div>

              {filteredResults.length === 0 ? (
                <div className="srch-no-result">
                  <p>Aucun expert disponible avec ce filtre.</p>
                  <button className="srch-reset-filter" onClick={() => setAvailFilter('all')}>
                    Voir tous les experts
                  </button>
                </div>
              ) : (
                <div className="srch-cards">
                  {filteredResults.map((r, i) => (
                    <AnonymousCard
                      key={r.slot.id}
                      result={r}
                      rank={i + 1}
                      onBook={() => setSelected(r)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Modal de réservation */}
      {selected && (
        <BookingModal
          match={selected}
          clientId={clientId}
          notes={notes}
          onClose={() => setSelected(null)}
          onBooked={() => {
            setSelected(null)
            setResults(null)
          }}
        />
      )}

      <style>{`
        .srch-wrap { display: flex; flex-direction: column; gap: 1.5rem; }
        .srch-form-card { background: var(--white); border: 1px solid var(--border); border-radius: var(--radius); padding: 1.5rem; display: flex; flex-direction: column; gap: 1.1rem; }
        .srch-form-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: .7rem; }
        .srch-form-title { font-size: 1rem; font-weight: 600; color: var(--text); }
        .srch-price-badge { font-size: .82rem; font-weight: 600; background: var(--c3-pale); color: var(--c3); padding: .35em .85em; border-radius: 20px; }
        .srch-form-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 1rem; }
        @media (max-width: 600px) { .srch-form-grid { grid-template-columns: 1fr; } }
        .srch-field { display: flex; flex-direction: column; gap: .4rem; }
        .srch-field-wide { grid-column: span 1; }
        .srch-field label { font-size: .83rem; font-weight: 500; color: var(--text-mid); }
        .req { color: var(--c1); }
        .srch-field input, .srch-field select, .srch-field textarea {
          padding: .6rem .85rem;
          border: 1.5px solid var(--border);
          border-radius: var(--radius-sm);
          font-size: .93rem; color: var(--text);
          background: var(--white); outline: none;
          font-family: inherit; transition: border-color .15s;
        }
        .srch-field input:focus, .srch-field select:focus, .srch-field textarea:focus { border-color: var(--c1); }
        .srch-field textarea { resize: vertical; min-height: 70px; }
        .srch-budget-warn { font-size: .78rem; color: #c0392b; margin-top: -.1rem; }
        .srch-error { color: #c0392b; font-size: .85rem; background: #fdf0ef; padding: .5rem .75rem; border-radius: 6px; }
        .fh-btn-primary { padding: .72rem 1.5rem; background: var(--c1); color: #fff; border: none; border-radius: var(--radius-sm); font-size: .95rem; font-weight: 600; cursor: pointer; align-self: flex-start; transition: background .15s; }
        .fh-btn-primary:hover:not(:disabled) { background: var(--c1-light); }
        .fh-btn-primary:disabled { opacity: .6; cursor: not-allowed; }
        .srch-results { display: flex; flex-direction: column; gap: 1rem; }
        .srch-results-title { font-family: 'Fraunces', serif; font-size: 1.2rem; font-weight: 700; color: var(--dark); }
        .srch-results-sub { font-size: .85rem; color: var(--text-light); margin-top: -.6rem; }
        .srch-cards { display: flex; flex-direction: column; gap: .9rem; }
        .srch-no-result { background: var(--white); border: 1px solid var(--border); border-radius: var(--radius); padding: 1.8rem; text-align: center; }
        .srch-no-result p { color: var(--text-mid); font-size: .95rem; }
        .srch-hint { font-size: .85rem; color: var(--text-light); margin-top: .4rem; }
        /* Filter */
        .srch-results-header { display: flex; align-items: flex-end; justify-content: space-between; flex-wrap: wrap; gap: .8rem; }
        .srch-avail-filters { display: flex; gap: .4rem; }
        .srch-avail-btn { padding: .38rem .85rem; border: 1.5px solid var(--border); border-radius: 20px; background: var(--white); font-size: .82rem; color: var(--text-mid); cursor: pointer; transition: border-color .12s, background .12s; white-space: nowrap; }
        .srch-avail-btn:hover { border-color: var(--c1); color: var(--c1); }
        .srch-avail-btn.active { border-color: var(--c1); background: var(--c1-pale); color: var(--c1); font-weight: 600; }
        .srch-reset-filter { margin-top: .8rem; padding: .45rem 1rem; background: var(--c1-pale); color: var(--c1); border: 1.5px solid var(--c1); border-radius: var(--radius-sm); font-size: .85rem; font-weight: 600; cursor: pointer; }
        /* Mini-agenda */
        .ac-mini-agenda-wrap { display: flex; flex-direction: column; gap: .4rem; padding-top: .5rem; border-top: 1px solid var(--border); }
        .ac-mini-agenda-label { font-size: .73rem; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: var(--text-light); }
        .mini-ag { display: flex; gap: .3rem; }
        .mini-ag-cell { display: flex; flex-direction: column; align-items: center; gap: .2rem; flex: 1; padding: .35rem .2rem; border-radius: var(--radius-sm); border: 1.5px solid var(--border); background: var(--bg); }
        .mini-ag-cell--avail { border-color: #27ae60; background: #edfaf3; }
        .mini-ag-day { font-size: .62rem; font-weight: 600; text-transform: uppercase; letter-spacing: .03em; color: var(--text-light); }
        .mini-ag-cell--avail .mini-ag-day { color: #1a7a46; }
        .mini-ag-num { font-size: .78rem; font-weight: 700; color: var(--text); }
        .mini-ag-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--border); }
        .mini-ag-cell--avail .mini-ag-dot { background: #27ae60; }
      `}</style>
    </div>
  )
}

function MiniAgenda({ consultantId }: { consultantId: string }) {
  const [slotMap, setSlotMap] = useState<Record<string, number>>({})

  useEffect(() => {
    fetch(`/api/freelancehub/client/slots?consultant_id=${consultantId}`)
      .then(r => r.json())
      .then(d => {
        const counts: Record<string, number> = {}
        Object.entries(d.slots_by_date ?? {}).forEach(([date, slots]) => {
          counts[date] = (slots as unknown[]).length
        })
        setSlotMap(counts)
      })
      .catch(() => {})
  }, [consultantId])

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return d
  })

  return (
    <div className="mini-ag">
      {days.map(d => {
        const iso   = d.toISOString().split('T')[0]
        const count = slotMap[iso] ?? 0
        const label = d.toLocaleDateString('fr-FR', { weekday: 'short' }).slice(0, 3)
        return (
          <div key={iso} className={`mini-ag-cell${count > 0 ? ' mini-ag-cell--avail' : ''}`} title={count > 0 ? `${count} créneau${count > 1 ? 'x' : ''} le ${d.toLocaleDateString('fr-FR')}` : 'Indisponible'}>
            <span className="mini-ag-day">{label}</span>
            <span className="mini-ag-num">{d.getDate()}</span>
            <span className="mini-ag-dot" />
          </div>
        )
      })}
    </div>
  )
}

function AnonymousCard({ result, rank, onBook }: { result: MatchingResult; rank: number; onBook: () => void }) {
  const { consultant: c, slot, score, score_breakdown: sb } = result
  const nextDate = new Date(slot.slot_date + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <div className="ac-card">
      <div className="ac-body">
        <div className="ac-top">
          <div className="ac-avatar"><span>{rank}</span></div>
          <div className="ac-info">
            <p className="ac-title">{c.title ?? 'Consultant Expert'}</p>
            <div className="ac-meta">
              {c.location && <span>📍 {c.location}</span>}
              {c.is_verified && <span className="ac-verified">✓ Vérifié</span>}
            </div>
            <div className="ac-rating">
              {'★'.repeat(Math.round(c.rating))}{'☆'.repeat(5 - Math.round(c.rating))}
              <span className="ac-rating-num">{Number(c.rating).toFixed(1)}</span>
            </div>
          </div>
          <div className="ac-score-wrap">
            <div className="ac-score">{score}</div>
            <div className="ac-score-label">score</div>
          </div>
        </div>

        <div className="ac-breakdown">
          <ScoreBar label="Compétence"   value={sb.skill_match}        />
          <ScoreBar label="Réputation"   value={sb.rating_score}       />
          <ScoreBar label="Disponibilité" value={sb.availability_score} />
        </div>

        <div className="ac-slot-info">
          <span>📅 Prochaine dispo : <strong>{nextDate}</strong> à {slot.slot_time.slice(0, 5)}</span>
          <span className="ac-price-tag">💶 85 € TTC</span>
        </div>

        {/* Mini-agenda 7 jours */}
        <div className="ac-mini-agenda-wrap">
          <span className="ac-mini-agenda-label">Disponibilités · 7 prochains jours</span>
          <MiniAgenda consultantId={c.id} />
        </div>
      </div>

      <button className="ac-book-btn" onClick={onBook}>
        Réserver · 85 € →
      </button>

      <style>{`
        .ac-card { background: var(--white); border: 1.5px solid var(--border); border-radius: var(--radius); padding: 1.3rem; display: flex; flex-direction: column; gap: 1.1rem; transition: border-color .15s, box-shadow .15s; }
        .ac-card:hover { border-color: var(--c1); box-shadow: 0 4px 16px rgba(0,0,0,.07); }
        .ac-body { display: flex; flex-direction: column; gap: .9rem; }
        .ac-top { display: flex; align-items: flex-start; gap: 1rem; }
        .ac-avatar { width: 48px; height: 48px; border-radius: 50%; background: var(--c1-pale); display: flex; align-items: center; justify-content: center; font-family: 'Fraunces', serif; font-size: 1.2rem; font-weight: 700; color: var(--c1); flex-shrink: 0; }
        .ac-info { flex: 1; display: flex; flex-direction: column; gap: .3rem; }
        .ac-title { font-weight: 600; font-size: .95rem; color: var(--text); }
        .ac-meta { display: flex; flex-wrap: wrap; gap: .7rem; font-size: .82rem; color: var(--text-mid); }
        .ac-verified { color: var(--c3); font-weight: 600; font-size: .78rem; background: var(--c3-pale); padding: .15em .5em; border-radius: 10px; }
        .ac-rating { font-size: .95rem; color: #e8b84b; letter-spacing: .05em; }
        .ac-rating-num { font-size: .82rem; color: var(--text-mid); margin-left: .4rem; }
        .ac-score-wrap { text-align: center; flex-shrink: 0; }
        .ac-score { font-family: 'Fraunces', serif; font-size: 1.5rem; font-weight: 700; color: var(--c1); }
        .ac-score-label { font-size: .7rem; color: var(--text-light); text-transform: uppercase; letter-spacing: .05em; }
        .ac-breakdown { display: flex; flex-direction: column; gap: .35rem; }
        .ac-slot-info { display: flex; gap: 1.5rem; flex-wrap: wrap; align-items: center; font-size: .85rem; color: var(--text-mid); }
        .ac-price-tag { font-weight: 700; color: var(--c3); background: var(--c3-pale); padding: .2em .6em; border-radius: 10px; font-size: .82rem; }
        .ac-book-btn { padding: .65rem 1.3rem; background: var(--c1); color: #fff; border: none; border-radius: var(--radius-sm); font-size: .9rem; font-weight: 600; cursor: pointer; align-self: flex-end; transition: background .15s; }
        .ac-book-btn:hover { background: var(--c1-light); }
      `}</style>
    </div>
  )
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '.7rem', fontSize: '.8rem' }}>
      <span style={{ color: 'var(--text-light)', width: '90px', flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: '5px', background: 'var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${value}%`, background: 'var(--c1)', borderRadius: '10px' }} />
      </div>
      <span style={{ color: 'var(--text-mid)', width: '30px', textAlign: 'right' }}>{value}</span>
    </div>
  )
}
