'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import type { UserRole } from '@/lib/freelancehub/types'

interface NavConfig {
  key:  string
  href: string
  icon: string
}

const CONSULTANT_NAV: NavConfig[] = [
  { key: 'navDashboard', href: '/freelancehub/consultant',           icon: '◉' },
  { key: 'navTasks',     href: '/freelancehub/tasks',               icon: '▤' },
  { key: 'navProfile',   href: '/freelancehub/consultant/profile',   icon: '○' },
  { key: 'navAgenda',    href: '/freelancehub/consultant/agenda',    icon: '◫' },
  { key: 'navBookings',  href: '/freelancehub/consultant/bookings',  icon: '◈' },
  { key: 'navEarnings',  href: '/freelancehub/consultant/earnings',  icon: '◇' },
  { key: 'navCV',        href: '/freelancehub/consultant/cv',        icon: '◻' },
  { key: 'navKYC',       href: '/freelancehub/consultant/kyc',       icon: '◑' },
  { key: 'navNDA',       href: '/freelancehub/consultant/nda',       icon: '◐' },
  { key: 'navSupport',   href: '/freelancehub/support',              icon: '?' },
]

const CLIENT_NAV: NavConfig[] = [
  { key: 'navDashboard',  href: '/freelancehub/client',              icon: '◉' },
  { key: 'navTasks',      href: '/freelancehub/tasks',              icon: '▤' },
  { key: 'navFindExpert', href: '/freelancehub/client/search',       icon: '◎' },
  { key: 'navMyBookings', href: '/freelancehub/client/bookings',     icon: '◈' },
  { key: 'navPayments',   href: '/freelancehub/client/payments',     icon: '◇' },
  { key: 'navReviews',    href: '/freelancehub/client/reviews',      icon: '◌' },
  { key: 'navSupport',    href: '/freelancehub/support',             icon: '?' },
]

const ADMIN_NAV: NavConfig[] = [
  { key: 'navAdminDashboard', href: '/freelancehub/admin',               icon: '◉' },
  { key: 'navTasks',          href: '/freelancehub/tasks',              icon: '▤' },
  { key: 'navConsultants',    href: '/freelancehub/admin/consultants',   icon: '○' },
  { key: 'navSkills',         href: '/freelancehub/admin/skills',        icon: '◑' },
  { key: 'navAdminBookings',  href: '/freelancehub/admin/bookings',      icon: '◈' },
  { key: 'navAdminPayments',  href: '/freelancehub/admin/payments',      icon: '◇' },
  { key: 'navMatchingEngine', href: '/freelancehub/admin/matching',      icon: '◎' },
  { key: 'navSupport',        href: '/freelancehub/support',             icon: '?' },
]

const NAV_BY_ROLE: Record<UserRole, NavConfig[]> = {
  consultant: CONSULTANT_NAV,
  client:     CLIENT_NAV,
  admin:      ADMIN_NAV,
}

interface FHSidebarProps {
  role: UserRole
}

export default function FHSidebar({ role }: FHSidebarProps) {
  const t        = useTranslations('FHSidebar')
  const pathname = usePathname()
  const configs  = NAV_BY_ROLE[role]

  return (
    <aside className="fh-sidebar">
      <nav className="fh-sidebar-nav">
        {configs.map(({ key, href, icon }) => {
          const active =
            href === `/freelancehub/${role}`
              ? pathname === href
              : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`fh-sidebar-item${active ? ' active' : ''}`}
            >
              <span className="fh-sidebar-icon">{icon}</span>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <span>{t(key as any)}</span>
            </Link>
          )
        })}
      </nav>

      <style>{`
        .fh-sidebar {
          width: 220px; min-width: 220px;
          background: var(--white);
          border-right: 1px solid var(--border);
          padding: 1.2rem .75rem;
          min-height: calc(100vh - var(--nav-h));
        }
        .fh-sidebar-nav {
          display: flex; flex-direction: column; gap: .2rem;
        }
        .fh-sidebar-item {
          display: flex; align-items: center; gap: .65rem;
          padding: .58rem .8rem;
          border-radius: var(--radius-sm);
          font-size: .88rem; color: var(--text-mid);
          text-decoration: none;
          transition: background .12s, color .12s;
        }
        .fh-sidebar-item:hover {
          background: var(--bg);
          color: var(--text);
        }
        .fh-sidebar-item.active {
          background: var(--c1-pale);
          color: var(--c1);
          font-weight: 600;
        }
        .fh-sidebar-icon {
          font-size: 1rem; opacity: .7;
          width: 18px; text-align: center;
        }
        .fh-sidebar-item.active .fh-sidebar-icon { opacity: 1; }
      `}</style>
    </aside>
  )
}
