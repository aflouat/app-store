import { NextRequest, NextResponse } from 'next/server'
import { AGENTS, estimateCost } from '@/lib/freelancehub/agents'
import { runAgent } from '@/lib/freelancehub/agent-client'
import type { AgentMessage } from '@/lib/freelancehub/agent-client'

// Route publique — pas d'auth requise
// Accessible aux visiteurs non connectés
export async function POST(req: NextRequest) {
  const body     = await req.json()
  const messages: AgentMessage[] = body.messages ?? []

  if (!messages.length || messages[messages.length - 1].role !== 'user') {
    return NextResponse.json({ error: 'Message invalide' }, { status: 400 })
  }
  const lastContent = messages[messages.length - 1].content
  if (!lastContent.trim() || lastContent.length > 1000) {
    return NextResponse.json({ error: 'Message trop long (1000 car. max)' }, { status: 400 })
  }

  const agent    = AGENTS.supportPublic
  const result   = await runAgent(agent, messages)
  const costCents = estimateCost(agent, result.inputTokens, result.outputTokens)

  // Log usage (surveiller budget mensuel)
  console.log(`[agent:${agent.id}] in=${result.inputTokens} out=${result.outputTokens} cost≈${costCents/100}€`)

  // Parse escalation marker
  const escalateMatch = result.content.match(/\{"escalate":true,"subject":"(\w+)"\}/)
  const escalate      = !!escalateMatch
  const subject       = escalateMatch?.[1] ?? 'autre'
  const message       = result.content.replace(/\{"escalate":true,"subject":"\w+"\}/, '').trim()

  return NextResponse.json({ message, escalate, subject })
}
