import { getApps, getEarlyAdopterStats } from '@/lib/api'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import AppCatalog from '@/components/AppCatalog'
import CtaBand from '@/components/CtaBand'
import HeroSearch from '@/components/HeroSearch'
import ChatWidget from '@/components/freelancehub/ChatWidget'
import EarlyAdopterBand from '@/components/EarlyAdopterBand'
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
  const [apps, earlyStats] = await Promise.all([getApps(), getEarlyAdopterStats()])
  const publishedCount = apps.filter(a => a.status === 'published').length

  return (
    <div className={styles.layout}>
      <Navbar />
      <EarlyAdopterBand stats={earlyStats} />

      {/* HERO */}
      <section className={styles.hero}>
        <h1 className={styles.heroTitle}>
          Vos outils métiers,<br />au même endroit.
        </h1>
        <p className={styles.heroSub}>
          Découvrez et accédez aux applications perform-learn pour piloter vos projets ERP et gérer votre activité de consulting.
        </p>

        <HeroSearch />

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
            <div className={styles.statN}>{earlyStats?.remaining ?? 20}</div>
            <div className={styles.statL}>places fondateur</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statN}>100%</div>
            <div className={styles.statL}>Made with AI</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statN}>10%</div>
            <div className={styles.statL}>commission fondateurs</div>
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
      <div id="catalogue">
        <AppCatalog apps={apps} />
      </div>

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

      {/* FREELANCEHUB CTA */}
      <section className={styles.fhSection}>
        <div className={styles.fhContent}>
          <div className={styles.fhBadge}>Disponible maintenant</div>
          <h2 className={styles.fhTitle}>
            Trouvez l&apos;expert B2B<br />qu&apos;il vous faut.
          </h2>
          <p className={styles.fhSub}>
            FreelanceHub connecte consultants experts vérifiés et entreprises via un matching algorithmique,
            un paiement sécurisé par séquestre et un anonymat total jusqu&apos;à la confirmation.
          </p>
          <div className={styles.fhPills}>
            <span className={styles.fhPill}>✓ KYC vérifié</span>
            <span className={styles.fhPill}>✓ Paiement séquestre</span>
            <span className={styles.fhPill}>✓ Anonymat</span>
            <span className={styles.fhPill}>✓ Matching algorithmique</span>
          </div>
          <div className={styles.fhCtas}>
            <a href="/freelancehub/register" className={styles.fhBtn1}>Rejoindre FreelanceHub</a>
            <a href="/freelancehub/login" className={styles.fhBtn2}>Se connecter</a>
          </div>
        </div>
        <div className={styles.fhIllus} aria-hidden="true">
          <div className={styles.fhCard}>
            <div className={styles.fhCardTop}>
              <div className={styles.fhAvatar}>◈</div>
              <div>
                <div className={styles.fhCardName}>Expert vérifié</div>
                <div className={styles.fhCardRole}>Consultant ERP · 8 ans</div>
              </div>
              <span className={styles.fhVerified}>✓</span>
            </div>
            <div className={styles.fhSkills}>
              <span>D365 F&O</span><span>SAP</span><span>Data</span>
            </div>
            <div className={styles.fhRate}>À partir de <strong>120 €/h</strong></div>
          </div>
        </div>
      </section>

      {/* CTA BAND */}
      <CtaBand />

      <Footer />
      <ChatWidget />
    </div>
  )
}
