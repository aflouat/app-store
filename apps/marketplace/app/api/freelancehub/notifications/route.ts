import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import {
  listNotifications,
  markAllRead,
  markOneRead,
} from '@/lib/freelancehub/notifications'

// GET /api/freelancehub/notifications — list for current user
export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const notifications = await listNotifications(session.user.id)
  return NextResponse.json({ notifications })
}

// PATCH /api/freelancehub/notifications — mark as read
// Body: { all: true } OR { id: "<uuid>" }
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))

  if (body.all) {
    await markAllRead(session.user.id)
  } else if (body.id) {
    await markOneRead(session.user.id, body.id)
  } else {
    return NextResponse.json({ error: 'Provide { all: true } or { id }.' }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
