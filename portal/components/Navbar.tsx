'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './Navbar.module.css'

const TABS = [
  { label: 'Applications', href: '/' },
  { label: 'FreelanceHub', href: '/freelancehub/login' },
  { label: 'Le Labo', href: '/labo' },
]

export default function Navbar() {
  const pathname = usePathname()

  return (
    <nav className={styles.topnav}>
      <Link href="/" className={styles.logo}>
        <span className={styles.logoMark}>PL</span>
        <span className={styles.logoText}>perform-learn</span>
      </Link>

      <div className={styles.navTabs}>
        {TABS.map(tab => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`${styles.navTab} ${pathname === tab.href ? styles.navTabActive : ''}`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className={styles.navRight}>
        <button className={styles.btnSm}>Connexion</button>
        <button className={`${styles.btnSm} ${styles.btnPrimary}`}>Rejoindre</button>
      </div>
    </nav>
  )
}
