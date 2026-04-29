import Link from 'next/link'
import styles from './CtaBand.module.css'

export default function CtaBand() {
  return (
    <div className={styles.band}>
      <h2 className={styles.title}>Rejoignez les Fondateurs FreelanceHub</h2>
      <p className={styles.sub}>20 places à commission réduite (10%). Inscrivez-vous maintenant, KYC simple et rapide.</p>
      <div className={styles.btns}>
        <Link href="/freelancehub/register" className={styles.btn1}>
          S&apos;inscrire comme consultant
        </Link>
        <Link href="/freelancehub/login" className={styles.btn2}>
          Déjà inscrit ? Se connecter
        </Link>
      </div>
    </div>
  )
}
