// lib/freelancehub/matching.ts — SERVER ONLY
//
// Tarification : 85 € TTC fixe par consultation (1h)
//   HT         = 85 / 1.20  = 70.83 €
//   TVA 20%    = 85 - 70.83 = 14.17 €
//   Commission = HT × 15%   = 10.62 €
//   Consultant = HT - comm  = 60.21 €
//
// Score composite :
//   55 % skill_match   (niveau déclaré par le consultant)
//   35 % rating_score  (note / 5)
//   10 % availability_score (prochain slot dans < 7j → 100, sinon dégressif)

import { query } from './db'
import type { MatchingResult } from './types'

// ─── Prix plateforme (centimes) ──────────────────────────────
export const CONSULTATION_PRICE_TTC  = 8500   // 85,00 € TTC
export const CONSULTATION_PRICE_HT   = Math.round(CONSULTATION_PRICE_TTC / 1.20) // 7083 c
export const CONSULTATION_TVA        = CONSULTATION_PRICE_TTC - CONSULTATION_PRICE_HT // 1417 c
export const PLATFORM_COMMISSION     = Math.round(CONSULTATION_PRICE_HT * 0.15)   // 1062 c
export const CONSULTANT_NET          = CONSULTATION_PRICE_HT - PLATFORM_COMMISSION  // 6021 c

interface MatchInput {
  skill_id:      number
  client_budget: number | null  // budget max TTC en euros (null = pas de limite)
}

export async function findMatches(input: MatchInput): Promise<MatchingResult[]> {
  const { skill_id, client_budget } = input

  // Budget check : le prix fixe est 85 € TTC
  if (client_budget !== null && client_budget < CONSULTATION_PRICE_TTC / 100) {
    return []
  }

  // Trouver les consultants ayant la compétence + leur PROCHAIN créneau dispo
  const candidates = await query<{
    consultant_id: string
    user_id:       string
    title:         string | null
    bio:           string | null
    daily_rate:    number | null
    rating:        number
    rating_count:  number
    is_verified:   boolean
    location:      string | null
    skill_level:   string
    slot_id:       string
    slot_date:     string
    slot_time:     string
    duration_min:  number
    days_until:    number   // jours avant le prochain créneau
  }>(
    `SELECT DISTINCT ON (c.id)
       c.id          AS consultant_id,
       c.user_id,
       c.title,
       c.bio,
       c.daily_rate,
       c.rating,
       c.rating_count,
       c.is_verified,
       c.location,
       cs.level      AS skill_level,
       s.id          AS slot_id,
       s.slot_date::text,
       s.slot_time::text,
       s.duration_min,
       (s.slot_date - CURRENT_DATE) AS days_until
     FROM freelancehub.consultants c
     JOIN freelancehub.users u       ON u.id = c.user_id
     JOIN freelancehub.consultant_skills cs
       ON cs.consultant_id = c.id AND cs.skill_id = $1
     JOIN freelancehub.slots s
       ON s.consultant_id = c.id
      AND s.status = 'available'
      AND s.slot_date >= CURRENT_DATE
     WHERE c.is_available = true
     ORDER BY c.id, s.slot_date ASC, s.slot_time ASC`,
    [skill_id]
  )

  if (candidates.length === 0) return []

  const results: MatchingResult[] = candidates.map(c => {
    // Skill match (niveau déclaré)
    const LEVEL_SCORE: Record<string, number> = {
      expert:       100,
      senior:        80,
      intermediate:  60,
      junior:        40,
    }
    const skillScore = LEVEL_SCORE[c.skill_level] ?? 50

    // Rating score (0–100)
    const ratingScore = (Number(c.rating) / 5) * 100

    // Availability score : créneau dans < 7j → 100, linéaire jusqu'à 30j → 0
    const days = Number(c.days_until)
    const availabilityScore = days <= 7
      ? 100
      : Math.max(0, Math.round(100 - ((days - 7) / 23) * 100))

    // Score composite 55 / 35 / 10
    const score =
      0.55 * skillScore +
      0.35 * ratingScore +
      0.10 * availabilityScore

    return {
      consultant: {
        id:               c.consultant_id,
        user_id:          c.user_id,
        title:            c.title,
        bio:              c.bio,
        daily_rate:       c.daily_rate,
        experience_years: 0,
        rating:           Number(c.rating),
        rating_count:     Number(c.rating_count),
        is_verified:      c.is_verified,
        is_available:     true,
        location:         c.location,
        linkedin_url:     null,
        // Anonymisé : nom/email non exposés
        name:  undefined,
        email: undefined,
      },
      slot: {
        id:            c.slot_id,
        consultant_id: c.consultant_id,
        slot_date:     c.slot_date,
        slot_time:     c.slot_time,
        duration_min:  60,   // 1 heure fixe
        status:        'available',
        created_at:    '',
      },
      score: Math.round(score * 10) / 10,
      score_breakdown: {
        skill_match:        Math.round(skillScore),
        rating_score:       Math.round(ratingScore),
        availability_score: Math.round(availabilityScore),
        price_score:        100,  // prix fixe plateforme = 85 € pour tous
      },
    }
  })

  // Tri par score desc, top 5
  return results.sort((a, b) => b.score - a.score).slice(0, 5)
}
