import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { routeMessage } from '@/lib/freelancehub/chat-router'
import type { AgentMessage } from '@/lib/freelancehub/agent-client'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const messages: AgentMessage[] = body.messages ?? []
  const currentAgent = body.currentAgent ?? null

  if (!messages.length || messages[messages.length - 1].role !== 'user') {
    return NextResponse.json({ error: 'Message invalide' }, { status: 400 })
  }
  const lastContent = messages[messages.length - 1].content
  if (!lastContent.trim() || lastContent.length > 1000) {
    return NextResponse.json({ error: 'Message invalide' }, { status: 400 })
  }

  const result = await routeMessage(messages, currentAgent, false)

  console.log(
    `[chat-router] agent=${result.agentId} in=${messages.length} cost≈${result.costCents / 100}€`
  )

  return NextResponse.json({
    agentId:   result.agentId,
    message:   result.content,
    escalate:  result.escalate,
    subject:   result.subject,
  })
}
