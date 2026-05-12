-- SantéApp — créneaux de disponibilité médecin
-- Analogue à freelancehub.slots, adapté au domaine santé

CREATE TABLE IF NOT EXISTS sante.doctor_slots (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id    UUID        NOT NULL REFERENCES sante.doctors(user_id) ON DELETE CASCADE,
  slot_date    DATE        NOT NULL,
  slot_time    TIME        NOT NULL,
  duration_min INTEGER     NOT NULL DEFAULT 30,
  status       TEXT        NOT NULL DEFAULT 'available'
               CHECK (status IN ('available', 'booked', 'cancelled')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_doctor_slots_active
  ON sante.doctor_slots(doctor_id, slot_date, slot_time)
  WHERE status != 'cancelled';

CREATE INDEX IF NOT EXISTS idx_doctor_slots_doctor_date
  ON sante.doctor_slots(doctor_id, slot_date);

CREATE INDEX IF NOT EXISTS idx_doctor_slots_date
  ON sante.doctor_slots(slot_date);

CREATE INDEX IF NOT EXISTS idx_doctor_slots_status
  ON sante.doctor_slots(status);
