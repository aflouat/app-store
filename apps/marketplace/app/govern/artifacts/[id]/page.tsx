export const dynamic = 'force-dynamic'

import { getArtifactById, getArtifactChildren, getMetrics, getLogs } from '@/lib/govern/queries'
import { StatusBadge } from '@/components/govern/StatusBadge'
import { LevelBadge } from '@/components/govern/LevelBadge'
import { ArtifactCard } from '@/components/govern/ArtifactCard'
import { BusinessValueBadge } from '@/components/govern/BusinessValueBadge'
import { ArtifactForm } from '@/components/govern/ArtifactForm'
import { LogEntry } from '@/components/govern/LogEntry'
import { MetricRow } from '@/components/govern/MetricRow'

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
      {/* En-tête */}
      <div>
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <LevelBadge level={artifact.level} />
          <StatusBadge status={artifact.status} />
          <span className="text-xs text-gray-400">{artifact.type_label}</span>
          {artifact.business_value !== null && artifact.business_value !== undefined && (
            <BusinessValueBadge value={artifact.business_value} valueType={artifact.value_type} />
          )}
        </div>
        <h1 className="text-2xl font-medium">{artifact.title}</h1>
        {artifact.parent_title && (
          <p className="text-sm text-gray-400 mt-1">↑ {artifact.parent_title}</p>
        )}
        {artifact.description && (
          <p className="text-gray-600 mt-2">{artifact.description}</p>
        )}
        {artifact.value_note && (
          <p className="text-xs text-gray-400 mt-1 italic">💡 {artifact.value_note}</p>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Colonne principale */}
        <div className="md:col-span-2 space-y-6">
          {/* Sous-artefacts */}
          {children.length > 0 && (
            <div>
              <h2 className="text-lg font-medium mb-4">Sous-artefacts ({children.length})</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {children.map(child => (
                  <ArtifactCard key={child.id} artifact={child} />
                ))}
              </div>
            </div>
          )}

          {/* Métriques */}
          {metrics.length > 0 && (
            <div>
              <h2 className="text-lg font-medium mb-3">KPIs ({metrics.length})</h2>
              <div className="space-y-2">
                {metrics.map(m => <MetricRow key={m.id} metric={m} />)}
              </div>
            </div>
          )}

          {/* Historique */}
          {logs.length > 0 && (
            <div>
              <h2 className="text-lg font-medium mb-3">Historique récent</h2>
              <div className="space-y-1">
                {logs.map(log => <LogEntry key={log.id} log={log} />)}
              </div>
            </div>
          )}
        </div>

        {/* Panneau d'édition */}
        <div className="border border-gray-200 rounded-lg p-4 h-fit">
          <h2 className="text-sm font-medium text-gray-700 mb-3">Mettre à jour</h2>
          <ArtifactForm
            artifactId={artifact.id}
            typeSlug={artifact.type_slug}
            initialStatus={artifact.status}
            initialBusinessValue={artifact.business_value}
            initialValueType={artifact.value_type}
            initialValueNote={artifact.value_note ?? ''}
          />
        </div>
      </div>
    </div>
  )
}