# GOVERN_SETUP.md — App /govern : interface de gouvernance Perform-Learn

> **Session Claude Code** — Module gouvernance UI
> **Repo** : portail Perform-Learn existant (Next.js App Router)
> **Sous-dossier cible** : `app/govern/`
> **Règle absolue** : chaque fichier créé correspond à un artefact en BDD. Tracer chaque étape dans `governance.execution_logs`.

---

## Vision du produit

`/govern` est l'interface entre les **priorités business** (roadmap, epics, user stories) et le **code qui s'exécute sur une machine** (tâches, commits, tests). Elle est utilisable par :

- **Un humain** (Abdel) : naviguer la roadmap, changer les statuts, créer des artefacts, lire les logs
- **Un agent IA** (Claude Code) : récupérer son contexte d'onboarding, lire ses tâches assignées, générer un `TASK.md` prêt à l'emploi, tracer ses actions

C'est le cockpit de pilotage Lean Startup — pas un outil de gestion de projet générique.

---

## Structure de fichiers à créer

```
app/
└── govern/
    ├── layout.tsx                        # Layout avec sidebar de navigation
    ├── page.tsx                          # Dashboard principal (redirect → /govern/roadmap)
    ├── roadmap/
    │   └── page.tsx                      # Vue roadmap : cycles → epics drill-down
    ├── artifacts/
    │   ├── page.tsx                      # Liste filtrée de tous les artefacts
    │   └── [id]/
    │       └── page.tsx                  # Détail artefact : édition, tâches, logs
    ├── agent/
    │   └── page.tsx                      # Vue agent : contexte onboarding + TASK.md
    ├── logs/
    │   └── page.tsx                      # Feed audit trail complet
    └── api/
        ├── artifacts/
        │   └── route.ts                  # GET (liste/filtre) · POST (créer)
        ├── artifacts/[id]/
        │   └── route.ts                  # GET (détail) · PATCH (statut, champs)
        ├── metrics/
        │   └── route.ts                  # GET · PATCH
        ├── logs/
        │   └── route.ts                  # GET · POST
        └── agent/
            └── context/
                └── route.ts              # GET contexte onboarding · POST générer TASK.md

lib/
└── govern/
    ├── db.ts                             # Pool pg — connexion PostgreSQL VPS
    ├── queries.ts                        # Requêtes SQL nommées (pas d'ORM)
    └── types.ts                          # Types TypeScript alignés sur le schéma BDD

components/govern/
    ├── ArtifactCard.tsx                  # Card artefact avec badge niveau + statut
    ├── ArtifactForm.tsx                  # Formulaire création/édition
    ├── StatusBadge.tsx                   # Badge coloré par statut
    ├── LevelBadge.tsx                    # Badge strategic / tactical / operational
    ├── LogEntry.tsx                      # Entrée de log avec acteur (human/agent)
    ├── MetricRow.tsx                     # Ligne KPI avec statut visuel
    ├── TaskMdPreview.tsx                 # Preview du TASK.md généré
    └── GovernSidebar.tsx                 # Sidebar de navigation /govern
```

---

## Étape 0 — Seed BDD des artefacts /govern

Avant tout code, insérer les artefacts dans `governance.artifacts` :

```sql
-- Epic parent
INSERT INTO governance.artifacts (
    id, project_id, parent_id, type_slug, title, description,
    status, priority, assignee_id, sort_order, tags, created_by
) VALUES (
    'ep000000-gov0-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    (SELECT id FROM governance.artifacts WHERE type_slug = 'roadmap_cycle'
     AND title ILIKE '%Cycle 2%' LIMIT 1),
    'epic',
    'App /govern — Interface de gouvernance',
    'Dashboard cockpit reliant priorités business et exécution code. Utilisable par humain et agent IA.',
    'in_progress', 1,
    '00000000-0000-0000-0000-000000000001',
    40,
    ARRAY['govern', 'dashboard', 'agent', 'cycle-2'],
    '00000000-0000-0000-0000-000000000001'
);

-- User Stories
INSERT INTO governance.artifacts (id, project_id, parent_id, type_slug, title, status, priority, assignee_id, sort_order, tags, created_by) VALUES
('us000000-gov0-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'ep000000-gov0-0000-0000-000000000001',
 'user_story', 'Vue roadmap drill-down (cycles → epics → stories → tâches)', 'ready', 1, '00000000-0000-0000-0000-000000000002', 10, ARRAY['roadmap','navigation'], '00000000-0000-0000-0000-000000000001'),
('us000000-gov0-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'ep000000-gov0-0000-0000-000000000001',
 'user_story', 'Détail artefact — édition statut, champs, tâches enfants', 'ready', 1, '00000000-0000-0000-0000-000000000002', 20, ARRAY['artifact','edit'], '00000000-0000-0000-0000-000000000001'),
('us000000-gov0-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'ep000000-gov0-0000-0000-000000000001',
 'user_story', 'Vue agent — contexte onboarding + génération TASK.md', 'ready', 1, '00000000-0000-0000-0000-000000000002', 30, ARRAY['agent','taskmd'], '00000000-0000-0000-0000-000000000001'),
('us000000-gov0-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'ep000000-gov0-0000-0000-000000000001',
 'user_story', 'Feed audit trail — logs humain et agent en temps réel', 'ready', 2, '00000000-0000-0000-0000-000000000002', 40, ARRAY['logs','audit'], '00000000-0000-0000-0000-000000000001');

INSERT INTO governance.execution_logs (artifact_id, actor_id, actor_type, action, new_value, note)
VALUES ('ep000000-gov0-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'human',
        'created', '{"status":"in_progress"}', 'Epic /govern créé — scaffolding Claude Code démarré');
```

---

## Étape 1 — Connexion PostgreSQL (`lib/govern/db.ts`)

```typescript
// lib/govern/db.ts
// SERVER ONLY — ne jamais importer côté client
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
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
```

Variable d'environnement requise (serveur uniquement, jamais `NEXT_PUBLIC_`) :
```
DATABASE_URL=postgresql://<user>:<password>@<vps-host>:5432/<dbname>
```

Ajouter dans `.env.local` et documenter dans `.env.example`.

---

## Étape 2 — Types TypeScript (`lib/govern/types.ts`)

```typescript
// lib/govern/types.ts

export type ArtifactLevel = 'strategic' | 'tactical' | 'operational'
export type ArtifactStatus = 'draft' | 'ready' | 'in_progress' | 'done' | 'cancelled' | 'blocked'
export type ActorType = 'human' | 'agent'
export type MetricStatus = 'pending' | 'on_track' | 'at_risk' | 'achieved' | 'missed'

export interface Artifact {
  id: string
  project_id: string
  parent_id: string | null
  type_slug: string
  type_label: string
  level: ArtifactLevel
  title: string
  description: string | null
  body: string | null
  status: ArtifactStatus
  priority: 1 | 2 | 3 | 4
  assignee_id: string | null
  assignee_name: string | null
  assignee_type: ActorType | null
  due_date: string | null
  sort_order: number
  tags: string[]
  metadata: Record<string, unknown>
  parent_title: string | null
  parent_type: string | null
  project_name: string
  metric_count: number
  metrics_ok: number
  last_action: string | null
  last_action_at: string | null
  created_at: string
  updated_at: string
}

export interface Metric {
  id: string
  artifact_id: string
  name: string
  description: string | null
  target: number | null
  actual: number | null
  unit: string | null
  status: MetricStatus
  measured_at: string | null
}

export interface ExecutionLog {
  id: string
  artifact_id: string
  actor_id: string | null
  actor_type: ActorType
  actor_name: string | null
  action: string
  previous_value: unknown
  new_value: unknown
  note: string | null
  logged_at: string
}

export interface ArtifactType {
  slug: string
  level: ArtifactLevel
  label: string
  description: string | null
  icon: string | null
}
```

---

## Étape 3 — Requêtes SQL (`lib/govern/queries.ts`)

```typescript
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
      sort_order
  `, statuses?.length ? [projectSlug, statuses] : [projectSlug])

// Arbre d'un artefact : enfants directs
export const getArtifactChildren = (parentId: string) =>
  query<Artifact>(`
    SELECT * FROM governance.v_artifact_context
    WHERE parent_id = $1
    ORDER BY sort_order
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
```

---

## Étape 4 — Routes API

### `app/govern/api/artifacts/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getArtifactContext, createArtifact, insertLog } from '@/lib/govern/queries'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const project = searchParams.get('project') ?? 'perform-learn'
  const statuses = searchParams.getAll('status')
  const artifacts = await getArtifactContext(project, statuses.length ? statuses : undefined)
  return NextResponse.json(artifacts)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const artifact = await createArtifact(body)
  if (!artifact) return NextResponse.json({ error: 'Création échouée' }, { status: 500 })
  await insertLog({ artifact_id: artifact.id, actor_id: body.created_by, action: 'created', new_value: { title: body.title } })
  return NextResponse.json(artifact, { status: 201 })
}
```

### `app/govern/api/artifacts/[id]/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getArtifactById, getArtifactChildren, updateArtifactStatus } from '@/lib/govern/queries'
import { query } from '@/lib/govern/db'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const [artifact, children] = await Promise.all([
    getArtifactById(params.id),
    getArtifactChildren(params.id),
  ])
  if (!artifact) return NextResponse.json({ error: 'Non trouvé' }, { status: 404 })
  return NextResponse.json({ artifact, children })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const { status, actor_id, note, ...fields } = body

  if (status) {
    await updateArtifactStatus(params.id, status, actor_id, note)
  }

  const updatable = ['title', 'description', 'body', 'priority', 'due_date', 'tags', 'metadata', 'assignee_id']
  const toUpdate = Object.entries(fields).filter(([k]) => updatable.includes(k))
  if (toUpdate.length) {
    const sets = toUpdate.map(([k], i) => `${k} = $${i + 2}`).join(', ')
    const vals = toUpdate.map(([, v]) => v)
    await query(`UPDATE governance.artifacts SET ${sets}, updated_at = NOW() WHERE id = $1`, [params.id, ...vals])
  }

  return NextResponse.json({ success: true })
}
```

### `app/govern/api/logs/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getLogs, insertLog } from '@/lib/govern/queries'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const artifactId = searchParams.get('artifact_id') ?? undefined
  const limit = parseInt(searchParams.get('limit') ?? '50')
  const logs = await getLogs(artifactId, limit)
  return NextResponse.json(logs)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  await insertLog(body)
  return NextResponse.json({ success: true }, { status: 201 })
}
```

### `app/govern/api/agent/context/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getArtifactContext, getLogs } from '@/lib/govern/queries'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const project = searchParams.get('project') ?? 'perform-learn'

  const [active, logs] = await Promise.all([
    getArtifactContext(project, ['in_progress', 'ready', 'blocked']),
    getLogs(undefined, 20),
  ])

  return NextResponse.json({ active_artifacts: active, recent_logs: logs })
}

export async function POST(req: NextRequest) {
  // Génère un TASK.md pour les tâches assignées à l'agent
  const { artifact_ids, actor_id } = await req.json()
  const { getArtifactById, getMetrics } = await import('@/lib/govern/queries')

  const artifacts = await Promise.all(artifact_ids.map((id: string) => getArtifactById(id)))
  const valid = artifacts.filter(Boolean)

  const lines: string[] = [
    `# TASK.md — Contexte agent généré automatiquement`,
    `> Généré le ${new Date().toISOString()}`,
    `> Actor ID : ${actor_id}`,
    '',
    '## Artefacts assignés',
    '',
  ]

  for (const a of valid) {
    if (!a) continue
    lines.push(`### [${a.level.toUpperCase()}] ${a.title}`)
    lines.push(`- **ID** : \`${a.id}\``)
    lines.push(`- **Type** : ${a.type_label}`)
    lines.push(`- **Statut** : ${a.status}`)
    lines.push(`- **Parent** : ${a.parent_title ?? '—'}`)
    if (a.description) lines.push(`- **Description** : ${a.description}`)
    if (a.body) lines.push(`\n${a.body}`)
    lines.push('')
    lines.push('```sql')
    lines.push(`UPDATE governance.artifacts SET status = 'in_progress', updated_at = NOW() WHERE id = '${a.id}';`)
    lines.push(`INSERT INTO governance.execution_logs (artifact_id, actor_id, actor_type, action, new_value, note)`)
    lines.push(`VALUES ('${a.id}', '${actor_id}', 'agent', 'status_changed', '{"status":"in_progress"}', 'Démarrage agent');`)
    lines.push('```')
    lines.push('')
  }

  return NextResponse.json({ taskmd: lines.join('\n') })
}
```

---

## Étape 5 — Pages front

### `app/govern/layout.tsx`
```typescript
import { GovernSidebar } from '@/components/govern/GovernSidebar'

export default function GovernLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <GovernSidebar />
      <main className="flex-1 p-6 overflow-auto">
        {children}
      </main>
    </div>
  )
}
```

### `app/govern/roadmap/page.tsx`
```typescript
// Server Component — fetch direct via queries.ts
import { getArtifactContext } from '@/lib/govern/queries'
import { ArtifactCard } from '@/components/govern/ArtifactCard'

export default async function RoadmapPage() {
  const artifacts = await getArtifactContext('perform-learn')
  const cycles = artifacts.filter(a => a.type_slug === 'roadmap_cycle')

  return (
    <div>
      <h1 className="text-xl font-medium mb-6">Roadmap Perform-Learn</h1>
      <div className="flex flex-col gap-4">
        {cycles.map(cycle => (
          <ArtifactCard key={cycle.id} artifact={cycle} showChildren />
        ))}
      </div>
    </div>
  )
}
```

### `app/govern/agent/page.tsx`
```typescript
// Client Component — polling toutes les 30s pour contexte agent
'use client'
import { useEffect, useState } from 'react'
import { TaskMdPreview } from '@/components/govern/TaskMdPreview'

export default function AgentPage() {
  const [context, setContext] = useState<{ active_artifacts: unknown[]; recent_logs: unknown[] } | null>(null)
  const [taskmd, setTaskmd] = useState<string>('')

  useEffect(() => {
    const load = () =>
      fetch('/govern/api/agent/context?project=perform-learn')
        .then(r => r.json())
        .then(setContext)
    load()
    const interval = setInterval(load, 30_000)
    return () => clearInterval(interval)
  }, [])

  const generateTaskMd = async () => {
    if (!context) return
    const agentArtifacts = (context.active_artifacts as { assignee_type: string; id: string }[])
      .filter(a => a.assignee_type === 'agent')
      .map(a => a.id)
    const res = await fetch('/govern/api/agent/context', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        artifact_ids: agentArtifacts,
        actor_id: '00000000-0000-0000-0000-000000000002',
      }),
    })
    const { taskmd } = await res.json()
    setTaskmd(taskmd)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-medium">Contexte agent</h1>
        <button
          onClick={generateTaskMd}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ backgroundColor: '#B9958D' }}
        >
          Générer TASK.md
        </button>
      </div>
      <div className="text-sm text-gray-500">
        {context
          ? `${context.active_artifacts.length} artefacts actifs · ${context.recent_logs.length} logs récents`
          : 'Chargement...'}
      </div>
      {taskmd && <TaskMdPreview content={taskmd} />}
    </div>
  )
}
```

---

## Étape 6 — Composants clés

### `components/govern/StatusBadge.tsx`
```typescript
const colors: Record<string, string> = {
  draft:       'bg-gray-100 text-gray-600',
  ready:       'bg-blue-50 text-blue-700',
  in_progress: 'bg-amber-50 text-amber-700',
  done:        'bg-green-50 text-green-700',
  cancelled:   'bg-gray-100 text-gray-400',
  blocked:     'bg-red-50 text-red-600',
}
const labels: Record<string, string> = {
  draft: 'Brouillon', ready: 'Prêt', in_progress: 'En cours',
  done: 'Terminé', cancelled: 'Annulé', blocked: 'Bloqué',
}
export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${colors[status] ?? 'bg-gray-100 text-gray-500'}`}>
      {labels[status] ?? status}
    </span>
  )
}
```

### `components/govern/LevelBadge.tsx`
```typescript
const config: Record<string, { label: string; className: string }> = {
  strategic:   { label: 'Stratégique',   className: 'bg-purple-50 text-purple-700' },
  tactical:    { label: 'Tactique',      className: 'bg-teal-50 text-teal-700' },
  operational: { label: 'Opérationnel', className: 'bg-amber-50 text-amber-700' },
}
export function LevelBadge({ level }: { level: string }) {
  const c = config[level] ?? { label: level, className: 'bg-gray-100 text-gray-500' }
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${c.className}`}>
      {c.label}
    </span>
  )
}
```

### `components/govern/TaskMdPreview.tsx`
```typescript
'use client'
export function TaskMdPreview({ content }: { content: string }) {
  const copy = () => navigator.clipboard.writeText(content)
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
        <span className="text-xs font-medium text-gray-500">TASK.md généré</span>
        <button onClick={copy} className="text-xs text-gray-400 hover:text-gray-600">
          Copier
        </button>
      </div>
      <pre className="p-4 text-xs overflow-auto max-h-96 whitespace-pre-wrap font-mono text-gray-700">
        {content}
      </pre>
    </div>
  )
}
```

### `components/govern/GovernSidebar.tsx`
```typescript
import Link from 'next/link'

const nav = [
  { href: '/govern/roadmap',   label: 'Roadmap',    icon: '🗺' },
  { href: '/govern/artifacts', label: 'Artefacts',  icon: '📋' },
  { href: '/govern/agent',     label: 'Agent',      icon: '🤖' },
  { href: '/govern/logs',      label: 'Logs',       icon: '📜' },
]

export function GovernSidebar() {
  return (
    <aside className="w-48 border-r border-gray-100 p-4 flex flex-col gap-1">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Gouvernance</p>
      {nav.map(item => (
        <Link
          key={item.href}
          href={item.href}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
        >
          <span style={{ fontSize: 16 }}>{item.icon}</span>
          {item.label}
        </Link>
      ))}
    </aside>
  )
}
```

---

## Étape 7 — Variables d'environnement

Ajouter dans `.env.local` (jamais committé) :
```
DATABASE_URL=postgresql://<user>:<password>@<vps-ip>:5432/<dbname>
```

Documenter dans `.env.example` :
```
# PostgreSQL VPS — schéma governance (SERVER ONLY)
DATABASE_URL=postgresql://user:password@host:5432/dbname
```

Installer le driver pg :
```bash
npm install pg
npm install --save-dev @types/pg
```

---

## Étape 8 — Clôture BDD après implémentation

```sql
-- Passer toutes les US en done après validation
UPDATE governance.artifacts
SET status = 'done', updated_at = NOW()
WHERE id IN (
    'us000000-gov0-0000-0000-000000000001',
    'us000000-gov0-0000-0000-000000000002',
    'us000000-gov0-0000-0000-000000000003',
    'us000000-gov0-0000-0000-000000000004'
);

INSERT INTO governance.execution_logs (artifact_id, actor_id, actor_type, action, new_value, note)
SELECT id, '00000000-0000-0000-0000-000000000002', 'agent',
       'status_changed', '{"status":"done"}',
       'App /govern scaffoldée — layout, routes API, composants, connexion PostgreSQL'
FROM governance.artifacts
WHERE id IN (
    'us000000-gov0-0000-0000-000000000001',
    'us000000-gov0-0000-0000-000000000002',
    'us000000-gov0-0000-0000-000000000003',
    'us000000-gov0-0000-0000-000000000004'
);
```

---

## Checklist de validation

- [ ] `npm install pg @types/pg` exécuté
- [ ] `DATABASE_URL` dans `.env.local`, documenté dans `.env.example`
- [ ] Seed BDD exécuté (1 epic + 4 US + 1 log)
- [ ] `lib/govern/db.ts` — connexion PostgreSQL testée (`query('SELECT 1')`)
- [ ] `GET /govern/api/artifacts` retourne les artefacts du projet
- [ ] `GET /govern/api/agent/context` retourne artefacts actifs + logs récents
- [ ] `POST /govern/api/agent/context` génère un TASK.md valide
- [ ] Page `/govern/roadmap` affiche les cycles
- [ ] Page `/govern/agent` affiche le contexte et le bouton "Générer TASK.md"
- [ ] Page `/govern/logs` affiche le feed d'audit
- [ ] `PATCH /govern/api/artifacts/[id]` change le statut et insère un log automatiquement
- [ ] `DATABASE_URL` absent côté client (pas de `NEXT_PUBLIC_DATABASE_URL`)
