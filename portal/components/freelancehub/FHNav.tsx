'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import type { UserRole } from '@/lib/freelancehub/types'

interface FHNavProps {
  user: { name: string; email: string; role: UserRole }
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

export default function FHNav({ user }: FHNavProps) {
  const pathname = usePathname()
  const homeUrl  = `/freelancehub/${user.role}`

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
