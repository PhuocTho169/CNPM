-- 006: Route translations (multilingual route names & descriptions)
CREATE TABLE IF NOT EXISTS route_translations (
  id SERIAL PRIMARY KEY,
  route_id INT NOT NULL REFERENCES culinary_routes(id) ON DELETE CASCADE,
  language_id INT NOT NULL REFERENCES languages(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (route_id, language_id)
);
DROP TRIGGER IF EXISTS trg_rtranslations_updated ON route_translations;
CREATE TRIGGER trg_rtranslations_updated BEFORE UPDATE ON route_translations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX IF NOT EXISTS idx_rtranslations_route ON route_translations(route_id);
