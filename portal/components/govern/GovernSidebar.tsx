import Link from 'next/link'

const nav = [
  { href: '/govern/plan',      label: 'Plan d\'action', icon: '🎯' },
  { href: '/govern/roadmap',   label: 'Roadmap',        icon: '🗺' },
  { href: '/govern/artifacts', label: 'Artefacts',      icon: '📋' },
  { href: '/govern/agent',     label: 'Agent',          icon: '🤖' },
  { href: '/govern/logs',      label: 'Logs',           icon: '📜' },
]

export function GovernSidebar() {
  return (
    <aside className="w-48 border-r border-gray-100 p-4 flex flex-col gap-1">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Gouvernance</p>
      {nav.map(item => (
        <Link
          key={item.href}
          href={item.href}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
        >
          <span style={{ fontSize: 16 }}>{item.icon}</span>
          {item.label}
        </Link>
      ))}
    </aside>
  )
}