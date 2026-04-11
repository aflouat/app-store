'use client'

import { useState } from 'react'
import type { Skill, MatchingResult } from '@/lib/freelancehub/types'
import BookingModal from './BookingModal'

interface Props {
  skills:   Skill[]
  clientId: string
}

export default function SearchClient({ skills, clientId }: Props) {
  const [skillId,  setSkillId]  = useState('')
  const [date,     setDate]     = useState('')
  const [time,     setTime]     = useState('09:00')
  const [budget,   setBudget]   = useState('')
  const [notes,    setNotes]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [results,  setResults]  = useState<MatchingResult[] | null>(null)
  const [error,    setError]    = useState('')
  const [selected, setSelected] = useState<MatchingResult | null>(null)

  const today = new Date().toISOString().split('T')[0]

  async function handleSearch() {
    if (!skillId || !date || !time) return
    setLoading(true)
    setError('')
    setResults(null)

    const res = await fetch('/api/freelancehub/matching', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        skill_id:      Number(skillId),
        slot_date:     date,
        slot_time:     time + ':00',
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

  // Group skills by category
  const byCategory: Record<string, Skill[]> = {}
  skills.forEach(s => {
    const cat = s.category ?? 'Autre'
    if (!byCategory[cat]) byCategory[cat] = []
    byCategory[cat].push(s)
  })

  const times = ['08:00','09:00','10:00','11:00','14:00','15:00','16:00','17:00','18:00']

  return (
    <div className="srch-wrap">
      {/* Search form */}
      <div className="srch-form-card">
        <h2 className="srch-form-title">Critères de recherche</h2>
        <div className="srch-form-grid">
          <div className="srch-field">
            <label>Expertise recherchée <span className="req">*</span></label>
            <select value={skillId} onChange={e => setSkillId(e.target.value)}>
              <option value="">— Sélectionnez —</option>
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
            <label>Date souhaitée <span className="req">*</span></label>
            <input type="date" value={date} min={today} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="srch-field">
            <label>Heure de début <span className="req">*</span></label>
            <select value={time} onChange={e => setTime(e.target.value)}>
              {times.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="srch-field">
            <label>Budget max TJM (€)</label>
            <input
              type="number"
              value={budget}
              onChange={e => setBudget(e.target.value)}
              placeholder="Sans limite"
              min={0}
            />
          </div>
        </div>
        <div className="srch-field srch-notes">
          <label>Contexte / description du besoin</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            placeholder="Décrivez votre projet, vos attentes, le contexte…"
          />
        </div>
        {error && <p className="srch-error">{error}</p>}
        <button
          className="fh-btn-primary"
          onClick={handleSearch}
          disabled={loading || !skillId || !date}
        >
          {loading ? 'Recherche en cours…' : 'Rechercher un expert'}
        </button>
      </div>

      {/* Results */}
      {results !== null && (
        <div className="srch-results">
          {results.length === 0 ? (
            <div className="srch-no-result">
              <p>Aucun expert disponible pour ces critères.</p>
              <p className="srch-hint">Essayez une autre date, heure ou expertise.</p>
            </div>
          ) : (
            <>
              <h2 className="srch-results-title">
                {results.length} expert{results.length > 1 ? 's' : ''} disponible{results.length > 1 ? 's' : ''}
              </h2>
              <p className="srch-results-sub">
                L&apos;identité du consultant reste anonyme jusqu&apos;au paiement confirmé.
              </p>
              <div className="srch-cards">
                {results.map((r, i) => (
                  <AnonymousCard
                    key={r.slot.id}
                    result={r}
                    rank={i + 1}
                    onBook={() => setSelected(r)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Booking modal */}
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
        .srch-form-title { font-size: 1rem; font-weight: 600; color: var(--text); }
        .srch-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        @media (max-width: 600px) { .srch-form-grid { grid-template-columns: 1fr; } }
        .srch-field { display: flex; flex-direction: column; gap: .4rem; }
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
        .srch-notes { margin-top: -.3rem; }
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
      `}</style>
    </div>
  )
}

function AnonymousCard({ result, rank, onBook }: { result: MatchingResult; rank: number; onBook: () => void }) {
  const { consultant: c, slot, score, score_breakdown: sb } = result
  return (
    <div className="ac-card">
      <div className="ac-rank">#{rank}</div>
      <div className="ac-body">
        <div className="ac-top">
          <div className="ac-avatar">
            <span>{rank}</span>
          </div>
          <div className="ac-info">
            <p className="ac-title">{c.title ?? 'Consultant Expert'}</p>
            <div className="ac-meta">
              {c.location && <span>📍 {c.location}</span>}
              {c.daily_rate && <span>💶 {c.daily_rate} €/j</span>}
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
          <ScoreBar label="Compétence"      value={sb.skill_match}        />
          <ScoreBar label="Réputation"      value={sb.rating_score}       />
          <ScoreBar label="Disponibilité"   value={sb.availability_score} />
          <ScoreBar label="Compétitivité"   value={sb.price_score}        />
        </div>

        <div className="ac-slot-info">
          <span>📅 {new Date(slot.slot_date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          <span>🕐 {slot.slot_time.slice(0,5)} ({slot.duration_min} min)</span>
        </div>
      </div>
      <button className="ac-book-btn" onClick={onBook}>
        Réserver cet expert →
      </button>

      <style>{`
        .ac-card { background: var(--white); border: 1.5px solid var(--border); border-radius: var(--radius); padding: 1.3rem; display: flex; flex-direction: column; gap: 1.1rem; transition: border-color .15s, box-shadow .15s; }
        .ac-card:hover { border-color: var(--c1); box-shadow: 0 4px 16px rgba(0,0,0,.07); }
        .ac-rank { display: none; }
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
        .ac-slot-info { display: flex; gap: 1.5rem; flex-wrap: wrap; font-size: .85rem; color: var(--text-mid); }
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
