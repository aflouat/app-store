'use client'

import { useState } from 'react'

const TASKS_ABDEL = [
  {
    id: 'T-010',
    title: 'Valider le texte CTA landing page',
    description: "Confirmer le wording du bouton principal sur perform-learn.fr → /freelancehub/register. Proposition : « Rejoindre FreelanceHub » / sous-titre « Consultation horaire · Paiement sécurisé · KYC vérifié ».",
    duration: '15 min',
    tool: 'Réponse par email ou message',
    deadline: '2026-04-21',
    actionUrl: 'https://perform-learn.fr',
  },
  {
    id: 'T-011',
    title: 'Confirmer les critères Early Adopter',
    description: "Les 20 premiers consultants avec KYC validé reçoivent automatiquement le badge Fondateur + commission 10%. Valider : auto (actuel) ou liste manuelle ?",
    duration: '15 min',
    tool: 'Réponse par email ou message',
    deadline: '2026-04-22',
    actionUrl: 'https://portal.perform-learn.fr/freelancehub/admin/consultants',
  },
]

const TASKS_AMINETOU = [
  {
    id: 'T-008',
    title: 'Liste 20 consultants Early Adopter',
    description: "Identifier et contacter 20 experts (priorité auto-entrepreneurs) pour être les premiers inscrits et validés KYC sur FreelanceHub. Critères : expertise B2B, disponibilité, profil crédible.",
    duration: '3-4h',
    tool: 'LinkedIn, réseau personnel',
    deadline: '2026-04-23',
    actionUrl: 'https://portal.perform-learn.fr/freelancehub/admin',
  },
  {
    id: 'T-009',
    title: "Valider le contenu email J-3 lancement",
    description: "Relire et valider l'email envoyé à la waitlist 3 jours avant le go-live (27/04). Vérifier : ton, promesse, CTA, conformité RGPD. Draft à venir de l'agent tech.",
    duration: '30 min',
    tool: 'Email (draft à venir)',
    deadline: '2026-04-25',
    actionUrl: 'https://portal.perform-learn.fr',
  },
  {
    id: 'T-012',
    title: 'Configurer STRIPE_WEBHOOK_SECRET dans Vercel',
    description: "Récupérer le secret de webhook Stripe et l'ajouter dans les variables d'environnement Vercel. Étapes : (1) Aller sur dashboard.stripe.com/webhooks → Add endpoint → URL : https://portal.perform-learn.fr/api/webhooks/stripe → Événements : payment_intent.succeeded, payment_intent.payment_failed, charge.refunded → Cliquer Add endpoint. (2) Copier le Signing secret (whsec_xxx...). (3) Aller sur Vercel → projet portal → Settings → Environment Variables → ajouter STRIPE_WEBHOOK_SECRET = whsec_xxx → Save → Redéployer. Cette variable est indispensable pour que les paiements Stripe soient confirmés automatiquement.",
    duration: '15 min',
    tool: 'dashboard.stripe.com + vercel.com',
    deadline: '2026-04-25',
    actionUrl: 'https://dashboard.stripe.com/webhooks',
  },
]

export default function AdminGovPanel() {
  const [sending, setSending]   = useState<string | null>(null)
  const [results, setResults]   = useState<Record<string, 'ok' | 'err'>>({})

  async function send(assignee: 'abdel' | 'aminetou') {
    setSending(assignee)
    const tasks = assignee === 'abdel' ? TASKS_ABDEL : TASKS_AMINETOU
    const res = await fetch('/api/govern/tasks/notify', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ assignee, sprint: 'Semaine 19–25 avril 2026', tasks }),
    })
    setSending(null)
    setResults(r => ({ ...r, [assignee]: res.ok ? 'ok' : 'err' }))
  }

  return (
    <section className="gov-panel">
      <h2 className="gov-title">Gouvernance — tâches agents</h2>
      <p className="gov-sub">Envoie les emails de tâches aux agents humains pour cette semaine.</p>
      <div className="gov-btns">
        <div className="gov-agent">
          <div className="gov-agent-label">Abdel · T-010, T-011</div>
          <div className="gov-agent-tasks">CTA landing · Critères Early Adopter</div>
          <button
            className="gov-btn"
            onClick={() => send('abdel')}
            disabled={sending === 'abdel' || results['abdel'] === 'ok'}
          >
            {sending === 'abdel' ? 'Envoi…' : results['abdel'] === 'ok' ? '✓ Envoyé' : results['abdel'] === 'err' ? '✗ Erreur' : 'Envoyer →'}
          </button>
        </div>
        <div className="gov-agent">
          <div className="gov-agent-label">Mme Aminetou · T-008, T-009, T-012</div>
          <div className="gov-agent-tasks">Liste consultants · Email waitlist · Stripe webhook</div>
          <button
            className="gov-btn"
            onClick={() => send('aminetou')}
            disabled={sending === 'aminetou' || results['aminetou'] === 'ok'}
          >
            {sending === 'aminetou' ? 'Envoi…' : results['aminetou'] === 'ok' ? '✓ Envoyé' : results['aminetou'] === 'err' ? '✗ Erreur' : 'Envoyer →'}
          </button>
        </div>
      </div>
      <style>{`
        .gov-panel { background: var(--white); border: 1px solid var(--border); border-top: 3px solid #b45309; border-radius: var(--radius); padding: 1.4rem 1.6rem; display: flex; flex-direction: column; gap: 1rem; }
        .gov-title { font-size: 1rem; font-weight: 700; color: var(--dark); }
        .gov-sub { font-size: .83rem; color: var(--text-light); margin-top: -.4rem; }
        .gov-btns { display: flex; gap: 1rem; flex-wrap: wrap; }
        .gov-agent { background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 1rem 1.2rem; display: flex; flex-direction: column; gap: .4rem; flex: 1; min-width: 200px; }
        .gov-agent-label { font-size: .85rem; font-weight: 700; color: var(--dark); }
        .gov-agent-tasks { font-size: .78rem; color: var(--text-light); }
        .gov-btn { padding: .45rem .9rem; background: #b45309; color: #fff; border: none; border-radius: 6px; font-size: .82rem; font-weight: 600; cursor: pointer; transition: background .15s; margin-top: .3rem; align-self: flex-start; }
        .gov-btn:hover:not(:disabled) { background: #92400e; }
        .gov-btn:disabled { opacity: .6; cursor: not-allowed; }
      `}</style>
    </section>
  )
}
