-- 009: Sample analytics data (last 14 days) so the admin dashboard has data
INSERT INTO scan_logs (culinary_place_id, language_id, device_type, platform, anonymous_session_id, created_at)
SELECT p.id, l.id, dev.dev, plat.plat, md5(random()::text),
       now() - (random() * 14 || ' days')::interval - (random() * 12 || ' hours')::interval
FROM culinary_places p
CROSS JOIN generate_series(1, 15) g
CROSS JOIN LATERAL (SELECT (ARRAY['mobile','tablet','desktop'])[floor(random() * 3 + 1)] AS dev) dev
CROSS JOIN LATERAL (SELECT (ARRAY['iOS','Android','Windows','macOS'])[floor(random() * 4 + 1)] AS plat) plat
CROSS JOIN LATERAL (SELECT id FROM languages WHERE is_active ORDER BY random() LIMIT 1) l;

INSERT INTO audio_play_logs (culinary_place_id, translation_id, language_id, anonymous_session_id, created_at)
SELECT t.culinary_place_id, t.id, t.language_id, md5(random()::text),
       now() - (random() * 14 || ' days')::interval - (random() * 10 || ' hours')::interval
FROM culinary_place_translations t
CROSS JOIN generate_series(1, 4) g;
