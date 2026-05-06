'use client'
// Re-export from shared core — backward-compatible shim
// New apps should import from '@app-store/core-analytics' directly

declare global {
  interface Window {
    dataLayer: Record<string, unknown>[]
    umami?: { track: (event: string, data?: unknown) => void }
  }
}

export function trackEvent(event: string, params?: Record<string, unknown>) {
  if (typeof window === 'undefined') return

  window.dataLayer = window.dataLayer ?? []
  window.dataLayer.push({ event, ...params })

  if (window.umami) {
    window.umami.track(event, params)
  }
}
