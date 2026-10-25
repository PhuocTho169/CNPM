-- 003: Routes — culinary_routes (metadata only) + route_stops.
-- Names/descriptions moved to the unified `translations` table
-- (entity_type = 'route'), so the table itself only carries operational data.

CREATE TABLE IF NOT EXISTS culinary_routes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(80) UNIQUE NOT NULL,
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
CREATE INDEX IF NOT EXISTS idx_stops_place ON route_stops(culinary_place_id);
