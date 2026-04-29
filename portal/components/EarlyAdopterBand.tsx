import Link from 'next/link'
import type { EarlyAdopterStats } from '@/lib/api'

interface Props {
  stats: EarlyAdopterStats | null
}

export default function EarlyAdopterBand({ stats }: Props) {
  const remaining = stats?.remaining ?? 20
  const taken = stats?.taken ?? 0
  const total = stats?.total ?? 20
  const isFull = remaining <= 0

  const progressPct = Math.min(100, Math.round((taken / total) * 100))

  return (
    <div style={{
      background: '#fffbeb',
      borderBottom: '2px solid #fde68a',
      padding: '14px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '16px',
      flexWrap: 'wrap',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <span style={{
          background: '#b45309',
          color: '#fff',
          fontSize: '11px',
          fontWeight: 700,
          padding: '3px 8px',
          borderRadius: '4px',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}>
          ★ Fondateur
        </span>
        <div>
          <span style={{ fontWeight: 600, fontSize: '14px', color: '#92400e' }}>
            {isFull ? 'Places épuisées' : `${remaining} place${remaining > 1 ? 's' : ''} restante${remaining > 1 ? 's' : ''} sur ${total}`}
          </span>
          <span style={{ color: '#78716c', fontSize: '13px', marginLeft: '8px' }}>
            — Commission <strong style={{ color: '#b45309' }}>10%</strong> au lieu de 15% + badge Fondateur sur votre profil
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{
            width: '80px',
            height: '6px',
            background: '#fde68a',
            borderRadius: '3px',
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${progressPct}%`,
              height: '100%',
              background: '#b45309',
              borderRadius: '3px',
              transition: 'width 0.3s ease',
            }} />
          </div>
          <span style={{ fontSize: '11px', color: '#92400e' }}>{taken}/{total}</span>
        </div>
      </div>

      {isFull ? (
        <Link
          href="/freelancehub/register"
          style={{
            background: '#78716c',
            color: '#fff',
            padding: '7px 16px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 600,
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          Rejoindre la liste d&apos;attente
        </Link>
      ) : (
        <Link
          href="/freelancehub/register"
          style={{
            background: '#b45309',
            color: '#fff',
            padding: '7px 16px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 600,
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          Devenir Fondateur →
        </Link>
      )}
    </div>
  )
}
