import { NextRequest, NextResponse } from 'next/server'
import { sendTaskNotifications, AgentTask } from '@/lib/freelancehub/email'

// POST /api/govern/tasks/notify
// Auth : Authorization: Bearer <CRON_SECRET>
// Body : { assignee: 'abdel' | 'aminetou', sprint: string, tasks: AgentTask[] }
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { assignee, sprint, tasks } = await req.json() as {
    assignee: 'abdel' | 'aminetou'
    sprint:   string
    tasks:    AgentTask[]
  }

  if (!assignee || !tasks?.length) {
    return NextResponse.json({ error: 'assignee et tasks requis.' }, { status: 400 })
  }

  await sendTaskNotifications(assignee, tasks, sprint ?? 'Sprint en cours')

  return NextResponse.json({ success: true, sent_to: assignee, task_count: tasks.length })
}
