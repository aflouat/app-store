import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { AGENTS, estimateCost } from '@/lib/freelancehub/agents'
import { runAgent } from '@/lib/freelancehub/agent-client'
import type { AgentMessage } from '@/lib/freelancehub/agent-client'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body     = await req.json()
  const messages: AgentMessage[] = body.messages ?? []

  if (!messages.length || messages[messages.length - 1].role !== 'user') {
    return NextResponse.json({ error: 'Message invalide' }, { status: 400 })
  }
  const lastContent = messages[messages.length - 1].content
  if (!lastContent.trim() || lastContent.length > 1000) {
    return NextResponse.json({ error: 'Message invalide' }, { status: 400 })
  }

  const agent    = AGENTS.support
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
