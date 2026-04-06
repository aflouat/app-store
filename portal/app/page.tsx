import { getApps, getWaitlistStats } from '@/lib/api'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import AppCatalog from '@/components/AppCatalog'
import WaitlistBanner from '@/components/WaitlistBanner'
import styles from './page.module.css'

export default async function Home() {
  const [apps, stats] = await Promise.all([getApps(), getWaitlistStats()])

  const publishedCount = apps.filter(a => a.status === 'published').length

  return (
    <div className={styles.layout}>
      <Navbar />

      {/* HERO */}
      <section className={styles.hero}>
        <h1 className={styles.heroTitle}>
          Vos outils métiers,<br />au même endroit.
        </h1>
        <p className={styles.heroSub}>
          Découvrez et accédez aux applications perform-learn pour piloter vos projets ERP et gérer votre activité.
        </p>

        {/* STATS BAR */}
        <div className={styles.statsBar}>
          <div className={styles.stat}>
            <span className={styles.statValue}>{publishedCount}</span>
            <span className={styles.statLabel}>app{publishedCount !== 1 ? 's' : ''} disponible{publishedCount !== 1 ? 's' : ''}</span>
          </div>
          {stats && (
            <div className={styles.stat}>
              <span className={styles.statValue}>{stats.total}</span>
              <span className={styles.statLabel}>inscrits waitlist</span>
            </div>
          )}
          <div className={styles.stat}>
            <span className={styles.statValue}>100%</span>
            <span className={styles.statLabel}>Made with AI</span>
          </div>
        </div>
      </section>

      <AppCatalog apps={apps} />

      <WaitlistBanner />

      <Footer />
    </div>
  )
}
