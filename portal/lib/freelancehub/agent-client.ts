// lib/freelancehub/agent-client.ts
// Factory : instancie le bon client selon le provider de l'agent.
// Grok, OpenAI et Gemini partagent l'interface OpenAI-compatible.

import OpenAI from 'openai'
import type { AgentConfig, AgentProvider } from './agents'

const BASE_URLS: Record<AgentProvider, string | undefined> = {
  grok:      'https://api.x.ai/v1',
  gemini:    'https://generativelanguage.googleapis.com/v1beta/openai/',
  openai:    undefined,
  anthropic: undefined,
}

const API_KEY_ENV: Record<AgentProvider, string> = {
  grok:      'GROK_API_KEY',
  gemini:    'GEMINI_API_KEY',
  openai:    'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
}

function getOpenAICompatibleClient(provider: AgentProvider): OpenAI {
  const apiKey  = process.env[API_KEY_ENV[provider]] ?? 'missing'
  const baseURL = BASE_URLS[provider]
  return new OpenAI({ apiKey, ...(baseURL ? { baseURL } : {}) })
}

export interface AgentMessage {
  role:    'user' | 'assistant'
  content: string
}

export interface AgentResponse {
  content:      string
  inputTokens:  number
  outputTokens: number
}

export class AgentError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'AgentError'
  }
}

// Point d'entrée unique pour tous les agents
export async function runAgent(
  agent:    AgentConfig,
  messages: AgentMessage[]
): Promise<AgentResponse> {
  try {
    if (agent.provider === 'anthropic') {
      const { default: Anthropic } = await import('@anthropic-ai/sdk')
      const client   = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      const response = await client.messages.create({
        model:      agent.model,
        max_tokens: agent.maxTokens,
        system:     agent.systemPrompt,
        messages:   messages.map(m => ({ role: m.role, content: m.content })),
      })
      return {
        content:      response.content[0].type === 'text' ? response.content[0].text : '',
        inputTokens:  response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      }
    }

    // Grok / OpenAI / Gemini — interface identique
    const client   = getOpenAICompatibleClient(agent.provider)
    const response = await client.chat.completions.create({
      model:      agent.model,
      max_tokens: agent.maxTokens,
      messages:   [
        { role: 'system', content: agent.systemPrompt },
        ...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      ],
    })
    return {
      content:      response.choices[0]?.message?.content ?? '',
      inputTokens:  response.usage?.prompt_tokens     ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
    }

  } catch (err: unknown) {
    // Normalise les erreurs provider en AgentError avec status HTTP
    const status = (err as { status?: number })?.status ?? 500
    const msg    = (err as { message?: string })?.message ?? 'Erreur inconnue'

    if (status === 401 || status === 403) {
      console.error(`[agent:${agent.id}] Clé API invalide ou accès refusé (${status})`)
      throw new AgentError(status, 'Clé API invalide ou accès refusé')
    }
    if (status === 429) {
      console.error(`[agent:${agent.id}] Rate limit atteint`)
      throw new AgentError(429, 'Quota dépassé, réessayez dans quelques instants')
    }
    if (status === 408 || msg.includes('timeout') || msg.includes('ECONNRESET')) {
      console.error(`[agent:${agent.id}] Timeout`)
      throw new AgentError(504, 'Temps de réponse dépassé')
    }
    console.error(`[agent:${agent.id}] Erreur inattendue (${status}):`, msg)
    throw new AgentError(status, msg)
  }
}
