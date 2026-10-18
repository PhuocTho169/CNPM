-- 005: Engagement & analytics
CREATE TABLE IF NOT EXISTS visitor_favorites (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(64) NOT NULL,
  culinary_place_id INT NOT NULL REFERENCES culinary_places(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, culinary_place_id)
);
CREATE INDEX IF NOT EXISTS idx_fav_session ON visitor_favorites(session_id);

CREATE TABLE IF NOT EXISTS visitor_history (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(64) NOT NULL,
  culinary_place_id INT NOT NULL REFERENCES culinary_places(id) ON DELETE CASCADE,
  language_id INT REFERENCES languages(id),
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_history_session ON visitor_history(session_id, viewed_at DESC);

CREATE TABLE IF NOT EXISTS scan_logs (
  id SERIAL PRIMARY KEY,
  culinary_place_id INT NOT NULL REFERENCES culinary_places(id) ON DELETE CASCADE,
  language_id INT REFERENCES languages(id),
  device_type VARCHAR(20),
  platform VARCHAR(60),
  anonymous_session_id VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_scans_time ON scan_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_scans_place ON scan_logs(culinary_place_id);

CREATE TABLE IF NOT EXISTS audio_play_logs (
  id SERIAL PRIMARY KEY,
  culinary_place_id INT NOT NULL REFERENCES culinary_places(id) ON DELETE CASCADE,
  translation_id INT REFERENCES culinary_place_translations(id) ON DELETE SET NULL,
  language_id INT REFERENCES languages(id),
  anonymous_session_id VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_plays_time ON audio_play_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_plays_place ON audio_play_logs(culinary_place_id);

CREATE TABLE IF NOT EXISTS system_settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS trg_settings_updated ON system_settings;
CREATE TRIGGER trg_settings_updated BEFORE UPDATE ON system_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
