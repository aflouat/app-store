import { NextRequest, NextResponse } from 'next/server'
import { routeMessage } from '@/lib/freelancehub/chat-router'
import type { AgentMessage } from '@/lib/freelancehub/agent-client'
import { queryOne } from '@/lib/freelancehub/db'

const WEEKLY_LIMIT = 2

function getWeekStart(): string {
  const now  = new Date()
  const day  = now.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day // rewind to Monday
  const mon  = new Date(now)
  mon.setUTCDate(now.getUTCDate() + diff)
  return mon.toISOString().slice(0, 10)
}

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

  // ── Weekly rate limit (2 messages/semaine par IP) ──────────────
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown'
  const weekStart = getWeekStart()

  const limitRow = await queryOne<{ count: number }>(
    `INSERT INTO freelancehub.chat_limits (identifier, week_start, count)
     VALUES ($1, $2, 1)
     ON CONFLICT (identifier, week_start) DO UPDATE
       SET count = freelancehub.chat_limits.count + 1
     RETURNING count`,
    [ip, weekStart]
  ).catch(() => null)

  if ((limitRow?.count ?? 0) > WEEKLY_LIMIT) {
    return NextResponse.json({ limitReached: true })
  }

  // ── Appel agent ─────────────────────────────────────────────────
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
