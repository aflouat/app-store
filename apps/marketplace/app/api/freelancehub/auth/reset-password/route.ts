import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { queryOne } from '@/lib/freelancehub/db'

export async function POST(req: NextRequest) {
  const { token, password } = await req.json()

  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'Token requis.' }, { status: 400 })
  }
  if (!password || typeof password !== 'string' || password.length < 8) {
    return NextResponse.json({ error: 'Le mot de passe doit contenir au moins 8 caractères.' }, { status: 400 })
  }

  const user = await queryOne<{ id: string }>(
    `SELECT id FROM freelancehub.users
     WHERE password_reset_token = $1
       AND password_reset_expires_at > NOW()
       AND is_active = true`,
    [token]
  )

  if (!user) {
    return NextResponse.json({ error: 'Lien invalide ou expiré.' }, { status: 400 })
  }

  const hash = await bcrypt.hash(password, 12)

  await queryOne(
    `UPDATE freelancehub.users
     SET password_hash = $1,
         password_reset_token = NULL,
         password_reset_expires_at = NULL
     WHERE id = $2`,
    [hash, user.id]
  )

  return NextResponse.json({ message: 'Mot de passe mis à jour.' })
}
