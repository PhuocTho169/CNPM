-- 002: Core culinary catalog
CREATE TABLE IF NOT EXISTS languages (
  id SERIAL PRIMARY KEY,
  code VARCHAR(10) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  native_name VARCHAR(100) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS trg_languages_updated ON languages;
CREATE TRIGGER trg_languages_updated BEFORE UPDATE ON languages
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(150) NOT NULL,
  applies_to VARCHAR(10) NOT NULL DEFAULT 'both'
    CHECK (applies_to IN ('place', 'dish', 'both')),
  icon VARCHAR(20),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS trg_categories_updated ON categories;
CREATE TRIGGER trg_categories_updated BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

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

CREATE TABLE IF NOT EXISTS culinary_place_translations (
  id SERIAL PRIMARY KEY,
  culinary_place_id INT NOT NULL REFERENCES culinary_places(id) ON DELETE CASCADE,
  language_id INT NOT NULL REFERENCES languages(id),
  name VARCHAR(255) NOT NULL,
  short_description TEXT,
  description TEXT,
  history TEXT,
  cultural_significance TEXT,
  tourist_tips TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (culinary_place_id, language_id)
);
DROP TRIGGER IF EXISTS trg_ptranslations_updated ON culinary_place_translations;
CREATE TRIGGER trg_ptranslations_updated BEFORE UPDATE ON culinary_place_translations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX IF NOT EXISTS idx_ptranslations_place ON culinary_place_translations(culinary_place_id);
CREATE INDEX IF NOT EXISTS idx_ptranslations_lang ON culinary_place_translations(language_id);

CREATE TABLE IF NOT EXISTS culinary_place_images (
  id SERIAL PRIMARY KEY,
  culinary_place_id INT NOT NULL REFERENCES culinary_places(id) ON DELETE CASCADE,
  image_url VARCHAR(500) NOT NULL,
  alt_text VARCHAR(300),
  sort_order INT NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pimages_place ON culinary_place_images(culinary_place_id);

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

CREATE TABLE IF NOT EXISTS dish_translations (
  id SERIAL PRIMARY KEY,
  dish_id INT NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
  language_id INT NOT NULL REFERENCES languages(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  ingredients TEXT,
  cultural_information TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (dish_id, language_id)
);
DROP TRIGGER IF EXISTS trg_dtranslations_updated ON dish_translations;
CREATE TRIGGER trg_dtranslations_updated BEFORE UPDATE ON dish_translations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX IF NOT EXISTS idx_dtranslations_dish ON dish_translations(dish_id);
