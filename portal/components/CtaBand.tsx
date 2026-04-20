'use client'

import { useState } from 'react'
import Link from 'next/link'
import { WaitlistModal } from './WaitlistModal'
import styles from './CtaBand.module.css'

export default function CtaBand() {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <>
      <div className={styles.band}>
        <h2 className={styles.title}>Prêt à transformer votre façon de travailler ?</h2>
        <p className={styles.sub}>Rejoignez la liste d&apos;attente et soyez parmi les premiers à accéder à la plateforme.</p>
        <div className={styles.btns}>
          <button className={styles.btn1} onClick={() => setModalOpen(true)}>
            Rejoindre la waitlist
          </button>
          <Link href="/freelancehub" className={styles.btn2}>
            En savoir plus
          </Link>
        </div>
      </div>
      <WaitlistModal isOpen={modalOpen} onClose={() => setModalOpen(false)} source="cta-band" />
    </>
  )
}
