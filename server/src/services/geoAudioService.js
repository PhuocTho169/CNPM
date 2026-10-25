const db = require('../db');
const media = require('./mediaService');
const { ApiError } = require('../utils/errors');
const narration = require('../utils/narration');

// Backend side of the mobile GPS audio guide.
//
// The phone does the fine-grained work: it watches GPS, computes Haversine
// distances against a small cached dataset, and only calls us when a visitor
// actually crosses a zone boundary. So this service stays deliberately thin —
// it answers "which zones are around me" and "what is the narration for this
// place in this language". Both stay public: a visitor must be able to walk up
// and listen without logging in.
//
// Narration content is whatever an admin typed into the place translation
// fields. Nothing here invents historical or cultural facts.

const EARTH_RADIUS_M = 6371000;

// Mirrors the app-side config so both ends agree on what a zone means.
const DEFAULT_ZONE_RADIUS_M = 100;
const DEFAULT_ZONE_EXIT_BUFFER_M = 20;
const DEFAULT_NEARBY_RADIUS_M = 500;
const MAX_NEARBY_RADIUS_M = 5000;
const DEFAULT_NEARBY_LIMIT = 20;

/** Haversine distance in meters. Same formula the app uses client-side. */
function haversineMeters(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * Places whose zone could plausibly matter from the visitor's position.
 *
 * `radius` is deliberately generous (500m by default): the app wants every
 * place it might walk into next, not just the ones it is standing on. Exact
 * distance is computed on the device, so the server only has to prefilter.
 */
async function findNearbyZones({ latitude, longitude, radius, limit, lang }) {
  const radiusM = Math.min(
    Math.max(Number(radius) || DEFAULT_NEARBY_RADIUS_M, 50),
    MAX_NEARBY_RADIUS_M
  );
  const take = Math.min(Math.max(Number(limit) || DEFAULT_NEARBY_LIMIT, 1), 50);

  const rows = await db.getMany(
    `SELECT p.id,
            p.zone_radius,
            p.zone_exit_buffer,
            p.latitude,
            p.longitude,
            t.name,
            c.name AS category_name,
            c.icon  AS category_icon,
            (6371000 * acos(least(1.0, greatest(-1.0,
              cos(radians($1)) * cos(radians(p.latitude)) * cos(radians(p.longitude) - radians($2))
              + sin(radians($1)) * sin(radians(p.latitude))
            )))) AS distance_m
       FROM culinary_places p
       LEFT JOIN translations t
         ON t.entity_type = 'place' AND t.entity_id = p.id
        AND t.language_id = (SELECT id FROM languages WHERE code = $3)
       LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.status = 'PUBLISHED'
        AND p.latitude IS NOT NULL
        AND p.longitude IS NOT NULL
        AND (6371000 * acos(least(1.0, greatest(-1.0,
              cos(radians($1)) * cos(radians(p.latitude)) * cos(radians(p.longitude) - radians($2))
              + sin(radians($1)) * sin(radians(p.latitude))
            )))) <= $4
      ORDER BY distance_m ASC
      LIMIT $5`,
    [latitude, longitude, lang || 'vi', radiusM, take]
  );

  return rows.map((r) => ({
    id: r.id,
    name: r.name || `Place #${r.id}`,
    category_name: r.category_name,
    category_icon: r.category_icon,
    latitude: r.latitude,
    longitude: r.longitude,
    // Hysteresis shipped with the data: the app opens the zone at zone_radius
    // and only closes it at zone_radius + zone_exit_buffer.
    zone_radius: r.zone_radius ?? DEFAULT_ZONE_RADIUS_M,
    zone_exit_buffer: r.zone_exit_buffer ?? DEFAULT_ZONE_EXIT_BUFFER_M,
    distance_m: Math.round(Number(r.distance_m)),
  }));
}

/**
 * Narration payload for one place in one language.
 *
 * `audioUrl` is absolute so the phone can stream it without knowing whether it
 * is talking to a LAN IP or a public host. If TTS has not produced the file
 * yet we generate it now rather than leaving the visitor in silence.
 */
async function getNarration(placeId, language) {
  const lang = String(language || 'vi').toLowerCase();

  const translation = await db.getOne(
    `SELECT t.id, t.name, t.short_description, t.description, t.history,
            t.cultural_significance, t.tourist_tips, l.code AS language_code
       FROM translations t
       JOIN languages l ON l.id = t.language_id
      WHERE t.entity_type = 'place' AND t.entity_id = $1 AND l.code = $2`,
    [placeId, lang]
  );

  if (!translation) {
    throw new ApiError(
      404,
      'NARRATION_UNAVAILABLE',
      `No ${lang} guide is available for this culinary place.`
    );
  }

  const audio = await db.getOne(
    `SELECT url AS file_url, duration FROM media_files
      WHERE entity_type = 'translation' AND entity_id = $1 AND kind = 'audio'`,
    [translation.id]
  );

  if (!audio) {
    // First visit for this language pair. Generate synchronously so the phone
    // gets a real file on this request; mediaService already de-dupes the
    // text and the warmup service will usually have beaten us to it.
    const text = narrationText(translation);
    if (text) {
      const generated = await media.generateSpeech(text, lang);
      const attached = await media.attachAudio(translation.id, generated);
      return shape(placeId, lang, translation, attached);
    }
  }

  return shape(placeId, lang, translation, audio);
}

function shape(placeId, lang, translation, audio) {
  return {
    placeId,
    language: lang,
    title: translation.name,
    audioUrl: audio?.file_url || null,
    duration: audio?.duration ?? null,
  };
}

/**
 * What the narrator actually reads. Only admin-managed fields go in here — the
 * phone must never be the source of a historical claim. Shared with the guide
 * page and warm-up so the GPS clip is the same ~30s clip everywhere.
 */
function narrationText(t) {
  return narration.placeNarration(t, t.language_code);
}

module.exports = {
  findNearbyZones,
  getNarration,
  haversineMeters,
  narrationText,
  DEFAULT_ZONE_RADIUS_M,
  DEFAULT_ZONE_EXIT_BUFFER_M,
};