import Link from 'next/link'
import styles from './Footer.module.css'

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.left}>
          <span className={styles.brand}>perform-learn.fr</span>
          <span className={styles.tagline}>Le Laboratoire de la Performance et de l&apos;Apprentissage</span>
        </div>
        <nav className={styles.legal} aria-label="Liens légaux">
          <Link href="/freelancehub/cgu" className={styles.legalLink}>CGU</Link>
          <Link href="/freelancehub/privacy" className={styles.legalLink}>Confidentialité</Link>
          <Link href="/legal" className={styles.legalLink}>Mentions légales</Link>
        </nav>
        <div className={styles.right}>
          <span className={styles.copy}>© 2026 LPA — Tous droits réservés</span>
        </div>
      </div>
    </footer>
  )
}
