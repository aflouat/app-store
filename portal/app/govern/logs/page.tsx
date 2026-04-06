// Server Component — feed audit trail
import { getLogs } from '@/lib/govern/queries'
import { LogEntry } from '@/components/govern/LogEntry'

export default async function LogsPage() {
  const logs = await getLogs(undefined, 100)

  return (
    <div>
      <h1 className="text-xl font-medium mb-6">Audit trail complet</h1>
      <div className="space-y-2">
        {logs.map(log => (
          <LogEntry key={log.id} log={log} />
        ))}
      </div>
    </div>
  )
}