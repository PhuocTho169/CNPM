const media = require('../services/mediaService');
const placeService = require('../services/placeService');
const stats = require('../services/statsService');
const { success, created, ApiError } = require('../utils/errors');
const { requireFields, toIntOrNull } = require('../validators');

// ---------- Audio ----------
async function getAudio(req, res, next) {
  try {
    return success(res, await media.getAudioForTranslation(req.params.translationId));
  } catch (err) { return next(err); }
}

async function uploadAudio(req, res, next) {
  try {
    if (!req.file) throw new ApiError(400, 'VALIDATION_ERROR', 'Audio file is required (field name: audio).');
    const row = await media.attachAudio(req.params.translationId, {
      file_url: placeService.publicUrl(req, req.file.path.replace(/\\/g, '/')),
      duration: toIntOrNull(req.body.duration),
      file_size: req.file.size,
      mime_type: req.file.mimetype,
      source: 'UPLOAD',
    });
    return created(res, row);
  } catch (err) { return next(err); }
}

async function linkAudioUrl(req, res, next) {
  try {
    requireFields(req.body, ['file_url']);
    const row = await media.attachAudio(req.params.translationId, {
      file_url: req.body.file_url,
      duration: toIntOrNull(req.body.duration),
      mime_type: req.body.mime_type || 'audio/mpeg',
      source: 'UPLOAD',
    });
    return created(res, row);
  } catch (err) { return next(err); }
}

async function deleteAudio(req, res, next) {
  try { return success(res, await media.deleteAudio(req.params.id)); } catch (err) { return next(err); }
}

async function ttsGenerate(req, res, next) {
  try {
    requireFields(req.body, ['text', 'language_code']);
    const result = await media.generateSpeech(req.body.text, req.body.language_code);
    // If translation_id provided, attach the generated audio to the translation
    const translationId = toIntOrNull(req.body.translation_id);
    if (translationId) {
      const row = await media.attachAudio(translationId, result);
      return created(res, row);
    }
    return created(res, result);
  } catch (err) { return next(err); }
}

// ---------- QR ----------
// The admin dashboard's origin (what the browser is actually browsing) — best hint
// for a QR value that works on the admin's LAN / phone.
function clientOriginHint(req) {
  if (req.headers.origin && /^https?:\/\//.test(req.headers.origin)) return req.headers.origin;
  if (req.headers.referer) {
    try { return new URL(req.headers.referer).origin; } catch { /* ignore */ }
  }
  // Fall back to the request's own origin (proxy-aware: app has trust proxy on)
  return `${req.protocol}://${req.get('host')}`;
}

async function getQR(req, res, next) {
  try { return success(res, await media.getQR(req.params.id)); } catch (err) { return next(err); }
}

// The admin dashboard can override the origin it is being browsed on, so a QR
// generated from http://<lan-ip>:8080 points at the LAN address, not localhost.
function qrOriginHint(req) {
  const fromBody = req.body?.origin_hint || req.body?.originHint;
  if (typeof fromBody === 'string' && /^https?:\/\//.test(fromBody)) return fromBody;
  return clientOriginHint(req);
}

async function createQR(req, res, next) {
  try {
    return created(res, await media.generateQR(req.params.id, {
      regenerate: false,
      baseUrl: req.body?.base_url,
      originHint: qrOriginHint(req),
    }));
  } catch (err) { return next(err); }
}

async function regenerateQR(req, res, next) {
  try {
    return success(res, await media.generateQR(req.params.id, {
      regenerate: true,
      baseUrl: req.body?.base_url,
      originHint: qrOriginHint(req),
    }));
  } catch (err) { return next(err); }
}

// ---------- Statistics ----------
async function dashboardStats(req, res, next) {
  try {
    const [overview, scans, topPlaces, languages, playsByLang, devices, dishes] = await Promise.all([
      stats.dashboardStatistics(),
      stats.scansOverTime(14),
      stats.topPlaces(8),
      stats.popularLanguages(),
      stats.audioPlaysByLanguage(),
      stats.deviceBreakdown(),
      stats.popularDishes(8),
    ]);
    return success(res, {
      overview, scans_over_time: scans, top_places: topPlaces,
      languages, audio_plays_by_language: playsByLang, devices, popular_dishes: dishes,
    });
  } catch (err) { return next(err); }
}

async function scansStats(req, res, next) {
  try {
    return success(res, {
      over_time: await stats.scansOverTime(toIntOrNull(req.query.days) || 30),
      by_place: await stats.topPlaces(20),
      by_language: await stats.popularLanguages(),
    });
  } catch (err) { return next(err); }
}

async function audioStats(req, res, next) {
  try {
    return success(res, {
      by_language: await stats.audioPlaysByLanguage(),
      by_place: await stats.topPlaces(20),
    });
  } catch (err) { return next(err); }
}

// ---------- Visitor favorites & history ----------
async function listFavorites(req, res, next) {
  try {
    const rows = await require('../db').getMany(
      `SELECT p.id, p.code, p.address, p.price_range,
              c.name AS category_name, prim.image_url AS primary_image,
              t.name, t.short_description, f.created_at
       FROM visitor_favorites f
       JOIN culinary_places p ON p.id = f.culinary_place_id
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN culinary_place_translations t ON t.culinary_place_id = p.id
         AND t.language_id = (SELECT id FROM languages WHERE code = $2)
       LEFT JOIN LATERAL (
         SELECT image_url FROM culinary_place_images pi WHERE pi.culinary_place_id = p.id
         ORDER BY pi.is_primary DESC, pi.sort_order ASC LIMIT 1
       ) prim ON true
       WHERE f.session_id = $1 AND p.status = 'PUBLISHED'
       ORDER BY f.created_at DESC`,
      [req.query.session_id, (req.query.lang || 'vi').toLowerCase()]
    );
    return success(res, rows);
  } catch (err) { return next(err); }
}

async function addFavorite(req, res, next) {
  try {
    requireFields(req.body, ['session_id']);
    await require('../db').query(
      `INSERT INTO visitor_favorites (session_id, culinary_place_id) VALUES ($1,$2)
       ON CONFLICT (session_id, culinary_place_id) DO NOTHING`,
      [req.body.session_id, toIntOrNull(req.body.culinary_place_id)]
    );
    return created(res, { added: true });
  } catch (err) { return next(err); }
}

async function removeFavorite(req, res, next) {
  try {
    requireFields(req.body, ['session_id']);
    await require('../db').query(
      'DELETE FROM visitor_favorites WHERE session_id = $1 AND culinary_place_id = $2',
      [req.body.session_id, toIntOrNull(req.body.culinary_place_id)]
    );
    return success(res, { removed: true });
  } catch (err) { return next(err); }
}

async function logHistory(req, res, next) {
  try {
    requireFields(req.body, ['session_id']);
    await require('../db').query(
      `INSERT INTO visitor_history (session_id, culinary_place_id, language_id) VALUES ($1,$2,$3)`,
      [req.body.session_id, toIntOrNull(req.body.culinary_place_id), toIntOrNull(req.body.language_id)]
    );
    return created(res, { logged: true });
  } catch (err) { return next(err); }
}

async function listHistory(req, res, next) {
  try {
    const rows = await require('../db').getMany(
      `SELECT DISTINCT ON (h.culinary_place_id)
              p.id, p.code, t.name, t.short_description, prim.image_url AS primary_image,
              c.name AS category_name, h.viewed_at
       FROM visitor_history h
       JOIN culinary_places p ON p.id = h.culinary_place_id
       LEFT JOIN culinary_place_translations t ON t.culinary_place_id = p.id
         AND t.language_id = (SELECT id FROM languages WHERE code = $2)
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN LATERAL (
         SELECT image_url FROM culinary_place_images pi WHERE pi.culinary_place_id = p.id
         ORDER BY pi.is_primary DESC, pi.sort_order ASC LIMIT 1
       ) prim ON true
       WHERE h.session_id = $1 AND p.status = 'PUBLISHED'
       ORDER BY h.culinary_place_id, h.viewed_at DESC`,
      [req.query.session_id, (req.query.lang || 'vi').toLowerCase()]
    );
    rows.sort((a, b) => new Date(b.viewed_at) - new Date(a.viewed_at));
    return success(res, rows);
  } catch (err) { return next(err); }
}

async function logPlay(req, res, next) {
  try {
    const id = toIntOrNull(req.params.id);
    if (!id) throw new ApiError(400, 'INVALID_PLACE_ID', 'Invalid place id.');
    await stats.logAudioPlay({
      placeId: id,
      translationId: toIntOrNull(req.body.translation_id),
      languageId: toIntOrNull(req.body.language_id),
      sessionId: req.body.anonymous_session_id,
    });
    return success(res, { logged: true });
  } catch (err) { return next(err); }
}

module.exports = {
  getAudio, uploadAudio, linkAudioUrl, deleteAudio, ttsGenerate,
  getQR, createQR, regenerateQR,
  dashboardStats, scansStats, audioStats,
  listFavorites, addFavorite, removeFavorite, logHistory, listHistory, logPlay,
};
