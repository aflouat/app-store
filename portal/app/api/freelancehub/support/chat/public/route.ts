import { NextRequest, NextResponse } from 'next/server'
import { routeMessage } from '@/lib/freelancehub/chat-router'
import type { AgentMessage } from '@/lib/freelancehub/agent-client'

// Route publique — pas d'auth requise
// Accessible aux visiteurs non connectés
export async function POST(req: NextRequest) {
  const body = await req.json()
  const messages: AgentMessage[] = body.messages ?? []
  const currentAgent = body.currentAgent ?? null

  if (!messages.length || messages[messages.length - 1].role !== 'user') {
    return NextResponse.json({ error: 'Message invalide' }, { status: 400 })
  }
  const lastContent = messages[messages.length - 1].content
  if (!lastContent.trim() || lastContent.length > 1000) {
    return NextResponse.json({ error: 'Message trop long (1000 car. max)' }, { status: 400 })
  }

  try {
    const result = await routeMessage(messages, currentAgent, true)

    console.log(
      `[chat-router:public] agent=${result.agentId} in=${messages.length} cost≈${result.costCents / 100}€`
    )

    return NextResponse.json({
      agentId:  result.agentId,
      message:  result.content,
      escalate: result.escalate,
      subject:  result.subject,
    })

  } catch (err: unknown) {
    const status = (err as { status?: number })?.status ?? 500
    console.error('[chat-router:public] Erreur', status, (err as { message?: string })?.message)
    return NextResponse.json({
      message:  'Le service est temporairement indisponible. Réessayez dans quelques instants ou écrivez-nous à contact@perform-learn.fr.',
      escalate: false,
    })
  }
}
