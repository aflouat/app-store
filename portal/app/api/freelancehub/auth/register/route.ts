import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { queryOne } from '@/lib/freelancehub/db'

// POST /api/freelancehub/auth/register
// Body: { name, email, password, role: 'consultant' | 'client' }
export async function POST(req: NextRequest) {
  const { name, email, password, role } = await req.json()

  if (!email || !password || !role) {
    return NextResponse.json({ error: 'Champs obligatoires manquants.' }, { status: 400 })
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
    `INSERT INTO freelancehub.users (email, name, role, password_hash)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, role`,
    [email.toLowerCase().trim(), name?.trim() || null, role, hash]
  )

  if (!user) {
    return NextResponse.json({ error: 'Erreur lors de la création du compte.' }, { status: 500 })
  }

  return NextResponse.json({ success: true, role: user.role }, { status: 201 })
}
