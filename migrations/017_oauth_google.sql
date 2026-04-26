-- 017_oauth_google.sql — OAuth provider columns on freelancehub.users
ALTER TABLE freelancehub.users
  ADD COLUMN IF NOT EXISTS oauth_provider    TEXT,
  ADD COLUMN IF NOT EXISTS oauth_provider_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS users_oauth_provider_id_idx
  ON freelancehub.users (oauth_provider, oauth_provider_id)
  WHERE oauth_provider IS NOT NULL;
