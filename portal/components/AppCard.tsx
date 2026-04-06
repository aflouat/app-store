import Link from 'next/link'
import type { App } from '@/lib/api'
import styles from './AppCard.module.css'

const STATUS_LABELS: Record<App['status'], string> = {
  published: 'Disponible',
  coming_soon: 'Bientôt disponible',
  draft: 'En développement',
}

const STATUS_CLASS: Record<App['status'], string> = {
  published: styles.badgePublished,
  coming_soon: styles.badgeComingSoon,
  draft: styles.badgeDraft,
}

export default function AppCard({ app }: { app: App }) {
  const initials = app.name.slice(0, 2).toUpperCase()

  return (
    <Link href={`/apps/${app.slug}`} className={styles.card}>
      <div className={styles.icon}>
        {app.icon_url
          ? <img src={app.icon_url} alt={app.name} width={40} height={40} />
          : <span>{initials}</span>
        }
      </div>
      <div className={styles.body}>
        <div className={styles.header}>
          <h3 className={styles.name}>{app.name}</h3>
          <span className={`${styles.badge} ${STATUS_CLASS[app.status]}`}>
            {STATUS_LABELS[app.status]}
          </span>
        </div>
        {app.description && <p className={styles.desc}>{app.description}</p>}
        {app.tags.length > 0 && (
          <div className={styles.tags}>
            {app.tags.map(tag => (
              <span key={tag} className={styles.tag}>{tag}</span>
            ))}
          </div>
        )}
      </div>
      <span className={styles.version}>v{app.version}</span>
    </Link>
  )
}
