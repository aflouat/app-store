'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  bookingId:       string
  reviewerId:      string
  reviewerRole:    'client' | 'consultant'
  revieweeId:      string
  redirectTo:      string
  consultantTitle?: string | null
}

export default function ReviewForm({
  bookingId,
  reviewerId,
  reviewerRole,
  revieweeId,
  redirectTo,
  consultantTitle,
}: Props) {
  const router  = useRouter()
  const [rating,   setRating]  = useState(0)
  const [hover,    setHover]   = useState(0)
  const [comment,  setComment] = useState('')
  const [saving,   setSaving]  = useState(false)
  const [error,    setError]   = useState('')

  async function handleSubmit() {
    if (rating === 0) {
      setError('Veuillez sélectionner une note.')
      return
    }
    setSaving(true)
    setError('')

    const res = await fetch('/api/freelancehub/reviews', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        booking_id:   bookingId,
        reviewer_id:  reviewerId,
        reviewee_id:  revieweeId,
        reviewer_role: reviewerRole,
        rating,
        comment: comment.trim() || null,
      }),
    })

    setSaving(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Erreur lors de l\'envoi.')
      return
    }

    router.push(redirectTo)
    router.refresh()
  }

  const targetLabel = reviewerRole === 'client'
    ? (consultantTitle ?? 'le consultant')
    : 'le client'

  return (
    <div className="rev-form">
      <div className="rev-target">
        Vous évaluez {targetLabel}
      </div>

      {/* Star rating */}
      <div className="rev-stars-wrap">
        <p className="rev-stars-label">Note globale</p>
        <div className="rev-stars">
          {[1,2,3,4,5].map(i => (
            <button
              key={i}
              type="button"
              className={`rev-star ${i <= (hover || rating) ? 'active' : ''}`}
              onClick={() => setRating(i)}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(0)}
            >
              ★
            </button>
          ))}
        </div>
        <p className="rev-rating-label">
          {rating === 0 ? 'Cliquez pour noter'
            : rating === 1 ? 'Très insatisfait'
            : rating === 2 ? 'Insatisfait'
            : rating === 3 ? 'Correct'
            : rating === 4 ? 'Satisfait'
            : 'Très satisfait'}
        </p>
      </div>

      {/* Comment */}
      <div className="rev-field">
        <label>Commentaire (optionnel)</label>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          rows={4}
          placeholder="Partagez votre expérience avec ce consultant…"
        />
        <span className="rev-char-count">{comment.length}/500</span>
      </div>

      {error && <p className="rev-error">{error}</p>}

      <button
        className="fh-btn-primary"
        onClick={handleSubmit}
        disabled={saving || rating === 0}
      >
        {saving ? 'Envoi…' : 'Publier mon avis'}
      </button>

      <style>{`
        .rev-form { display: flex; flex-direction: column; gap: 1.3rem; background: var(--white); border: 1px solid var(--border); border-radius: var(--radius); padding: 1.8rem; }
        .rev-target { font-size: .9rem; color: var(--text-mid); }
        .rev-stars-wrap { display: flex; flex-direction: column; gap: .4rem; }
        .rev-stars-label { font-size: .85rem; font-weight: 600; color: var(--text); }
        .rev-stars { display: flex; gap: .3rem; }
        .rev-star { background: none; border: none; font-size: 2.2rem; color: #e0dbd8; cursor: pointer; transition: color .1s; line-height: 1; padding: 0 .05rem; }
        .rev-star.active { color: #e8b84b; }
        .rev-rating-label { font-size: .85rem; color: var(--text-light); min-height: 1.2em; }
        .rev-field { display: flex; flex-direction: column; gap: .4rem; position: relative; }
        .rev-field label { font-size: .85rem; font-weight: 500; color: var(--text); }
        .rev-field textarea { padding: .7rem .9rem; border: 1.5px solid var(--border); border-radius: var(--radius-sm); font-size: .93rem; color: var(--text); background: var(--white); outline: none; font-family: inherit; resize: vertical; min-height: 100px; transition: border-color .15s; }
        .rev-field textarea:focus { border-color: var(--c1); }
        .rev-char-count { position: absolute; right: .5rem; bottom: .4rem; font-size: .73rem; color: var(--text-light); }
        .rev-error { color: #c0392b; font-size: .85rem; background: #fdf0ef; padding: .5rem .75rem; border-radius: 6px; }
        .fh-btn-primary { padding: .72rem 1.5rem; background: var(--c1); color: #fff; border: none; border-radius: var(--radius-sm); font-size: .95rem; font-weight: 600; cursor: pointer; align-self: flex-start; transition: background .15s; }
        .fh-btn-primary:hover:not(:disabled) { background: var(--c1-light); }
        .fh-btn-primary:disabled { opacity: .6; cursor: not-allowed; }
      `}</style>
    </div>
  )
}
