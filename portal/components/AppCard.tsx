'use client'
import { useState } from 'react'
import Link from 'next/link'
import type { App } from '@/lib/api'
import { useToast } from '@/hooks/useToast'
import { ToastContainer } from './ToastContainer'
import { WaitlistModal } from './WaitlistModal'
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
  // url starting with '/' = internal Next.js route (usable now)
  const isLive = app.status === 'published' && app.url?.startsWith('/')
  const { toasts, showToast } = useToast()
  const [waitlistOpen, setWaitlistOpen] = useState(false)

  const cardHref = isLive ? app.url! : `/apps/${app.slug}`

  const handleCtaClick = (e: React.MouseEvent) => {
    if (isLive) return // let the Link handle navigation
    e.preventDefault()
    if (app.status === 'published') {
      showToast('Bientôt disponible', 'info')
    } else {
      setWaitlistOpen(true)
    }
  }

  return (
    <>
      <Link href={cardHref} className={styles.card}>
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
          <span
            role="button"
            onClick={handleCtaClick}
            className={`${styles.cta} ${app.status === 'published' ? styles.ctaActive : styles.ctaSoon}`}
          >
            {isLive ? 'Ouvrir →' : app.status === 'published' ? 'Bientôt →' : 'Rejoindre la waitlist'}
          </span>
        </div>
      </Link>

      <WaitlistModal
        isOpen={waitlistOpen}
        onClose={() => setWaitlistOpen(false)}
        source={`app-${app.slug}`}
      />
      <ToastContainer toasts={toasts} />
    </>
  )
}
