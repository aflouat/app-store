'use client'
// CLIENT ONLY — ne jamais importer côté serveur
// Envoie des events à GTM (dataLayer) et Umami simultanément

declare global {
  interface Window {
    dataLayer: Record<string, unknown>[]
    umami?: { track: (event: string, data?: unknown) => void }
  }
}

export function trackEvent(event: string, params?: Record<string, unknown>) {
  if (typeof window === 'undefined') return

  // GTM dataLayer
  window.dataLayer = window.dataLayer ?? []
  window.dataLayer.push({ event, ...params })

  // Umami custom event
  if (window.umami) {
    window.umami.track(event, params)
  }
}
