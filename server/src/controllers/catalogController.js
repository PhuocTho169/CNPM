const catalog = require('../services/catalogService');
const { success, created, ApiError } = require('../utils/errors');
const { requireFields, toIntOrNull, toBoolOrNull } = require('../validators');
const { parsePagination } = require('../utils/paginate');

const DEFAULT_LANG = 'vi';
const resolveLang = (req) => (req.query.lang || DEFAULT_LANG).toLowerCase();

// ---------- Categories ----------
async function listCategories(req, res, next) {
  try { return success(res, await catalog.listCategories({ appliesTo: req.query.applies_to })); } catch (err) { return next(err); }
}

async function createCategory(req, res, next) {
  try {
    requireFields(req.body, ['code', 'name']);
    return created(res, await catalog.createCategory(req.body));
  } catch (err) { return next(err); }
}

async function updateCategory(req, res, next) {
  try { return success(res, await catalog.updateCategory(req.params.id, req.body)); } catch (err) { return next(err); }
}

async function deleteCategory(req, res, next) {
  try { return success(res, await catalog.deleteCategory(req.params.id)); } catch (err) { return next(err); }
}

// ---------- Languages ----------
async function listLanguages(req, res, next) {
  try {
    const activeOnly = req.query.active_only === 'true';
    return success(res, await catalog.listLanguages(activeOnly));
  } catch (err) { return next(err); }
}

async function createLanguage(req, res, next) {
  try {
    requireFields(req.body, ['code', 'name', 'native_name']);
    return created(res, await catalog.createLanguage(req.body));
  } catch (err) { return next(err); }
}

async function updateLanguage(req, res, next) {
  try { return success(res, await catalog.updateLanguage(req.params.id, req.body)); } catch (err) { return next(err); }
}

async function deleteLanguage(req, res, next) {
  try { return success(res, await catalog.deleteLanguage(req.params.id)); } catch (err) { return next(err); }
}

// ---------- Dishes ----------
async function listDishes(req, res, next) {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const data = await catalog.listDishes({
      placeId: toIntOrNull(req.query.place_id),
      lang: resolveLang(req),
      q: req.query.q,
      status: req.query.status,
      page, limit, offset,
    });
    return success(res, data.items, data.meta);
  } catch (err) { return next(err); }
}

async function getDish(req, res, next) {
  try { return success(res, await catalog.getDish(req.params.id, resolveLang(req))); } catch (err) { return next(err); }
}

async function createDish(req, res, next) {
  try {
    requireFields(req.body, ['code', 'culinary_place_id']);
    return created(res, await catalog.createDish({
      ...req.body,
      category_id: toIntOrNull(req.body.category_id),
      is_signature: toBoolOrNull(req.body.is_signature) ?? false,
    }));
  } catch (err) { return next(err); }
}

async function updateDish(req, res, next) {
  try {
    return success(res, await catalog.updateDish(req.params.id, {
      ...req.body,
      category_id: toIntOrNull(req.body.category_id),
      is_signature: toBoolOrNull(req.body.is_signature),
    }));
  } catch (err) { return next(err); }
}

async function deleteDish(req, res, next) {
  try { return success(res, await catalog.deleteDish(req.params.id)); } catch (err) { return next(err); }
}

async function upsertDishTranslation(req, res, next) {
  try {
    requireFields(req.body, ['language_id', 'name']);
    return created(res, await catalog.upsertDishTranslation(req.params.id, req.body));
  } catch (err) { return next(err); }
}

async function uploadDishImage(req, res, next) {
  try {
    if (!req.file) throw new ApiError(400, 'VALIDATION_ERROR', 'Image file is required (field name: image).');
    const placeService = require('../services/placeService');
    const image_url = placeService.publicUrl(req, req.file.path.replace(/\\/g, '/'));
    return success(res, await catalog.updateDish(req.params.id, { image_url }));
  } catch (err) { return next(err); }
}

// ---------- Routes ----------
async function listRoutes(req, res, next) {
  try {
    return success(res, await catalog.listRoutes({ status: req.query.status, lang: resolveLang(req) }));
  } catch (err) { return next(err); }
}

async function getRoute(req, res, next) {
  try { return success(res, await catalog.getRoute(req.params.id, resolveLang(req))); } catch (err) { return next(err); }
}

async function createRoute(req, res, next) {
  try {
    requireFields(req.body, ['code', 'name']);
    return created(res, await catalog.createRoute(req.body));
  } catch (err) { return next(err); }
}

async function updateRoute(req, res, next) {
  try { return success(res, await catalog.updateRoute(req.params.id, req.body)); } catch (err) { return next(err); }
}

async function deleteRoute(req, res, next) {
  try { return success(res, await catalog.deleteRoute(req.params.id)); } catch (err) { return next(err); }
}

async function addStop(req, res, next) {
  try {
    requireFields(req.body, ['culinary_place_id']);
    return created(res, await catalog.addStop(req.params.id, {
      culinary_place_id: toIntOrNull(req.body.culinary_place_id),
      position: toIntOrNull(req.body.position),
      note: req.body.note,
    }));
  } catch (err) { return next(err); }
}

async function updateStop(req, res, next) {
  try {
    return success(res, await catalog.updateStop(req.params.stopId, {
      position: toIntOrNull(req.body.position),
      note: req.body.note,
    }));
  } catch (err) { return next(err); }
}

async function deleteStop(req, res, next) {
  try { return success(res, await catalog.deleteStop(req.params.stopId)); } catch (err) { return next(err); }
}

module.exports = {
  listCategories, createCategory, updateCategory, deleteCategory,
  listLanguages, createLanguage, updateLanguage, deleteLanguage,
  listDishes, getDish, createDish, updateDish, deleteDish, upsertDishTranslation, uploadDishImage,
  listRoutes, getRoute, createRoute, updateRoute, deleteRoute, addStop, updateStop, deleteStop,
};
