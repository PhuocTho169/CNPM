-- 009: Sample activity data (last 14 days) so the admin dashboard has data
-- One-shot seed: guarded by an existence check so repeated starts never stack rows.
INSERT INTO activity_logs (event_type, culinary_place_id, language_id, device_type, platform, session_id, created_at)
SELECT 'scan', p.id, l.id, dev.dev, plat.plat, md5(random()::text),
       now() - (random() * 14 || ' days')::interval - (random() * 12 || ' hours')::interval
FROM culinary_places p
CROSS JOIN generate_series(1, 15) g
CROSS JOIN LATERAL (SELECT (ARRAY['mobile','tablet','desktop'])[floor(random() * 3 + 1)] AS dev) dev
CROSS JOIN LATERAL (SELECT (ARRAY['iOS','Android','Windows','macOS'])[floor(random() * 4 + 1)] AS plat) plat
CROSS JOIN LATERAL (SELECT id FROM languages WHERE is_active ORDER BY random() LIMIT 1) l
WHERE NOT EXISTS (SELECT 1 FROM activity_logs WHERE event_type = 'scan');

INSERT INTO activity_logs (event_type, culinary_place_id, translation_id, language_id, session_id, created_at)
SELECT 'play', t.entity_id, t.id, t.language_id, md5(random()::text),
       now() - (random() * 14 || ' days')::interval - (random() * 10 || ' hours')::interval
FROM translations t
CROSS JOIN generate_series(1, 4) g
WHERE t.entity_type = 'place'
  AND NOT EXISTS (SELECT 1 FROM activity_logs WHERE event_type = 'play');
