export type SanteRole = 'patient' | 'doctor' | 'admin'

export interface SanteUser {
  id: string
  email: string
  name: string | null
  role: SanteRole
  is_active: boolean
  created_at: string
}

export interface Patient extends SanteUser {
  role: 'patient'
  date_of_birth?: string
  phone?: string
}

export interface Doctor extends SanteUser {
  role: 'doctor'
  specialty?: string
  rpps_number?: string   // numéro RPPS — identifiant médecin France
  is_verified: boolean
}

export interface Appointment {
  id: string
  patient_id: string
  doctor_id: string
  scheduled_at: string   // ISO datetime
  duration_min: number
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  notes?: string
  created_at: string
}
