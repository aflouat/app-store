// lib/freelancehub/matching.ts — SERVER ONLY
// Matching algorithm : 40% skill match + 30% rating + 20% availability + 10% price
import { query } from './db'
import type { MatchingResult } from './types'

interface MatchInput {
  skill_id:      number
  slot_date:     string
  slot_time:     string
  client_budget: number | null  // TJM max in euros, null = no constraint
}

export async function findMatches(input: MatchInput): Promise<MatchingResult[]> {
  const { skill_id, slot_date, slot_time, client_budget } = input

  // Find consultants with the skill + an available slot at this datetime
  const candidates = await query<{
    consultant_id: string
    user_id:       string
    name:          string | null
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
    // availability score factors
    available_slots_count: number
  }>(
    `SELECT
       c.id          AS consultant_id,
       c.user_id,
       u.name,
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
       -- how many total available slots the consultant has in next 14 days
       (SELECT COUNT(*) FROM freelancehub.slots s2
        WHERE s2.consultant_id = c.id
          AND s2.status = 'available'
          AND s2.slot_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 14
       )            AS available_slots_count
     FROM freelancehub.consultants c
     JOIN freelancehub.users u ON u.id = c.user_id
     JOIN freelancehub.consultant_skills cs ON cs.consultant_id = c.id AND cs.skill_id = $1
     JOIN freelancehub.slots s ON s.consultant_id = c.id
       AND s.slot_date = $2
       AND s.slot_time = $3
       AND s.status = 'available'
     WHERE c.is_available = true
       AND ($4::int IS NULL OR c.daily_rate IS NULL OR c.daily_rate <= $4)
     ORDER BY c.rating DESC`,
    [skill_id, slot_date, slot_time, client_budget]
  )

  if (candidates.length === 0) return []

  // Compute max daily_rate among candidates for price normalization
  const rates = candidates.map(c => c.daily_rate ?? 0).filter(r => r > 0)
  const maxRate = rates.length > 0 ? Math.max(...rates) : 1
  const minRate = rates.length > 0 ? Math.min(...rates) : 0

  const results: MatchingResult[] = candidates.map(c => {
    // Skill match (based on level)
    const LEVEL_SCORE: Record<string, number> = {
      expert:       100,
      senior:        80,
      intermediate:  60,
      junior:        40,
    }
    const skillScore = LEVEL_SCORE[c.skill_level] ?? 50

    // Rating score (0-100)
    const ratingScore = (Number(c.rating) / 5) * 100

    // Availability score (more available slots = more flexible = higher score, capped at 100)
    const availabilityScore = Math.min(Number(c.available_slots_count) * 10, 100)

    // Price competitiveness (lower rate = higher score)
    let priceScore = 100
    if (c.daily_rate && maxRate > minRate) {
      priceScore = ((maxRate - c.daily_rate) / (maxRate - minRate)) * 100
    }

    // Weighted composite score
    const score =
      0.40 * skillScore +
      0.30 * ratingScore +
      0.20 * availabilityScore +
      0.10 * priceScore

    return {
      consultant: {
        id:              c.consultant_id,
        user_id:         c.user_id,
        title:           c.title,
        bio:             c.bio,
        daily_rate:      c.daily_rate,
        experience_years: 0,
        rating:          Number(c.rating),
        rating_count:    Number(c.rating_count),
        is_verified:     c.is_verified,
        is_available:    true,
        location:        c.location,
        linkedin_url:    null,
        // Anonymized — name is NOT exposed here
        name:            undefined,
        email:           undefined,
      },
      slot: {
        id:           c.slot_id,
        consultant_id: c.consultant_id,
        slot_date:    c.slot_date,
        slot_time:    c.slot_time,
        duration_min: Number(c.duration_min),
        status:       'available',
        created_at:   '',
      },
      score: Math.round(score * 10) / 10,
      score_breakdown: {
        skill_match:        Math.round(skillScore),
        rating_score:       Math.round(ratingScore),
        availability_score: Math.round(availabilityScore),
        price_score:        Math.round(priceScore),
      },
    }
  })

  // Sort by score desc, return top 5
  return results.sort((a, b) => b.score - a.score).slice(0, 5)
}
