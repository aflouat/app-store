-- =============================================================
-- Migration 007 — FreelanceHub v2
-- Notifications in-app + index rappels cron
-- =============================================================

-- ─── Notifications in-app ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS freelancehub.notifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES freelancehub.users(id) ON DELETE CASCADE,
    type        VARCHAR(50) NOT NULL,
                -- booking_confirmed | new_booking | review_request
                -- fund_released | reminder | booking_cancelled
    title       VARCHAR(255) NOT NULL,
    message     TEXT,
    data        JSONB,           -- { booking_id, ... }
    is_read     BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_user_unread
    ON freelancehub.notifications(user_id, is_read, created_at DESC);

-- ─── Index for cron J-1 query ─────────────────────────────────
-- Find bookings whose slot_date = tomorrow efficiently
CREATE INDEX IF NOT EXISTS idx_slots_date
    ON freelancehub.slots(slot_date);

CREATE INDEX IF NOT EXISTS idx_bookings_slot_status
    ON freelancehub.bookings(slot_id, status);
