-- 011: Per-dish QR codes (scannable recipe pages)
-- The media layer already references dish_qr_codes (mediaService.getDishQR /
-- generateDishQR), but no migration had ever created the table, so the server
-- would fail on startup with "relation "dish_qr_codes" does not exist".
-- Idempotent: safe to re-run on every migrate.
CREATE TABLE IF NOT EXISTS dish_qr_codes (
  id SERIAL PRIMARY KEY,
  dish_id INT NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
  qr_value TEXT NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_dish_qr_dish ON dish_qr_codes(dish_id);
DROP TRIGGER IF EXISTS trg_dish_qrcodes_updated ON dish_qr_codes;
CREATE TRIGGER trg_dish_qrcodes_updated BEFORE UPDATE ON dish_qr_codes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
