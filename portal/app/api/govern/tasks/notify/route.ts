import { NextRequest, NextResponse } from 'next/server'
import { sendTaskNotifications, AgentTask } from '@/lib/freelancehub/email'
import { auth } from '@/auth'

// POST /api/govern/tasks/notify
// Auth : Bearer <CRON_SECRET>  OU  session admin
// Body : { assignee: 'abdel' | 'aminetou', sprint: string, tasks: AgentTask[] }
export async function POST(req: NextRequest) {
  const secret     = process.env.CRON_SECRET
  const bearer     = req.headers.get('authorization')
  const cronOk     = secret && bearer === `Bearer ${secret}`

  if (!cronOk) {
    const session = await auth()
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const { assignee, sprint, tasks } = await req.json() as {
    assignee: 'abdel' | 'aminetou'
    sprint:   string
    tasks:    AgentTask[]
  }

  if (!assignee || !tasks?.length) {
    return NextResponse.json({ error: 'assignee et tasks requis.' }, { status: 400 })
  }

  try {
    await sendTaskNotifications(assignee, tasks, sprint ?? 'Sprint en cours')
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }

  return NextResponse.json({ success: true, sent_to: assignee, task_count: tasks.length })
}
