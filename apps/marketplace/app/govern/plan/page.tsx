export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { getActionPlan } from '@/lib/govern/queries'
import { StatusBadge } from '@/components/govern/StatusBadge'
import { LevelBadge } from '@/components/govern/LevelBadge'
import { BusinessValueBadge } from '@/components/govern/BusinessValueBadge'
import type { ValueType } from '@/lib/govern/types'

const VALUE_TYPE_LABELS: Record<ValueType, string> = {
  revenue_impact:        '💰 Impact revenu',
  user_acquisition:      '🎯 Acquisition',
  cost_reduction:        '⚡ Réduction coût',
  risk_mitigation:       '🛡 Mitigation risque',
  strategic_positioning: '🗺 Stratégie',
}

export default async function ActionPlanPage() {
  const artifacts = await getActionPlan('perform-learn')

  const withValue    = artifacts.filter(a => a.business_value !== null)
  const withoutValue = artifacts.filter(a => a.business_value === null)

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-xl font-medium mb-1">Plan d&apos;action — Priorisation business</h1>
        <p className="text-sm text-gray-500">
          {withValue.length} artefact{withValue.length > 1 ? 's' : ''} valorisé{withValue.length > 1 ? 's' : ''},
          {withoutValue.length > 0 && ` ${withoutValue.length} sans estimation.`}
          {' '}Triés par valeur business décroissante.
        </p>
      </div>

      {/* Légende */}
      <div className="flex flex-wrap gap-3 text-xs text-gray-500 border border-gray-100 rounded-lg p-3 bg-gray-50">
        <span className="font-medium text-gray-600">Types de valeur :</span>
        {(Object.entries(VALUE_TYPE_LABELS) as [ValueType, string][]).map(([k, v]) => (
          <span key={k}>{v}</span>
        ))}
      </div>

      {/* Tableau principal */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-medium text-gray-600 w-8">#</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Artefact</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Valeur business</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Catégorie</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Statut</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Parent</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Assigné</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {withValue.map((artifact, idx) => (
              <tr
                key={artifact.id}
                className="hover:bg-gray-50 transition-colors"
              >
                <td className="px-4 py-3 text-gray-400 text-xs">{idx + 1}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <LevelBadge level={artifact.level} />
                    <Link
                      href={`/govern/artifacts/${artifact.id}`}
                      className="font-medium text-gray-900 hover:text-[#B9958D] transition-colors"
                    >
                      {artifact.title}
                    </Link>
                  </div>
                  {artifact.value_note && (
                    <p className="text-xs text-gray-400 mt-0.5 ml-14 line-clamp-1 italic">
                      {artifact.value_note}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                  {artifact.type_label}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <BusinessValueBadge
                    value={artifact.business_value!}
                    valueType={artifact.value_type}
                    showScore
                  />
                </td>
                <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                  {artifact.value_type
                    ? VALUE_TYPE_LABELS[artifact.value_type as ValueType]
                    : '—'}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={artifact.status} />
                </td>
                <td className="px-4 py-3 text-xs text-gray-500 max-w-[180px] truncate">
                  {artifact.parent_title ?? '—'}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                  {artifact.assignee_name
                    ? `👤 ${artifact.assignee_name}`
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Artefacts sans valeur estimée */}
      {withoutValue.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-gray-500 mb-2">
            Sans estimation ({withoutValue.length})
          </h2>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {withoutValue.map(a => (
              <Link
                key={a.id}
                href={`/govern/artifacts/${a.id}`}
                className="flex items-center gap-2 border border-dashed border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-500 hover:border-gray-400 transition-colors"
              >
                <LevelBadge level={a.level} />
                <span className="truncate">{a.title}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
