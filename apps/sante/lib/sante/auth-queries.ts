// SERVER ONLY
import { queryOne } from '@app-store/core-db'
import type { SanteUser } from './types'

export async function getUserByEmail(email: string): Promise<SanteUser | null> {
  return queryOne<SanteUser>(
    `SELECT id, email, name, role, is_active, created_at
       FROM sante.users WHERE email = $1`,
    [email.toLowerCase()]
  )
}

export async function getUserWithPasswordHash(
  email: string
): Promise<(SanteUser & { password_hash: string }) | null> {
  return queryOne<SanteUser & { password_hash: string }>(
    `SELECT id, email, name, role, password_hash, is_active, created_at
       FROM sante.users WHERE email = $1`,
    [email.toLowerCase()]
  )
}

export async function getUserById(id: string): Promise<SanteUser | null> {
  return queryOne<SanteUser>(
    `SELECT id, email, name, role, is_active, created_at
       FROM sante.users WHERE id = $1`,
    [id]
  )
}
