'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { Notification } from '@/lib/freelancehub/notifications'

const TYPE_META: Record<string, { icon: string; color: string }> = {
  booking_confirmed: { icon: '✓', color: 'var(--c3)' },
  new_booking:       { icon: '◈', color: 'var(--c1)' },
  review_request:    { icon: '◌', color: 'var(--c2)' },
  fund_released:     { icon: '◇', color: 'var(--c4)' },
  reminder:          { icon: '◫', color: 'var(--c1)' },
  booking_cancelled: { icon: '✕', color: '#c0392b' },
}

export default function NotificationsPage() {
  const router                = useRouter()
  const [items,   setItems]   = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/freelancehub/notifications')
    if (res.ok) {
      const json = await res.json()
      setItems(json.notifications ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function markAllRead() {
    await fetch('/api/freelancehub/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    })
    setItems(prev => prev.map(n => ({ ...n, is_read: true })))
    router.refresh()
  }

  async function markOneRead(id: string) {
    await fetch('/api/freelancehub/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setItems(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    router.refresh()
  }

  const unread = items.filter(n => !n.is_read).length

  return (
    <div className="fh-page">
      <header className="fh-page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 className="fh-page-title">Notifications</h1>
            <p className="fh-page-sub">
              {unread > 0 ? `${unread} non lue${unread > 1 ? 's' : ''}` : 'Tout est lu'}
            </p>
          </div>
          {unread > 0 && (
            <button className="notif-read-all" onClick={markAllRead}>
              Tout marquer comme lu
            </button>
          )}
        </div>
      </header>

      {loading ? (
        <p className="fh-empty">Chargement…</p>
      ) : items.length === 0 ? (
        <div className="notif-empty">
          <span className="notif-empty-icon">◌</span>
          <p>Aucune notification.</p>
        </div>
      ) : (
        <div className="notif-list">
          {items.map(n => {
            const meta = TYPE_META[n.type] ?? { icon: '●', color: 'var(--text-mid)' }
            const date = new Date(n.created_at)
            const dateStr = date.toLocaleDateString('fr-FR', {
              day: 'numeric', month: 'short',
            })
            const timeStr = date.toLocaleTimeString('fr-FR', {
              hour: '2-digit', minute: '2-digit',
            })
            return (
              <div
                key={n.id}
                className={`notif-item${n.is_read ? '' : ' unread'}`}
                onClick={() => !n.is_read && markOneRead(n.id)}
              >
                <span
                  className="notif-icon"
                  style={{ background: meta.color + '20', color: meta.color }}
                >
                  {meta.icon}
                </span>
                <div className="notif-body">
                  <span className="notif-title">{n.title}</span>
                  {n.message && <span className="notif-msg">{n.message}</span>}
                </div>
                <div className="notif-meta">
                  <span className="notif-date">{dateStr}</span>
                  <span className="notif-time">{timeStr}</span>
                </div>
                {!n.is_read && <span className="notif-dot" />}
              </div>
            )
          })}
        </div>
      )}

      <style>{`
        .fh-page { display: flex; flex-direction: column; gap: 1.5rem; max-width: 680px; }
        .fh-page-header { display: flex; flex-direction: column; gap: .3rem; }
        .fh-page-title { font-family: 'Fraunces', serif; font-size: 1.7rem; font-weight: 700; color: var(--dark); }
        .fh-page-sub { color: var(--text-mid); font-size: .9rem; }
        .fh-empty { color: var(--text-light); font-size: .9rem; }

        .notif-read-all {
          font-size: .82rem; color: var(--c1); background: none;
          border: 1px solid var(--c1); border-radius: 6px;
          padding: .35em .9em; cursor: pointer;
          transition: background .12s, color .12s;
        }
        .notif-read-all:hover { background: var(--c1); color: #fff; }

        .notif-empty {
          display: flex; flex-direction: column; align-items: center;
          gap: .6rem; padding: 3rem; color: var(--text-light);
        }
        .notif-empty-icon { font-size: 2rem; opacity: .4; }

        .notif-list { display: flex; flex-direction: column; gap: .4rem; }

        .notif-item {
          display: flex; align-items: flex-start; gap: .9rem;
          padding: .9rem 1rem;
          background: var(--white);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          cursor: default;
          position: relative;
          transition: background .12s;
        }
        .notif-item.unread {
          background: var(--c1-pale);
          border-color: var(--c1);
          cursor: pointer;
        }
        .notif-item.unread:hover { background: var(--c1-pale); filter: brightness(.97); }

        .notif-icon {
          width: 34px; height: 34px; min-width: 34px;
          border-radius: 9px;
          display: flex; align-items: center; justify-content: center;
          font-size: .9rem;
        }

        .notif-body {
          flex: 1; display: flex; flex-direction: column; gap: .2rem;
        }
        .notif-title { font-size: .9rem; font-weight: 600; color: var(--dark); }
        .notif-msg   { font-size: .82rem; color: var(--text-mid); line-height: 1.45; }

        .notif-meta {
          display: flex; flex-direction: column; align-items: flex-end;
          gap: .1rem; min-width: 56px;
        }
        .notif-date { font-size: .75rem; color: var(--text-light); }
        .notif-time { font-size: .72rem; color: var(--text-light); }

        .notif-dot {
          position: absolute; top: .75rem; right: .75rem;
          width: 8px; height: 8px;
          background: var(--c1); border-radius: 50%;
        }
      `}</style>
    </div>
  )
}
