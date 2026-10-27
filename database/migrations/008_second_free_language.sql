-- 008: Two free language slots per guest session.
--
-- The paywall rule is "the guest may pick up to 2 languages for free; from the
-- 3rd language onward they pay 20,000 VND once and unlock everything".
-- guest_sessions.free_language_id was the single free slot; this adds the
-- second slot so both choices live in the same row and the unlock rule stays
-- inspectable in one place.

ALTER TABLE guest_sessions
  ADD COLUMN IF NOT EXISTS free_language_id_2 INT REFERENCES languages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_guest_free_lang_2 ON guest_sessions(free_language_id_2);
