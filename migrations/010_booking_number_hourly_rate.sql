-- =============================================================
-- Migration 010 — Numéro de réservation + tarif horaire consultant
-- =============================================================

-- ─── Numéro de réservation lisible (séquence auto) ───────────
ALTER TABLE freelancehub.bookings
  ADD COLUMN IF NOT EXISTS booking_number SERIAL;

-- Contrainte unique sur le numéro
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_number
  ON freelancehub.bookings(booking_number);

-- ─── Tarif horaire consultant (remplace daily_rate sémantiquement) ───
-- daily_rate reste en base pour compatibilité ; on l'utilise comme taux horaire
-- On ajoute un commentaire explicatif
COMMENT ON COLUMN freelancehub.consultants.daily_rate IS
  'Taux horaire moyen en euros (THM). Utilisé pour calculer le prix d''une consultation d''1h.';

COMMENT ON TABLE freelancehub.bookings IS
  'Réservations de consultations. booking_number est le numéro lisible affiché aux utilisateurs (ex: #42).';
