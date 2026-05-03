// lib/freelancehub/db.ts
// SERVER ONLY — ne jamais importer côté client
import { Client } from 'pg'

// Interface minimale compatible pg Client et pglite Transaction
export type DbClient = {
  query(sql: string, params?: unknown[]): Promise<{ rows: unknown[] }>
}

// Détecte le mode dev local : DATABASE_URL est un chemin fichier, pas une URL postgres
const isLocalDev = !((process.env.DATABASE_URL ?? '').startsWith('postgres'))

// ─── pg Client par requête (production serverless) ────────────
// Pas de pool persistant : Vercel gèle la Lambda entre requêtes,
// ce qui rend les connexions périmées côté PgBouncer/Supabase.
// Supabase gère le vrai pool côté serveur (PgBouncer port 6543).
async function withPgClient<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  try {
    return await fn(client)
  } finally {
    await client.end().catch(() => null)
  }
}

// ─── PGlite (dev local) ───────────────────────────────────────
// Utilise 'any' + specifier variable pour empêcher Turbopack de tracer
// ce module au build — pglite n'est jamais chargé en production.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _pglite: any = null

async function getPglite() {
  if (!_pglite) {
    // La concaténation rend le specifier opaque à l'analyse statique de Turbopack/webpack
    const id = '@electric-sql' + '/pglite'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod: any = await import(id)
    _pglite = new mod.PGlite(process.env.DATABASE_URL)
    await _pglite.waitReady
  }
  return _pglite
}

// ─── API publique ─────────────────────────────────────────────

export async function query<T = unknown>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  if (isLocalDev) {
    const db = await getPglite()
    const result = await db.query(sql, params as unknown[]) as { rows: T[] }
    return result.rows
  }
  return withPgClient(async (client) => {
    const result = await client.query(sql, params)
    return result.rows as T[]
  })
}

export async function queryOne<T = unknown>(
  sql: string,
  params?: unknown[]
): Promise<T | null> {
  const rows = await query<T>(sql, params)
  return rows[0] ?? null
}

export async function withTransaction<T>(
  fn: (client: DbClient) => Promise<T>
): Promise<T> {
  if (isLocalDev) {
    const db = await getPglite()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return db.transaction(async (tx: any) => fn(tx as DbClient))
  }
  return withPgClient(async (client) => {
    await client.query('BEGIN')
    try {
      const result = await fn(client as unknown as DbClient)
      await client.query('COMMIT')
      return result
    } catch (err) {
      await client.query('ROLLBACK').catch(() => null)
      throw err
    }
  })
}

export async function queryTx<T = unknown>(
  client: DbClient,
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  const result = await client.query(sql, params)
  return result.rows as T[]
}

export async function queryOneTx<T = unknown>(
  client: DbClient,
  sql: string,
  params?: unknown[]
): Promise<T | null> {
  const rows = await queryTx<T>(client, sql, params)
  return rows[0] ?? null
}
