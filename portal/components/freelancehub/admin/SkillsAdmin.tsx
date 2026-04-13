'use client'

import { useState } from 'react'

interface Skill {
  id: number
  name: string
  category: string | null
  consultants_count: number
}

const CATEGORIES = ['ERP', 'Data', 'Tech', 'Management', 'Méthodes', 'Finance', 'Autre']

export default function SkillsAdmin({ initialSkills }: { initialSkills: Skill[] }) {
  const [skills,   setSkills]   = useState<Skill[]>(initialSkills)
  const [newName,  setNewName]  = useState('')
  const [newCat,   setNewCat]   = useState('Tech')
  const [adding,   setAdding]   = useState(false)
  const [error,    setError]    = useState('')
  const [deleting, setDeleting] = useState<number | null>(null)

  // Group by category
  const byCategory: Record<string, Skill[]> = {}
  skills.forEach(s => {
    const cat = s.category ?? 'Autre'
    if (!byCategory[cat]) byCategory[cat] = []
    byCategory[cat].push(s)
  })

  async function addSkill() {
    if (!newName.trim()) return
    setAdding(true)
    setError('')

    const res = await fetch('/api/freelancehub/admin/skills', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name: newName.trim(), category: newCat }),
    })

    setAdding(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Erreur lors de l\'ajout.')
      return
    }
    const { skill } = await res.json()
    setSkills(prev => [...prev, { ...skill, consultants_count: 0 }]
      .sort((a, b) => (a.category ?? '').localeCompare(b.category ?? '') || a.name.localeCompare(b.name)))
    setNewName('')
  }

  async function deleteSkill(skill: Skill) {
    if (skill.consultants_count > 0) {
      setError(`"${skill.name}" est utilisée par ${skill.consultants_count} consultant(s) — impossible de supprimer.`)
      return
    }
    setDeleting(skill.id)
    setError('')

    const res = await fetch(`/api/freelancehub/admin/skills/${skill.id}`, { method: 'DELETE' })
    setDeleting(null)

    if (res.ok) {
      setSkills(prev => prev.filter(s => s.id !== skill.id))
    } else {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Erreur lors de la suppression.')
    }
  }

  return (
    <div className="sk-wrap">
      {/* Add form */}
      <div className="sk-add-card">
        <h2 className="sk-add-title">Ajouter une expertise</h2>
        <div className="sk-add-row">
          <div className="sk-field sk-field-grow">
            <label>Nom</label>
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Ex : Cloud / GCP"
              onKeyDown={e => e.key === 'Enter' && addSkill()}
            />
          </div>
          <div className="sk-field">
            <label>Catégorie</label>
            <select value={newCat} onChange={e => setNewCat(e.target.value)}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <button className="sk-add-btn" onClick={addSkill} disabled={adding || !newName.trim()}>
            {adding ? '…' : '+ Ajouter'}
          </button>
        </div>
        {error && <p className="sk-error">{error}</p>}
      </div>

      {/* Skills list by category */}
      {Object.entries(byCategory).map(([cat, catSkills]) => (
        <div key={cat} className="sk-group">
          <div className="sk-group-header">
            <span className="sk-group-cat">{cat}</span>
            <span className="sk-group-count">{catSkills.length}</span>
          </div>
          <div className="sk-items">
            {catSkills.map(skill => (
              <div key={skill.id} className="sk-item">
                <span className="sk-name">{skill.name}</span>
                {skill.consultants_count > 0 && (
                  <span className="sk-usage">{skill.consultants_count} consultant{skill.consultants_count > 1 ? 's' : ''}</span>
                )}
                <button
                  className="sk-del-btn"
                  onClick={() => deleteSkill(skill)}
                  disabled={deleting === skill.id || skill.consultants_count > 0}
                  title={skill.consultants_count > 0 ? 'Utilisée par des consultants' : 'Supprimer'}
                >
                  {deleting === skill.id ? '…' : '×'}
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      <style>{`
        .sk-wrap { display: flex; flex-direction: column; gap: 1.2rem; }
        .sk-add-card { background: var(--white); border: 1px solid var(--border); border-radius: var(--radius); padding: 1.3rem 1.5rem; display: flex; flex-direction: column; gap: .9rem; }
        .sk-add-title { font-size: .95rem; font-weight: 600; color: var(--text); }
        .sk-add-row { display: flex; align-items: flex-end; gap: .75rem; flex-wrap: wrap; }
        .sk-field { display: flex; flex-direction: column; gap: .35rem; }
        .sk-field-grow { flex: 1; min-width: 180px; }
        .sk-field label { font-size: .8rem; font-weight: 500; color: var(--text-mid); }
        .sk-field input, .sk-field select { padding: .55rem .75rem; border: 1.5px solid var(--border); border-radius: var(--radius-sm); font-size: .9rem; color: var(--text); background: var(--white); outline: none; font-family: inherit; }
        .sk-field input:focus, .sk-field select:focus { border-color: var(--c1); }
        .sk-add-btn { padding: .55rem 1.1rem; background: var(--c1); color: #fff; border: none; border-radius: var(--radius-sm); font-size: .88rem; font-weight: 600; cursor: pointer; white-space: nowrap; transition: background .15s; }
        .sk-add-btn:hover:not(:disabled) { background: var(--c1-light); }
        .sk-add-btn:disabled { opacity: .5; cursor: not-allowed; }
        .sk-error { color: #c0392b; font-size: .83rem; background: #fdf0ef; padding: .4rem .75rem; border-radius: 6px; }
        .sk-group { background: var(--white); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
        .sk-group-header { display: flex; align-items: center; gap: .6rem; padding: .6rem 1.1rem; background: var(--bg); border-bottom: 1px solid var(--border); }
        .sk-group-cat { font-size: .78rem; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: var(--text-mid); }
        .sk-group-count { font-size: .73rem; background: var(--border); color: var(--text-light); padding: .1em .5em; border-radius: 10px; }
        .sk-items { display: flex; flex-wrap: wrap; gap: .5rem; padding: .9rem 1.1rem; }
        .sk-item { display: flex; align-items: center; gap: .4rem; padding: .3rem .7rem; border-radius: 20px; border: 1.5px solid var(--border); background: var(--bg); }
        .sk-name { font-size: .85rem; color: var(--text); }
        .sk-usage { font-size: .73rem; color: var(--c3); font-weight: 600; background: var(--c3-pale); padding: .1em .45em; border-radius: 10px; }
        .sk-del-btn { background: none; border: none; color: var(--text-light); cursor: pointer; font-size: 1rem; line-height: 1; padding: 0 .1rem; transition: color .12s; }
        .sk-del-btn:hover:not(:disabled) { color: #c0392b; }
        .sk-del-btn:disabled { opacity: .3; cursor: not-allowed; }
      `}</style>
    </div>
  )
}
