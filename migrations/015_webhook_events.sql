-- 015_webhook_events.sql
-- Idempotence des webhooks Stripe : évite le double traitement d'un même événement.

CREATE TABLE IF NOT EXISTS freelancehub.webhook_events (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     text        NOT NULL UNIQUE,  -- Stripe event ID (evt_xxx)
  event_type   text        NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON freelancehub.webhook_events (event_id);
