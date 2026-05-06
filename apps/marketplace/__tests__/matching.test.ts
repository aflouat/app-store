import { describe, it, expect } from 'vitest'

// Copie locale de l'algorithme de matching (RG-06)
// Source : lib/freelancehub/matching.ts
type SkillLevel = 'junior' | 'intermédiaire' | 'senior' | 'expert'

const SKILL_SCORES: Record<SkillLevel, number> = {
  junior: 40,
  intermédiaire: 60,
  senior: 80,
  expert: 100,
}

function computeScore({
  skillLevel,
  rating,
  daysUntilAvailable,
  dailyRateTTC,
  clientBudget,
}: {
  skillLevel: SkillLevel
  rating: number
  daysUntilAvailable: number
  dailyRateTTC: number
  clientBudget: number | null
}): number {
  const skillMatch = SKILL_SCORES[skillLevel]
  const ratingScore = (rating / 5) * 100

  let availabilityScore: number
  if (daysUntilAvailable < 7) {
    availabilityScore = 100
  } else if (daysUntilAvailable >= 30) {
    availabilityScore = 0
  } else {
    availabilityScore = Math.max(0, (1 - (daysUntilAvailable - 7) / 23) * 100)
  }

  let priceScore: number
  if (clientBudget === null) {
    priceScore = 100
  } else if (dailyRateTTC > clientBudget) {
    return -1 // filtré avant calcul
  } else {
    priceScore = Math.max(0, (1 - dailyRateTTC / clientBudget) * 100)
  }

  return (
    0.55 * skillMatch +
    0.35 * ratingScore +
    0.05 * availabilityScore +
    0.05 * priceScore
  )
}

describe('Matching — score composite (RG-06)', () => {
  it('expert 5★ disponible immédiatement sans contrainte budget → score maximal ~100', () => {
    const score = computeScore({
      skillLevel: 'expert',
      rating: 5,
      daysUntilAvailable: 0,
      dailyRateTTC: 100,
      clientBudget: null,
    })
    expect(score).toBeCloseTo(100, 0)
  })

  it('junior 1★ disponible dans 30 jours → score minimal', () => {
    const score = computeScore({
      skillLevel: 'junior',
      rating: 1,
      daysUntilAvailable: 30,
      dailyRateTTC: 50,
      clientBudget: null,
    })
    // skillMatch=40×0.55=22 + rating=20×0.35=7 + avail=0×0.05=0 + price=100×0.05=5 = 34
    expect(score).toBeCloseTo(34, 0)
  })

  it('tarif TTC supérieur au budget client → filtré (score -1)', () => {
    const score = computeScore({
      skillLevel: 'expert',
      rating: 5,
      daysUntilAvailable: 0,
      dailyRateTTC: 200,
      clientBudget: 150,
    })
    expect(score).toBe(-1)
  })

  it('budget null → priceScore = 100 (aucun filtre prix)', () => {
    const score = computeScore({
      skillLevel: 'senior',
      rating: 4,
      daysUntilAvailable: 5,
      dailyRateTTC: 999,
      clientBudget: null,
    })
    expect(score).toBeGreaterThan(0)
    // senior=80×0.55=44 + rating=80×0.35=28 + avail=100×0.05=5 + price=100×0.05=5 = 82
    expect(score).toBeCloseTo(82, 0)
  })

  it('disponible dans < 7 jours → availabilityScore = 100', () => {
    const withAvail = computeScore({
      skillLevel: 'senior',
      rating: 3,
      daysUntilAvailable: 3,
      dailyRateTTC: 100,
      clientBudget: null,
    })
    const withoutAvail = computeScore({
      skillLevel: 'senior',
      rating: 3,
      daysUntilAvailable: 30,
      dailyRateTTC: 100,
      clientBudget: null,
    })
    expect(withAvail).toBeGreaterThan(withoutAvail)
  })

  it('disponible dans exactement 30 jours → availabilityScore = 0', () => {
    const score = computeScore({
      skillLevel: 'expert',
      rating: 5,
      daysUntilAvailable: 30,
      dailyRateTTC: 100,
      clientBudget: null,
    })
    // expert=100×0.55=55 + rating=100×0.35=35 + avail=0×0.05=0 + price=100×0.05=5 = 95
    expect(score).toBeCloseTo(95, 0)
  })

  it('poids des critères : skill (55%) > rating (35%) > avail (5%) = price (5%)', () => {
    const baseScore = computeScore({
      skillLevel: 'senior',
      rating: 3,
      daysUntilAvailable: 15,
      dailyRateTTC: 100,
      clientBudget: null,
    })
    const expertScore = computeScore({
      skillLevel: 'expert', // +20 points skill = +11 score
      rating: 3,
      daysUntilAvailable: 15,
      dailyRateTTC: 100,
      clientBudget: null,
    })
    expect(expertScore - baseScore).toBeCloseTo(11, 0)
  })
})

describe('Matching — niveaux de compétence', () => {
  it.each([
    ['junior', 40],
    ['intermédiaire', 60],
    ['senior', 80],
    ['expert', 100],
  ])('%s → skillMatch = %i', (level, expected) => {
    expect(SKILL_SCORES[level as SkillLevel]).toBe(expected)
  })
})
