-- 007: Per-language audio for dishes
-- audio_guides.translation_id is FK-bound to culinary_place_translations, so it
-- cannot carry dish narration. This mirrors that table for dish_translations.
CREATE TABLE IF NOT EXISTS dish_audio_guides (
  id SERIAL PRIMARY KEY,
  translation_id INT NOT NULL REFERENCES dish_translations(id) ON DELETE CASCADE,
  file_url VARCHAR(500) NOT NULL,
  duration INT,
  file_size INT,
  mime_type VARCHAR(100),
  source VARCHAR(10) NOT NULL DEFAULT 'UPLOAD' CHECK (source IN ('UPLOAD', 'TTS')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dish_audio_translation ON dish_audio_guides(translation_id);
-- One audio row per translation: attachAudio relies on this to update in place.
CREATE UNIQUE INDEX IF NOT EXISTS uq_dish_audio_translation ON dish_audio_guides(translation_id);