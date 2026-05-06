-- 018_referral.sql — Système de parrainage consultant
-- referrer_id       : l'utilisateur qui a parrainé
-- referrer_commission_until : date jusqu'à laquelle le filleul bénéficie de -2% commission
ALTER TABLE freelancehub.users
  ADD COLUMN IF NOT EXISTS referrer_id                UUID REFERENCES freelancehub.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS referrer_commission_until   TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_referrer_id
  ON freelancehub.users (referrer_id)
  WHERE referrer_id IS NOT NULL;
