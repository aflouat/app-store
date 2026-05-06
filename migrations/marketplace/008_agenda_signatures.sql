-- =============================================================
-- Migration 008 — Agenda optimisation + Signatures
-- =============================================================

-- ─── Index composite pour queries de disponibilités client ───
CREATE INDEX IF NOT EXISTS idx_slots_consultant_date_status
    ON freelancehub.slots(consultant_id, slot_date, status);

-- ─── Signatures : acceptation CGU, NDA, conditions de service ─
CREATE TABLE IF NOT EXISTS freelancehub.signatures (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id               UUID NOT NULL REFERENCES freelancehub.users(id) ON DELETE CASCADE,
    document_type         VARCHAR(50) NOT NULL
                              CHECK (document_type IN ('CGU', 'NDA', 'conditions_service')),
    document_version      VARCHAR(20) NOT NULL DEFAULT '1.0',
    signed_at             TIMESTAMPTZ DEFAULT NOW(),
    ip_address            INET,
    user_agent            TEXT,
    provider              VARCHAR(50) DEFAULT 'checkbox'
                              CHECK (provider IN ('checkbox', 'yousign', 'docusign')),
    provider_signature_id TEXT    -- ID externe si provider tiers (Yousign, DocuSign)
);

CREATE INDEX IF NOT EXISTS idx_signatures_user ON freelancehub.signatures(user_id);
CREATE INDEX IF NOT EXISTS idx_signatures_type ON freelancehub.signatures(document_type);

-- ─── Commentaire ─────────────────────────────────────────────
COMMENT ON TABLE freelancehub.signatures IS
  'Traçabilité des acceptations de documents légaux. Phase 1 : checkbox + horodatage. Phase 2 : intégration Yousign.';
