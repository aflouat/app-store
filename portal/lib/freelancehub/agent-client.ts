// lib/freelancehub/agent-client.ts
// Factory : instancie le bon client selon le provider de l'agent.
// Tous les providers exposent une interface OpenAI-compatible sauf Anthropic.

import OpenAI from 'openai'
import type { AgentConfig, AgentProvider } from './agents'

const BASE_URLS: Record<AgentProvider, string | undefined> = {
  grok:      'https://api.x.ai/v1',
  openai:    undefined,              // SDK OpenAI natif, pas de baseURL custom
  anthropic: undefined,              // géré séparément via @anthropic-ai/sdk
}

const API_KEY_ENV: Record<AgentProvider, string> = {
  grok:      'GROK_API_KEY',
  openai:    'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
}

// Retourne un client OpenAI-compatible (Grok et OpenAI partagent la même interface)
function getOpenAICompatibleClient(provider: AgentProvider): OpenAI {
  const envVar = API_KEY_ENV[provider]
  const apiKey = process.env[envVar] ?? 'missing'
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

// Point d'entrée unique pour tous les agents
export async function runAgent(
  agent:    AgentConfig,
  messages: AgentMessage[]
): Promise<AgentResponse> {
  if (agent.provider === 'anthropic') {
    // Anthropic SDK séparé
    const { default: Anthropic } = await import('@anthropic-ai/sdk')
    const client   = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const response = await client.messages.create({
      model:     agent.model,
      max_tokens: agent.maxTokens,
      system:    agent.systemPrompt,
      messages:  messages.map(m => ({ role: m.role, content: m.content })),
    })
    const content = response.content[0].type === 'text' ? response.content[0].text : ''
    return {
      content,
      inputTokens:  response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    }
  }

  // Grok / OpenAI — interface identique
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
}
