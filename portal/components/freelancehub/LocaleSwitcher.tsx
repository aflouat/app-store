'use client'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { setLocale } from '@/lib/freelancehub/setLocale'

export default function LocaleSwitcher() {
  const locale = useLocale()
  const router = useRouter()

  async function switchTo(next: 'fr' | 'en') {
    await setLocale(next)
    router.refresh()
  }

  return (
    <div style={{ display: 'flex', gap: '.25rem' }}>
      {(['fr', 'en'] as const).map(l => (
        <button
          key={l}
          onClick={() => switchTo(l)}
          disabled={locale === l}
          style={{
            padding: '.18rem .52rem',
            fontSize: '.73rem',
            fontWeight: locale === l ? 700 : 400,
            background: locale === l ? 'var(--c1)' : 'transparent',
            color: locale === l ? '#fff' : 'var(--text-mid)',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            cursor: locale === l ? 'default' : 'pointer',
            textTransform: 'uppercase',
          }}
        >
          {l}
        </button>
      ))}
    </div>
  )
}
