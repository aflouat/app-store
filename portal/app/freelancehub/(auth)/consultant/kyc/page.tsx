'use client'

import { useState, useEffect, FormEvent } from 'react'

interface KycStatus {
  kyc_status:        'none' | 'submitted' | 'validated' | 'rejected'
  kyc_document_name: string | null
  kyc_submitted_at:  string | null
  kyc_validated_at:  string | null
  kyc_notes:         string | null
}

const STATUS_CONFIG = {
  none:      { label: 'Non soumis',        color: 'var(--text-light)', bg: '#f5f5f5' },
  submitted: { label: 'En cours de validation', color: '#d97706', bg: '#fffbeb' },
  validated: { label: 'Validé',            color: 'var(--c3)',  bg: 'var(--c3-pale)' },
  rejected:  { label: 'Refusé',            color: '#c0392b',   bg: '#fdf0ef' },
}

export default function ConsultantKycPage() {
  const [status,       setStatus]       = useState<KycStatus | null>(null)
  const [docType,      setDocType]      = useState<'KBIS' | 'URSSAF'>('KBIS')
  const [file,         setFile]         = useState<File | null>(null)
  const [uploading,    setUploading]    = useState(false)
  const [progress,     setProgress]     = useState(0)
  const [error,        setError]        = useState('')
  const [success,      setSuccess]      = useState(false)

  useEffect(() => {
    fetch('/api/freelancehub/consultant/kyc')
      .then(r => r.json())
      .then(setStatus)
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!file) return
    setUploading(true)
    setError('')
    setProgress(10)

    const fd = new FormData()
    fd.append('file', file)
    fd.append('document_type', docType)

    setProgress(40)
    const res = await fetch('/api/freelancehub/consultant/kyc', { method: 'POST', body: fd })
    setProgress(90)
    const data = await res.json().catch(() => ({}))
    setProgress(100)
    setUploading(false)

    if (!res.ok) {
      setError(data.error ?? 'Erreur lors de l\'envoi.')
      setProgress(0)
      return
    }

    setSuccess(true)
    setStatus(prev => prev ? { ...prev, kyc_status: 'submitted', kyc_document_name: file.name } : null)
    setFile(null)
    setTimeout(() => setProgress(0), 600)
  }

  const cfg = status ? STATUS_CONFIG[status.kyc_status] : null

  return (
    <div className="kyc-page">
      <header className="kyc-header">
        <h1 className="kyc-title">Vérification KYC</h1>
        <p className="kyc-sub">
          Le KYC est obligatoire pour apparaître dans les résultats de recherche et recevoir des réservations.
        </p>
      </header>

      {status && (
        <div className="kyc-status-card" style={{ background: cfg?.bg, borderColor: cfg?.color + '40' }}>
          <div className="kyc-status-label" style={{ color: cfg?.color }}>
            {status.kyc_status === 'none'      && '○ Non soumis'}
            {status.kyc_status === 'submitted' && '⏳ En cours de validation'}
            {status.kyc_status === 'validated' && '✓ KYC validé — profil actif'}
            {status.kyc_status === 'rejected'  && '✗ Document refusé'}
          </div>
          {status.kyc_document_name && (
            <p className="kyc-doc-name">Document : {status.kyc_document_name}</p>
          )}
          {status.kyc_submitted_at && (
            <p className="kyc-date">
              Soumis le {new Date(status.kyc_submitted_at).toLocaleDateString('fr-FR')}
            </p>
          )}
          {status.kyc_validated_at && (
            <p className="kyc-date">
              Validé le {new Date(status.kyc_validated_at).toLocaleDateString('fr-FR')}
            </p>
          )}
          {status.kyc_notes && status.kyc_status === 'rejected' && (
            <p className="kyc-notes">Motif : {status.kyc_notes}</p>
          )}
        </div>
      )}

      {status?.kyc_status === 'validated' ? null : (
        <div className="kyc-form-card">
          <h2 className="kyc-form-title">
            {status?.kyc_status === 'rejected'
              ? 'Soumettre un nouveau document'
              : 'Soumettre votre justificatif'}
          </h2>

          <div className="kyc-info">
            <p>Documents acceptés :</p>
            <ul>
              <li><strong>Kbis</strong> — extrait d'immatriculation au RCS (moins de 3 mois)</li>
              <li><strong>Attestation URSSAF</strong> — attestation de vigilance en cours de validité</li>
            </ul>
            <p>Formats : PDF, JPG, PNG · Taille max : 5 Mo</p>
          </div>

          {success && (
            <div className="kyc-success">
              Document envoyé avec succès. Validation sous 24-48h ouvrées.
            </div>
          )}

          {error && <div className="kyc-error">{error}</div>}

          <form onSubmit={handleSubmit} className="kyc-form">
            <div className="kyc-field">
              <label>Type de document</label>
              <select value={docType} onChange={e => setDocType(e.target.value as 'KBIS' | 'URSSAF')}>
                <option value="KBIS">Kbis</option>
                <option value="URSSAF">Attestation URSSAF</option>
              </select>
            </div>

            <div className="kyc-field">
              <label>Fichier <span className="req">*</span></label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={e => { setFile(e.target.files?.[0] ?? null); setSuccess(false); setError('') }}
                required
              />
              {file && <span className="kyc-filename">{file.name} ({(file.size / 1024).toFixed(0)} Ko)</span>}
            </div>

            {progress > 0 && progress < 100 && (
              <div className="kyc-progress-bar">
                <div className="kyc-progress-fill" style={{ width: `${progress}%` }} />
              </div>
            )}

            <button type="submit" className="kyc-submit-btn" disabled={!file || uploading}>
              {uploading ? 'Envoi en cours…' : 'Envoyer le document'}
            </button>
          </form>
        </div>
      )}

      <style>{`
        .kyc-page { display: flex; flex-direction: column; gap: 1.5rem; max-width: 640px; }
        .kyc-header { display: flex; flex-direction: column; gap: .3rem; }
        .kyc-title { font-family: 'Fraunces', serif; font-size: 1.7rem; font-weight: 700; color: var(--dark); }
        .kyc-sub { color: var(--text-mid); font-size: .9rem; }
        .kyc-status-card { border: 1px solid; border-radius: var(--radius); padding: 1.2rem 1.4rem; display: flex; flex-direction: column; gap: .4rem; }
        .kyc-status-label { font-weight: 700; font-size: 1rem; }
        .kyc-doc-name { font-size: .87rem; color: var(--text-mid); }
        .kyc-date { font-size: .82rem; color: var(--text-light); }
        .kyc-notes { font-size: .87rem; color: #c0392b; background: #fef0ef; padding: .5rem .75rem; border-radius: 6px; margin-top: .2rem; }
        .kyc-form-card { background: var(--white); border: 1px solid var(--border); border-radius: var(--radius); padding: 1.6rem; display: flex; flex-direction: column; gap: 1.2rem; }
        .kyc-form-title { font-size: 1rem; font-weight: 700; color: var(--dark); }
        .kyc-info { font-size: .85rem; color: var(--text-mid); background: var(--bg); padding: .9rem 1rem; border-radius: var(--radius-sm); display: flex; flex-direction: column; gap: .4rem; }
        .kyc-info ul { padding-left: 1.2rem; display: flex; flex-direction: column; gap: .2rem; }
        .kyc-info li { color: var(--text); }
        .kyc-form { display: flex; flex-direction: column; gap: 1rem; }
        .kyc-field { display: flex; flex-direction: column; gap: .35rem; }
        .kyc-field label { font-size: .85rem; font-weight: 500; color: var(--text); }
        .req { color: var(--c1); }
        .kyc-field select, .kyc-field input[type="file"] { padding: .6rem .85rem; border: 1.5px solid var(--border); border-radius: var(--radius-sm); font-size: .9rem; background: var(--white); color: var(--text); outline: none; }
        .kyc-field select:focus, .kyc-field input[type="file"]:focus { border-color: var(--c1); }
        .kyc-filename { font-size: .78rem; color: var(--text-light); }
        .kyc-progress-bar { height: 4px; background: var(--border); border-radius: 2px; overflow: hidden; }
        .kyc-progress-fill { height: 100%; background: var(--c1); transition: width .3s ease; }
        .kyc-submit-btn { padding: .75rem 1.5rem; background: var(--c1); color: #fff; border: none; border-radius: var(--radius-sm); font-size: .95rem; font-weight: 600; cursor: pointer; transition: background .15s; }
        .kyc-submit-btn:hover:not(:disabled) { background: var(--c1-light); }
        .kyc-submit-btn:disabled { opacity: .6; cursor: not-allowed; }
        .kyc-success { padding: .75rem 1rem; background: var(--c3-pale); color: var(--c3); border-radius: var(--radius-sm); font-size: .88rem; font-weight: 500; }
        .kyc-error { padding: .75rem 1rem; background: #fdf0ef; color: #c0392b; border-radius: var(--radius-sm); font-size: .85rem; }
      `}</style>
    </div>
  )
}
