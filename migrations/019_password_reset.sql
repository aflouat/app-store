-- 019_password_reset.sql — Token réinitialisation mot de passe (1h TTL)
ALTER TABLE freelancehub.users
  ADD COLUMN IF NOT EXISTS password_reset_token      TEXT,
  ADD COLUMN IF NOT EXISTS password_reset_expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_reset_token
  ON freelancehub.users (password_reset_token)
  WHERE password_reset_token IS NOT NULL;
