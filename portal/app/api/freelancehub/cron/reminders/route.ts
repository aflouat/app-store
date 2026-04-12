// POST /api/freelancehub/cron/reminders
// Called daily by Vercel Cron (see vercel.json) at 08:00 UTC.
// Finds bookings with slot_date = tomorrow + status confirmed/in_progress.
// Sends reminder emails + creates in-app notifications.
//
// Security: protected by CRON_SECRET header (set as Vercel env var).

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/freelancehub/db'
import { sendBookingReminder } from '@/lib/freelancehub/email'
import { createNotification } from '@/lib/freelancehub/notifications'

interface ReminderRow {
  booking_id:       string
  client_id:        string
  consultant_user_id: string
  client_name:      string | null
  client_email:     string
  consultant_name:  string | null
  consultant_email: string
  skill_name:       string | null
  slot_date:        string
  slot_time:        string
}

export async function POST(req: NextRequest) {
  // Verify CRON_SECRET — Vercel sends: Authorization: Bearer <CRON_SECRET>
  const authHeader = req.headers.get('authorization')
  const secret = authHeader?.replace('Bearer ', '') ?? req.nextUrl.searchParams.get('secret')
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Bookings whose slot is tomorrow
  const bookings = await query<ReminderRow>(
    `SELECT
       b.id AS booking_id,
       b.client_id,
       c.user_id AS consultant_user_id,
       uc.name  AS client_name,
       uc.email AS client_email,
       uc2.name  AS consultant_name,
       uc2.email AS consultant_email,
       sk.name   AS skill_name,
       s.slot_date::text,
       s.slot_time::text
     FROM freelancehub.bookings b
     JOIN freelancehub.slots s      ON s.id = b.slot_id
     JOIN freelancehub.users uc     ON uc.id = b.client_id
     JOIN freelancehub.consultants c ON c.id = b.consultant_id
     JOIN freelancehub.users uc2    ON uc2.id = c.user_id
     LEFT JOIN freelancehub.skills sk ON sk.id = b.skill_requested
     WHERE s.slot_date = CURRENT_DATE + INTERVAL '1 day'
       AND b.status IN ('confirmed', 'in_progress')`
  )

  if (bookings.length === 0) {
    return NextResponse.json({ sent: 0, message: 'No upcoming bookings for tomorrow.' })
  }

  let sent = 0
  const errors: string[] = []

  for (const b of bookings) {
    try {
      // Email reminders
      if (process.env.RESEND_API_KEY) {
        await sendBookingReminder({
          bookingId:       b.booking_id,
          clientName:      b.client_name ?? 'Client',
          clientEmail:     b.client_email,
          consultantName:  b.consultant_name ?? 'Consultant',
          consultantEmail: b.consultant_email,
          skillName:       b.skill_name ?? 'Expertise',
          slotDate:        b.slot_date,
          slotTime:        b.slot_time.slice(0, 5),
          amountHt:        0,
        })
      }

      // In-app notifications
      const skill    = b.skill_name ?? 'votre mission'
      const dateStr  = new Date(b.slot_date + 'T00:00:00')
        .toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
      const timeStr  = b.slot_time.slice(0, 5)

      await createNotification(
        b.client_id,
        'reminder',
        'Rappel — mission demain',
        `${skill} le ${dateStr} à ${timeStr}.`,
        { booking_id: b.booking_id }
      )

      await createNotification(
        b.consultant_user_id,
        'reminder',
        'Rappel — mission demain',
        `${skill} le ${dateStr} à ${timeStr}.`,
        { booking_id: b.booking_id }
      )

      sent++
    } catch (err) {
      console.error(`[cron/reminders] booking ${b.booking_id}:`, err)
      errors.push(b.booking_id)
    }
  }

  return NextResponse.json({ sent, errors: errors.length ? errors : undefined })
}
