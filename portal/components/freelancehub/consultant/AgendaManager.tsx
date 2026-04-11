'use client'

import { useState } from 'react'

interface Slot {
  id: string
  slot_date: string
  slot_time: string
  duration_min: number
  status: string
}

interface Props {
  consultantId: string
  initialSlots: Slot[]
}

const TIME_SLOTS = [
  '08:00','09:00','10:00','11:00',
  '14:00','15:00','16:00','17:00','18:00',
]

export default function AgendaManager({ consultantId, initialSlots }: Props) {
  const [slots,   setSlots]   = useState<Slot[]>(initialSlots)
  const [newDate, setNewDate] = useState('')
  const [newTime, setNewTime] = useState(TIME_SLOTS[0])
  const [newDur,  setNewDur]  = useState('60')
  const [adding,  setAdding]  = useState(false)
  const [error,   setError]   = useState('')

  // Group slots by date
  const byDate: Record<string, Slot[]> = {}
  slots.forEach(s => {
    if (!byDate[s.slot_date]) byDate[s.slot_date] = []
    byDate[s.slot_date].push(s)
  })

  async function addSlot() {
    if (!newDate || !newTime) return
    setAdding(true)
    setError('')

    const res = await fetch('/api/freelancehub/consultant/slots', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        consultant_id: consultantId,
        slot_date:     newDate,
        slot_time:     newTime,
        duration_min:  Number(newDur),
      }),
    })

    setAdding(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Erreur lors de l\'ajout.')
      return
    }
    const { slot } = await res.json()
    setSlots(prev => [...prev, slot].sort((a, b) =>
      a.slot_date + a.slot_time < b.slot_date + b.slot_time ? -1 : 1
    ))
    setNewDate('')
  }

  async function cancelSlot(slotId: string) {
    const res = await fetch(`/api/freelancehub/consultant/slots/${slotId}`, {
      method: 'DELETE',
    })
    if (res.ok) {
      setSlots(prev => prev.filter(s => s.id !== slotId))
    }
  }

  // Today's date as min for the date picker
  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="agenda-wrap">
      {/* Add slot form */}
      <div className="agenda-add-card">
        <h2 className="agenda-add-title">Ajouter un créneau</h2>
        <div className="agenda-add-row">
          <div className="agenda-field">
            <label>Date</label>
            <input
              type="date"
              value={newDate}
              min={today}
              onChange={e => setNewDate(e.target.value)}
            />
          </div>
          <div className="agenda-field">
            <label>Heure</label>
            <select value={newTime} onChange={e => setNewTime(e.target.value)}>
              {TIME_SLOTS.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="agenda-field">
            <label>Durée</label>
            <select value={newDur} onChange={e => setNewDur(e.target.value)}>
              <option value="30">30 min</option>
              <option value="60">1h</option>
              <option value="90">1h30</option>
              <option value="120">2h</option>
            </select>
          </div>
          <button
            className="agenda-add-btn"
            onClick={addSlot}
            disabled={adding || !newDate}
          >
            {adding ? '…' : '+ Ajouter'}
          </button>
        </div>
        {error && <p className="agenda-error">{error}</p>}
      </div>

      {/* Slots by date */}
      {Object.keys(byDate).length === 0 ? (
        <p className="agenda-empty">Aucun créneau à venir. Ajoutez vos disponibilités ci-dessus.</p>
      ) : (
        <div className="agenda-days">
          {Object.entries(byDate).map(([date, daySlots]) => (
            <div key={date} className="agenda-day">
              <div className="agenda-day-header">
                {new Date(date + 'T00:00:00').toLocaleDateString('fr-FR', {
                  weekday: 'long', day: 'numeric', month: 'long',
                })}
              </div>
              <div className="agenda-day-slots">
                {daySlots.map(slot => (
                  <div
                    key={slot.id}
                    className={`agenda-slot agenda-slot--${slot.status}`}
                  >
                    <span className="agenda-slot-time">
                      {slot.slot_time.slice(0,5)}
                    </span>
                    <span className="agenda-slot-dur">
                      {slot.duration_min} min
                    </span>
                    <span className={`agenda-slot-badge`}>
                      {slot.status === 'available' ? 'Libre'
                        : slot.status === 'booked'  ? 'Réservé'
                        : 'Annulé'}
                    </span>
                    {slot.status === 'available' && (
                      <button
                        className="agenda-cancel-btn"
                        onClick={() => cancelSlot(slot.id)}
                        title="Supprimer ce créneau"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .agenda-wrap { display: flex; flex-direction: column; gap: 1.5rem; }
        .agenda-add-card { background: var(--white); border: 1px solid var(--border); border-radius: var(--radius); padding: 1.3rem 1.5rem; display: flex; flex-direction: column; gap: .9rem; }
        .agenda-add-title { font-size: .95rem; font-weight: 600; color: var(--text); }
        .agenda-add-row { display: flex; align-items: flex-end; gap: .8rem; flex-wrap: wrap; }
        .agenda-field { display: flex; flex-direction: column; gap: .35rem; }
        .agenda-field label { font-size: .8rem; font-weight: 500; color: var(--text-mid); }
        .agenda-field input, .agenda-field select { padding: .55rem .75rem; border: 1.5px solid var(--border); border-radius: var(--radius-sm); font-size: .9rem; color: var(--text); background: var(--white); outline: none; font-family: inherit; }
        .agenda-field input:focus, .agenda-field select:focus { border-color: var(--c1); }
        .agenda-add-btn { padding: .58rem 1.2rem; background: var(--c1); color: #fff; border: none; border-radius: var(--radius-sm); font-size: .9rem; font-weight: 600; cursor: pointer; white-space: nowrap; transition: background .15s; }
        .agenda-add-btn:hover:not(:disabled) { background: var(--c1-light); }
        .agenda-add-btn:disabled { opacity: .5; cursor: not-allowed; }
        .agenda-error { color: #c0392b; font-size: .83rem; }
        .agenda-empty { color: var(--text-light); font-size: .9rem; }
        .agenda-days { display: flex; flex-direction: column; gap: 1.2rem; }
        .agenda-day { background: var(--white); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
        .agenda-day-header { padding: .75rem 1.2rem; background: var(--bg); border-bottom: 1px solid var(--border); font-size: .88rem; font-weight: 600; color: var(--text); text-transform: capitalize; }
        .agenda-day-slots { display: flex; flex-wrap: wrap; gap: .5rem; padding: .9rem 1.2rem; }
        .agenda-slot { display: flex; align-items: center; gap: .6rem; padding: .4rem .8rem; border-radius: 20px; border: 1.5px solid var(--border); background: var(--bg); font-size: .85rem; }
        .agenda-slot--available { border-color: var(--c3); background: var(--c3-pale); }
        .agenda-slot--booked    { border-color: var(--c1); background: var(--c1-pale); }
        .agenda-slot--cancelled { opacity: .5; }
        .agenda-slot-time { font-weight: 700; color: var(--text); }
        .agenda-slot-dur  { color: var(--text-light); font-size: .8rem; }
        .agenda-slot-badge { font-size: .75rem; font-weight: 600; }
        .agenda-slot--available .agenda-slot-badge { color: var(--c3); }
        .agenda-slot--booked    .agenda-slot-badge { color: var(--c1); }
        .agenda-cancel-btn { background: none; border: none; color: var(--text-light); cursor: pointer; font-size: 1rem; line-height: 1; padding: 0 .1rem; transition: color .12s; }
        .agenda-cancel-btn:hover { color: #c0392b; }
      `}</style>
    </div>
  )
}
