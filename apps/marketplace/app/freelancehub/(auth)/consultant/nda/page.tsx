'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ConsultantNdaPage() {
  const router = useRouter()
  const [accepted,  setAccepted]  = useState(false)
  const [signed,    setSigned]    = useState(false)
  const [signedAt,  setSignedAt]  = useState<string | null>(null)
  const [loading,   setLoading]   = useState(false)
  const [checking,  setChecking]  = useState(true)

  useEffect(() => {
    fetch('/api/freelancehub/consultant/nda')
      .then(r => r.json())
      .then(d => {
        setSigned(d.signed)
        setSignedAt(d.signed_at)
        setChecking(false)
      })
  }, [])

  async function handleSign() {
    if (!accepted) return
    setLoading(true)
    const res = await fetch('/api/freelancehub/consultant/nda', { method: 'POST' })
    setLoading(false)
    if (res.ok) {
      setSigned(true)
      setSignedAt(new Date().toISOString())
      setTimeout(() => router.push('/freelancehub/consultant/bookings'), 1500)
    }
  }

  if (checking) return null

  return (
    <div className="nda-page">
      <header className="nda-header">
        <h1 className="nda-title">Accord de Non-Divulgation (NDA)</h1>
        <p className="nda-sub">Version 1.0 — à signer avant votre première mission</p>
      </header>

      {signed && (
        <div className="nda-signed-banner">
          ✓ NDA signé le {new Date(signedAt!).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}.
          Votre signature est enregistrée et horodatée.
        </div>
      )}

      <div className="nda-card">
        <div className="nda-content">

          <section>
            <h2>Préambule</h2>
            <p>
              Dans le cadre des missions de conseil réalisées via la plateforme FreelanceHub (éditée par
              EMMAEINNA Aminetou, SIREN 103 082 673), le consultant expert (ci-après « le Consultant »)
              est susceptible d'accéder à des informations confidentielles appartenant aux entreprises
              clientes (ci-après « le Client »). Le présent accord de non-divulgation (NDA) encadre la
              protection de ces informations.
            </p>
          </section>

          <section>
            <h2>Article 1 — Définition des informations confidentielles</h2>
            <p>
              Sont considérées comme confidentielles toutes les informations, données, documents, processus,
              méthodes, stratégies, résultats, codes sources, bases de données, informations financières ou
              commerciales communiquées par le Client au Consultant dans le cadre d'une mission, qu'elles
              soient transmises oralement, par écrit, sous format électronique ou tout autre support.
            </p>
            <p>
              Ne sont pas soumises à cet accord les informations qui : (i) étaient déjà connues du
              Consultant avant la mission, (ii) sont ou deviennent publiques sans faute du Consultant,
              (iii) sont reçues licitement d'un tiers sans obligation de confidentialité.
            </p>
          </section>

          <section>
            <h2>Article 2 — Obligations du Consultant</h2>
            <p>Le Consultant s'engage à :</p>
            <ul>
              <li>Ne pas divulguer les informations confidentielles à des tiers sans accord écrit préalable du Client</li>
              <li>N'utiliser ces informations qu'aux fins strictement nécessaires à l'exécution de la mission</li>
              <li>Protéger les informations confidentielles avec le même niveau de soin que ses propres informations sensibles, et au minimum avec une diligence raisonnable</li>
              <li>Ne pas reproduire, copier ou stocker les informations confidentielles au-delà de la durée de la mission, sauf accord exprès du Client</li>
              <li>Informer immédiatement FreelanceHub et le Client en cas de divulgation accidentelle ou non autorisée</li>
            </ul>
          </section>

          <section>
            <h2>Article 3 — Durée</h2>
            <p>
              Les obligations de confidentialité prennent effet à compter de la signature du présent accord
              et demeurent en vigueur pendant une durée de <strong>3 ans</strong> après la fin de la
              dernière mission réalisée via FreelanceHub, quelle qu'en soit la cause de cessation.
            </p>
          </section>

          <section>
            <h2>Article 4 — Non-sollicitation</h2>
            <p>
              Pendant la durée du présent accord et pendant les <strong>12 mois</strong> suivant la fin de
              toute mission, le Consultant s'engage à ne pas solliciter directement les clients rencontrés
              via FreelanceHub pour leur proposer des services similaires en dehors de la plateforme.
            </p>
          </section>

          <section>
            <h2>Article 5 — Propriété intellectuelle</h2>
            <p>
              Toute production réalisée par le Consultant dans le cadre d'une mission (livrables, analyses,
              code, recommandations) reste la propriété du Client, sauf accord contractuel contraire conclu
              directement entre le Consultant et le Client.
            </p>
          </section>

          <section>
            <h2>Article 6 — Sanctions</h2>
            <p>
              Tout manquement aux obligations du présent accord pourra entraîner la suspension immédiate
              du compte Consultant sur FreelanceHub, sans préjudice de toute action en dommages et intérêts
              que le Client ou FreelanceHub serait en droit d'engager devant les juridictions compétentes.
            </p>
          </section>

          <section>
            <h2>Article 7 — Droit applicable</h2>
            <p>
              Le présent accord est soumis au droit français. Tout litige sera porté devant les tribunaux
              compétents du ressort du siège social de FreelanceHub.
            </p>
          </section>

          <section>
            <h2>Article 8 — Preuve de signature</h2>
            <p>
              La signature électronique du présent accord par checkbox horodatée constitue une preuve
              d'acceptation conformément à l'article 1366 du Code civil. L'adresse IP et le User-Agent
              du signataire sont conservés à titre probatoire.
            </p>
          </section>

        </div>

        {!signed ? (
          <div className="nda-sign-zone">
            <label className="nda-checkbox-row">
              <input
                type="checkbox"
                checked={accepted}
                onChange={e => setAccepted(e.target.checked)}
              />
              <span>
                J'ai lu et j'accepte intégralement les termes du présent Accord de Non-Divulgation.
                Je comprends que cette acceptation est horodatée et constitue une preuve légale.
              </span>
            </label>
            <button
              className="nda-sign-btn"
              onClick={handleSign}
              disabled={!accepted || loading}
            >
              {loading ? 'Signature en cours…' : 'Signer le NDA et accéder à mes réservations'}
            </button>
          </div>
        ) : (
          <div className="nda-already-signed">
            ✓ Vous avez signé ce NDA. Redirection vers vos réservations…
          </div>
        )}
      </div>

      <style>{`
        .nda-page { display: flex; flex-direction: column; gap: 1.5rem; max-width: 760px; }
        .nda-header { display: flex; flex-direction: column; gap: .3rem; }
        .nda-title { font-family: 'Fraunces', serif; font-size: 1.7rem; font-weight: 700; color: var(--dark); }
        .nda-sub { color: var(--text-light); font-size: .85rem; }
        .nda-signed-banner { background: var(--c3-pale); color: var(--c3); padding: .75rem 1rem; border-radius: var(--radius-sm); font-size: .9rem; font-weight: 600; }
        .nda-card { background: var(--white); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
        .nda-content { padding: 2rem; display: flex; flex-direction: column; gap: 1.5rem; max-height: 520px; overflow-y: auto; border-bottom: 1px solid var(--border); }
        .nda-content section { display: flex; flex-direction: column; gap: .6rem; }
        .nda-content h2 { font-size: .95rem; font-weight: 700; color: var(--dark); }
        .nda-content p, .nda-content li { font-size: .88rem; color: var(--text); line-height: 1.7; }
        .nda-content ul { padding-left: 1.3rem; display: flex; flex-direction: column; gap: .3rem; }
        .nda-sign-zone { padding: 1.4rem 2rem; display: flex; flex-direction: column; gap: 1rem; background: var(--bg); }
        .nda-checkbox-row { display: flex; align-items: flex-start; gap: .7rem; cursor: pointer; }
        .nda-checkbox-row input[type="checkbox"] { margin-top: .15rem; flex-shrink: 0; accent-color: var(--c1); width: 16px; height: 16px; }
        .nda-checkbox-row span { font-size: .87rem; color: var(--text); line-height: 1.5; font-weight: 500; }
        .nda-sign-btn { padding: .8rem 1.6rem; background: var(--c1); color: #fff; border: none; border-radius: var(--radius-sm); font-size: .95rem; font-weight: 600; cursor: pointer; transition: background .15s; }
        .nda-sign-btn:hover:not(:disabled) { background: var(--c1-light); }
        .nda-sign-btn:disabled { opacity: .5; cursor: not-allowed; }
        .nda-already-signed { padding: 1.2rem 2rem; background: var(--c3-pale); color: var(--c3); font-weight: 600; font-size: .9rem; }
      `}</style>
    </div>
  )
}
