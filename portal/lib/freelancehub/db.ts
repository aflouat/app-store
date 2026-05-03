// lib/freelancehub/db.ts
// SERVER ONLY — ne jamais importer côté client
import { Client } from 'pg'

// Interface minimale compatible pg Client et pglite Transaction
export type DbClient = {
  query(sql: string, params?: unknown[]): Promise<{ rows: unknown[] }>
}

async function withPgClient<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  try {
    return await fn(client)
  } finally {
    await client.end().catch(() => null)
  }
}

export async function query<T = unknown>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
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
