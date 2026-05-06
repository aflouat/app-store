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