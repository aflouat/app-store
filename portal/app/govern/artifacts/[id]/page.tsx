export const dynamic = 'force-dynamic'

import { getArtifactById, getArtifactChildren, getMetrics, getLogs } from '@/lib/govern/queries'
import { StatusBadge } from '@/components/govern/StatusBadge'
import { LevelBadge } from '@/components/govern/LevelBadge'
import { ArtifactCard } from '@/components/govern/ArtifactCard'

export default async function ArtifactDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const [artifact, children, metrics, logs] = await Promise.all([
    getArtifactById(params.id),
    getArtifactChildren(params.id),
    getMetrics(params.id),
    getLogs(params.id, 10),
  ])

  if (!artifact) {
    return <div>Artefact non trouvé</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <LevelBadge level={artifact.level} />
          <StatusBadge status={artifact.status} />
        </div>
        <h1 className="text-2xl font-medium">{artifact.title}</h1>
        {artifact.description && (
          <p className="text-gray-600 mt-2">{artifact.description}</p>
        )}
      </div>

      {children.length > 0 && (
        <div>
          <h2 className="text-lg font-medium mb-4">Sous-artefacts</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {children.map(child => (
              <ArtifactCard key={child.id} artifact={child} />
            ))}
          </div>
        </div>
      )}

      {logs.length > 0 && (
        <div>
          <h2 className="text-lg font-medium mb-4">Historique récent</h2>
          <div className="space-y-2">
            {logs.map(log => (
              <div key={log.id} className="text-sm text-gray-600">
                {log.logged_at} — {log.action} par {log.actor_name ?? 'Système'}
                {log.note && ` : ${log.note}`}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}