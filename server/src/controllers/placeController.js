const placeService = require('../services/placeService');
const statsService = require('../services/statsService');
const { success, created, ApiError } = require('../utils/errors');
const { requireFields, toIntOrNull, toFloatOrNull, toBoolOrNull } = require('../validators');
const { parsePagination } = require('../utils/paginate');

const DEFAULT_LANG = 'vi';

// GPS audio-zone geometry is admin data, but clamp it here so a typo in the
// panel cannot create a zone that swallows the whole district (or one so small
// a visitor can never trigger it).
//
// Returns null when the field is absent so an unrelated admin edit never
// stomps the radius a curator already tuned. placeService.create() owns the
// default for genuinely new rows.
function clampZone(value, { min, max }) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'zone_radius and zone_exit_buffer must be numbers.');
  }
  return Math.min(Math.max(Math.round(n), min), max);
}

function resolveLang(req) {
  return (req.query.lang || DEFAULT_LANG).toLowerCase();
}

function placePayload(body) {
  return {
    code: body.code,
    category_id: toIntOrNull(body.category_id),
    address: body.address,
    latitude: toFloatOrNull(body.latitude),
    longitude: toFloatOrNull(body.longitude),
    phone: body.phone,
    website: body.website,
    price_range: body.price_range,
    price_min: toIntOrNull(body.price_min),
    price_max: toIntOrNull(body.price_max),
    opening_time: body.opening_time,
    closing_time: body.closing_time,
    is_recommended: toBoolOrNull(body.is_recommended),
    status: body.status,
    zone_radius: clampZone(body.zone_radius, { min: 25, max: 1000 }),
    zone_exit_buffer: clampZone(body.zone_exit_buffer, { min: 0, max: 500 }),
  };
}

// ---------- Admin CRUD ----------
async function list(req, res, next) {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const data = await placeService.list({
      lang: resolveLang(req),
      category: req.query.category,
      q: req.query.q,
      status: req.query.status,
      price: req.query.price,
      openNow: req.query.open_now,
      recommended: toBoolOrNull(req.query.recommended),
      page, limit, offset,
      sort: req.query.sort,
    });
    return success(res, data.items, data.meta);
  } catch (err) { return next(err); }
}

async function getOne(req, res, next) {
  try {
    return success(res, await placeService.getById(req.params.id, resolveLang(req)));
  } catch (err) { return next(err); }
}

async function create(req, res, next) {
  try {
    requireFields(req.body, ['code']);
    return created(res, await placeService.create(placePayload(req.body)));
  } catch (err) { return next(err); }
}

async function update(req, res, next) {
  try {
    return success(res, await placeService.update(req.params.id, placePayload(req.body)));
  } catch (err) { return next(err); }
}

async function setStatus(req, res, next) {
  try {
    const status = String(req.body.status || '').toUpperCase();
    if (!['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(status)) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'status must be DRAFT, PUBLISHED or ARCHIVED.');
    }
    return success(res, await placeService.setStatus(req.params.id, status));
  } catch (err) { return next(err); }
}

async function remove(req, res, next) {
  try {
    return success(res, await placeService.remove(req.params.id));
  } catch (err) { return next(err); }
}

// ---------- Translations ----------
async function listTranslations(req, res, next) {
  try {
    return success(res, await placeService.listTranslations(req.params.id));
  } catch (err) { return next(err); }
}

async function upsertTranslation(req, res, next) {
  try {
    requireFields(req.body, ['language_id', 'name']);
    const row = await placeService.upsertTranslation(req.params.id, req.body);
    return created(res, row);
  } catch (err) { return next(err); }
}

async function deleteTranslation(req, res, next) {
  try {
    await placeService.deleteTranslation(req.params.translationId);
    return success(res, { id: Number(req.params.translationId), deleted: true });
  } catch (err) { return next(err); }
}

// ---------- Images ----------
async function listImages(req, res, next) {
  try { return success(res, await placeService.listImages(req.params.id)); } catch (err) { return next(err); }
}

async function addImage(req, res, next) {
  try {
    if (!req.file) throw new ApiError(400, 'VALIDATION_ERROR', 'Image file is required (field name: image).');
    const image_url = placeService.publicUrl(req, `${req.file.path.replace(/\\/g, '/')}`);
    const row = await placeService.addImage(req.params.id, {
      image_url,
      alt_text: req.body.alt_text,
      is_primary: toBoolOrNull(req.body.is_primary),
    });
    return created(res, row);
  } catch (err) { return next(err); }
}

async function updateImage(req, res, next) {
  try {
    return success(res, await placeService.updateImage(req.params.id, req.params.imageId, {
      alt_text: req.body.alt_text,
      sort_order: toIntOrNull(req.body.sort_order),
      is_primary: toBoolOrNull(req.body.is_primary),
    }));
  } catch (err) { return next(err); }
}

async function deleteImage(req, res, next) {
  try {
    await placeService.deleteImage(req.params.id, req.params.imageId);
    return success(res, { id: Number(req.params.imageId), deleted: true });
  } catch (err) { return next(err); }
}

// ---------- Public guide ----------
async function publicGuide(req, res, next) {
  try {
    const id = toIntOrNull(req.params.id);
    if (!id) throw new ApiError(400, 'INVALID_PLACE_ID', 'Invalid place id.');
    const detail = await placeService.getFullDetail(id, resolveLang(req));
    if (detail.status === 'ARCHIVED') {
      throw new ApiError(410, 'PLACE_ARCHIVED', 'This culinary location is no longer available.');
    }
    return success(res, detail);
  } catch (err) { return next(err); }
}

async function nearby(req, res, next) {
  try {
    const lat = toFloatOrNull(req.query.lat);
    const lng = toFloatOrNull(req.query.lng);
    if (lat === null || lng === null) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'lat and lng query params are required.');
    }
    const radius = toIntOrNull(req.query.radius) || 2000;
    const limit = toIntOrNull(req.query.limit) || 10;
    const lang = resolveLang(req);
    const rows = await placeService.nearby(lat, lng, radius, lang, limit);
    return success(res, rows);
  } catch (err) { return next(err); }
}

async function logScan(req, res, next) {
  try {
    const id = toIntOrNull(req.params.id);
    if (!id) throw new ApiError(400, 'INVALID_PLACE_ID', 'Invalid place id.');
    const langId = toIntOrNull(req.body.language_id);
    await statsService.logScan({
      placeId: id,
      languageId: langId,
      deviceType: req.body.device_type,
      platform: req.body.platform,
      sessionId: req.body.anonymous_session_id,
    });
    return success(res, { logged: true });
  } catch (err) { return next(err); }
}

module.exports = {
  list, getOne, create, update, setStatus, remove,
  listTranslations, upsertTranslation, deleteTranslation,
  listImages, addImage, updateImage, deleteImage,
  publicGuide, nearby, logScan,
};
