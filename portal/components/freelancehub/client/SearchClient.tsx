'use client'

import { useState, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import type { Skill, MatchingResult } from '@/lib/freelancehub/types'
import BookingModal from './BookingModal'
import { trackEvent } from '@/lib/freelancehub/analytics'

type AvailFilter = 'all' | 'week' | 'month'

interface Props {
  skills:   Skill[]
  clientId: string
}

function priceTTC(dailyRate: number | null | undefined): number {
  return Math.round((dailyRate ?? 85) * 1.20)
}

export default function SearchClient({ skills, clientId }: Props) {
  const t      = useTranslations('SearchClient')
  const locale = useLocale()

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
      setError(d.error ?? t('searchError'))
      return
    }
    const data = await res.json()
    const matches: MatchingResult[] = data.matches ?? []
    setResults(matches)
    trackEvent('search_consultant', { skill_id: Number(skillId), results_count: matches.length })
  }

  const byCategory: Record<string, Skill[]> = {}
  skills.forEach(s => {
    const cat = s.category ?? 'Autre'
    if (!byCategory[cat]) byCategory[cat] = []
    byCategory[cat].push(s)
  })

  const minPriceTTC = results && results.length > 0
    ? Math.min(...results.map(r => priceTTC(r.consultant.daily_rate)))
    : priceTTC(null)
  const budgetInsuffisant = budget && results && Number(budget) < minPriceTTC

  const today = new Date()
  const filteredResults = results?.filter(r => {
    if (availFilter === 'all') return true
    const slotDate = new Date(r.slot.slot_date + 'T00:00:00')
    const daysUntil = Math.ceil((slotDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return availFilter === 'week' ? daysUntil <= 7 : daysUntil <= 30
  }) ?? []

  const AVAIL_FILTERS: [AvailFilter, string][] = [
    ['all',   t('filterAll')],
    ['week',  t('filterWeek')],
    ['month', t('filterMonth')],
  ]

  return (
    <div className="srch-wrap">
      <div className="srch-form-card">
        <div className="srch-form-header">
          <h2 className="srch-form-title">{t('formTitle')}</h2>
          <span className="srch-price-badge">{t('priceBadge')}</span>
        </div>

        <div className="srch-form-grid">
          <div className="srch-field srch-field-wide">
            <label>{t('expertiseLabel')} <span className="req">*</span></label>
            <select value={skillId} onChange={e => setSkillId(e.target.value)}>
              <option value="">{t('expertisePlaceholder')}</option>
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
            <label>{t('budgetLabel')}</label>
            <input
              type="number"
              value={budget}
              onChange={e => setBudget(e.target.value)}
              placeholder={t('budgetPlaceholder')}
              min={0}
            />
            {budgetInsuffisant && (
              <span className="srch-budget-warn">
                {t('budgetWarning', { price: minPriceTTC })}
              </span>
            )}
          </div>
        </div>

        <div className="srch-field">
          <label>{t('notesLabel')}</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            placeholder={t('notesPlaceholder')}
          />
        </div>

        {error && <p className="srch-error">{error}</p>}

        <button
          className="fh-btn-primary"
          onClick={handleSearch}
          disabled={loading || !skillId || !!budgetInsuffisant}
        >
          {loading ? t('searching') : t('searchBtn')}
        </button>
      </div>

      {results !== null && (
        <div className="srch-results">
          {results.length === 0 ? (
            <div className="srch-no-result">
              <p>{t('noResults')}</p>
              <p className="srch-hint">{t('noResultsHint')}</p>
            </div>
          ) : (
            <>
              <div className="srch-results-header">
                <div>
                  <h2 className="srch-results-title">
                    {t('resultsCount', { count: results.length })}
                  </h2>
                  <p className="srch-results-sub">
                    {t('anonymousBadge')} <strong>{minPriceTTC} € TTC</strong>
                  </p>
                </div>
                <div className="srch-avail-filters">
                  {AVAIL_FILTERS.map(([v, l]) => (
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
                  <p>{t('noResultsFilter')}</p>
                  <button className="srch-reset-filter" onClick={() => setAvailFilter('all')}>
                    {t('seeAllExperts')}
                  </button>
                </div>
              ) : (
                <div className="srch-cards">
                  {filteredResults.map((r, i) => (
                    <AnonymousCard
                      key={r.slot.id}
                      result={r}
                      rank={i + 1}
                      locale={locale}
                      onBook={() => { trackEvent('select_consultant', { rank: i + 1 }); setSelected(r) }}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

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
        .srch-results-header { display: flex; align-items: flex-end; justify-content: space-between; flex-wrap: wrap; gap: .8rem; }
        .srch-avail-filters { display: flex; gap: .4rem; }
        .srch-avail-btn { padding: .38rem .85rem; border: 1.5px solid var(--border); border-radius: 20px; background: var(--white); font-size: .82rem; color: var(--text-mid); cursor: pointer; transition: border-color .12s, background .12s; white-space: nowrap; }
        .srch-avail-btn:hover { border-color: var(--c1); color: var(--c1); }
        .srch-avail-btn.active { border-color: var(--c1); background: var(--c1-pale); color: var(--c1); font-weight: 600; }
        .srch-reset-filter { margin-top: .8rem; padding: .45rem 1rem; background: var(--c1-pale); color: var(--c1); border: 1.5px solid var(--c1); border-radius: var(--radius-sm); font-size: .85rem; font-weight: 600; cursor: pointer; }
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

function MiniAgenda({ consultantId, locale, unavailableLabel }: { consultantId: string; locale: string; unavailableLabel: string }) {
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
        const label = d.toLocaleDateString(locale, { weekday: 'short' }).slice(0, 3)
        const dateStr = d.toLocaleDateString(locale)
        return (
          <div
            key={iso}
            className={`mini-ag-cell${count > 0 ? ' mini-ag-cell--avail' : ''}`}
            title={count > 0 ? `${count} / ${dateStr}` : unavailableLabel}
          >
            <span className="mini-ag-day">{label}</span>
            <span className="mini-ag-num">{d.getDate()}</span>
            <span className="mini-ag-dot" />
          </div>
        )
      })}
    </div>
  )
}

function AnonymousCard({ result, rank, locale, onBook }: { result: MatchingResult; rank: number; locale: string; onBook: () => void }) {
  const t = useTranslations('SearchClient')
  const { consultant: c, slot, score, score_breakdown: sb } = result
  const nextDate = new Date(slot.slot_date + 'T00:00:00').toLocaleDateString(locale, {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <div className="ac-card">
      <div className="ac-body">
        <div className="ac-top">
          <div className="ac-avatar"><span>{rank}</span></div>
          <div className="ac-info">
            <p className="ac-title">{c.title ?? t('expertConsultant')}</p>
            <div className="ac-meta">
              {c.location && <span>📍 {c.location}</span>}
            </div>
            <div className="ac-trust-badges">
              {c.is_verified && <span className="ac-trust-pill ac-trust-verified">{t('kycVerified')}</span>}
              <span className="ac-trust-pill ac-trust-escrow">{t('escrowPayment')}</span>
              {c.is_early_adopter && <span className="ac-trust-pill ac-trust-founder">{t('founder')}</span>}
            </div>
            <div className="ac-rating">
              {'★'.repeat(Math.round(c.rating))}{'☆'.repeat(5 - Math.round(c.rating))}
              <span className="ac-rating-num">{Number(c.rating).toFixed(1)}</span>
            </div>
          </div>
          <div className="ac-score-wrap">
            <div className="ac-score">{score}</div>
            <div className="ac-score-label">{t('score')}</div>
          </div>
        </div>

        <div className="ac-breakdown">
          <ScoreBar label={t('skillBar')}        value={sb.skill_match}        />
          <ScoreBar label={t('reputationBar')}   value={sb.rating_score}       />
          <ScoreBar label={t('availabilityBar')} value={sb.availability_score} />
        </div>

        <div className="ac-slot-info">
          <span>{t('nextAvailability')} <strong>{nextDate}</strong> à {slot.slot_time.slice(0, 5)}</span>
          <span className="ac-price-tag">💶 {priceTTC(c.daily_rate)} € TTC</span>
        </div>

        <div className="ac-mini-agenda-wrap">
          <span className="ac-mini-agenda-label">{t('availabilityLabel')}</span>
          <MiniAgenda consultantId={c.id} locale={locale} unavailableLabel={t('unavailable')} />
        </div>
      </div>

      <button className="ac-book-btn" onClick={onBook}>
        {t('bookBtn', { price: priceTTC(c.daily_rate) })}
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
        .ac-trust-badges { display: flex; flex-wrap: wrap; gap: .35rem; margin-top: .1rem; }
        .ac-trust-pill { font-size: .68rem; font-weight: 600; padding: .18em .55em; border-radius: 20px; white-space: nowrap; }
        .ac-trust-verified { background: var(--c3-pale); color: var(--c3); }
        .ac-trust-escrow   { background: var(--c1-pale); color: var(--c1); }
        .ac-trust-founder  { background: #fef9ec; color: #b45309; border: 1px solid #fde68a; }
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
