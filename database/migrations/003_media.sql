-- 003: Audio guides & QR codes
CREATE TABLE IF NOT EXISTS audio_guides (
  id SERIAL PRIMARY KEY,
  translation_id INT NOT NULL REFERENCES culinary_place_translations(id) ON DELETE CASCADE,
  file_url VARCHAR(500) NOT NULL,
  duration INT,
  file_size INT,
  mime_type VARCHAR(100),
  source VARCHAR(10) NOT NULL DEFAULT 'UPLOAD' CHECK (source IN ('UPLOAD', 'TTS')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audio_translation ON audio_guides(translation_id);

CREATE TABLE IF NOT EXISTS qr_codes (
  id SERIAL PRIMARY KEY,
  culinary_place_id INT NOT NULL REFERENCES culinary_places(id) ON DELETE CASCADE,
  qr_value TEXT NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS trg_qrcodes_updated ON qr_codes;
CREATE TRIGGER trg_qrcodes_updated BEFORE UPDATE ON qr_codes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX IF NOT EXISTS idx_qr_place ON qr_codes(culinary_place_id);
