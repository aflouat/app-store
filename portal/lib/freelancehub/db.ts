// lib/freelancehub/db.ts
// SERVER ONLY — ne jamais importer côté client
import { Pool, PoolClient } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
})

pool.on('error', (err) => {
  console.error('[db] Unexpected idle client error:', err)
})

export async function query<T = unknown>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  const client = await pool.connect()
  try {
    const result = await client.query(sql, params)
    return result.rows as T[]
  } finally {
    client.release()
  }
}

export async function queryOne<T = unknown>(
  sql: string,
  params?: unknown[]
): Promise<T | null> {
  const rows = await query<T>(sql, params)
  return rows[0] ?? null
}

// Transaction helper — the callback receives a connected client
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function queryTx<T = unknown>(
  client: PoolClient,
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  const result = await client.query(sql, params)
  return result.rows as T[]
}

export async function queryOneTx<T = unknown>(
  client: PoolClient,
  sql: string,
  params?: unknown[]
): Promise<T | null> {
  const rows = await queryTx<T>(client, sql, params)
  return rows[0] ?? null
}
