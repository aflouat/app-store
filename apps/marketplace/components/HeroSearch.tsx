'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import styles from '@/app/page.module.css'

export default function HeroSearch() {
  const [q, setQ] = useState('')
  const router = useRouter()

  const handleSearch = () => {
    const catalog = document.getElementById('catalogue')
    if (catalog) {
      catalog.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  return (
    <div className={styles.searchWrap}>
      <input
        type="search"
        className={styles.searchInput}
        placeholder="Rechercher une application…"
        value={q}
        onChange={e => setQ(e.target.value)}
        onKeyDown={handleKey}
      />
      <button className={styles.btnSearch} onClick={handleSearch}>
        Rechercher
      </button>
    </div>
  )
}
