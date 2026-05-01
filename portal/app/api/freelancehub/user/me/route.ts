import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { queryOne } from '@/lib/freelancehub/db'

// DELETE /api/freelancehub/user/me
// RGPD droit à l'effacement — soft delete consultant/client uniquement
export async function DELETE() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role === 'admin') {
    return NextResponse.json({ error: 'Les comptes admin ne peuvent pas être supprimés via cette route.' }, { status: 403 })
  }

  const userId = session.user.id

  // Block if consultant has active/pending bookings
  const activeBooking = await queryOne<{ id: string }>(
    `SELECT b.id FROM freelancehub.bookings b
     JOIN freelancehub.consultants c ON c.id = b.consultant_id
     WHERE c.user_id = $1 AND b.status IN ('pending','confirmed','in_progress')
     UNION
     SELECT id FROM freelancehub.bookings
     WHERE client_id = $1 AND status IN ('pending','confirmed','in_progress')
     LIMIT 1`,
    [userId]
  )
  if (activeBooking) {
    return NextResponse.json({
      error: 'Impossible de supprimer le compte : des réservations actives sont en cours.',
    }, { status: 409 })
  }

  // Soft delete — anonymise données personnelles
  await queryOne(
    `UPDATE freelancehub.users
     SET email      = 'deleted_' || id || '@anon.local',
         name       = 'Utilisateur supprimé',
         password_hash = NULL,
         deleted_at = NOW()
     WHERE id = $1`,
    [userId]
  )

  return NextResponse.json({ success: true })
}
