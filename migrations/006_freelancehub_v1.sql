-- =============================================================
-- Migration 006 — FreelanceHub schema v1
-- Marketplace B2B consulting : consultant / client / admin
-- =============================================================

-- Schema
CREATE SCHEMA IF NOT EXISTS freelancehub;

-- ─── Skills reference ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS freelancehub.skills (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    category    VARCHAR(50),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO freelancehub.skills (name, category) VALUES
    ('ERP / SAP',             'ERP'),
    ('ERP / D365 F&O',        'ERP'),
    ('ERP / Oracle',          'ERP'),
    ('Management de projet',  'Management'),
    ('Agilité / Scrum',       'Méthodes'),
    ('Conduite du changement','Management'),
    ('Data / BI',             'Data'),
    ('Cybersécurité',         'Tech'),
    ('Cloud / AWS',           'Tech'),
    ('Cloud / Azure',         'Tech'),
    ('Développement web',     'Tech'),
    ('Finance / Contrôle',    'Finance')
ON CONFLICT (name) DO NOTHING;

-- ─── Users ──────────────────────────────────────────────────
-- Extends shared.users if it exists, or standalone
CREATE TABLE IF NOT EXISTS freelancehub.users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) NOT NULL UNIQUE,
    name            VARCHAR(255),
    role            VARCHAR(20) NOT NULL CHECK (role IN ('client', 'consultant', 'admin')),
    password_hash   TEXT,                   -- bcrypt hash
    avatar_url      TEXT,                   -- MinIO URL
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Consultant profiles ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS freelancehub.consultants (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES freelancehub.users(id) ON DELETE CASCADE,
    title           VARCHAR(255),           -- ex: "Expert ERP / D365 F&O"
    bio             TEXT,
    daily_rate      INTEGER,                -- TJM en euros
    experience_years INTEGER DEFAULT 0,
    rating          NUMERIC(3,2) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
    rating_count    INTEGER DEFAULT 0,
    is_verified     BOOLEAN DEFAULT FALSE,
    is_available    BOOLEAN DEFAULT TRUE,
    location        VARCHAR(100),
    linkedin_url    TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Consultant ↔ Skills (many-to-many)
CREATE TABLE IF NOT EXISTS freelancehub.consultant_skills (
    consultant_id   UUID NOT NULL REFERENCES freelancehub.consultants(id) ON DELETE CASCADE,
    skill_id        INTEGER NOT NULL REFERENCES freelancehub.skills(id) ON DELETE CASCADE,
    level           VARCHAR(20) DEFAULT 'intermediate' CHECK (level IN ('junior', 'intermediate', 'senior', 'expert')),
    PRIMARY KEY (consultant_id, skill_id)
);

-- ─── Slots (agenda) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS freelancehub.slots (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultant_id   UUID NOT NULL REFERENCES freelancehub.consultants(id) ON DELETE CASCADE,
    slot_date       DATE NOT NULL,
    slot_time       TIME NOT NULL,          -- heure de début
    duration_min    INTEGER DEFAULT 60,     -- durée en minutes
    status          VARCHAR(20) DEFAULT 'available'
                        CHECK (status IN ('available', 'booked', 'cancelled')),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_slots_consultant_date
    ON freelancehub.slots(consultant_id, slot_date);
CREATE INDEX IF NOT EXISTS idx_slots_status
    ON freelancehub.slots(status);

-- ─── Bookings ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS freelancehub.bookings (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id           UUID NOT NULL REFERENCES freelancehub.users(id),
    consultant_id       UUID NOT NULL REFERENCES freelancehub.consultants(id),
    slot_id             UUID NOT NULL REFERENCES freelancehub.slots(id),
    skill_requested     INTEGER REFERENCES freelancehub.skills(id),
    matching_score      NUMERIC(5,2),       -- score algo (0-100)
    status              VARCHAR(30) DEFAULT 'pending'
                            CHECK (status IN (
                                'pending', 'confirmed', 'in_progress',
                                'completed', 'cancelled', 'disputed'
                            )),
    -- Anonymous reveal: consultant identity hidden until payment confirmed
    revealed_at         TIMESTAMPTZ,        -- moment de la révélation
    notes               TEXT,               -- demande client
    amount_ht           INTEGER,            -- montant HT en centimes
    commission_amount   INTEGER,            -- 15% plateforme en centimes
    consultant_amount   INTEGER,            -- 85% consultant en centimes
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_client ON freelancehub.bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_consultant ON freelancehub.bookings(consultant_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON freelancehub.bookings(status);

-- ─── Payments ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS freelancehub.payments (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id          UUID NOT NULL REFERENCES freelancehub.bookings(id),
    stripe_payment_id   VARCHAR(255) UNIQUE,    -- pi_xxx
    stripe_transfer_id  VARCHAR(255),            -- tr_xxx (reversement)
    amount              INTEGER NOT NULL,        -- en centimes
    currency            VARCHAR(3) DEFAULT 'eur',
    status              VARCHAR(30) DEFAULT 'pending'
                            CHECK (status IN (
                                'pending', 'authorized', 'captured',
                                'transferred', 'refunded', 'failed'
                            )),
    authorized_at       TIMESTAMPTZ,
    captured_at         TIMESTAMPTZ,
    transferred_at      TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Reviews ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS freelancehub.reviews (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id      UUID NOT NULL REFERENCES freelancehub.bookings(id),
    reviewer_id     UUID NOT NULL REFERENCES freelancehub.users(id),
    reviewee_id     UUID NOT NULL REFERENCES freelancehub.users(id),
    reviewer_role   VARCHAR(20) NOT NULL CHECK (reviewer_role IN ('client', 'consultant')),
    rating          INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment         TEXT,
    is_validated    BOOLEAN DEFAULT FALSE,  -- auto-validé après 48h
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(booking_id, reviewer_id)         -- une seule éval par booking par personne
);

-- ─── Trigger : updated_at auto ───────────────────────────────
CREATE OR REPLACE FUNCTION freelancehub.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_users_updated_at'
                   AND tgrelid = 'freelancehub.users'::regclass) THEN
        CREATE TRIGGER trg_users_updated_at
            BEFORE UPDATE ON freelancehub.users
            FOR EACH ROW EXECUTE FUNCTION freelancehub.set_updated_at();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_consultants_updated_at'
                   AND tgrelid = 'freelancehub.consultants'::regclass) THEN
        CREATE TRIGGER trg_consultants_updated_at
            BEFORE UPDATE ON freelancehub.consultants
            FOR EACH ROW EXECUTE FUNCTION freelancehub.set_updated_at();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_bookings_updated_at'
                   AND tgrelid = 'freelancehub.bookings'::regclass) THEN
        CREATE TRIGGER trg_bookings_updated_at
            BEFORE UPDATE ON freelancehub.bookings
            FOR EACH ROW EXECUTE FUNCTION freelancehub.set_updated_at();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_payments_updated_at'
                   AND tgrelid = 'freelancehub.payments'::regclass) THEN
        CREATE TRIGGER trg_payments_updated_at
            BEFORE UPDATE ON freelancehub.payments
            FOR EACH ROW EXECUTE FUNCTION freelancehub.set_updated_at();
    END IF;
END;
$$;

-- ─── Demo seeds (dev only) ────────────────────────────────────
-- Admin account
INSERT INTO freelancehub.users (id, email, name, role, password_hash) VALUES
    ('00000000-0000-0000-0000-000000000001',
     'admin@perform-learn.fr',
     'Admin FreelanceHub',
     'admin',
     '$2b$10$placeholder_admin_hash')
ON CONFLICT (email) DO NOTHING;

-- Demo consultant
INSERT INTO freelancehub.users (id, email, name, role, password_hash) VALUES
    ('00000000-0000-0000-0000-000000000002',
     'consultant1@demo.fr',
     'Sophie Martin',
     'consultant',
     '$2b$10$placeholder_consultant_hash')
ON CONFLICT (email) DO NOTHING;

INSERT INTO freelancehub.consultants (user_id, title, bio, daily_rate, experience_years, rating, rating_count, is_verified) VALUES
    ('00000000-0000-0000-0000-000000000002',
     'Expert ERP & Transformation Digitale',
     'Consultante senior spécialisée D365 F&O avec 8 ans d''expérience en transformation digitale industrielle.',
     850, 8, 4.8, 12, TRUE)
ON CONFLICT (user_id) DO NOTHING;

-- Demo client
INSERT INTO freelancehub.users (id, email, name, role, password_hash) VALUES
    ('00000000-0000-0000-0000-000000000003',
     'client1@demo.fr',
     'Acme Corp',
     'client',
     '$2b$10$placeholder_client_hash')
ON CONFLICT (email) DO NOTHING;
