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