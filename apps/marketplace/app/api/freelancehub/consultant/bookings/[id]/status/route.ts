import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { queryOne, query } from '@/lib/freelancehub/db'
import { createNotification } from '@/lib/freelancehub/notifications'

// Transitions autorisées par le consultant
const ALLOWED_TRANSITIONS: Record<string, string> = {
  confirmed:   'in_progress',
  in_progress: 'completed',
}

const STATUS_LABELS: Record<string, string> = {
  in_progress: 'En cours',
  completed:   'Terminée',
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'consultant') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: bookingId } = await params
  const { status: newStatus } = await req.json()

  if (!newStatus) {
    return NextResponse.json({ error: 'Statut manquant.' }, { status: 400 })
  }

  // Récupérer la réservation avec vérification ownership
  const booking = await queryOne<{
    id: string; status: string; client_id: string; consultant_id: string
  }>(
    `SELECT b.id, b.status, b.client_id, b.consultant_id
     FROM freelancehub.bookings b
     JOIN freelancehub.consultants c ON c.id = b.consultant_id
     WHERE b.id = $1 AND c.user_id = $2`,
    [bookingId, session.user.id]
  )

  if (!booking) {
    return NextResponse.json({ error: 'Réservation introuvable.' }, { status: 404 })
  }

  // Vérifier que la transition est autorisée
  const expectedNew = ALLOWED_TRANSITIONS[booking.status]
  if (!expectedNew || expectedNew !== newStatus) {
    return NextResponse.json(
      { error: `Transition ${booking.status} → ${newStatus} non autorisée.` },
      { status: 409 }
    )
  }

  // Appliquer le changement de statut
  await query(
    `UPDATE freelancehub.bookings SET status = $1, updated_at = NOW() WHERE id = $2`,
    [newStatus, bookingId]
  )

  // Notifier le client du changement de statut
  try {
    await createNotification(
      booking.client_id,
      'booking_confirmed',
      `Consultation ${STATUS_LABELS[newStatus] ?? newStatus}`,
      newStatus === 'in_progress'
        ? 'Votre consultant a démarré la consultation.'
        : 'Votre consultation est terminée. Vous pouvez maintenant laisser une évaluation.',
      { booking_id: bookingId }
    )
  } catch (e) { console.error('[consultant/status] notif error:', e) }

  return NextResponse.json({ success: true, status: newStatus })
}
