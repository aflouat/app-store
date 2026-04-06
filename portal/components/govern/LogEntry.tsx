import type { ExecutionLog } from '@/lib/govern/types'

export function LogEntry({ log }: { log: ExecutionLog }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-100">
      <div className="w-2 h-2 rounded-full bg-gray-300 mt-2 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-gray-900">
            {log.actor_name ?? 'Système'}
          </span>
          <span className="text-xs text-gray-500">
            {new Date(log.logged_at).toLocaleString('fr-FR')}
          </span>
        </div>
        <p className="text-sm text-gray-700">{log.action}</p>
        {log.note && (
          <p className="text-xs text-gray-500 mt-1">{log.note}</p>
        )}
      </div>
    </div>
  )
}