// lib/freelancehub/types.ts

export type UserRole = 'client' | 'consultant' | 'admin'

export interface FHUser {
  id: string
  email: string
  name: string | null
  role: UserRole
  avatar_url: string | null
  is_active: boolean
  created_at: string
}

export interface Consultant {
  id: string
  user_id: string
  title: string | null
  bio: string | null
  daily_rate: number | null
  experience_years: number
  rating: number
  rating_count: number
  is_verified: boolean
  is_available: boolean
  location: string | null
  linkedin_url: string | null
  // joined from users
  name?: string
  email?: string
  avatar_url?: string | null
  // joined skills
  skills?: Skill[]
}

export interface Skill {
  id: number
  name: string
  category: string | null
  level?: 'junior' | 'intermediate' | 'senior' | 'expert'
}

export type SlotStatus = 'available' | 'booked' | 'cancelled'

export interface Slot {
  id: string
  consultant_id: string
  slot_date: string   // ISO date string
  slot_time: string   // HH:MM
  duration_min: number
  status: SlotStatus
  created_at: string
}

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'disputed'

export interface Booking {
  id: string
  client_id: string
  consultant_id: string
  slot_id: string
  skill_requested: number | null
  matching_score: number | null
  status: BookingStatus
  revealed_at: string | null
  notes: string | null
  amount_ht: number | null          // centimes
  commission_amount: number | null  // centimes
  consultant_amount: number | null  // centimes
  created_at: string
  updated_at: string
  // joined fields
  client_name?: string
  client_email?: string
  consultant_name?: string
  slot_date?: string
  slot_time?: string
  skill_name?: string
}

export type PaymentStatus =
  | 'pending'
  | 'authorized'
  | 'captured'
  | 'transferred'
  | 'refunded'
  | 'failed'

export interface Payment {
  id: string
  booking_id: string
  stripe_payment_id: string | null
  stripe_transfer_id: string | null
  amount: number  // centimes
  currency: string
  status: PaymentStatus
  authorized_at: string | null
  captured_at: string | null
  transferred_at: string | null
  created_at: string
}

export interface Review {
  id: string
  booking_id: string
  reviewer_id: string
  reviewee_id: string
  reviewer_role: 'client' | 'consultant'
  rating: number
  comment: string | null
  is_validated: boolean
  created_at: string
}

// ─── Matching ─────────────────────────────────────────────────
export interface MatchingInput {
  skill_id: number
  slot_date: string
  slot_time: string
  client_budget?: number  // TJM max en euros
}

export interface MatchingResult {
  consultant: Consultant
  slot: Slot
  score: number
  score_breakdown: {
    skill_match: number
    rating_score: number
    availability_score: number
    price_score: number
  }
}
