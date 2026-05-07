import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { query, queryOne } from '@app-store/core-db'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Corps de requête invalide.' }, { status: 400 })

  const { name, email, password, role } = body as Record<string, string>

  if (!email || !password || !role) {
    return NextResponse.json({ error: 'Email, mot de passe et rôle sont requis.' }, { status: 400 })
  }
  if (!['patient', 'doctor'].includes(role)) {
    return NextResponse.json({ error: 'Rôle invalide.' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Le mot de passe doit comporter au moins 8 caractères.' }, { status: 400 })
  }

  const normalizedEmail = email.toLowerCase().trim()

  const existing = await queryOne('SELECT id FROM sante.users WHERE email = $1', [normalizedEmail])
  if (existing) {
    return NextResponse.json({ error: 'Un compte existe déjà avec cet email.' }, { status: 409 })
  }

  const hash = await bcrypt.hash(password, 12)

  const user = await queryOne<{ id: string }>(
    `INSERT INTO sante.users (email, password_hash, name, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [normalizedEmail, hash, name?.trim() || null, role]
  )

  if (!user) {
    return NextResponse.json({ error: 'Erreur lors de la création du compte.' }, { status: 500 })
  }

  if (role === 'patient') {
    await query('INSERT INTO sante.patients (user_id) VALUES ($1)', [user.id])
  } else if (role === 'doctor') {
    await query('INSERT INTO sante.doctors (user_id) VALUES ($1)', [user.id])
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}
