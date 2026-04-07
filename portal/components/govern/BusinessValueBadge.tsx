import type { ValueType } from '@/lib/govern/types'

const VALUE_TYPE_LABELS: Record<ValueType, string> = {
  revenue_impact:        'Revenu',
  user_acquisition:      'Acquisition',
  cost_reduction:        'Coût',
  risk_mitigation:       'Risque',
  strategic_positioning: 'Stratégie',
}

function getValueTier(score: number): { label: string; bg: string; text: string } {
  if (score >= 75) return { label: 'Haute',      bg: '#96AEAA', text: '#fff' }
  if (score >= 50) return { label: 'Moyenne',    bg: '#B9958D', text: '#fff' }
  if (score >= 25) return { label: 'Faible',     bg: '#AAB1AF', text: '#fff' }
  return               { label: 'Très faible', bg: '#A3AB9A', text: '#5a5a5a' }
}

interface BusinessValueBadgeProps {
  value: number
  valueType?: ValueType | null
  showScore?: boolean
}

export function BusinessValueBadge({ value, valueType, showScore = true }: BusinessValueBadgeProps) {
  const tier = getValueTier(value)
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
        style={{ backgroundColor: tier.bg, color: tier.text }}
        title={`Valeur business : ${value}/100`}
      >
        {showScore && <span className="font-bold">{value}</span>}
        <span>{tier.label}</span>
      </span>
      {valueType && (
        <span className="text-xs text-gray-400">
          {VALUE_TYPE_LABELS[valueType]}
        </span>
      )}
    </span>
  )
}
