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

export async function upsertOAuthUser({
  email,
  name,
  oauthProvider,
  oauthProviderId,
  avatarUrl,
}: {
  email: string
  name: string
  oauthProvider: string
  oauthProviderId: string
  avatarUrl?: string | null
}): Promise<FHUser> {
  // Existing account: link OAuth. New account: create as consultant.
  const user = await queryOne<FHUser>(
    `INSERT INTO freelancehub.users
       (email, name, role, avatar_url, oauth_provider, oauth_provider_id, is_active)
     VALUES ($1, $2, 'consultant', $3, $4, $5, true)
     ON CONFLICT (email) DO UPDATE SET
       oauth_provider    = EXCLUDED.oauth_provider,
       oauth_provider_id = EXCLUDED.oauth_provider_id,
       avatar_url        = COALESCE(freelancehub.users.avatar_url, EXCLUDED.avatar_url)
     RETURNING id, email, name, role, avatar_url, is_active, created_at`,
    [email, name, avatarUrl ?? null, oauthProvider, oauthProviderId]
  )
  if (!user) throw new Error('upsertOAuthUser: DB returned null')
  return user
}
