-- Early Adopter: badge Fondateur + commission réduite 10%
ALTER TABLE freelancehub.consultants
  ADD COLUMN IF NOT EXISTS is_early_adopter BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS commission_rate   NUMERIC(4,2) DEFAULT 15.00;

CREATE INDEX IF NOT EXISTS idx_consultants_early_adopter ON freelancehub.consultants(is_early_adopter);
