const db = require('../db');

async function logAudioPlay({ placeId, translationId, languageId, sessionId }) {
  await db.query(
    `INSERT INTO audio_play_logs (culinary_place_id, translation_id, language_id, anonymous_session_id)
     VALUES ($1,$2,$3,$4)`,
    [placeId, translationId || null, languageId || null, sessionId || null]
  );
}

async function dashboardStatistics() {
  const [counts] = [await db.getOne(`\
    SELECT\
      (SELECT count(*)::int FROM culinary_places) AS total_places,\
      (SELECT count(*)::int FROM culinary_places WHERE status = 'PUBLISHED') AS published_places,\
      (SELECT count(*)::int FROM dishes) AS total_dishes,\
      (SELECT count(*)::int FROM languages WHERE is_active) AS total_languages,\
      (SELECT count(*)::int FROM audio_guides) AS total_audio,\
      (SELECT count(*)::int FROM dish_audio_guides) AS total_dish_audio,\
      (SELECT count(*)::int FROM qr_codes) AS total_place_qr,\
      (SELECT count(*)::int FROM dish_qr_codes) AS total_dish_qr,\
      (SELECT count(*)::int FROM scan_logs) AS total_scans,\
      (SELECT count(*)::int FROM audio_play_logs) AS total_plays,\
      (SELECT count(*)::int FROM culinary_routes) AS total_routes,\
      (SELECT count(*)::int FROM users) AS total_users\
  `)];
  return counts;
}

async function scansOverTime(days = 14) {
  return db.getMany(
    `SELECT d::date AS day,
            count(s.id)::int AS scans
     FROM generate_series(now() - ($1::int - 1) * interval '1 day', now(), interval '1 day') d
     LEFT JOIN scan_logs s ON s.created_at >= d AND s.created_at < d + interval '1 day'
     GROUP BY d ORDER BY d`,
    [days]
  );
}

async function topPlaces(limit = 8) {
  return db.getMany(
    `SELECT p.id, p.code, count(s.id)::int AS scan_count,
            (SELECT count(*)::int FROM audio_play_logs a WHERE a.culinary_place_id = p.id) AS play_count,
            t.name
     FROM culinary_places p
     LEFT JOIN scan_logs s ON s.culinary_place_id = p.id
     LEFT JOIN culinary_place_translations t ON t.culinary_place_id = p.id AND t.language_id =
       (SELECT id FROM languages WHERE code = 'vi')
     GROUP BY p.id, t.name
     ORDER BY scan_count DESC, play_count DESC
     LIMIT $1`,
    [limit]
  );
}

async function popularLanguages() {
  return db.getMany(
    `SELECT l.code, l.native_name, count(s.id)::int AS scan_count
     FROM languages l LEFT JOIN scan_logs s ON s.language_id = l.id
     GROUP BY l.id ORDER BY scan_count DESC`
  );
}

async function audioPlaysByLanguage() {
  return db.getMany(
    `SELECT l.code, l.native_name, count(a.id)::int AS play_count
     FROM languages l LEFT JOIN audio_play_logs a ON a.language_id = l.id
     GROUP BY l.id ORDER BY play_count DESC`
  );
}

async function deviceBreakdown() {
  return db.getMany(
    `SELECT COALESCE(device_type, 'unknown') AS device_type, count(*)::int AS count
     FROM scan_logs GROUP BY device_type ORDER BY count DESC`
  );
}

async function popularDishes(limit = 8) {
  return db.getMany(
    `SELECT d.id, dt.name, d.price, count(*)::int AS _unused
     FROM dishes d
     LEFT JOIN dish_translations dt ON dt.dish_id = d.id AND dt.language_id = (SELECT id FROM languages WHERE code='vi')
     WHERE d.is_signature = true
     GROUP BY d.id, dt.name, d.price
     ORDER BY d.id LIMIT $1`,
    [limit]
  );
}

module.exports = {
  logAudioPlay, dashboardStatistics, scansOverTime,
  topPlaces, popularLanguages, audioPlaysByLanguage,
  deviceBreakdown, popularDishes,
};
