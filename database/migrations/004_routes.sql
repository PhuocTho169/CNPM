-- 004: Culinary routes
CREATE TABLE IF NOT EXISTS culinary_routes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(80) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  estimated_duration VARCHAR(80),
  distance VARCHAR(80),
  difficulty VARCHAR(20) NOT NULL DEFAULT 'EASY'
    CHECK (difficulty IN ('EASY', 'MODERATE', 'HARD')),
  cover_image_url VARCHAR(500),
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS trg_routes_updated ON culinary_routes;
CREATE TRIGGER trg_routes_updated BEFORE UPDATE ON culinary_routes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS route_stops (
  id SERIAL PRIMARY KEY,
  route_id INT NOT NULL REFERENCES culinary_routes(id) ON DELETE CASCADE,
  culinary_place_id INT NOT NULL REFERENCES culinary_places(id) ON DELETE CASCADE,
  position INT NOT NULL DEFAULT 1,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (route_id, position)
);
CREATE INDEX IF NOT EXISTS idx_stops_route ON route_stops(route_id);
