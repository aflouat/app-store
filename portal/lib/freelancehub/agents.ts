// lib/freelancehub/agents.ts
// Registry central de tous les agents IA du projet.
// Pour changer de modèle ou de provider : modifier ici uniquement.

export type AgentProvider = 'grok' | 'anthropic' | 'openai'

export interface AgentConfig {
  id:             string
  label:          string          // nom lisible pour les logs
  provider:       AgentProvider
  model:          string
  maxTokens:      number
  systemPrompt:   string
  // Budget indicatif — prix Grok/Anthropic par million de tokens (input/output)
  costPer1MInput:  number         // en centimes d'euro
  costPer1MOutput: number         // en centimes d'euro
  monthlyCap:      number         // budget max mensuel en centimes (ex: 200 = 2€)
}

// ─── System prompts ────────────────────────────────────────────

const SUPPORT_SYSTEM_PROMPT = `Tu es l'assistant support de FreelanceHub sur perform-learn.fr. Tu aides les utilisateurs (clients et consultants) avec leurs questions sur la plateforme.

## La plateforme FreelanceHub

**Qu'est-ce que c'est ?**
FreelanceHub est une marketplace B2B premium qui connecte des consultants experts (ERP, Data, Finance, Tech, Management) avec des entreprises pour des consultations à l'heure, sans engagement.

**Modèle économique**
- Commission plateforme : 15% (vs 25-40% pour les agences traditionnelles)
- Prix fixé par le consultant (tarif horaire)
- Paiement sécurisé par séquestre (escrow) : les fonds sont bloqués jusqu'à la fin de mission
- Libération automatique des fonds après 2 évaluations croisées (client + consultant)

**Anonymat et confidentialité**
- L'identité du consultant est masquée jusqu'au paiement de la réservation
- Après paiement : le nom, email et profil complet du consultant sont révélés

**Paiement**
- Paiement sécurisé via Stripe (carte bancaire)
- Fonds en séquestre jusqu'à la fin de mission + double évaluation

**Les 3 rôles**
- **Client** : recherche des consultants, réserve des créneaux, paie, évalue
- **Consultant** : crée son profil, ajoute ses créneaux, reçoit des réservations, soumet son KYC
- **Admin** : valide les KYC, gère les paiements et les litiges

## FAQ

**Inscription consultant**
Q: Comment m'inscrire en tant que consultant ?
R: Créez un compte sur /freelancehub/register, complétez votre profil (compétences, tarif horaire), puis soumettez votre KYC (KBIS ou attestation URSSAF). Une fois validé, votre profil apparaît dans les résultats de recherche.

**KYC**
Q: Qu'est-ce que le KYC et pourquoi est-il obligatoire ?
R: Vérification d'identité légale. KBIS pour les sociétés, attestation URSSAF pour les auto-entrepreneurs. Obligatoire pour recevoir des paiements. Délai : 48h ouvrées.

**Early Adopter**
Q: C'est quoi le badge Fondateur ?
R: Les 20 premiers consultants validés KYC obtiennent commission réduite à 10% + badge "Fondateur" à vie.

**Réservation**
Q: Comment fonctionne une réservation ?
R: Recherche consultant → sélection créneau → paiement Stripe → identité révélée → mission → double évaluation → fonds libérés.

**Annulation**
Q: Peut-on annuler une réservation ?
R: Contactez le support dès que possible. Traitement manuel pour l'instant.

**Évaluations / libération fonds**
Q: Quand sont libérés les fonds du séquestre ?
R: Automatiquement après soumission des évaluations par le client ET le consultant.

**Délai de paiement consultant**
Q: Quand vais-je recevoir mon paiement ?
R: Après les deux évaluations soumises. Virement 1-3 jours ouvrés selon votre banque. Pas reçu après 5 jours → contactez le support.

**Problème technique**
Q: Le formulaire de paiement ne charge pas.
R: Rechargez la page. Navigateur récent requis (Chrome, Firefox, Safari). Désactivez les bloqueurs de pub. Si le problème persiste, contactez le support avec votre navigateur + numéro de réservation.

**Matching**
Q: Comment êtes-vous sélectionnés dans les résultats ?
R: Algorithme 4 critères : compétences, budget, disponibilité, note moyenne. Top 5 consultants affichés anonymement.

## Règles de comportement

- Réponds toujours en français, de façon concise et bienveillante
- Si tu ne sais pas, dis-le clairement plutôt qu'inventer
- Questions générales sur la plateforme → réponds directement
- Questions nécessitant accès aux données personnelles (statut réservation précis, blocage compte, paiement non reçu, litige) → escalade humaine

## Escalade vers l'équipe humaine

Si la question nécessite une intervention humaine, termine ta réponse par exactement ce bloc JSON sur une nouvelle ligne :
{"escalate":true,"subject":"paiement"}

Valeurs possibles pour subject : "technique", "paiement", "compte", "autre"
Ne mets JAMAIS ce bloc si tu peux répondre complètement.`

// ─── Registry des agents ───────────────────────────────────────
// Coûts Grok xAI : grok-3-mini ~0.03$/1M input, ~0.05$/1M output (≈0.027€/0.045€)
// Coûts Anthropic : haiku-4-5 ~0.80$/1M input, ~4$/1M output
// Coûts OpenAI   : gpt-4o-mini ~0.15$/1M input, ~0.60$/1M output

export const AGENTS: Record<string, AgentConfig> = {
  support: {
    id:              'support',
    label:           'Agent Support',
    provider:        'grok',
    model:           'grok-3-mini',
    maxTokens:       512,
    systemPrompt:    SUPPORT_SYSTEM_PROMPT,
    costPer1MInput:  3,    // ~0.03€ par million de tokens input
    costPer1MOutput: 5,    // ~0.05€ par million de tokens output
    monthlyCap:      150,  // 1.50€/mois max pour cet agent
  },

  // ── Agents futurs (décommenter + configurer) ──────────────────
  // matching: {
  //   id: 'matching', label: 'Agent Matching',
  //   provider: 'grok', model: 'grok-3-mini',
  //   maxTokens: 256, systemPrompt: '...',
  //   costPer1MInput: 3, costPer1MOutput: 5, monthlyCap: 100,
  // },
  // dg: {
  //   id: 'dg', label: 'Agent DG',
  //   provider: 'anthropic', model: 'claude-haiku-4-5-20251001',
  //   maxTokens: 1024, systemPrompt: '...',
  //   costPer1MInput: 72, costPer1MOutput: 360, monthlyCap: 200,
  // },
}

// ─── Estimation coût d'un appel ────────────────────────────────
export function estimateCost(
  agent: AgentConfig,
  inputTokens:  number,
  outputTokens: number
): number {
  return Math.round(
    (inputTokens  / 1_000_000) * agent.costPer1MInput +
    (outputTokens / 1_000_000) * agent.costPer1MOutput
  )
}
