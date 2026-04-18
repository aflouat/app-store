import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { queryOne } from '@/lib/freelancehub/db'
import { createNotification } from '@/lib/freelancehub/notifications'

// PATCH /api/freelancehub/admin/consultants/[id]/kyc
// body: { action: 'validate' | 'reject', notes?: string }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const { action, notes } = await req.json()

  if (!['validate', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Action invalide.' }, { status: 400 })
  }
  if (action === 'reject' && !notes?.trim()) {
    return NextResponse.json({ error: 'Une raison de refus est obligatoire.' }, { status: 400 })
  }

  const consultant = await queryOne<{ id: string; user_id: string; kyc_status: string }>(
    `SELECT id, user_id, kyc_status FROM freelancehub.consultants WHERE id = $1`,
    [id]
  )
  if (!consultant) {
    return NextResponse.json({ error: 'Consultant introuvable.' }, { status: 404 })
  }
  if (consultant.kyc_status !== 'submitted') {
    return NextResponse.json({ error: 'Aucun document KYC en attente de validation.' }, { status: 409 })
  }

  if (action === 'validate') {
    await queryOne(
      `UPDATE freelancehub.consultants
       SET kyc_status = 'validated', is_verified = TRUE, kyc_validated_at = NOW(), kyc_notes = NULL
       WHERE id = $1`,
      [id]
    )
    await createNotification(
      consultant.user_id,
      'kyc_validated',
      'KYC validé — profil activé',
      'Votre dossier KYC a été validé. Votre profil est maintenant actif et visible dans les résultats.'
    )
  } else {
    await queryOne(
      `UPDATE freelancehub.consultants
       SET kyc_status = 'rejected', is_verified = FALSE, kyc_notes = $1
       WHERE id = $2`,
      [notes.trim(), id]
    )
    await createNotification(
      consultant.user_id,
      'kyc_rejected',
      'KYC refusé — action requise',
      `Votre dossier KYC a été refusé. Motif : ${notes.trim()}. Veuillez soumettre un nouveau document.`
    )
  }

  return NextResponse.json({ success: true, action })
}
