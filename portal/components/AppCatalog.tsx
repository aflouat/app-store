'use client'

import { useState, useMemo } from 'react'
import type { App } from '@/lib/api'
import AppCard from './AppCard'
import styles from './AppCatalog.module.css'

const ALL = 'Tous'

interface Props {
  apps: App[]
}

export default function AppCatalog({ apps }: Props) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState(ALL)

  const categories = useMemo(() => {
    const cats = Array.from(new Set(apps.map(a => a.category)))
    return [ALL, ...cats]
  }, [apps])

  const filtered = useMemo(() => {
    return apps.filter(app => {
      const matchCat = category === ALL || app.category === category
      const q = search.toLowerCase()
      const matchSearch =
        !q ||
        app.name.toLowerCase().includes(q) ||
        (app.description ?? '').toLowerCase().includes(q) ||
        app.tags.some(t => t.toLowerCase().includes(q))
      return matchCat && matchSearch
    })
  }, [apps, search, category])

  return (
    <section className={styles.catalog}>
      <div className={styles.controls}>
        <input
          type="search"
          className={styles.search}
          placeholder="Rechercher une app..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          aria-label="Rechercher"
        />
        <div className={styles.filters}>
          {categories.map(cat => (
            <button
              key={cat}
              className={`${styles.pill} ${category === cat ? styles.pillActive : ''}`}
              onClick={() => setCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.header}>
        <h2 className={styles.title}>Applications</h2>
        <span className={styles.count}>
          {filtered.length} app{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className={styles.empty}>
          <p>Aucune application ne correspond à votre recherche.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {filtered.map(app => <AppCard key={app.id} app={app} />)}
        </div>
      )}
    </section>
  )
}
