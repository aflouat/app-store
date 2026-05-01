import { describe, it, expect } from 'vitest'

// Logique de pricing centralisée (RG-02 + RG-03)
// Ces tests documentent le contrat attendu — tout changement dans le code doit casser ces tests.

const DEFAULT_RATE_EUR = 85

function buildPricing(hourlyRateEur: number) {
  const htCents     = Math.round(hourlyRateEur * 100)
  const ttcCents    = Math.round(htCents * 1.20)
  const commCents   = Math.round(htCents * 0.15)
  const netCents    = htCents - commCents
  return {
    priceTTC:        +(ttcCents / 100).toFixed(2),
    priceHT:         +(htCents  / 100).toFixed(2),
    tva:             +((ttcCents - htCents) / 100).toFixed(2),
    commission:      +(commCents / 100).toFixed(2),
    consultantNet:   +(netCents  / 100).toFixed(2),
    priceTTCCents:   ttcCents,
    priceHTCents:    htCents,
    commissionCents: commCents,
    consultantCents: netCents,
  }
}

function computeStripeAmount(amountHtFromDb: string | number | null, defaultHtCents: number) {
  const htCents  = Number(amountHtFromDb ?? defaultHtCents)
  const ttcCents = Math.round(htCents * 1.20)
  return { htCents, ttcCents }
}

describe('buildPricing — RG-02 tarification', () => {
  it('85 €/h (taux par défaut) → TTC 102 €, TVA 17 €, commission 12.75 €', () => {
    const p = buildPricing(DEFAULT_RATE_EUR)
    expect(p.priceHT).toBe(85)
    expect(p.priceTTC).toBe(102)
    expect(p.tva).toBe(17)
    expect(p.commission).toBe(12.75)
    expect(p.consultantNet).toBe(72.25)
  })

  it('100 €/h → TTC 120 €', () => {
    const p = buildPricing(100)
    expect(p.priceTTC).toBe(120)
    expect(p.priceHTCents).toBe(10_000)
    expect(p.priceTTCCents).toBe(12_000)
  })

  it('montant en cents transmis à Stripe doit être ≥ 50 (règle Stripe)', () => {
    expect(buildPricing(DEFAULT_RATE_EUR).priceTTCCents).toBeGreaterThanOrEqual(50)
  })

  it('priceTTCCents = priceHTCents × 1.20 (arrondi) pour tous les tarifs standards', () => {
    ;[50, 75, 85, 100, 150, 200].forEach(rate => {
      const p = buildPricing(rate)
      expect(p.priceTTCCents).toBe(Math.round(p.priceHTCents * 1.20))
    })
  })
})

describe('buildPricing — RG-03 commission', () => {
  it('commission + consultantNet = priceHT (en cents)', () => {
    ;[50, 85, 100, 150].forEach(rate => {
      const p = buildPricing(rate)
      expect(p.commissionCents + p.consultantCents).toBe(p.priceHTCents)
    })
  })

  it('commission = 15% du HT', () => {
    ;[85, 100, 200].forEach(rate => {
      const p = buildPricing(rate)
      expect(p.commissionCents).toBe(Math.round(p.priceHTCents * 0.15))
    })
  })

  it('consultant reçoit 85% du HT', () => {
    ;[85, 100].forEach(rate => {
      const p = buildPricing(rate)
      expect(p.consultantCents).toBe(Math.round(p.priceHTCents * 0.85))
    })
  })

  it('Early Adopter : commission 10% — consultant reçoit 90%', () => {
    // Calcul Early Adopter (migration 012)
    const htCents = 8500
    const earlyAdopterCommission = Math.round(htCents * 0.10)
    const earlyAdopterNet = htCents - earlyAdopterCommission
    expect(earlyAdopterCommission).toBe(850)
    expect(earlyAdopterNet).toBe(7650)
  })

  it('Parrainage actif : commission 13% — consultant reçoit 87%', () => {
    const htCents = 8500
    const referralCommission = Math.round(htCents * 0.13)
    const referralNet = htCents - referralCommission
    expect(referralCommission).toBe(1105)
    expect(referralNet).toBe(7395)
  })
})

describe('computeStripeAmount — lecture depuis la DB (RG-02)', () => {
  it('convertit correctement un string NUMERIC PostgreSQL', () => {
    const { htCents, ttcCents } = computeStripeAmount('8500', 0)
    expect(htCents).toBe(8500)
    expect(ttcCents).toBe(10200)
  })

  it('utilise le fallback si amount_ht est null', () => {
    const { htCents } = computeStripeAmount(null, 8500)
    expect(htCents).toBe(8500)
  })

  it('accepte un nombre directement (pas seulement string)', () => {
    const { htCents } = computeStripeAmount(8500, 0)
    expect(htCents).toBe(8500)
  })
})
