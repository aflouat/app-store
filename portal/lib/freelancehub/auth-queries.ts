// lib/freelancehub/auth-queries.ts — SERVER ONLY
import { queryOne } from './db'
import type { FHUser } from './types'

export async function getUserByEmail(email: string): Promise<FHUser | null> {
  return queryOne<FHUser>(
    `SELECT id, email, name, role, avatar_url, is_active, created_at
     FROM freelancehub.users
     WHERE email = $1 AND is_active = true`,
    [email]
  )
}

export async function getUserWithPasswordHash(
  email: string
): Promise<(FHUser & { password_hash: string | null }) | null> {
  return queryOne<FHUser & { password_hash: string | null }>(
    `SELECT id, email, name, role, avatar_url, is_active, created_at, password_hash
     FROM freelancehub.users
     WHERE email = $1 AND is_active = true`,
    [email]
  )
}

export async function getUserById(id: string): Promise<FHUser | null> {
  return queryOne<FHUser>(
    `SELECT id, email, name, role, avatar_url, is_active, created_at
     FROM freelancehub.users
     WHERE id = $1 AND is_active = true`,
    [id]
  )
}
