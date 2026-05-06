import Link from 'next/link'
import styles from './Navbar.module.css'

const TABS = [
  { label: 'Applications', href: '/' },
  { label: 'FreelanceHub', href: '/freelancehub/login' },
  { label: 'Le Labo', href: '/labo' },
]

export default function Navbar() {
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
            className={styles.navTab}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className={styles.navRight}>
        <Link href="/freelancehub/login" className={styles.btnSm}>Connexion</Link>
        <Link
          href="/freelancehub/register"
          className={`${styles.btnSm} ${styles.btnPrimary}`}
        >
          S&apos;inscrire
        </Link>
      </div>
    </nav>
  )
}
