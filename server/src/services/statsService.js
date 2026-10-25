const db = require('../db');

// Dashboard + visitor analytics, built on the single activity_logs stream that
// replaced scan_logs / audio_play_logs / visitor_favorites / visitor_history.

async function logScan({ placeId, languageId, deviceType, platform, sessionId }) {
  await db.query(
    `INSERT INTO activity_logs (event_type, session_id, culinary_place_id, language_id, device_type, platform)
     VALUES ('scan', $1, $2, $3, $4, $5)`,
    [sessionId || null, placeId, languageId || null, deviceType || null, platform || null]
  );
}

async function logAudioPlay({ placeId, translationId, languageId, sessionId }) {
  await db.query(
    `INSERT INTO activity_logs (event_type, session_id, culinary_place_id, translation_id, language_id)
     VALUES ('play', $1, $2, $3, $4)`,
    [sessionId || null, placeId, translationId || null, languageId || null]
  );
}

// Lightweight "this browser is on the site right now" ping. Reuses the 'view'
// event type (no food_place attached) so the dashboard's 5-minute online count
// covers every public page, not just place guides.
async function logVisit({ sessionId, deviceType, platform, path }) {
  const sid = String(sessionId || '').slice(0, 64);
  if (!sid) return;
  await db.query(
    `INSERT INTO activity_logs (event_type, session_id, device_type, platform, metadata)
     VALUES ('view', $1, $2, $3, $4::jsonb)`,
    [
      sid,
      deviceType || null,
      platform || null,
      path ? JSON.stringify({ path: String(path).slice(0, 200) }) : null,
    ]
  );
}

async function dashboardStatistics() {
  return db.getOne(`
    SELECT
      (SELECT count(*)::int FROM culinary_places) AS total_places,
      (SELECT count(*)::int FROM culinary_places WHERE status = 'PUBLISHED') AS published_places,
      (SELECT count(*)::int FROM dishes) AS total_dishes,
      (SELECT count(*)::int FROM languages WHERE is_active) AS total_languages,
      (SELECT count(*)::int FROM media_files WHERE kind = 'audio') AS total_audio,
      (SELECT count(*)::int FROM media_files WHERE kind = 'qr' AND entity_type = 'place') AS total_place_qr,
      (SELECT count(*)::int FROM media_files WHERE kind = 'qr' AND entity_type = 'dish') AS total_dish_qr,
      (SELECT count(*)::int FROM activity_logs WHERE event_type = 'scan') AS total_scans,
      (SELECT count(*)::int FROM activity_logs WHERE event_type = 'play') AS total_plays,
      (SELECT count(*)::int FROM culinary_routes) AS total_routes,
      (SELECT count(*)::int FROM users) AS total_users,
      (SELECT count(DISTINCT session_id)::int FROM activity_logs
        WHERE event_type = 'scan' AND session_id IS NOT NULL) AS unique_visitors,
      (SELECT count(DISTINCT session_id)::int FROM activity_logs
        WHERE event_type = 'scan' AND session_id IS NOT NULL
          AND created_at > now() - interval '24 hours') AS visitors_today,
      (SELECT count(DISTINCT session_id)::int FROM activity_logs
        WHERE session_id IS NOT NULL
          AND created_at > now() - interval '5 minutes') AS users_online
  `);
}

// Sessions with any activity in the last N minutes — the "users online now"
// list behind the dashboard card. One row per session: device, platform, the
// last page path (from the visit ping), action count and last-seen time.
async function onlineUsers(minutes = 5) {
  return db.getMany(
    `SELECT l.session_id,
            COALESCE(l.device_type, 'unknown') AS device_type,
            l.platform,
            l.metadata->>'path' AS last_page,
            (SELECT count(*)::int FROM activity_logs a
              WHERE a.session_id = l.session_id
                AND a.created_at > now() - make_interval(mins => $1::int)) AS actions,
            l.created_at AS last_seen
     FROM (
       SELECT DISTINCT ON (session_id)
              session_id, device_type, platform, metadata, created_at
       FROM activity_logs
       WHERE session_id IS NOT NULL
         AND created_at > now() - make_interval(mins => $1::int)
       ORDER BY session_id, created_at DESC
     ) l
     ORDER BY l.created_at DESC`,
    [minutes]
  );
}

async function scansOverTime(days = 14) {
  return db.getMany(
    `SELECT d::date AS day,
            count(s.id)::int AS scans
     FROM generate_series(now() - ($1::int - 1) * interval '1 day', now(), interval '1 day') d
     LEFT JOIN activity_logs s
       ON s.event_type = 'scan' AND s.created_at >= d AND s.created_at < d + interval '1 day'
     GROUP BY d ORDER BY d`,
    [days]
  );
}

async function topPlaces(limit = 8) {
  return db.getMany(
    `SELECT p.id, p.code,
            count(s.id)::int AS scan_count,
            (SELECT count(*)::int FROM activity_logs a
              WHERE a.event_type = 'play' AND a.culinary_place_id = p.id) AS play_count,
            t.name
     FROM culinary_places p
     LEFT JOIN activity_logs s ON s.event_type = 'scan' AND s.culinary_place_id = p.id
     LEFT JOIN translations t
       ON t.entity_type = 'place' AND t.entity_id = p.id
      AND t.language_id = (SELECT id FROM languages WHERE code = 'vi')
     GROUP BY p.id, t.name
     ORDER BY scan_count DESC, play_count DESC
     LIMIT $1`,
    [limit]
  );
}

async function popularLanguages() {
  return db.getMany(
    `SELECT l.code, l.native_name, count(s.id)::int AS scan_count
     FROM languages l
     LEFT JOIN activity_logs s ON s.event_type = 'scan' AND s.language_id = l.id
     GROUP BY l.id ORDER BY scan_count DESC`
  );
}

async function audioPlaysByLanguage() {
  return db.getMany(
    `SELECT l.code, l.native_name, count(a.id)::int AS play_count
     FROM languages l
     LEFT JOIN activity_logs a ON a.event_type = 'play' AND a.language_id = l.id
     GROUP BY l.id ORDER BY play_count DESC`
  );
}

async function deviceBreakdown() {
  return db.getMany(
    `SELECT COALESCE(device_type, 'unknown') AS device_type, count(*)::int AS count
     FROM activity_logs WHERE event_type = 'scan'
     GROUP BY device_type ORDER BY count DESC`
  );
}

async function popularDishes(limit = 8) {
  return db.getMany(
    `SELECT d.id, t.name, d.price, count(*)::int AS _unused
     FROM dishes d
     LEFT JOIN translations t
       ON t.entity_type = 'dish' AND t.entity_id = d.id
      AND t.language_id = (SELECT id FROM languages WHERE code = 'vi')
     WHERE d.is_signature = true
     GROUP BY d.id, t.name, d.price
     ORDER BY d.id LIMIT $1`,
    [limit]
  );
}

module.exports = {
  logScan, logAudioPlay, logVisit, dashboardStatistics, scansOverTime, onlineUsers,
  topPlaces, popularLanguages, audioPlaysByLanguage, deviceBreakdown, popularDishes,
};
