'use client'

import Link from 'next/link'
import { signOut } from 'next-auth/react'
import type { UserRole } from '@/lib/freelancehub/types'

interface FHNavProps {
  user:        { name: string; email: string; role: UserRole }
  unreadCount?: number
}

const ROLE_LABELS: Record<UserRole, string> = {
  consultant: 'Consultant',
  client:     'Client',
  admin:      'Admin',
}

const ROLE_COLORS: Record<UserRole, string> = {
  consultant: '#96AEAA',
  client:     '#B9958D',
  admin:      '#A3AB9A',
}

export default function FHNav({ user, unreadCount = 0 }: FHNavProps) {
  const homeUrl = `/freelancehub/${user.role}`

  return (
    <nav className="fh-nav">
      <Link href={homeUrl} className="fh-nav-brand">
        <span className="fh-nav-logo">FH</span>
        <span className="fh-nav-name">FreelanceHub</span>
      </Link>

      <div className="fh-nav-right">
        <span
          className="fh-role-badge"
          style={{ background: ROLE_COLORS[user.role] + '22', color: ROLE_COLORS[user.role] }}
        >
          {ROLE_LABELS[user.role]}
        </span>
        <span className="fh-nav-user">{user.name || user.email}</span>

        {/* Support link */}
        <Link href="/freelancehub/support" className="fh-bell" aria-label="Support">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </Link>

        {/* Notification bell */}
        <Link href="/freelancehub/notifications" className="fh-bell" aria-label="Notifications">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          {unreadCount > 0 && (
            <span className="fh-bell-badge">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>

        <button
          className="fh-nav-signout"
          onClick={() => signOut({ callbackUrl: '/freelancehub/login' })}
        >
          Déconnexion
        </button>
      </div>

      <style>{`
        .fh-nav {
          height: var(--nav-h);
          background: var(--white);
          border-bottom: 1px solid var(--border);
          display: flex; align-items: center;
          padding: 0 1.5rem; gap: 1rem;
          position: sticky; top: 0; z-index: 100;
        }
        .fh-nav-brand {
          display: flex; align-items: center; gap: .55rem;
          text-decoration: none; margin-right: auto;
        }
        .fh-nav-logo {
          width: 32px; height: 32px;
          background: var(--c1); color: #fff;
          border-radius: 9px; display: flex;
          align-items: center; justify-content: center;
          font-weight: 700; font-size: .8rem;
        }
        .fh-nav-name {
          font-family: 'Fraunces', serif;
          font-weight: 700; font-size: 1.05rem;
          color: var(--dark);
        }
        .fh-nav-right {
          display: flex; align-items: center; gap: .9rem;
        }
        .fh-role-badge {
          font-size: .75rem; font-weight: 600;
          padding: .25em .7em; border-radius: 20px;
        }
        .fh-nav-user {
          font-size: .88rem; color: var(--text-mid);
          white-space: nowrap; max-width: 180px;
          overflow: hidden; text-overflow: ellipsis;
        }
        .fh-bell {
          position: relative;
          display: flex; align-items: center; justify-content: center;
          width: 34px; height: 34px;
          border-radius: 8px;
          color: var(--text-mid);
          text-decoration: none;
          transition: background .12s, color .12s;
        }
        .fh-bell:hover { background: var(--bg); color: var(--text); }
        .fh-bell-badge {
          position: absolute; top: 2px; right: 2px;
          background: var(--c1); color: #fff;
          font-size: .6rem; font-weight: 700;
          min-width: 16px; height: 16px;
          border-radius: 8px; padding: 0 4px;
          display: flex; align-items: center; justify-content: center;
          line-height: 1;
        }
        .fh-nav-signout {
          font-size: .82rem; color: var(--text-light);
          background: none; border: 1px solid var(--border);
          padding: .3em .8em; border-radius: 6px;
          cursor: pointer; transition: color .15s, border-color .15s;
        }
        .fh-nav-signout:hover { color: var(--text); border-color: var(--text-mid); }
      `}</style>
    </nav>
  )
}
