import type { App } from '@/lib/api'
import styles from './AppCard.module.css'

export default function AppCard({ app }: { app: App }) {
  const initials = app.name.slice(0, 2).toUpperCase()

  return (
    <a
      href={app.url ?? '#'}
      target={app.url ? '_blank' : undefined}
      rel="noreferrer"
      className={styles.card}
    >
      <div className={styles.icon}>
        {app.icon_url
          ? <img src={app.icon_url} alt={app.name} width={40} height={40} />
          : <span>{initials}</span>
        }
      </div>
      <div className={styles.body}>
        <h3 className={styles.name}>{app.name}</h3>
        {app.description && <p className={styles.desc}>{app.description}</p>}
      </div>
      <span className={styles.version}>v{app.version}</span>
    </a>
  )
}
