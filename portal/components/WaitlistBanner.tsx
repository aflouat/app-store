'use client'

import { useState } from 'react'
import { WaitlistModal } from './WaitlistModal'
import styles from './WaitlistBanner.module.css'

export default function WaitlistBanner() {
  const [dismissed, setDismissed] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  if (dismissed) return null

  return (
    <>
      <div className={styles.banner}>
        <button
          className={styles.dismiss}
          onClick={() => setDismissed(true)}
          aria-label="Fermer"
        >
          ×
        </button>
        <div className={styles.inner}>
          <div className={styles.text}>
            <p className={styles.title}>Lancement le 30 avril 2026</p>
            <p className={styles.sub}>Inscrivez-vous pour être notifié en avant-première.</p>
          </div>
          <button
            className={styles.btn}
            onClick={() => setModalOpen(true)}
          >
            Rejoindre la waitlist
          </button>
        </div>
      </div>

      <WaitlistModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        source="banner"
      />
    </>
  )
}
