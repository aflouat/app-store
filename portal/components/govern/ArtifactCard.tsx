import Link from 'next/link'
import { StatusBadge } from './StatusBadge'
import { LevelBadge } from './LevelBadge'
import type { Artifact } from '@/lib/govern/types'

export function ArtifactCard({ artifact, showChildren = false }: { artifact: Artifact; showChildren?: boolean }) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <LevelBadge level={artifact.level} />
          <StatusBadge status={artifact.status} />
        </div>
        <span className="text-xs text-gray-500">{artifact.type_label}</span>
      </div>

      <Link href={`/govern/artifacts/${artifact.id}`}>
        <h3 className="font-medium text-gray-900 mb-1 hover:text-blue-600">
          {artifact.title}
        </h3>
      </Link>

      {artifact.description && (
        <p className="text-sm text-gray-600 mb-2 line-clamp-2">
          {artifact.description}
        </p>
      )}

      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>#{artifact.id.slice(-8)}</span>
        {artifact.assignee_name && (
          <span>👤 {artifact.assignee_name}</span>
        )}
      </div>

      {showChildren && artifact.metric_count > 0 && (
        <div className="mt-2 text-xs text-gray-500">
          {artifact.metrics_ok}/{artifact.metric_count} métriques OK
        </div>
      )}
    </div>
  )
}