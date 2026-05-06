-- SantéApp — schéma initial
-- Appliqué indépendamment des migrations marketplace

CREATE SCHEMA IF NOT EXISTS sante;

CREATE TABLE IF NOT EXISTS sante.users (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT        UNIQUE NOT NULL,
  password_hash TEXT,
  name          TEXT,
  role          TEXT        NOT NULL CHECK (role IN ('patient', 'doctor', 'admin')),
  is_active     BOOLEAN     NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sante.doctors (
  user_id     UUID        PRIMARY KEY REFERENCES sante.users(id) ON DELETE CASCADE,
  specialty   TEXT,
  rpps_number TEXT        UNIQUE,
  is_verified BOOLEAN     NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS sante.patients (
  user_id       UUID        PRIMARY KEY REFERENCES sante.users(id) ON DELETE CASCADE,
  date_of_birth DATE,
  phone         TEXT
);

CREATE TABLE IF NOT EXISTS sante.appointments (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id   UUID        NOT NULL REFERENCES sante.users(id),
  doctor_id    UUID        NOT NULL REFERENCES sante.users(id),
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_min INT         NOT NULL DEFAULT 30,
  status       TEXT        NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id   ON sante.appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id  ON sante.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled   ON sante.appointments(scheduled_at);
