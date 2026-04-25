-- 016_chat_limits.sql
-- Rate limiting persistant pour le chat public : 2 messages/semaine par IP

CREATE TABLE IF NOT EXISTS freelancehub.chat_limits (
  identifier  VARCHAR(255) NOT NULL,
  week_start  DATE         NOT NULL,
  count       INTEGER      NOT NULL DEFAULT 0,
  PRIMARY KEY (identifier, week_start)
);

CREATE INDEX IF NOT EXISTS idx_chat_limits_week
  ON freelancehub.chat_limits (week_start);
