// lib/freelancehub/chat-router.ts
// Router intelligent multi-agents : keyword classifier + fallback LLM + context persistence

import { AGENTS, estimateCost } from './agents'
import { runAgent } from './agent-client'
import type { AgentMessage } from './agent-client'
import { queryOne } from './db'

export type ChatAgentId = 'onboarding' | 'matching' | 'sales' | 'support' | 'supportPublic'

interface KeywordRule {
  agent: ChatAgentId
  keywords: string[]
  weight: number
}

const KEYWORD_RULES: KeywordRule[] = [
  {
    agent: 'onboarding',
    weight: 3,
    keywords: [
      'inscription', 'inscrire', "s'inscrire", 'créer compte', 'créer un compte',
      'kyc', 'kbis', 'urssaf', 'sirene', 'siret', 'vérification',
      'profil', 'compétence', 'compétences', 'skill', 'skills',
      'tarif horaire', 'daily rate', 'daily_rate', 'thm', 'taux horaire',
      'consultant', 'devenir consultant', 'auto-entrepreneur',
    ],
  },
  {
    agent: 'matching',
    weight: 3,
    keywords: [
      'rechercher', 'chercher', 'trouver', 'expert', 'consultant',
      'réservation', 'réserver', 'book', 'booking', 'créneau', 'créneaux',
      'disponibilité', 'disponible', 'slot', 'slots',
      'prix', 'tarif', 'budget', 'coût', 'montant',
      'mission', 'consultation', 'session',
    ],
  },
  {
    agent: 'sales',
    weight: 3,
    keywords: [
      'early adopter', 'fondateur', 'badge fondateur',
      'commission', 'pourcentage', 'tarif plateforme',
      'démonstration', 'démo', 'demo',
      'entreprise', 'b2b', 'partenariat', 'partenaire',
      'offre', 'promotion', 'avantage',
    ],
  },
  {
    agent: 'support',
    weight: 2,
    keywords: [
      'bug', 'problème technique', 'erreur', 'crash', 'ne marche pas',
      'paiement', 'stripe', 'carte bancaire', 'remboursement',
      'compte', 'email', 'mot de passe', 'connexion', 'login',
      'annulation', 'annuler', 'litige', 'réclamation',
      'évaluation', 'avis', 'note', 'review',
      'support', 'aide', 'help',
    ],
  },
]

const FOLLOW_UP_KEYWORDS = [
  'oui', 'non', 'ok', 'daccord', "d'accord", 'merci', 'et', 'donc',
  'ensuite', 'après', 'puis', 'alors', 'mais', 'parce que', 'car',
  'comment', 'pourquoi', 'quand', 'où', 'qui', 'quel', 'quelle',
]

function isFollowUp(text: string): boolean {
  const t = text.toLowerCase().trim()
  if (t.length < 25) return true
  return FOLLOW_UP_KEYWORDS.some(kw => t.includes(kw))
}

function classifyByKeywords(text: string): ChatAgentId | null {
  const t = text.toLowerCase()
  const scores: Record<string, number> = {}

  for (const rule of KEYWORD_RULES) {
    for (const kw of rule.keywords) {
      if (t.includes(kw.toLowerCase())) {
        scores[rule.agent] = (scores[rule.agent] ?? 0) + rule.weight
      }
    }
  }

  const entries = Object.entries(scores)
  if (entries.length === 0) return null

  entries.sort((a, b) => b[1] - a[1])
  const [topAgent, topScore] = entries[0]
  const secondScore = entries[1]?.[1] ?? 0

  // Si le top n'est pas clairement dominant, renvoyer null (fallback LLM)
  if (topScore - secondScore < 2) return null

  return topAgent as ChatAgentId
}

/** Route un message vers le bon agent.
 *  @param messages      Historique complet de la conversation
 *  @param currentAgent  Agent actuel (si connu côté client)
 *  @param isPublic      true = visiteur non authentifié → supportPublic fallback
 *  @returns             { agentId, content, escalate?, subject?, costCents }
 */
export async function routeMessage(
  messages: AgentMessage[],
  currentAgent?: ChatAgentId | null,
  isPublic = false
): Promise<{
  agentId: ChatAgentId
  content: string
  escalate: boolean
  subject: string
  costCents: number
}> {
  const lastMsg = messages[messages.length - 1]?.content ?? ''

  // ── Phase 1 : classifier par mots-clés ─────────────────────────
  let chosen = classifyByKeywords(lastMsg)

  // ── Phase 2 : context persistence ────────────────────────────
  // Si le message ressemble à une suite de conversation ET qu'un agent est déjà actif,
  // conserver l'agent sauf si les mots-clés sont très explicites pour un autre agent.
  if (!chosen && currentAgent) {
    if (isFollowUp(lastMsg)) {
      chosen = currentAgent
    }
  }

  // ── Phase 3 : fallback LLM (dispatcher) ────────────────────────
  if (!chosen) {
    try {
      const dispatcher = AGENTS.dispatcher
      const result = await runAgent(dispatcher, [
        { role: 'user', content: `Message : "${lastMsg}"\nAgent :` },
      ])
      const raw = result.content.trim().toLowerCase()
      if (['onboarding', 'matching', 'sales', 'support'].includes(raw)) {
        chosen = raw as ChatAgentId
      }
    } catch {
      // Dispatcher en échec → fallback support
    }
  }

  // ── Phase 4 : fallback défaut ──────────────────────────────────
  if (!chosen) {
    chosen = isPublic ? 'supportPublic' : 'support'
  }

  // Si public mais agent choisi = support (pas supportPublic), utiliser supportPublic
  const agentId: ChatAgentId = (isPublic && chosen === 'support') ? 'supportPublic' : chosen

  // ── Phase 5 : vérifier budget mensuel avant d'appeler le LLM ───
  const agent = AGENTS[agentId]
  const monthStart = new Date().toISOString().slice(0, 8) + '01'
  const agentIdentifier = `agent:${agentId}`

  const accumulated = await queryOne<{ count: number }>(
    `SELECT count FROM freelancehub.chat_limits WHERE identifier = $1 AND week_start = $2`,
    [agentIdentifier, monthStart]
  ).catch(() => null)

  if ((accumulated?.count ?? 0) >= agent.monthlyCap) {
    return {
      agentId,
      content: 'Le service de chat est temporairement indisponible. Écrivez-nous à contact@perform-learn.fr.',
      escalate: false,
      subject: 'autre',
      costCents: 0,
    }
  }

  // ── Phase 6 : exécuter l'agent choisi ──────────────────────────
  const result = await runAgent(agent, messages)
  const costCents = estimateCost(agent, result.inputTokens, result.outputTokens)

  // Enregistrer le coût dans chat_limits (identifier = agent:agentId, week_start = 1er du mois)
  await queryOne<{ count: number }>(
    `INSERT INTO freelancehub.chat_limits (identifier, week_start, count)
     VALUES ($1, $2, $3)
     ON CONFLICT (identifier, week_start) DO UPDATE
       SET count = freelancehub.chat_limits.count + $3
     RETURNING count`,
    [agentIdentifier, monthStart, costCents]
  ).catch(() => null)

  // Parse escalation marker {"escalate":true,"subject":"..."}
  const escalateMatch = result.content.match(/\{"escalate":true,"subject":"(\w+)"\}/)
  const escalate = !!escalateMatch
  const subject = escalateMatch?.[1] ?? 'autre'
  const content = result.content.replace(/\{"escalate":true,"subject":"\w+"\}/, '').trim()

  return { agentId, content, escalate, subject, costCents }
}
