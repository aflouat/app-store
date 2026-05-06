import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getApp, getApps } from '@/lib/api'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import styles from './page.module.css'

export async function generateStaticParams() {
  const apps = await getApps()
  return apps.map(app => ({ slug: app.slug }))
}

const STATUS_LABELS = {
  published: 'Disponible',
  coming_soon: 'Bientôt disponible',
  draft: 'En développement',
}

const STATUS_CLASS: Record<string, string> = {
  published: styles.badgePublished,
  coming_soon: styles.badgeComingSoon,
  draft: styles.badgeDraft,
}

export default async function AppDetailPage({ params }: { params: { slug: string } }) {
  const app = await getApp(params.slug)
  if (!app) notFound()

  const initials = app.name.slice(0, 2).toUpperCase()

  return (
    <div className={styles.layout}>
      <Navbar />
      <main className={styles.main}>
        <Link href="/" className={styles.back}>← Retour au catalogue</Link>

        <div className={styles.card}>
          <div className={styles.header}>
            <div className={styles.icon}>
              {app.icon_url
                ? <img src={app.icon_url} alt={app.name} width={56} height={56} />
                : <span>{initials}</span>
              }
            </div>
            <div className={styles.meta}>
              <div className={styles.titleRow}>
                <h1 className={styles.title}>{app.name}</h1>
                <span className={`${styles.badge} ${STATUS_CLASS[app.status] ?? ''}`}>
                  {STATUS_LABELS[app.status] ?? app.status}
                </span>
              </div>
              <div className={styles.metaRow}>
                <span className={styles.category}>{app.category}</span>
                <span className={styles.version}>v{app.version}</span>
              </div>
            </div>
          </div>

          {app.description && (
            <p className={styles.description}>{app.description}</p>
          )}

          {app.tags.length > 0 && (
            <div className={styles.tags}>
              {app.tags.map(tag => (
                <span key={tag} className={styles.tag}>{tag}</span>
              ))}
            </div>
          )}

          <div className={styles.cta}>
            {app.status === 'published' && app.url ? (
              <a
                href={app.url}
                target="_blank"
                rel="noreferrer"
                className={styles.btnPrimary}
              >
                Ouvrir l&apos;application →
              </a>
            ) : app.status === 'published' ? (
              <span className={styles.btnDisabled}>Ouvrir l&apos;application</span>
            ) : (
              <span className={styles.btnComingSoon}>Bientôt disponible</span>
            )}
          </div>
        </div>

        {/* Screenshot placeholder */}
        <div className={styles.screenshotPlaceholder}>
          <div className={styles.screenshotInner}>
            <span className={styles.screenshotLabel}>Aperçu disponible au lancement</span>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
