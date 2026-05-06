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