-- 999: Drop the legacy tables/functions that the 11-table schema replaced.
-- Order is FK-safe (children first) and everything is IF EXISTS so this is a
-- no-op entirely fresh database is initialized.
DROP TABLE IF EXISTS language_entitlement_audit CASCADE;
DROP TABLE IF EXISTS payment_webhook_events CASCADE;
DROP TABLE IF EXISTS payment_transactions CASCADE;
DROP TABLE IF EXISTS language_package_languages CASCADE;
DROP TABLE IF EXISTS access_packages CASCADE;
DROP TABLE IF EXISTS language_entitlements CASCADE;
DROP TABLE IF EXISTS audio_guides CASCADE;
DROP TABLE IF EXISTS dish_audio_guides CASCADE;
DROP TABLE IF EXISTS dish_qr_codes CASCADE;
DROP TABLE IF EXISTS qr_codes CASCADE;
DROP TABLE IF EXISTS culinary_place_images CASCADE;
DROP TABLE IF EXISTS scan_logs CASCADE;
DROP TABLE IF EXISTS audio_play_logs CASCADE;
DROP TABLE IF EXISTS visitor_favorites CASCADE;
DROP TABLE IF EXISTS visitor_history CASCADE;
DROP TABLE IF EXISTS culinary_place_translations CASCADE;
DROP TABLE IF EXISTS dish_translations CASCADE;
DROP TABLE IF EXISTS route_translations CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;
DROP FUNCTION IF EXISTS f_check_ent_available_exclusive() CASCADE;
