'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { UserRole } from '@/lib/freelancehub/types'

interface NavItem {
  label: string
  href:  string
  icon:  string
}

const CONSULTANT_NAV: NavItem[] = [
  { label: 'Tableau de bord', href: '/freelancehub/consultant',           icon: '◉' },
  { label: 'Mon profil',      href: '/freelancehub/consultant/profile',   icon: '○' },
  { label: 'Mon agenda',      href: '/freelancehub/consultant/agenda',    icon: '◫' },
  { label: 'Réservations',    href: '/freelancehub/consultant/bookings',  icon: '◈' },
  { label: 'Mes gains',       href: '/freelancehub/consultant/earnings',  icon: '◇' },
  { label: 'Mon CV',          href: '/freelancehub/consultant/cv',        icon: '◻' },
  { label: 'Mon KYC',         href: '/freelancehub/consultant/kyc',       icon: '◑' },
  { label: 'NDA',             href: '/freelancehub/consultant/nda',       icon: '◐' },
]

const CLIENT_NAV: NavItem[] = [
  { label: 'Tableau de bord', href: '/freelancehub/client',              icon: '◉' },
  { label: 'Trouver un expert', href: '/freelancehub/client/search',     icon: '◎' },
  { label: 'Mes réservations', href: '/freelancehub/client/bookings',    icon: '◈' },
  { label: 'Mes paiements',    href: '/freelancehub/client/payments',    icon: '◇' },
  { label: 'Mes évaluations',  href: '/freelancehub/client/reviews',     icon: '◌' },
]

const ADMIN_NAV: NavItem[] = [
  { label: 'Dashboard',       href: '/freelancehub/admin',               icon: '◉' },
  { label: 'Consultants',     href: '/freelancehub/admin/consultants',   icon: '○' },
  { label: 'Expertises',      href: '/freelancehub/admin/skills',        icon: '◑' },
  { label: 'Réservations',    href: '/freelancehub/admin/bookings',      icon: '◈' },
  { label: 'Paiements',       href: '/freelancehub/admin/payments',      icon: '◇' },
  { label: 'Matching engine', href: '/freelancehub/admin/matching',      icon: '◎' },
]

const NAV_BY_ROLE: Record<UserRole, NavItem[]> = {
  consultant: CONSULTANT_NAV,
  client:     CLIENT_NAV,
  admin:      ADMIN_NAV,
}

interface FHSidebarProps {
  role: UserRole
}

export default function FHSidebar({ role }: FHSidebarProps) {
  const pathname = usePathname()
  const items    = NAV_BY_ROLE[role]

  return (
    <aside className="fh-sidebar">
      <nav className="fh-sidebar-nav">
        {items.map(item => {
          const active =
            item.href === `/freelancehub/${role}`
              ? pathname === item.href
              : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`fh-sidebar-item${active ? ' active' : ''}`}
            >
              <span className="fh-sidebar-icon">{item.icon}</span>
              <span>{item.label}</span>
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
