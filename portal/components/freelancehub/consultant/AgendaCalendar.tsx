'use client'

import { useState, useEffect, useCallback } from 'react'

interface Slot {
  id: string
  slot_date: string
  slot_time: string
  duration_min: number
  status: 'available' | 'booked' | 'cancelled'
}

interface Props {
  consultantId: string
}

const TIME_SLOTS = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00']
const DAYS_FR    = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim']
const MONTHS_FR  = ['jan','fév','mar','avr','mai','jun','jul','aoû','sep','oct','nov','déc']

function toMonday(date: Date): string {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  return d.toISOString().split('T')[0]
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

function fmt(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getDate()} ${MONTHS_FR[d.getMonth()]}`
}

export default function AgendaCalendar({ consultantId }: Props) {
  const [weekStart,  setWeekStart]  = useState(() => toMonday(new Date()))
  const [slots,      setSlots]      = useState<Slot[]>([])
  const [loading,    setLoading]    = useState(true)
  const [busy,       setBusy]       = useState<Set<string>>(new Set())
  const [error,      setError]      = useState('')
  const [duplicating, setDuplicating] = useState(false)

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  // Map "date|time" → slot for O(1) lookup
  const slotMap = new Map<string, Slot>()
  slots.forEach(s => slotMap.set(`${s.slot_date}|${s.slot_time}`, s))

  const fetchWeek = useCallback(async (monday: string) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/freelancehub/consultant/slots?week=${monday}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setSlots(data.slots ?? [])
    } catch {
      setError('Impossible de charger les créneaux.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchWeek(weekStart) }, [weekStart, fetchWeek])

  function prevWeek() { setWeekStart(w => addDays(w, -7)) }
  function nextWeek() { setWeekStart(w => addDays(w, 7)) }

  async function toggleCell(date: string, time: string) {
    const key = `${date}|${time}`
    if (busy.has(key)) return

    const existing = slotMap.get(key)

    setBusy(b => new Set(b).add(key))
    setError('')

    if (existing) {
      // Delete (cancel) the slot
      const res = await fetch(`/api/freelancehub/consultant/slots/${existing.id}`, { method: 'DELETE' })
      if (res.ok) {
        setSlots(prev => prev.filter(s => s.id !== existing.id))
      } else {
        const d = await res.json().catch(() => ({}))
        setError(d.error ?? 'Impossible de supprimer ce créneau.')
      }
    } else {
      // Create the slot
      const res = await fetch('/api/freelancehub/consultant/slots', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ consultant_id: consultantId, slot_date: date, slot_time: time, duration_min: 60 }),
      })
      if (res.ok) {
        const { slot } = await res.json()
        setSlots(prev => [...prev, slot])
      } else {
        const d = await res.json().catch(() => ({}))
        setError(d.error ?? 'Impossible de créer ce créneau.')
      }
    }

    setBusy(b => { const n = new Set(b); n.delete(key); return n })
  }

  async function duplicateWeek() {
    const available = slots.filter(s => s.status === 'available')
    if (available.length === 0) return
    setDuplicating(true)
    setError('')

    const nextMonday = addDays(weekStart, 7)
    const payload = available.map(s => ({
      slot_date:    addDays(s.slot_date, 7),
      slot_time:    s.slot_time,
      duration_min: s.duration_min ?? 60,
    } as { slot_date: string; slot_time: string; duration_min: number }))

    const res = await fetch('/api/freelancehub/consultant/slots/bulk', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ consultant_id: consultantId, slots: payload }),
    })

    setDuplicating(false)
    if (res.ok) {
      const { created } = await res.json()
      // Navigate to next week to show the result
      setWeekStart(nextMonday)
      setSlots(created ?? [])
    } else {
      setError('Erreur lors de la duplication.')
    }
  }

  const availableCount = slots.filter(s => s.status === 'available').length
  const today = new Date().toISOString().split('T')[0]

  // Week label
  const weekLabel = `${fmt(weekStart)} – ${fmt(addDays(weekStart, 6))} ${new Date(weekStart + 'T00:00:00').getFullYear()}`

  return (
    <div className="cal-wrap">

      {/* Controls */}
      <div className="cal-controls">
        <button className="cal-nav-btn" onClick={prevWeek} title="Semaine précédente">‹</button>
        <span className="cal-week-label">{weekLabel}</span>
        <button className="cal-nav-btn" onClick={nextWeek} title="Semaine suivante">›</button>
        <div style={{ flex: 1 }} />
        {availableCount > 0 && (
          <button
            className="cal-dup-btn"
            onClick={duplicateWeek}
            disabled={duplicating}
            title="Copier tous les créneaux libres sur la semaine suivante"
          >
            {duplicating ? '…' : `Dupliquer →  (${availableCount} créneau${availableCount > 1 ? 'x' : ''})`}
          </button>
        )}
      </div>

      {error && <p className="cal-error">{error}</p>}

      {/* Grid */}
      <div className="cal-grid-wrap">
        <div className="cal-grid" style={{ '--cols': 8 } as React.CSSProperties}>

          {/* Header row */}
          <div className="cal-cell cal-time-header" />
          {weekDays.map((d, i) => (
            <div
              key={d}
              className={`cal-cell cal-day-header${d === today ? ' cal-day-today' : ''}`}
            >
              <span className="cal-day-name">{DAYS_FR[i]}</span>
              <span className="cal-day-num">{fmt(d)}</span>
            </div>
          ))}

          {/* Time rows */}
          {TIME_SLOTS.map(time => (
            <>
              <div key={`t-${time}`} className="cal-cell cal-time-label">{time}</div>
              {weekDays.map(date => {
                const key      = `${date}|${time}`
                const slot     = slotMap.get(key)
                const isPast   = date < today
                const isBusy   = busy.has(key)
                const isBooked = slot?.status === 'booked'
                const isAvail  = slot?.status === 'available'
                const cls = [
                  'cal-cell',
                  'cal-slot',
                  isAvail  ? 'cal-slot--avail'  : '',
                  isBooked ? 'cal-slot--booked' : '',
                  isPast   ? 'cal-slot--past'   : '',
                  isBusy   ? 'cal-slot--busy'   : '',
                ].filter(Boolean).join(' ')

                return (
                  <div
                    key={key}
                    className={cls}
                    onClick={() => !isPast && !isBooked && toggleCell(date, time)}
                    title={
                      isBooked ? 'Réservé — impossible de modifier'
                      : isAvail  ? 'Cliquer pour supprimer ce créneau'
                      : isPast   ? 'Date passée'
                      : 'Cliquer pour ajouter ce créneau'
                    }
                  >
                    {isBusy   && <span className="cal-spinner" />}
                    {isAvail  && !isBusy && <span className="cal-dot cal-dot--avail" />}
                    {isBooked && <span className="cal-dot cal-dot--booked" />}
                  </div>
                )
              })}
            </>
          ))}
        </div>

        {loading && (
          <div className="cal-loading-overlay">
            <span className="cal-loading-text">Chargement…</span>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="cal-legend">
        <span className="cal-legend-item"><span className="cal-dot cal-dot--avail" /> Disponible (cliquer pour supprimer)</span>
        <span className="cal-legend-item"><span className="cal-dot cal-dot--booked" /> Réservé</span>
        <span className="cal-legend-item"><span className="cal-dot cal-dot--empty" /> Vide (cliquer pour ajouter)</span>
      </div>

      <style>{`
        .cal-wrap { display: flex; flex-direction: column; gap: 1rem; }
        .cal-controls { display: flex; align-items: center; gap: .8rem; flex-wrap: wrap; }
        .cal-nav-btn { width: 32px; height: 32px; border: 1.5px solid var(--border); border-radius: var(--radius-sm); background: var(--white); color: var(--text); font-size: 1.1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: border-color .15s; }
        .cal-nav-btn:hover { border-color: var(--c1); color: var(--c1); }
        .cal-week-label { font-size: .9rem; font-weight: 600; color: var(--text); min-width: 180px; text-align: center; }
        .cal-dup-btn { padding: .42rem 1rem; background: var(--c1-pale); color: var(--c1); border: 1.5px solid var(--c1); border-radius: var(--radius-sm); font-size: .82rem; font-weight: 600; cursor: pointer; transition: background .15s; white-space: nowrap; }
        .cal-dup-btn:hover:not(:disabled) { background: var(--c1); color: #fff; }
        .cal-dup-btn:disabled { opacity: .5; cursor: not-allowed; }
        .cal-error { color: #c0392b; font-size: .83rem; background: #fdf0ef; padding: .5rem .75rem; border-radius: 6px; }

        .cal-grid-wrap { position: relative; overflow-x: auto; }
        .cal-grid {
          display: grid;
          grid-template-columns: 52px repeat(7, 1fr);
          border: 1.5px solid var(--border);
          border-radius: var(--radius);
          overflow: hidden;
          min-width: 540px;
        }
        .cal-cell { border-right: 1px solid var(--border); border-bottom: 1px solid var(--border); }
        .cal-cell:nth-child(8n) { border-right: none; }

        /* Header */
        .cal-time-header { background: var(--bg); }
        .cal-day-header { background: var(--bg); padding: .5rem .3rem; display: flex; flex-direction: column; align-items: center; gap: .1rem; }
        .cal-day-header.cal-day-today { background: var(--c1-pale); }
        .cal-day-name { font-size: .72rem; font-weight: 600; color: var(--text-mid); text-transform: uppercase; letter-spacing: .04em; }
        .cal-day-num  { font-size: .8rem; font-weight: 700; color: var(--text); }
        .cal-day-today .cal-day-num { color: var(--c1); }

        /* Time labels */
        .cal-time-label { background: var(--bg); font-size: .73rem; color: var(--text-light); display: flex; align-items: center; justify-content: center; padding: 0 .3rem; height: 38px; font-weight: 500; }

        /* Slot cells */
        .cal-slot { height: 38px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background .12s; }
        .cal-slot:hover:not(.cal-slot--past):not(.cal-slot--booked) { background: var(--c1-pale); }
        .cal-slot--avail  { background: #edfaf3; }
        .cal-slot--avail:hover  { background: #d4f3e5 !important; }
        .cal-slot--booked { background: #fdf0ef; cursor: not-allowed; }
        .cal-slot--past   { background: var(--bg); cursor: default; opacity: .5; }
        .cal-slot--busy   { pointer-events: none; }

        /* Dots */
        .cal-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
        .cal-dot--avail  { background: #27ae60; }
        .cal-dot--booked { background: var(--c1); }
        .cal-dot--empty  { background: var(--border); border: 1px solid var(--border); }

        /* Spinner */
        .cal-spinner { width: 12px; height: 12px; border: 2px solid var(--border); border-top-color: var(--c1); border-radius: 50%; animation: cal-spin .6s linear infinite; }
        @keyframes cal-spin { to { transform: rotate(360deg); } }

        /* Loading overlay */
        .cal-loading-overlay { position: absolute; inset: 0; background: rgba(255,255,255,.65); display: flex; align-items: center; justify-content: center; border-radius: var(--radius); }
        .cal-loading-text { font-size: .85rem; color: var(--text-mid); }

        /* Legend */
        .cal-legend { display: flex; gap: 1.2rem; flex-wrap: wrap; padding: .2rem 0; }
        .cal-legend-item { display: flex; align-items: center; gap: .4rem; font-size: .78rem; color: var(--text-light); }
      `}</style>
    </div>
  )
}
