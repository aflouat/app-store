-- =============================================================
-- Migration 011 — KYC Consultant + Marketing consent
-- =============================================================

-- ─── KYC fields on consultants ───────────────────────────────
ALTER TABLE freelancehub.consultants
  ADD COLUMN IF NOT EXISTS kyc_status VARCHAR(20) DEFAULT 'none'
    CHECK (kyc_status IN ('none', 'submitted', 'validated', 'rejected')),
  ADD COLUMN IF NOT EXISTS kyc_document_url TEXT,
  ADD COLUMN IF NOT EXISTS kyc_document_name TEXT,
  ADD COLUMN IF NOT EXISTS kyc_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS kyc_validated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS kyc_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_consultants_kyc_status
  ON freelancehub.consultants(kyc_status);

-- ─── Marketing consent on users ──────────────────────────────
ALTER TABLE freelancehub.users
  ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS marketing_consent_at TIMESTAMPTZ;
