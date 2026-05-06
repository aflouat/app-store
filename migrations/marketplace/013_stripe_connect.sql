-- Migration 013 — Stripe Connect + payments notes
-- Adds stripe_account_id/onboarded_at on consultants for future Stripe Connect payouts
-- Adds notes column on payments for payout_pending_manual tracking
-- Adds deleted_at on users for GDPR soft delete

ALTER TABLE freelancehub.consultants
  ADD COLUMN IF NOT EXISTS stripe_account_id   TEXT,
  ADD COLUMN IF NOT EXISTS stripe_onboarded_at TIMESTAMPTZ;

ALTER TABLE freelancehub.payments
  ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE freelancehub.users
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_payments_stripe_payment_id ON freelancehub.payments(stripe_payment_id);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON freelancehub.users(deleted_at) WHERE deleted_at IS NOT NULL;
