// lib/govern/queries.ts
import { query, queryOne } from './db'
import type { Artifact, Metric, ExecutionLog } from './types'

// Vue complète par projet (onboarding agent)
export const getArtifactContext = (projectSlug: string, statuses?: string[]) =>
  query<Artifact>(`
    SELECT * FROM governance.v_artifact_context
    WHERE project_slug = $1
    ${statuses?.length ? `AND status = ANY($2::text[])` : ''}
    ORDER BY
      CASE level WHEN 'strategic' THEN 1 WHEN 'tactical' THEN 2 ELSE 3 END,
      created_at
  `, statuses?.length ? [projectSlug, statuses] : [projectSlug])

// Arbre d'un artefact : enfants directs
export const getArtifactChildren = (parentId: string) =>
  query<Artifact>(`
    SELECT * FROM governance.v_artifact_context
    WHERE parent_id = $1
    ORDER BY created_at
  `, [parentId])

// Détail unique
export const getArtifactById = (id: string) =>
  queryOne<Artifact>(`
    SELECT * FROM governance.v_artifact_context WHERE id = $1
  `, [id])

// Métriques d'un artefact
export const getMetrics = (artifactId: string) =>
  query<Metric>(`
    SELECT * FROM governance.metrics
    WHERE artifact_id = $1
    ORDER BY created_at
  `, [artifactId])

// Logs récents (globaux ou par artefact)
export const getLogs = (artifactId?: string, limit = 50) =>
  query<ExecutionLog>(`
    SELECT el.*, u.name AS actor_name
    FROM governance.execution_logs el
    LEFT JOIN governance.users u ON u.id = el.actor_id
    ${artifactId ? 'WHERE el.artifact_id = $1' : ''}
    ORDER BY el.logged_at DESC
    LIMIT ${artifactId ? '$2' : '$1'}
  `, artifactId ? [artifactId, limit] : [limit])

// Changer le statut + log automatique
export const updateArtifactStatus = async (
  id: string,
  status: string,
  actorId: string,
  note?: string
) => {
  const current = await queryOne<{ status: string }>(
    'SELECT status FROM governance.artifacts WHERE id = $1', [id]
  )
  await query(
    'UPDATE governance.artifacts SET status = $1, updated_at = NOW() WHERE id = $2',
    [status, id]
  )
  await query(`
    INSERT INTO governance.execution_logs
      (artifact_id, actor_id, actor_type, action, previous_value, new_value, note)
    VALUES ($1, $2,
      (SELECT actor_type FROM governance.users WHERE id = $2),
      'status_changed',
      $3::jsonb, $4::jsonb, $5)
  `, [id, actorId, JSON.stringify({ status: current?.status }), JSON.stringify({ status }), note ?? null])
}

// Créer un artefact
export const createArtifact = (data: {
  project_id: string
  parent_id?: string
  type_slug: string
  title: string
  description?: string
  body?: string
  status?: string
  priority?: number
  assignee_id?: string
  tags?: string[]
  metadata?: Record<string, unknown>
  created_by: string
}) =>
  queryOne<{ id: string }>(`
    INSERT INTO governance.artifacts
      (project_id, parent_id, type_slug, title, description, body,
       status, priority, assignee_id, tags, metadata, created_by)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
    RETURNING id
  `, [
    data.project_id, data.parent_id ?? null, data.type_slug,
    data.title, data.description ?? null, data.body ?? null,
    data.status ?? 'draft', data.priority ?? 2,
    data.assignee_id ?? null,
    data.tags ?? [], JSON.stringify(data.metadata ?? {}),
    data.created_by
  ])

// Insérer un log
export const insertLog = (data: {
  artifact_id: string
  actor_id: string
  action: string
  new_value?: unknown
  note?: string
}) =>
  query(`
    INSERT INTO governance.execution_logs
      (artifact_id, actor_id, actor_type, action, new_value, note)
    VALUES ($1, $2,
      (SELECT actor_type FROM governance.users WHERE id = $2),
      $3, $4::jsonb, $5)
  `, [data.artifact_id, data.actor_id, data.action,
      JSON.stringify(data.new_value ?? {}), data.note ?? null])