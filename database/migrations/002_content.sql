-- 002: Content — culinary_places (+ GPS zone), dishes, unified translations,
-- unified media_files. Consolidation of the original 002_catalog + 003_media +
-- 007_dish_audio + 008_place_geo_zone + 010_language_voice.

CREATE TABLE IF NOT EXISTS culinary_places (
  id SERIAL PRIMARY KEY,
  code VARCHAR(80) UNIQUE NOT NULL,
  category_id INT REFERENCES categories(id),
  address VARCHAR(300),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  phone VARCHAR(50),
  website VARCHAR(300),
  price_range VARCHAR(80),
  price_min INT,
  price_max INT,
  opening_time TIME,
  closing_time TIME,
  is_recommended BOOLEAN NOT NULL DEFAULT false,
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS trg_places_updated ON culinary_places;
CREATE TRIGGER trg_places_updated BEFORE UPDATE ON culinary_places
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX IF NOT EXISTS idx_places_status ON culinary_places(status);
CREATE INDEX IF NOT EXISTS idx_places_category ON culinary_places(category_id);

ALTER TABLE culinary_places
  ADD COLUMN IF NOT EXISTS zone_radius INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS zone_exit_buffer INTEGER NOT NULL DEFAULT 20;

ALTER TABLE culinary_places
  DROP CONSTRAINT IF EXISTS chk_places_zone_radius,
  DROP CONSTRAINT IF EXISTS chk_places_zone_exit_buffer;

ALTER TABLE culinary_places
  ADD CONSTRAINT chk_places_zone_radius
    CHECK (zone_radius >= 25 AND zone_radius <= 1000),
  ADD CONSTRAINT chk_places_zone_exit_buffer
    CHECK (zone_exit_buffer >= 0 AND zone_exit_buffer <= 500);

CREATE TABLE IF NOT EXISTS dishes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(80) UNIQUE NOT NULL,
  culinary_place_id INT NOT NULL REFERENCES culinary_places(id) ON DELETE CASCADE,
  category_id INT REFERENCES categories(id),
  price VARCHAR(80),
  image_url VARCHAR(500),
  is_signature BOOLEAN NOT NULL DEFAULT false,
  status VARCHAR(20) NOT NULL DEFAULT 'PUBLISHED'
    CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS trg_dishes_updated ON dishes;
CREATE TRIGGER trg_dishes_updated BEFORE UPDATE ON dishes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX IF NOT EXISTS idx_dishes_place ON dishes(culinary_place_id);
CREATE INDEX IF NOT EXISTS idx_dishes_category ON dishes(category_id);

-- Unified polylingual content: replaces culinary_place_translations,
-- dish_translations and route_translations.
CREATE TABLE IF NOT EXISTS translations (
  id SERIAL PRIMARY KEY,
  entity_type VARCHAR(8) NOT NULL CHECK (entity_type IN ('place', 'dish', 'route')),
  entity_id INT NOT NULL,
  language_id INT NOT NULL REFERENCES languages(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  short_description TEXT,
  description TEXT,
  history TEXT,
  cultural_significance TEXT,
  tourist_tips TEXT,
  ingredients TEXT,
  cultural_information TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entity_type, entity_id, language_id)
);
DROP TRIGGER IF EXISTS trg_translations_updated ON translations;
CREATE TRIGGER trg_translations_updated BEFORE UPDATE ON translations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX IF NOT EXISTS idx_translations_entity
  ON translations(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_translations_language ON translations(language_id);

-- Unified media: replaces culinary_place_images, audio_guides,
-- dish_audio_guides, qr_codes and dish_qr_codes.
--   kind = image  (places: gallery; dishes: image_url stays on the row)
--   kind = audio  (always entity_type='translation', one per translation)
--   kind = qr     (places & dishes, one per entity)
CREATE TABLE IF NOT EXISTS media_files (
  id SERIAL PRIMARY KEY,
  entity_type VARCHAR(12) NOT NULL CHECK (entity_type IN ('place', 'dish', 'translation')),
  entity_id INT NOT NULL,
  kind VARCHAR(10) NOT NULL CHECK (kind IN ('image', 'audio', 'qr')),
  url VARCHAR(500) NOT NULL,
  alt_text VARCHAR(300),
  duration INT,
  file_size INT,
  mime_type VARCHAR(100),
  source VARCHAR(10) NOT NULL DEFAULT 'UPLOAD' CHECK (source IN ('UPLOAD', 'TTS')),
  sort_order INT NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS trg_media_updated ON media_files;
CREATE TRIGGER trg_media_updated BEFORE UPDATE ON media_files
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_media_entity
  ON media_files(entity_type, entity_id, kind);
-- Gallery read path: primary first, then sort order.
CREATE INDEX IF NOT EXISTS idx_media_gallery_order
  ON media_files(entity_type, entity_id, kind, is_primary DESC, sort_order);

-- One QR per entity (qr had `UNIQUE(dish_id)` on dish_qr_codes; qr_codes on
-- places was logically single-row too).
CREATE UNIQUE INDEX IF NOT EXISTS uq_media_qr_entity
  ON media_files(entity_type, entity_id) WHERE kind = 'qr';
-- One narration per translation (dish_audio_guides had UNIQUE(translation_id)).
CREATE UNIQUE INDEX IF NOT EXISTS uq_media_audio_translation
  ON media_files(entity_id) WHERE entity_type = 'translation' AND kind = 'audio';
