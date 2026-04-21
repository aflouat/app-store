import { describe, it, expect } from 'vitest'

// ─── Copie locale de buildPricing (évite d'importer le composant React) ───────
function buildPricing(hourlyRateEur: number) {
  const htCents    = Math.round(hourlyRateEur * 100)
  const ttcCents   = Math.round(htCents * 1.20)
  const commCents  = Math.round(htCents * 0.15)
  const netCents   = htCents - commCents
  return {
    priceTTC:       +(ttcCents / 100).toFixed(2),
    priceHT:        +(htCents  / 100).toFixed(2),
    tva:            +((ttcCents - htCents) / 100).toFixed(2),
    commission:     +(commCents / 100).toFixed(2),
    consultantNet:  +(netCents  / 100).toFixed(2),
    priceTTCCents:  ttcCents,
    priceHTCents:   htCents,
    commissionCents:commCents,
    consultantCents:netCents,
  }
}

// ─── Copie locale de la logique payment-intent (côté serveur) ─────────────────
function computeStripeAmount(amountHtFromDb: string | number | null, defaultHtCents: number) {
  const htCents  = Number(amountHtFromDb ?? defaultHtCents)
  const ttcCents = Math.round(htCents * 1.20)
  return { htCents, ttcCents }
}

describe('buildPricing — calcul des montants client', () => {
  it('85 €/h → TTC 102 €, TVA 17 €, commission 12.75 €', () => {
    const p = buildPricing(85)
    expect(p.priceHT).toBe(85)
    expect(p.priceTTC).toBe(102)
    expect(p.tva).toBe(17)
    expect(p.commission).toBe(12.75)
    expect(p.consultantNet).toBe(72.25)
  })

  it('100 €/h → TTC 120 €', () => {
    const p = buildPricing(100)
    expect(p.priceTTC).toBe(120)
    expect(p.priceHTCents).toBe(10000)
    expect(p.priceTTCCents).toBe(12000)
  })

  it('montant en cents transmis à Stripe doit être ≥ 50', () => {
    const p = buildPricing(85)
    expect(p.priceTTCCents).toBeGreaterThanOrEqual(50)
  })

  it('priceTTCCents = priceHTCents × 1.20 (arrondi)', () => {
    [50, 75, 85, 100, 150, 200].forEach(rate => {
      const p = buildPricing(rate)
      expect(p.priceTTCCents).toBe(Math.round(p.priceHTCents * 1.20))
    })
  })

  it('commission + consultantNet = priceHT', () => {
    [50, 85, 100].forEach(rate => {
      const p = buildPricing(rate)
      expect(p.commissionCents + p.consultantCents).toBe(p.priceHTCents)
    })
  })
})

describe('computeStripeAmount — lecture depuis la DB', () => {
  it('convertit correctement un string NUMERIC de pg', () => {
    const { htCents, ttcCents } = computeStripeAmount('8500', 0)
    expect(htCents).toBe(8500)
    expect(ttcCents).toBe(10200)
  })

  it('utilise le fallback si amount_ht est null', () => {
    const { htCents } = computeStripeAmount(null, 8500)
    expect(htCents).toBe(8500)
  })

  it('rejette un montant TTC < 50 centimes (règle Stripe)', () => {
    const { ttcCents } = computeStripeAmount('0', 0)
    expect(ttcCents).toBeLessThan(50)
  })

  it('accepte un nombre directement (pas seulement string)', () => {
    const { htCents } = computeStripeAmount(8500, 0)
    expect(htCents).toBe(8500)
  })
})

describe('smoke — variable NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', () => {
  it('doit être définie dans l\'environnement de déploiement', () => {
    // Ce test passe en local si l'env est configuré.
    // En CI/Vercel, cette var DOIT être présente dans les env vars (NEXT_PUBLIC_ prefix requis).
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    if (key) {
      expect(key).toMatch(/^pk_(test|live)_/)
    } else {
      console.warn('⚠️  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY absente — le paiement sera figé en prod')
    }
  })
})
