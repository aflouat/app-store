'use client'

import { useState, FormEvent } from 'react'
import type { Consultant, Skill } from '@/lib/freelancehub/types'

interface Props {
  userId: string
  consultant: (Consultant & { id?: string }) | null
  allSkills: Skill[]
  consultantSkills: { skill_id: number; level: string }[]
}

const LEVELS = [
  { value: 'junior',       label: 'Junior' },
  { value: 'intermediate', label: 'Intermédiaire' },
  { value: 'senior',       label: 'Senior' },
  { value: 'expert',       label: 'Expert' },
]

export default function ProfileForm({ userId, consultant, allSkills, consultantSkills }: Props) {
  const [title,    setTitle]    = useState(consultant?.title ?? '')
  const [bio,      setBio]      = useState(consultant?.bio ?? '')
  const [rate,     setRate]     = useState(String(consultant?.daily_rate ?? ''))
  const [exp,      setExp]      = useState(String(consultant?.experience_years ?? 0))
  const [location, setLocation] = useState(consultant?.location ?? '')
  const [linkedin, setLinkedin] = useState(consultant?.linkedin_url ?? '')
  const [youtube,  setYoutube]  = useState(consultant?.youtube_url ?? '')

  // skill_id → level (empty string = not selected)
  const [selectedSkills, setSelectedSkills] = useState<Record<number, string>>(() => {
    const map: Record<number, string> = {}
    consultantSkills.forEach(s => { map[s.skill_id] = s.level })
    return map
  })

  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)
  const [error,  setError]  = useState('')

  function toggleSkill(skillId: number) {
    setSelectedSkills(prev => {
      if (prev[skillId]) {
        const next = { ...prev }
        delete next[skillId]
        return next
      }
      return { ...prev, [skillId]: 'intermediate' }
    })
  }

  function setSkillLevel(skillId: number, level: string) {
    setSelectedSkills(prev => ({ ...prev, [skillId]: level }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSaved(false)

    const skills = Object.entries(selectedSkills).map(([id, level]) => ({
      skill_id: Number(id),
      level,
    }))

    const res = await fetch('/api/freelancehub/consultant/profile', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id:          userId,
        title,
        bio,
        daily_rate:       rate ? Number(rate) : null,
        experience_years: exp ? Number(exp) : 0,
        location,
        linkedin_url:     linkedin,
        youtube_url:      youtube,
        skills,
      }),
    })

    setSaving(false)
    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Une erreur est survenue.')
    }
  }

  // Group skills by category
  const byCategory: Record<string, Skill[]> = {}
  allSkills.forEach(s => {
    const cat = s.category ?? 'Autre'
    if (!byCategory[cat]) byCategory[cat] = []
    byCategory[cat].push(s)
  })

  return (
    <form onSubmit={handleSubmit} className="pfm-form">
      {/* Informations générales */}
      <section className="pfm-section">
        <h2 className="pfm-section-title">Informations générales</h2>
        <div className="pfm-grid-2">
          <Field label="Titre professionnel" required>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ex : Expert ERP / D365 F&O"
              required
            />
          </Field>
          <Field label="THM — Taux Horaire Moyen (€)">
            <input
              type="number"
              value={rate}
              onChange={e => setRate(e.target.value)}
              placeholder="85"
              min={0}
            />
          </Field>
          <Field label="Années d'expérience">
            <input
              type="number"
              value={exp}
              onChange={e => setExp(e.target.value)}
              min={0} max={50}
            />
          </Field>
          <Field label="Localisation">
            <input
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="Paris, France"
            />
          </Field>
        </div>
        <Field label="LinkedIn URL">
          <input
            type="url"
            value={linkedin}
            onChange={e => setLinkedin(e.target.value)}
            placeholder="https://linkedin.com/in/..."
          />
        </Field>
        <Field label="YouTube — CV vidéo (2-3 min)">
          <input
            type="url"
            value={youtube}
            onChange={e => setYoutube(e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
          />
        </Field>
        <Field label="Biographie (visible après révélation)">
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value)}
            rows={4}
            placeholder="Décrivez votre parcours, vos spécialités, vos réussites…"
          />
        </Field>
      </section>

      {/* Skills */}
      <section className="pfm-section">
        <h2 className="pfm-section-title">Expertises</h2>
        <p className="pfm-hint">Sélectionnez vos compétences et indiquez votre niveau.</p>
        <div className="pfm-skills">
          {Object.entries(byCategory).map(([cat, skills]) => (
            <div key={cat} className="pfm-skill-group">
              <span className="pfm-skill-category">{cat}</span>
              <div className="pfm-skill-items">
                {skills.map(skill => {
                  const selected = skill.id in selectedSkills
                  const level    = selectedSkills[skill.id] ?? 'intermediate'
                  return (
                    <div
                      key={skill.id}
                      className={`pfm-skill-item${selected ? ' selected' : ''}`}
                    >
                      <label className="pfm-skill-label">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleSkill(skill.id)}
                        />
                        <span>{skill.name}</span>
                      </label>
                      {selected && (
                        <select
                          value={level}
                          onChange={e => setSkillLevel(skill.id, e.target.value)}
                          className="pfm-level-select"
                        >
                          {LEVELS.map(l => (
                            <option key={l.value} value={l.value}>{l.label}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Actions */}
      <div className="pfm-actions">
        {error  && <p className="pfm-error">{error}</p>}
        {saved  && <p className="pfm-success">✓ Profil enregistré avec succès.</p>}
        <button type="submit" className="fh-btn-primary" disabled={saving}>
          {saving ? 'Enregistrement…' : 'Enregistrer le profil'}
        </button>
      </div>

      <style>{`
        .pfm-form { display: flex; flex-direction: column; gap: 1.5rem; }
        .pfm-section { background: var(--white); border: 1px solid var(--border); border-radius: var(--radius); padding: 1.5rem; display: flex; flex-direction: column; gap: 1.1rem; }
        .pfm-section-title { font-size: 1rem; font-weight: 600; color: var(--text); }
        .pfm-hint { font-size: .85rem; color: var(--text-light); margin-top: -.6rem; }
        .pfm-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        @media (max-width: 600px) { .pfm-grid-2 { grid-template-columns: 1fr; } }
        .pfm-field { display: flex; flex-direction: column; gap: .4rem; }
        .pfm-field label { font-size: .85rem; font-weight: 500; color: var(--text); }
        .pfm-field input, .pfm-field textarea, .pfm-field select {
          padding: .6rem .85rem;
          border: 1.5px solid var(--border);
          border-radius: var(--radius-sm);
          font-size: .93rem; color: var(--text);
          background: var(--white); outline: none;
          transition: border-color .15s;
          font-family: inherit;
        }
        .pfm-field input:focus, .pfm-field textarea:focus { border-color: var(--c1); }
        .pfm-field textarea { resize: vertical; min-height: 90px; }
        .pfm-skills { display: flex; flex-direction: column; gap: 1rem; }
        .pfm-skill-group { display: flex; flex-direction: column; gap: .5rem; }
        .pfm-skill-category { font-size: .78rem; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--text-light); }
        .pfm-skill-items { display: flex; flex-wrap: wrap; gap: .5rem; }
        .pfm-skill-item { display: flex; align-items: center; gap: .5rem; padding: .35rem .7rem; border-radius: 20px; border: 1.5px solid var(--border); background: var(--bg); transition: border-color .12s, background .12s; }
        .pfm-skill-item.selected { border-color: var(--c1); background: var(--c1-pale); }
        .pfm-skill-label { display: flex; align-items: center; gap: .4rem; cursor: pointer; font-size: .85rem; color: var(--text); }
        .pfm-skill-label input[type=checkbox] { accent-color: var(--c1); width: 14px; height: 14px; }
        .pfm-level-select { border: none; background: transparent; font-size: .8rem; color: var(--c1); font-weight: 600; cursor: pointer; padding: 0; outline: none; }
        .pfm-actions { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
        .pfm-error   { color: #c0392b; font-size: .85rem; background: #fdf0ef; padding: .5rem .75rem; border-radius: 6px; }
        .pfm-success { color: var(--c3); font-size: .85rem; background: var(--c3-pale); padding: .5rem .75rem; border-radius: 6px; }
        .fh-btn-primary { padding: .7rem 1.5rem; background: var(--c1); color: #fff; border: none; border-radius: var(--radius-sm); font-size: .95rem; font-weight: 600; cursor: pointer; transition: background .15s; }
        .fh-btn-primary:hover:not(:disabled) { background: var(--c1-light); }
        .fh-btn-primary:disabled { opacity: .6; cursor: not-allowed; }
      `}</style>
    </form>
  )
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="pfm-field">
      <label>{label}{required && <span style={{ color: 'var(--c1)', marginLeft: '.2em' }}>*</span>}</label>
      {children}
    </div>
  )
}
