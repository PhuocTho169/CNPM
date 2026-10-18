-- 008: GPS audio-zone geometry for culinary places
--
-- The mobile GPS guide triggers narration when the visitor walks inside a
-- geographic zone around a place. Both numbers live here so admin data stays
-- the source of truth: nothing about a radius is hard-coded in the app.
--
--   zone_radius       meters from the place centre where the zone OPENS
--   zone_exit_buffer  extra meters of hysteresis before it CLOSES again
--
-- Exit threshold = zone_radius + zone_exit_buffer (100/120 by default), which
-- stops GPS jitter from flapping the visitor in and out of the same zone.
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

-- Per-place values by venue scale: a whole market and a food street need a
-- wider net than a single small stall. Still editable from the admin panel.
UPDATE culinary_places SET zone_radius = 180, zone_exit_buffer = 20 WHERE code = 'cho-quan-4';
UPDATE culinary_places SET zone_radius = 150, zone_exit_buffer = 25 WHERE code = 'pho-an-vinh-khanh';
UPDATE culinary_places SET zone_radius = 100, zone_exit_buffer = 20 WHERE code = 'cafe-ben-van-don';
UPDATE culinary_places SET zone_radius =  90, zone_exit_buffer = 20
  WHERE code IN ('banh-canh-cua-nguyen-khoai', 'com-tam-vinh-khanh', 'bun-rieu-ben-van-don');
UPDATE culinary_places SET zone_radius =  80, zone_exit_buffer = 15
  WHERE code IN ('oc-oanh', 'hutieu-ca-men', 'banh-xeo-hoa-gia', 'che-heo-quay');

CREATE INDEX IF NOT EXISTS idx_places_zone ON culinary_places (zone_radius);