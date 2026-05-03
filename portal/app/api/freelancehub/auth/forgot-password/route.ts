import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { queryOne } from '@/lib/freelancehub/db'
import { sendPasswordReset } from '@/lib/freelancehub/email'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email requis.' }, { status: 400 })
    }

    const normalized = email.toLowerCase().trim()

    const user = await queryOne<{ id: string; email: string; name: string | null }>(
      `SELECT id, email, name FROM freelancehub.users WHERE email = $1 AND is_active = true`,
      [normalized]
    )

    // Always return 200 — anti-enumeration (never reveal if email exists)
    if (user) {
      const token   = randomBytes(32).toString('hex')
      const expires = new Date(Date.now() + 60 * 60 * 1000) // 1h

      await queryOne(
        `UPDATE freelancehub.users
         SET password_reset_token = $1, password_reset_expires_at = $2
         WHERE id = $3`,
        [token, expires.toISOString(), user.id]
      )

      const maskedEmail = normalized.replace(/(?<=.{2}).(?=.*@)/g, '*')
      try {
        await sendPasswordReset(user.email, token)
        console.log('[forgot-password] email sent for:', maskedEmail)
      } catch (err: unknown) {
        console.error('[forgot-password] sendPasswordReset failed', { email: maskedEmail, err: String(err) })
      }
    } else {
      console.log('[forgot-password] no active user found for request')
    }

    return NextResponse.json({ message: 'Si un compte existe, un email a été envoyé.' })
  } catch (err) {
    console.error('[forgot-password] error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
