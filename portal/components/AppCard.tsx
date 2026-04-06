import Link from 'next/link'
import type { App } from '@/lib/api'
import styles from './AppCard.module.css'

const STATUS_LABELS: Record<App['status'], string> = {
  published: 'Disponible',
  coming_soon: 'Bientôt',
  draft: 'En dev',
}

const STATUS_CLASS: Record<App['status'], string> = {
  published: styles.badgePublished,
  coming_soon: styles.badgeComingSoon,
  draft: styles.badgeDraft,
}

export default function AppCard({ app }: { app: App }) {
  const initials = app.name.slice(0, 2).toUpperCase()
  const isAvailable = app.status === 'published' && app.url

  return (
    <Link href={`/apps/${app.slug}`} className={styles.card}>
      {/* Status badge */}
      <div className={`${styles.statusBadge} ${STATUS_CLASS[app.status]}`}>
        {STATUS_LABELS[app.status]}
      </div>

      {/* Category label */}
      <div className={styles.catLabel}>
        <span className={styles.catDot} />
        {app.category}
      </div>

      {/* Icon */}
      <div className={styles.icon}>
        {app.icon_url
          ? <img src={app.icon_url} alt={app.name} width={40} height={40} />
          : <span>{initials}</span>
        }
      </div>

      <h3 className={styles.name}>{app.name}</h3>

      {app.description && (
        <p className={styles.desc}>{app.description}</p>
      )}

      {/* Tags/skills */}
      {app.tags.length > 0 && (
        <div className={styles.skills}>
          {app.tags.map(tag => (
            <span key={tag} className={styles.skill}>{tag}</span>
          ))}
        </div>
      )}

      {/* Bottom row */}
      <div className={styles.bottomRow}>
        <span className={styles.version}>v{app.version}</span>
        <span className={`${styles.cta} ${isAvailable ? styles.ctaActive : styles.ctaSoon}`}>
          {isAvailable ? 'Ouvrir →' : 'Bientôt disponible'}
        </span>
      </div>
    </Link>
  )
}
