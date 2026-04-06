'use client'

import { useState } from 'react'
import styles from './WaitlistBanner.module.css'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.perform-learn.fr'

export default function WaitlistBanner() {
  const [email, setEmail] = useState('')
  const [type, setType] = useState<'client' | 'freelance'>('client')
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setState('loading')
    try {
      const res = await fetch(`${API}/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, user_type: type }),
      })
      if (!res.ok) throw new Error()
      setState('success')
    } catch {
      setState('error')
    }
  }

  return (
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
        {state === 'success' ? (
          <p className={styles.success}>Vous êtes inscrit — à très bientôt !</p>
        ) : (
          <form className={styles.form} onSubmit={handleSubmit}>
            <select
              className={styles.select}
              value={type}
              onChange={e => setType(e.target.value as 'client' | 'freelance')}
              required
            >
              <option value="client">Entreprise</option>
              <option value="freelance">Freelance</option>
            </select>
            <input
              type="email"
              className={styles.input}
              placeholder="votre@email.fr"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            <button
              type="submit"
              className={styles.btn}
              disabled={state === 'loading'}
            >
              {state === 'loading' ? '...' : "Rejoindre"}
            </button>
            {state === 'error' && (
              <p className={styles.error}>Une erreur est survenue. Réessayez.</p>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
