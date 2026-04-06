import Link from 'next/link'
import styles from './Navbar.module.css'

export default function Navbar() {
  return (
    <nav className={styles.nav}>
      <Link href="/" className={styles.logo}>
        <span className={styles.logoMark}>PL</span>
        <span className={styles.logoText}>perform-learn</span>
      </Link>
      <div className={styles.links}>
        <Link href="/labo" className={styles.link}>Le Labo</Link>
        <span className={styles.badge}>App Store</span>
      </div>
    </nav>
  )
}
