import { getApps } from '@/lib/api'
import AppCard from '@/components/AppCard'
import styles from './page.module.css'

export default async function Home() {
  const apps = await getApps()

  return (
    <main>
      {/* NAV */}
      <nav className={styles.nav}>
        <a href="https://perform-learn.fr" className={styles.logo}>
          <span className={styles.logoMark}>PL</span>
          <span className={styles.logoText}>perform-learn</span>
        </a>
        <span className={styles.badge}>App Store</span>
      </nav>

      {/* HERO */}
      <section className={styles.hero}>
        <h1 className={styles.heroTitle}>Vos outils métiers,<br />au même endroit.</h1>
        <p className={styles.heroSub}>
          Découvrez et accédez aux applications perform-learn pour piloter vos projets et gérer votre activité.
        </p>
      </section>

      {/* CATALOG */}
      <section className={styles.catalog}>
        <div className={styles.catalogHeader}>
          <h2 className={styles.catalogTitle}>Applications disponibles</h2>
          <span className={styles.count}>{apps.length} app{apps.length !== 1 ? 's' : ''}</span>
        </div>

        {apps.length === 0 ? (
          <div className={styles.empty}>
            <p>Aucune application disponible pour le moment.</p>
            <p>Revenez bientôt — le lancement est prévu le <strong>30 avril 2026</strong>.</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {apps.map(app => <AppCard key={app.id} app={app} />)}
          </div>
        )}
      </section>
    </main>
  )
}
