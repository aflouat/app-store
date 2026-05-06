import type { Metric } from '@/lib/govern/types'

const statusConfig: Record<string, { label: string; className: string }> = {
  pending:   { label: 'En attente', className: 'bg-gray-100 text-gray-500' },
  on_track:  { label: 'En bonne voie', className: 'bg-teal-50 text-teal-700' },
  at_risk:   { label: 'À risque', className: 'bg-amber-50 text-amber-700' },
  achieved:  { label: 'Atteint', className: 'bg-green-50 text-green-700' },
  missed:    { label: 'Raté', className: 'bg-red-50 text-red-600' },
}

export function MetricRow({ metric }: { metric: Metric }) {
  const config = statusConfig[metric.status] ?? { label: metric.status, className: 'bg-gray-100 text-gray-500' }
  const progress = metric.target && metric.actual != null
    ? Math.min(100, Math.round((metric.actual / metric.target) * 100))
    : null

  return (
    <div className="flex items-center gap-4 p-3 rounded-lg border border-gray-100">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-gray-900">{metric.name}</span>
          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${config.className}`}>
            {config.label}
          </span>
        </div>
        {metric.description && (
          <p className="text-xs text-gray-500">{metric.description}</p>
        )}
      </div>

      <div className="text-right flex-shrink-0">
        {metric.actual != null && (
          <div className="text-sm font-medium text-gray-900">
            {metric.actual}
            {metric.unit && <span className="text-xs text-gray-500 ml-1">{metric.unit}</span>}
          </div>
        )}
        {metric.target != null && (
          <div className="text-xs text-gray-400">/ {metric.target} {metric.unit}</div>
        )}
      </div>

      {progress !== null && (
        <div className="w-20 flex-shrink-0">
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${progress}%`,
                backgroundColor: progress >= 100 ? '#96AEAA' : progress >= 60 ? '#B9958D' : '#e5e7eb',
              }}
            />
          </div>
          <div className="text-xs text-gray-400 text-right mt-0.5">{progress}%</div>
        </div>
      )}
    </div>
  )
}
