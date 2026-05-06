-- Migration 014 — Waitlist marketing consent
ALTER TABLE store.waitlist
  ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS marketing_consent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'landing';

COMMENT ON COLUMN store.waitlist.marketing_consent IS 'Consentement explicite art. 6.1.a RGPD';
COMMENT ON COLUMN store.waitlist.source IS 'landing | linkedin | direct';
