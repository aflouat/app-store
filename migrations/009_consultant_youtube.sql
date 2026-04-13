-- =============================================================
-- Migration 009 — YouTube URL sur le profil consultant
-- =============================================================

ALTER TABLE freelancehub.consultants
  ADD COLUMN IF NOT EXISTS youtube_url TEXT;

COMMENT ON COLUMN freelancehub.consultants.youtube_url IS
  'Lien YouTube vers la vidéo de présentation du consultant (2-3 min, format CV vidéo)';
