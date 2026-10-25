-- 004: Activity — one event stream replacing visitor_favorites,
-- visitor_history, scan_logs and audio_play_logs.
--
--   favorite : (session_id, culinary_place_id) unique → the old UNIQUE pair
--   view     : visitor history rows
--   scan     : QR scans (device_type / platform)
--   play     : audio plays (translation_id)

CREATE TABLE IF NOT EXISTS activity_logs (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(12) NOT NULL
    CHECK (event_type IN ('favorite', 'view', 'scan', 'play')),
  session_id VARCHAR(64),
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  guest_session_id VARCHAR(64) REFERENCES guest_sessions(id) ON DELETE SET NULL,
  culinary_place_id INT REFERENCES culinary_places(id) ON DELETE CASCADE,
  translation_id INT REFERENCES translations(id) ON DELETE SET NULL,
  language_id INT REFERENCES languages(id) ON DELETE SET NULL,
  device_type VARCHAR(20),
  platform VARCHAR(60),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_time ON activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_place ON activity_logs(culinary_place_id);
CREATE INDEX IF NOT EXISTS idx_activity_session_time
  ON activity_logs(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_type_time
  ON activity_logs(event_type, created_at DESC);

-- Keeps the old visitor_favorites UNIQUE(session_id, culinary_place_id).
CREATE UNIQUE INDEX IF NOT EXISTS uq_activity_favorite
  ON activity_logs(session_id, culinary_place_id) WHERE event_type = 'favorite';
