import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { queryOne } from '@/lib/freelancehub/db'
import { sendWelcomeConsultant } from '@/lib/freelancehub/email'

// POST /api/freelancehub/auth/register
// Body: { name, email, password, role: 'consultant' | 'client' }
export async function POST(req: NextRequest) {
  const { name, email, password, role, cgu_accepted, marketing_consent, ref } = await req.json()

  if (!email || !password || !role) {
    return NextResponse.json({ error: 'Champs obligatoires manquants.' }, { status: 400 })
  }
  if (!cgu_accepted) {
    return NextResponse.json({ error: 'L\'acceptation des CGU est obligatoire.' }, { status: 400 })
  }
  if (!['consultant', 'client'].includes(role)) {
    return NextResponse.json({ error: 'Rôle invalide.' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Le mot de passe doit contenir au moins 8 caractères.' }, { status: 400 })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Adresse email invalide.' }, { status: 400 })
  }

  // Check email uniqueness
  const existing = await queryOne<{ id: string }>(
    `SELECT id FROM freelancehub.users WHERE email = $1`,
    [email.toLowerCase().trim()]
  )
  if (existing) {
    return NextResponse.json({ error: 'Un compte existe déjà avec cet email.' }, { status: 409 })
  }

  const hash = await bcrypt.hash(password, 12)

  const user = await queryOne<{ id: string; email: string; role: string }>(
    `INSERT INTO freelancehub.users (email, name, role, password_hash, marketing_consent, marketing_consent_at)
     VALUES ($1, $2, $3, $4, $5, CASE WHEN $5 THEN NOW() ELSE NULL END)
     RETURNING id, email, role`,
    [email.toLowerCase().trim(), name?.trim() || null, role, hash, !!marketing_consent]
  )

  if (!user) {
    return NextResponse.json({ error: 'Erreur lors de la création du compte.' }, { status: 500 })
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
  const ua = req.headers.get('user-agent') ?? null
  await queryOne(
    `INSERT INTO freelancehub.signatures (user_id, document_type, document_version, ip_address, user_agent, provider)
     VALUES ($1, 'CGU', '1.0', $2, $3, 'checkbox')`,
    [user.id, ip, ua]
  )

  // Referral: validate ref UUID format before hitting the DB
  if (ref && typeof ref === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ref)) {
    const referrer = await queryOne<{ id: string }>(
      `SELECT id FROM freelancehub.users WHERE id = $1`,
      [ref]
    )
    if (referrer && referrer.id !== user.id) {
      await queryOne(
        `UPDATE freelancehub.users
         SET referrer_id = $1, referrer_commission_until = NOW() + INTERVAL '3 months'
         WHERE id = $2`,
        [ref, user.id]
      )
    }
  }

  if (role === 'consultant') {
    sendWelcomeConsultant(user.email, name?.trim() || '').catch(() => null)
  }

  return NextResponse.json({ success: true, role: user.role }, { status: 201 })
}
