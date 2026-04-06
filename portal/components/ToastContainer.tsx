'use client'
import { Toast } from '@/hooks/useToast'

const COLORS: Record<Toast['type'], { bg: string; text: string; border: string }> = {
  success: { bg: '#eef3f2', text: '#2e5c55', border: '#96AEAA' },
  error:   { bg: '#fdf0ee', text: '#712B13', border: '#B9958D' },
  info:    { bg: '#f7f5f3', text: '#2e2c2a', border: '#AAB1AF' },
}

export function ToastContainer({ toasts }: { toasts: Toast[] }) {
  if (toasts.length === 0) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '1.5rem',
        right: '1.5rem',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
      }}
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map(t => {
        const c = COLORS[t.type]
        return (
          <div
            key={t.id}
            role="status"
            style={{
              backgroundColor: c.bg,
              color: c.text,
              border: `1px solid ${c.border}`,
              borderRadius: '10px',
              padding: '0.65rem 1rem',
              fontSize: '0.875rem',
              fontFamily: 'DM Sans, sans-serif',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              maxWidth: '320px',
              animation: 'fadeInUp 0.2s ease',
            }}
          >
            {t.message}
          </div>
        )
      })}
    </div>
  )
}
