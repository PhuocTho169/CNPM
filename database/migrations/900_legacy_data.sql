-- 900: Legacy data migration (guarded) — no-op on a fresh database.
--
-- Runs after the new schema exists. Every block checks the legacy table with
-- to_regclass() and skips when the project was initialized fresh, where the
-- legacy tables never existed.

-- ---------------------------------------------------------------- places translations
DO $$
BEGIN
  IF to_regclass('public.culinary_place_translations') IS NOT NULL
     AND to_regclass('public.translations') IS NOT NULL THEN
    DELETE FROM translations WHERE entity_type = 'place';
    INSERT INTO translations (entity_type, entity_id, language_id, name,
      short_description, description, history, cultural_significance, tourist_tips)
    SELECT 'place', t.culinary_place_id, t.language_id, t.name,
      t.short_description, t.description, t.history,
      t.cultural_significance, t.tourist_tips
    FROM culinary_place_translations t
    ON CONFLICT (entity_type, entity_id, language_id) DO NOTHING;
  END IF;
END $$;

-- ---------------------------------------------------------------- dish translations
DO $$
BEGIN
  IF to_regclass('public.dish_translations') IS NOT NULL
     AND to_regclass('public.translations') IS NOT NULL THEN
    DELETE FROM translations WHERE entity_type = 'dish';
    INSERT INTO translations (entity_type, entity_id, language_id, name,
      description, ingredients, cultural_information)
    SELECT 'dish', t.dish_id, t.language_id, t.name,
      t.description, t.ingredients, t.cultural_information
    FROM dish_translations t
    ON CONFLICT (entity_type, entity_id, language_id) DO NOTHING;
  END IF;
END $$;

-- ---------------------------------------------------------------- route translations
DO $$
BEGIN
  IF to_regclass('public.route_translations') IS NOT NULL
     AND to_regclass('public.translations') IS NOT NULL THEN
    DELETE FROM translations WHERE entity_type = 'route';
    INSERT INTO translations (entity_type, entity_id, language_id, name, description)
    SELECT 'route', t.route_id, t.language_id, t.name, t.description
    FROM route_translations t
    ON CONFLICT (entity_type, entity_id, language_id) DO NOTHING;
  END IF;
END $$;

-- ---------------------------------------------------------------- media (images / audio / qr)
DO $$
BEGIN
  IF to_regclass('public.culinary_place_images') IS NOT NULL
     AND to_regclass('public.media_files') IS NOT NULL THEN
    INSERT INTO media_files (entity_type, entity_id, kind, url, alt_text, sort_order, is_primary)
    SELECT 'place', i.culinary_place_id, 'image', i.image_url, i.alt_text, i.sort_order, i.is_primary
    FROM culinary_place_images i
    WHERE NOT EXISTS (
      SELECT 1 FROM media_files m
      WHERE m.entity_type = 'place' AND m.entity_id = i.culinary_place_id
        AND m.kind = 'image' AND m.url = i.image_url);
  END IF;

  IF to_regclass('public.audio_guides') IS NOT NULL
     AND to_regclass('public.translations') IS NOT NULL
     AND to_regclass('public.culinary_place_translations') IS NOT NULL THEN
    -- legacy audio_guides.translation_id → new translations.id via the place + language pair
    INSERT INTO media_files (entity_type, entity_id, kind, url, duration, file_size, mime_type, source)
    SELECT 'translation', nt.id, 'audio', a.file_url, a.duration, a.file_size, a.mime_type, a.source
    FROM audio_guides a
    JOIN culinary_place_translations l
      ON l.id = a.translation_id
    JOIN translations nt
      ON nt.entity_type = 'place' AND nt.entity_id = l.culinary_place_id
     AND nt.language_id = l.language_id
    WHERE NOT EXISTS (
      SELECT 1 FROM media_files m
      WHERE m.entity_type = 'translation' AND m.entity_id = nt.id AND m.kind = 'audio');
  END IF;

  IF to_regclass('public.dish_audio_guides') IS NOT NULL
     AND to_regclass('public.translations') IS NOT NULL
     AND to_regclass('public.dish_translations') IS NOT NULL THEN
    INSERT INTO media_files (entity_type, entity_id, kind, url, duration, file_size, mime_type, source)
    SELECT 'translation', nt.id, 'audio', a.file_url, a.duration, a.file_size, a.mime_type, a.source
    FROM dish_audio_guides a
    JOIN dish_translations l
      ON l.id = a.translation_id
    JOIN translations nt
      ON nt.entity_type = 'dish' AND nt.entity_id = l.dish_id
     AND nt.language_id = l.language_id
    WHERE NOT EXISTS (
      SELECT 1 FROM media_files m
      WHERE m.entity_type = 'translation' AND m.entity_id = nt.id AND m.kind = 'audio');
  END IF;

  IF to_regclass('public.qr_codes') IS NOT NULL
     AND to_regclass('public.media_files') IS NOT NULL THEN
    INSERT INTO media_files (entity_type, entity_id, kind, url, metadata)
    SELECT 'place', q.culinary_place_id, 'qr', q.image_url, jsonb_build_object('qr_value', q.qr_value)
    FROM qr_codes q
    WHERE NOT EXISTS (
      SELECT 1 FROM media_files m
      WHERE m.entity_type = 'place' AND m.entity_id = q.culinary_place_id AND m.kind = 'qr');
  END IF;

  IF to_regclass('public.dish_qr_codes') IS NOT NULL
     AND to_regclass('public.media_files') IS NOT NULL THEN
    INSERT INTO media_files (entity_type, entity_id, kind, url, metadata)
    SELECT 'dish', q.dish_id, 'qr', q.image_url, jsonb_build_object('qr_value', q.qr_value)
    FROM dish_qr_codes q
    WHERE NOT EXISTS (
      SELECT 1 FROM media_files m
      WHERE m.entity_type = 'dish' AND m.entity_id = q.dish_id AND m.kind = 'qr');
  END IF;
END $$;

-- ---------------------------------------------------------------- activity events
DO $$
BEGIN
  IF to_regclass('public.visitor_favorites') IS NOT NULL
     AND to_regclass('public.activity_logs') IS NOT NULL THEN
    INSERT INTO activity_logs (event_type, session_id, culinary_place_id, created_at)
    SELECT 'favorite', f.session_id, f.culinary_place_id, f.created_at
    FROM visitor_favorites f
    WHERE NOT EXISTS (
      SELECT 1 FROM activity_logs a
      WHERE a.event_type = 'favorite' AND a.session_id = f.session_id
        AND a.culinary_place_id = f.culinary_place_id);
  END IF;

  IF to_regclass('public.visitor_history') IS NOT NULL
     AND to_regclass('public.activity_logs') IS NOT NULL THEN
    INSERT INTO activity_logs (event_type, session_id, culinary_place_id, language_id, created_at)
    SELECT 'view', h.session_id, h.culinary_place_id, h.language_id, h.viewed_at
    FROM visitor_history h
    WHERE NOT EXISTS (
      SELECT 1 FROM activity_logs a
      WHERE a.event_type = 'view' AND a.session_id = h.session_id
        AND a.culinary_place_id = h.culinary_place_id AND a.created_at = h.viewed_at);
  END IF;

  IF to_regclass('public.scan_logs') IS NOT NULL
     AND to_regclass('public.activity_logs') IS NOT NULL THEN
    INSERT INTO activity_logs (event_type, culinary_place_id, language_id, device_type, platform, session_id, created_at)
    SELECT 'scan', s.culinary_place_id, s.language_id, s.device_type, s.platform, s.anonymous_session_id, s.created_at
    FROM scan_logs s
    WHERE NOT EXISTS (
      SELECT 1 FROM activity_logs a
      WHERE a.event_type = 'scan' AND a.created_at = s.created_at
        AND a.culinary_place_id = s.culinary_place_id
        AND a.session_id IS NOT DISTINCT FROM s.anonymous_session_id);
  END IF;

  IF to_regclass('public.audio_play_logs') IS NOT NULL
     AND to_regclass('public.activity_logs') IS NOT NULL
     AND to_regclass('public.translations') IS NOT NULL
     AND to_regclass('public.culinary_place_translations') IS NOT NULL THEN
    INSERT INTO activity_logs (event_type, culinary_place_id, translation_id, language_id, session_id, created_at)
    SELECT 'play', p.culinary_place_id, nt.id, p.language_id, p.anonymous_session_id, p.created_at
    FROM audio_play_logs p
    LEFT JOIN culinary_place_translations l ON l.id = p.translation_id
    LEFT JOIN translations nt
      ON nt.entity_type = 'place' AND nt.entity_id = l.culinary_place_id
     AND nt.language_id = l.language_id
    WHERE NOT EXISTS (
      SELECT 1 FROM activity_logs a
      WHERE a.event_type = 'play' AND a.created_at = p.created_at
        AND a.culinary_place_id = p.culinary_place_id);
  END IF;
END $$;

-- ---------------------------------------------------------------- guest entitlements → purchased_languages
DO $$
BEGIN
  IF to_regclass('public.language_entitlements') IS NOT NULL
     AND to_regclass('public.guest_sessions') IS NOT NULL THEN
    ALTER TABLE guest_sessions ADD COLUMN IF NOT EXISTS purchased_languages INT[] NOT NULL DEFAULT '{}';

    -- paid rows → the array column; free rows → free_language_id
    UPDATE guest_sessions g
    SET purchased_languages = COALESCE((
      SELECT array_agg(DISTINCT le.language_id)
      FROM language_entitlements le
      WHERE le.guest_session_id = g.id AND le.access_type = 'purchased'
    ), g.purchased_languages);

    UPDATE guest_sessions g
    SET free_language_id = le.language_id
    FROM language_entitlements le
    WHERE le.guest_session_id = g.id AND le.access_type = 'free'
      AND g.free_language_id IS NULL;
  END IF;
END $$;
