import { getApps, getWaitlistStats } from '@/lib/api'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import AppCatalog from '@/components/AppCatalog'
import styles from './page.module.css'

const CATEGORIES = [
  { icon: '📊', label: 'Gestion de projet', count: 1, color: 'var(--c1-bg)', iconColor: 'var(--c1)' },
  { icon: '📦', label: 'Supply Chain', count: 1, color: 'var(--c2-bg)', iconColor: 'var(--c2)' },
  { icon: '🤝', label: 'Consulting', count: 1, color: 'var(--c3-bg)', iconColor: 'var(--c3)' },
  { icon: '🎓', label: 'Formation', count: 1, color: 'var(--c4-bg)', iconColor: 'var(--c4)' },
  { icon: '📣', label: 'Marketing', count: 1, color: 'var(--c1-bg)', iconColor: 'var(--c1)' },
]

const HOW_STEPS = [
  { num: '01', title: 'Parcourez le catalogue', desc: 'Explorez nos applications métiers classées par domaine.' },
  { num: '02', title: 'Choisissez votre outil', desc: 'Sélectionnez l\'app adaptée à votre besoin ERP ou consulting.' },
  { num: '03', title: 'Accédez en un clic', desc: 'Connexion directe sans configuration complexe.' },
  { num: '04', title: 'Mesurez & scalez', desc: 'Suivez vos usages et montez en puissance selon vos besoins.' },
]

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
          Découvrez et accédez aux applications perform-learn pour piloter vos projets ERP et gérer votre activité de consulting.
        </p>

        <div className={styles.searchWrap}>
          <input
            type="search"
            className={styles.searchInput}
            placeholder="Rechercher une application…"
            readOnly
          />
          <button className={styles.btnSearch}>Rechercher</button>
        </div>

        <div className={styles.tags}>
          <span className={styles.tagLabel}>Populaires :</span>
          {['D365', 'ERP', 'Consulting', 'Formation', 'LinkedIn'].map(t => (
            <span key={t} className={styles.tag}>{t}</span>
          ))}
        </div>

        {/* STATS BAR */}
        <div className={styles.statsBar}>
          <div className={styles.stat}>
            <div className={styles.statN}>{publishedCount}</div>
            <div className={styles.statL}>apps disponibles</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statN}>{stats?.total ?? '—'}</div>
            <div className={styles.statL}>inscrits waitlist</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statN}>100%</div>
            <div className={styles.statL}>Made with AI</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statN}>30/04</div>
            <div className={styles.statL}>Lancement 2026</div>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className={styles.section}>
        <div className={styles.sectionTitle}>
          <h2>{CATEGORIES.length} domaines au lancement</h2>
          <p>Notre catalogue MVP — des outils tech &amp; métier pensés pour les professionnels ERP</p>
        </div>
        <div className={styles.catGrid}>
          {CATEGORIES.map(cat => (
            <div key={cat.label} className={styles.catCard} style={{ '--cat-bg': cat.color, '--cat-icon': cat.iconColor } as React.CSSProperties}>
              <div className={styles.catIc}>{cat.icon}</div>
              <h3>{cat.label}</h3>
              <span>{cat.count} app{cat.count > 1 ? 's' : ''}</span>
            </div>
          ))}
        </div>
      </section>

      {/* CATALOGUE */}
      <AppCatalog apps={apps} />

      {/* HOW IT WORKS */}
      <section className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={styles.sectionTitle}>
          <h2>Comment ça marche</h2>
          <p>En 4 étapes, passez de la découverte à l&apos;usage opérationnel</p>
        </div>
        <div className={styles.howSteps}>
          {HOW_STEPS.map(s => (
            <div key={s.num} className={styles.stepItem}>
              <div className={styles.stepIc}>
                <span className={styles.stepNum}>{s.num}</span>
              </div>
              <h4>{s.title}</h4>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA BAND */}
      <div className={styles.ctaBand}>
        <h2>Prêt à transformer votre façon de travailler ?</h2>
        <p>Rejoignez la liste d&apos;attente et soyez parmi les premiers à accéder à la plateforme.</p>
        <div className={styles.ctaBtns}>
          <button className={styles.btnCta1}>Rejoindre la waitlist</button>
          <button className={styles.btnCta2}>En savoir plus</button>
        </div>
      </div>

      <Footer />
    </div>
  )
}
