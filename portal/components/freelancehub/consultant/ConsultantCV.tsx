'use client'

import type { Consultant, Skill } from '@/lib/freelancehub/types'

interface Props {
  consultant: Consultant & { name: string; email: string; bookings_count: number }
  skills: (Skill & { level: string })[]
}

const LEVEL_LABEL: Record<string, string> = {
  junior: 'Junior', intermediate: 'Intermédiaire', senior: 'Senior', expert: 'Expert',
}

export default function ConsultantCV({ consultant: c, skills }: Props) {
  const byCategory: Record<string, (Skill & { level: string })[]> = {}
  skills.forEach(s => {
    const cat = s.category ?? 'Autre'
    if (!byCategory[cat]) byCategory[cat] = []
    byCategory[cat].push(s)
  })

  return (
    <div className="cv-outer">
      {/* Print / actions bar — hidden in print */}
      <div className="cv-actions no-print">
        <button className="cv-print-btn" onClick={() => window.print()}>
          🖨 Imprimer / Exporter PDF
        </button>
        <a href="/freelancehub/consultant/profile" className="cv-edit-link">
          ← Modifier mon profil
        </a>
      </div>

      {/* CV sheet */}
      <div className="cv-sheet">
        {/* Header */}
        <header className="cv-header">
          <div className="cv-avatar">{(c.name || c.email)[0].toUpperCase()}</div>
          <div className="cv-header-info">
            <h1 className="cv-name">{c.name || 'Consultant'}</h1>
            <p className="cv-title">{c.title ?? 'Consultant Expert'}</p>
            <div className="cv-badges">
              {c.is_verified && <span className="cv-badge cv-badge--verified">✓ Vérifié</span>}
              {c.rating > 0 && (
                <span className="cv-badge cv-badge--rating">
                  {'★'.repeat(Math.round(Number(c.rating)))} {Number(c.rating).toFixed(1)}/5
                  {c.rating_count > 0 && ` · ${c.rating_count} avis`}
                </span>
              )}
              {c.bookings_count > 0 && (
                <span className="cv-badge cv-badge--missions">{c.bookings_count} mission{c.bookings_count > 1 ? 's' : ''}</span>
              )}
            </div>
          </div>
          <div className="cv-header-meta">
            <div className="cv-brand no-print">
              <span className="cv-brand-mark">FH</span>
              <span className="cv-brand-name">FreelanceHub</span>
            </div>
          </div>
        </header>

        <div className="cv-body">
          {/* Left column */}
          <aside className="cv-aside">
            {/* Contact */}
            <section className="cv-section">
              <h2 className="cv-section-title">Contact</h2>
              <div className="cv-contact-list">
                {c.location && <p className="cv-contact-item">📍 {c.location}</p>}
                <p className="cv-contact-item">✉ {c.email}</p>
                {c.linkedin_url && (
                  <a href={c.linkedin_url} target="_blank" rel="noreferrer" className="cv-contact-item cv-link">
                    in LinkedIn
                  </a>
                )}
                {c.youtube_url && (
                  <a href={c.youtube_url} target="_blank" rel="noreferrer" className="cv-contact-item cv-link cv-yt-link">
                    ▶ CV Vidéo YouTube
                  </a>
                )}
              </div>
            </section>

            {/* Stats */}
            <section className="cv-section">
              <h2 className="cv-section-title">Tarification</h2>
              <p className="cv-stat">
                <span className="cv-stat-label">THM</span>
                <span className="cv-stat-value">{c.daily_rate ? `${c.daily_rate} €/h` : 'Sur demande'}</span>
              </p>
              <p className="cv-stat">
                <span className="cv-stat-label">Expérience</span>
                <span className="cv-stat-value">{c.experience_years} an{c.experience_years > 1 ? 's' : ''}</span>
              </p>
            </section>

            {/* Expertises */}
            <section className="cv-section">
              <h2 className="cv-section-title">Expertises</h2>
              <div className="cv-skills-list">
                {Object.entries(byCategory).map(([cat, catSkills]) => (
                  <div key={cat} className="cv-skill-group">
                    <span className="cv-skill-cat">{cat}</span>
                    {catSkills.map(s => (
                      <div key={s.id} className="cv-skill-row">
                        <span className="cv-skill-name">{s.name}</span>
                        <span className={`cv-skill-level cv-skill-level--${s.level}`}>{LEVEL_LABEL[s.level] ?? s.level}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </section>
          </aside>

          {/* Right column */}
          <main className="cv-main">
            {c.bio && (
              <section className="cv-section">
                <h2 className="cv-section-title">À propos</h2>
                <p className="cv-bio">{c.bio}</p>
              </section>
            )}

            {c.youtube_url && (
              <section className="cv-section cv-yt-section no-print">
                <h2 className="cv-section-title">CV Vidéo</h2>
                <a href={c.youtube_url} target="_blank" rel="noreferrer" className="cv-yt-card">
                  <span className="cv-yt-icon">▶</span>
                  <div>
                    <p className="cv-yt-label">Visionner la présentation (2-3 min)</p>
                    <p className="cv-yt-url">{c.youtube_url}</p>
                  </div>
                </a>
              </section>
            )}

            {/* Platform notice */}
            <div className="cv-footer-notice">
              <p>Profil hébergé sur <strong>perform-learn.fr · FreelanceHub</strong> — Réservation en ligne disponible</p>
            </div>
          </main>
        </div>
      </div>

      <style>{`
        .cv-outer { display: flex; flex-direction: column; gap: 1.2rem; max-width: 820px; }

        /* Actions bar */
        .cv-actions { display: flex; align-items: center; gap: 1rem; }
        .cv-print-btn { padding: .6rem 1.2rem; background: var(--c1); color: #fff; border: none; border-radius: var(--radius-sm); font-size: .9rem; font-weight: 600; cursor: pointer; transition: background .15s; }
        .cv-print-btn:hover { background: var(--c1-light); }
        .cv-edit-link { font-size: .88rem; color: var(--text-mid); text-decoration: none; }
        .cv-edit-link:hover { color: var(--c1); }

        /* Sheet */
        .cv-sheet { background: var(--white); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }

        /* Header */
        .cv-header { display: flex; align-items: flex-start; gap: 1.2rem; padding: 1.8rem 2rem; background: var(--c1); color: #fff; }
        .cv-avatar { width: 60px; height: 60px; border-radius: 50%; background: rgba(255,255,255,.2); display: flex; align-items: center; justify-content: center; font-family: 'Fraunces', serif; font-size: 1.6rem; font-weight: 700; flex-shrink: 0; }
        .cv-header-info { flex: 1; }
        .cv-name  { font-family: 'Fraunces', serif; font-size: 1.6rem; font-weight: 700; margin-bottom: .2rem; }
        .cv-title { font-size: .95rem; opacity: .9; margin-bottom: .6rem; }
        .cv-badges { display: flex; flex-wrap: wrap; gap: .4rem; }
        .cv-badge { font-size: .73rem; font-weight: 600; padding: .2em .65em; border-radius: 10px; }
        .cv-badge--verified  { background: rgba(255,255,255,.25); }
        .cv-badge--rating    { background: rgba(255,255,255,.15); }
        .cv-badge--missions  { background: rgba(255,255,255,.15); }
        .cv-header-meta { flex-shrink: 0; }
        .cv-brand { display: flex; flex-direction: column; align-items: center; gap: .3rem; opacity: .8; }
        .cv-brand-mark { width: 32px; height: 32px; background: rgba(255,255,255,.3); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: .78rem; }
        .cv-brand-name { font-size: .7rem; letter-spacing: .04em; }

        /* Body */
        .cv-body { display: grid; grid-template-columns: 220px 1fr; }
        .cv-aside { padding: 1.4rem 1.3rem; border-right: 1px solid var(--border); background: var(--bg); display: flex; flex-direction: column; gap: 1.3rem; }
        .cv-main  { padding: 1.4rem 1.6rem; display: flex; flex-direction: column; gap: 1.3rem; }

        /* Sections */
        .cv-section { display: flex; flex-direction: column; gap: .6rem; }
        .cv-section-title { font-size: .72rem; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: var(--c1); padding-bottom: .3rem; border-bottom: 1.5px solid var(--c1-pale); }

        /* Contact */
        .cv-contact-list { display: flex; flex-direction: column; gap: .3rem; }
        .cv-contact-item { font-size: .82rem; color: var(--text-mid); }
        .cv-link { color: var(--c1); text-decoration: none; }
        .cv-link:hover { text-decoration: underline; }
        .cv-yt-link { font-weight: 600; color: #ff0000; }

        /* Stats */
        .cv-stat { display: flex; justify-content: space-between; align-items: center; font-size: .82rem; }
        .cv-stat-label { color: var(--text-light); }
        .cv-stat-value { font-weight: 600; color: var(--text); }

        /* Skills */
        .cv-skills-list { display: flex; flex-direction: column; gap: .8rem; }
        .cv-skill-group { display: flex; flex-direction: column; gap: .3rem; }
        .cv-skill-cat { font-size: .72rem; font-weight: 600; color: var(--text-light); text-transform: uppercase; letter-spacing: .04em; }
        .cv-skill-row { display: flex; justify-content: space-between; align-items: center; }
        .cv-skill-name { font-size: .82rem; color: var(--text); }
        .cv-skill-level { font-size: .7rem; font-weight: 600; padding: .1em .5em; border-radius: 10px; }
        .cv-skill-level--expert       { background: var(--c1-pale); color: var(--c1); }
        .cv-skill-level--senior       { background: var(--c3-pale); color: var(--c3); }
        .cv-skill-level--intermediate { background: var(--bg); color: var(--text-mid); }
        .cv-skill-level--junior       { background: var(--bg); color: var(--text-light); }

        /* Bio */
        .cv-bio { font-size: .88rem; color: var(--text-mid); line-height: 1.65; white-space: pre-wrap; }

        /* YouTube */
        .cv-yt-card { display: flex; align-items: center; gap: 1rem; padding: .9rem 1.1rem; background: #fff5f5; border: 1.5px solid #ffd0d0; border-radius: var(--radius-sm); text-decoration: none; transition: border-color .15s; }
        .cv-yt-card:hover { border-color: #ff0000; }
        .cv-yt-icon { font-size: 1.5rem; color: #ff0000; flex-shrink: 0; }
        .cv-yt-label { font-size: .88rem; font-weight: 600; color: var(--text); }
        .cv-yt-url  { font-size: .75rem; color: var(--text-light); margin-top: .1rem; word-break: break-all; }

        /* Footer */
        .cv-footer-notice { margin-top: auto; padding: .8rem 1rem; background: var(--bg); border-radius: var(--radius-sm); border: 1px solid var(--border); font-size: .78rem; color: var(--text-light); text-align: center; }

        /* Print */
        @media print {
          .no-print { display: none !important; }
          .fh-sidebar, .fh-nav, nav, header:not(.cv-header) { display: none !important; }
          .cv-outer { max-width: 100%; }
          .cv-sheet { border: none; box-shadow: none; }
          body { background: white; }
        }
      `}</style>
    </div>
  )
}
