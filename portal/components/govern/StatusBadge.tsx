const colors: Record<string, string> = {
  draft:       'bg-gray-100 text-gray-600',
  ready:       'bg-blue-50 text-blue-700',
  in_progress: 'bg-amber-50 text-amber-700',
  done:        'bg-green-50 text-green-700',
  cancelled:   'bg-gray-100 text-gray-400',
  blocked:     'bg-red-50 text-red-600',
}
const labels: Record<string, string> = {
  draft: 'Brouillon', ready: 'Prêt', in_progress: 'En cours',
  done: 'Terminé', cancelled: 'Annulé', blocked: 'Bloqué',
}
export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${colors[status] ?? 'bg-gray-100 text-gray-500'}`}>
      {labels[status] ?? status}
    </span>
  )
}