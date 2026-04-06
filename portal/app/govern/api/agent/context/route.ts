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