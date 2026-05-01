'use client'
import { useState } from 'react'
import Link from 'next/link'
import type { App } from '@/lib/api'
import { useToast } from '@/hooks/useToast'
import { ToastContainer } from './ToastContainer'
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
  const isLive = app.status === 'published' && app.url?.startsWith('/')
  const { toasts, showToast } = useToast()

  const cardHref = isLive ? app.url! : `/apps/${app.slug}`

  const handleCtaClick = (e: React.MouseEvent) => {
    if (isLive) return
    e.preventDefault()
    showToast('Bientôt disponible', 'info')
  }

  return (
    <>
      <Link href={cardHref} className={styles.card}>
        <div className={`${styles.statusBadge} ${STATUS_CLASS[app.status]}`}>
          {STATUS_LABELS[app.status]}
        </div>

        <div className={styles.catLabel}>
          <span className={styles.catDot} />
          {app.category}
        </div>

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

        {app.tags.length > 0 && (
          <div className={styles.skills}>
            {app.tags.map(tag => (
              <span key={tag} className={styles.skill}>{tag}</span>
            ))}
          </div>
        )}

        <div className={styles.bottomRow}>
          <span className={styles.version}>v{app.version}</span>
          <span
            role="button"
            onClick={handleCtaClick}
            className={`${styles.cta} ${app.status === 'published' ? styles.ctaActive : styles.ctaSoon}`}
          >
            {isLive ? 'Ouvrir →' : 'Bientôt →'}
          </span>
        </div>
      </Link>

      <ToastContainer toasts={toasts} />
    </>
  )
}
