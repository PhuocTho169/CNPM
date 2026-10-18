const db = require('../db');
const { ApiError } = require('../utils/errors');
const media = require('./mediaService');

// ---------- Categories ----------
async function listCategories({ appliesTo } = {}) {
  const where = [];
  const params = [];
  if (appliesTo) {
    where.push(`(applies_to = $1 OR applies_to = 'both')`);
    params.push(appliesTo);
  }
  const rows = await db.getMany(
    `SELECT * FROM categories ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY name`,
    params
  );
  return rows;
}

async function createCategory(data) {
  return db.getOne(
    `INSERT INTO categories (code, name, applies_to, icon) VALUES ($1,$2,$3,$4) RETURNING *`,
    [data.code, data.name, data.applies_to || 'both', data.icon || null]
  );
}

async function updateCategory(id, data) {
  const row = await db.getOne(
    `UPDATE categories SET name = COALESCE($2, name), applies_to = COALESCE($3, applies_to),
       icon = COALESCE($4, icon), is_active = COALESCE($5, is_active)
     WHERE id = $1 RETURNING *`,
    [id, data.name, data.applies_to, data.icon, data.is_active]
  );
  if (!row) throw new ApiError(404, 'CATEGORY_NOT_FOUND', 'Category not found.');
  return row;
}

async function deleteCategory(id) {
  const row = await db.getOne('DELETE FROM categories WHERE id = $1 RETURNING id', [id]);
  if (!row) throw new ApiError(404, 'CATEGORY_NOT_FOUND', 'Category not found.');
  return row;
}

// ---------- Languages ----------
async function listLanguages(activeOnly = false) {
  return db.getMany(
    `SELECT * FROM languages ${activeOnly ? 'WHERE is_active = true' : ''} ORDER BY id`
  );
}

async function createLanguage(data) {
  const row = await db.getOne(
    `INSERT INTO languages (code, name, native_name, bcl, voice_note, is_active) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [String(data.code).trim().toLowerCase(), data.name, data.native_name, data.bcl || null, data.voice_note || null, data.is_active ?? true]
  );
  // The TTS layer caches locales/voices per code — a new language must be
  // visible to it immediately.
  media.invalidateLanguageCache();
  return row;
}

async function updateLanguage(id, data) {
  const row = await db.getOne(
    `UPDATE languages SET name = COALESCE($2, name), native_name = COALESCE($3, native_name),
       bcl = COALESCE($4, bcl), voice_note = COALESCE($5, voice_note),
       is_active = COALESCE($6, is_active) WHERE id = $1 RETURNING *`,
    [id, data.name, data.native_name, data.bcl, data.voice_note, data.is_active]
  );
  if (!row) throw new ApiError(404, 'LANGUAGE_NOT_FOUND', 'Language not found.');
  // Editing `bcl` / `voice_note` changes the voice the next clip is generated with.
  media.invalidateLanguageCache();
  return row;
}

// Tables that hold real content for a language: deleting the language would
// destroy curated copy, so the API refuses with 409 instead.
const LANGUAGE_CONTENT_TABLES = [
  ['culinary_place_translations', 'place translations'],
  ['dish_translations', 'dish translations'],
  ['route_translations', 'route translations'],
];

// Analytics tables that only carry the language as a dimension. Their
// `language_id` is nullable, so we clear it (keeping the scan/play/history row
// itself) instead of letting the foreign key blow up as a 500.
const LANGUAGE_LOG_TABLES = ['scan_logs', 'audio_play_logs', 'visitor_history'];

async function deleteLanguage(id) {
  const lang = await db.getOne('SELECT id, code FROM languages WHERE id = $1', [id]);
  if (!lang) throw new ApiError(404, 'LANGUAGE_NOT_FOUND', 'Language not found.');

  const blockers = [];
  for (const [table, label] of LANGUAGE_CONTENT_TABLES) {
    const row = await db.getOne(`SELECT count(*)::int AS c FROM ${table} WHERE language_id = $1`, [id]);
    if (row?.c) blockers.push(`${row.c} ${label}`);
  }
  if (blockers.length) {
    throw new ApiError(
      409,
      'LANGUAGE_IN_USE',
      `This language still has content (${blockers.join(', ')}) and cannot be deleted. Deactivate it instead.`
    );
  }

  for (const table of LANGUAGE_LOG_TABLES) {
    await db.query(`UPDATE ${table} SET language_id = NULL WHERE language_id = $1`, [id]);
  }

  const row = await db.getOne('DELETE FROM languages WHERE id = $1 RETURNING id', [id]);
  if (!row) throw new ApiError(404, 'LANGUAGE_NOT_FOUND', 'Language not found.');
  media.invalidateLanguageCache();
  return row;
}

// ---------- Dishes ----------
async function listDishes({ placeId, lang, q, status, page, limit, offset }) {
  const params = [lang];
  const where = [];
  if (placeId) { params.push(placeId); where.push(`d.culinary_place_id = $${params.length}`); }
  if (status) { params.push(status); where.push(`d.status = $${params.length}`); }
  if (q) {
    params.push(`%${q}%`);
    where.push(`(dt.name ILIKE $${params.length} OR dt.description ILIKE $${params.length})`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = await db.getOne(
    `SELECT count(*)::int AS c FROM dishes d
     LEFT JOIN dish_translations dt ON dt.dish_id = d.id
       AND dt.language_id = (SELECT id FROM languages WHERE code = $1) ${whereSql}`,
    params
  );
  const rows = await db.getMany(
    `SELECT d.id, d.code, d.culinary_place_id, d.price, d.image_url, d.is_signature, d.status,
            c.code AS category_code, c.name AS category_name,
            p.code AS place_code, dt.name, dt.description, dt.ingredients,
            da.id AS audio_id, da.file_url, da.duration, da.source,
            (SELECT array_agg(l2.code ORDER BY l2.code) FROM dish_translations dt2
              JOIN languages l2 ON l2.id = dt2.language_id WHERE dt2.dish_id = d.id) AS language_codes
     FROM dishes d
     LEFT JOIN categories c ON c.id = d.category_id
     LEFT JOIN culinary_places p ON p.id = d.culinary_place_id
     LEFT JOIN dish_translations dt ON dt.dish_id = d.id
       AND dt.language_id = (SELECT id FROM languages WHERE code = $1)
     LEFT JOIN dish_audio_guides da ON da.translation_id = dt.id
     ${whereSql}
     ORDER BY d.culinary_place_id, d.is_signature DESC, d.id
     LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
    params
  );
  return {
    items: rows.map((r) => {
      const item = {
        id: r.id,
        code: r.code,
        culinary_place_id: r.culinary_place_id,
        price: r.price,
        image_url: r.image_url,
        is_signature: r.is_signature,
        status: r.status,
        category_code: r.category_code,
        category_name: r.category_name,
        place_code: r.place_code,
        name: r.name,
        description: r.description,
        ingredients: r.ingredients,
        language_codes: r.language_codes || [],
      };
      item.audio = r.audio_id
        ? { id: r.audio_id, file_url: r.file_url, duration: r.duration, source: r.source }
        : null;
      return item;
    }),
    meta: { page, limit, total: total?.c || 0, total_pages: Math.ceil((total?.c || 0) / limit) },
  };
}

async function getDish(id, lang) {
  const row = await db.getOne(
    `SELECT d.id, d.code, d.culinary_place_id, d.price, d.image_url, d.is_signature, d.status,
            c.code AS category_code, c.name AS category_name,
            dt.name, dt.description, dt.ingredients, dt.cultural_information,
            da.id AS audio_id, da.file_url, da.duration, da.source,
            p.latitude, p.longitude, p.address, p.opening_time, p.closing_time,
            p.price_range AS place_price_range,
            pi.image_url AS place_image_url
     FROM dishes d
     LEFT JOIN categories c ON c.id = d.category_id
     LEFT JOIN dish_translations dt ON dt.dish_id = d.id
       AND dt.language_id = (SELECT id FROM languages WHERE code = $2)
     LEFT JOIN dish_audio_guides da ON da.translation_id = dt.id
     LEFT JOIN culinary_places p ON p.id = d.culinary_place_id
     LEFT JOIN LATERAL (
       SELECT image_url FROM culinary_place_images pi
       WHERE pi.culinary_place_id = d.culinary_place_id
       ORDER BY pi.is_primary DESC, pi.sort_order ASC LIMIT 1
     ) pi ON true
     WHERE d.id = $1`,
    [id, lang]
  );
  if (!row) throw new ApiError(404, 'DISH_NOT_FOUND', 'The dish could not be found.');
  const dish = {
    id: row.id,
    code: row.code,
    culinary_place_id: row.culinary_place_id,
    price: row.price,
    image_url: row.image_url,
    is_signature: row.is_signature,
    status: row.status,
    category_code: row.category_code,
    category_name: row.category_name,
    name: row.name,
    description: row.description,
    ingredients: row.ingredients,
    cultural_information: row.cultural_information,
    place: row.culinary_place_id ? {
      id: row.culinary_place_id,
      latitude: row.latitude,
      longitude: row.longitude,
      address: row.address,
      opening_time: row.opening_time,
      closing_time: row.closing_time,
      price_range: row.place_price_range,
      primary_image: row.place_image_url,
    } : null,
  };
  dish.audio = row.audio_id
    ? { id: row.audio_id, file_url: row.file_url, duration: row.duration, source: row.source }
    : null;
  return dish;
}

async function createDish(data) {
  return db.getOne(
    `INSERT INTO dishes (code, culinary_place_id, category_id, price, image_url, is_signature, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [data.code, data.culinary_place_id, data.category_id, data.price, data.image_url, data.is_signature ?? false, data.status || 'PUBLISHED']
  );
}

async function updateDish(id, data) {
  const row = await db.getOne(
    `UPDATE dishes SET code = COALESCE($2, code), culinary_place_id = COALESCE($3, culinary_place_id),
       category_id = COALESCE($4, category_id), price = COALESCE($5, price), image_url = COALESCE($6, image_url),
       is_signature = COALESCE($7, is_signature), status = COALESCE($8, status)
     WHERE id = $1 RETURNING *`,
    [id, data.code, data.culinary_place_id, data.category_id, data.price, data.image_url, data.is_signature, data.status]
  );
  if (!row) throw new ApiError(404, 'DISH_NOT_FOUND', 'The dish could not be found.');
  return row;
}

async function deleteDish(id) {
  const row = await db.getOne('DELETE FROM dishes WHERE id = $1 RETURNING id', [id]);
  if (!row) throw new ApiError(404, 'DISH_NOT_FOUND', 'The dish could not be found.');
  return row;
}

async function upsertDishTranslation(dishId, { language_id, name, description, ingredients, cultural_information }) {
  if (!language_id || !name) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'language_id and name are required.');
  }
  return db.getOne(
    `INSERT INTO dish_translations (dish_id, language_id, name, description, ingredients, cultural_information)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (dish_id, language_id) DO UPDATE SET
       name = EXCLUDED.name, description = EXCLUDED.description,
       ingredients = EXCLUDED.ingredients, cultural_information = EXCLUDED.cultural_information
     RETURNING *`,
    [dishId, language_id, name, description, ingredients, cultural_information]
  );
}

// ---------- Culinary routes ----------
async function listRoutes({ status, lang }) {
  const rows = await db.getMany(
    `SELECT r.*, t.name AS t_name, t.description AS t_description FROM culinary_routes r
     LEFT JOIN route_translations t ON t.route_id = r.id
       AND t.language_id = (SELECT id FROM languages WHERE code = $1)
     ${status ? 'WHERE r.status = $2' : ''}
     ORDER BY r.id`,
    status ? [lang, status] : [lang]
  );
  const stops = await db.getMany(
    `SELECT s.route_id, s.position, s.note, p.id AS place_id, p.code AS place_code,
            t.name AS place_name, prim.image_url AS place_image, c.name AS category_name
     FROM route_stops s
     JOIN culinary_places p ON p.id = s.culinary_place_id
     LEFT JOIN culinary_place_translations t ON t.culinary_place_id = p.id
       AND t.language_id = (SELECT id FROM languages WHERE code = $1)
     LEFT JOIN categories c ON c.id = p.category_id
     LEFT JOIN LATERAL (
       SELECT image_url FROM culinary_place_images pi WHERE pi.culinary_place_id = p.id
       ORDER BY pi.is_primary DESC, pi.sort_order ASC LIMIT 1
     ) prim ON true
     ORDER BY s.route_id, s.position`,
    [lang]
  );
  return rows.map((r) => ({
    ...r,
    name: r.t_name || r.name,
    description: r.t_description || r.description,
    stops: stops.filter((s) => s.route_id === r.id),
  }));
}

async function getRoute(id, lang) {
  const rows = await listRoutes({ lang });
  const route = rows.find((r) => r.id === Number(id));
  if (!route) throw new ApiError(404, 'ROUTE_NOT_FOUND', 'Culinary route not found.');
  return route;
}

async function createRoute(data) {
  return db.getOne(
    `INSERT INTO culinary_routes (code, name, description, estimated_duration, distance, difficulty, cover_image_url, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [data.code, data.name, data.description, data.estimated_duration, data.distance, data.difficulty || 'EASY', data.cover_image_url, data.status || 'DRAFT']
  );
}

async function updateRoute(id, data) {
  const row = await db.getOne(
    `UPDATE culinary_routes SET code = COALESCE($2, code), name = COALESCE($3, name), description = COALESCE($4, description),
       estimated_duration = COALESCE($5, estimated_duration), distance = COALESCE($6, distance),
       difficulty = COALESCE($7, difficulty), cover_image_url = COALESCE($8, cover_image_url), status = COALESCE($9, status)
     WHERE id = $1 RETURNING *`,
    [id, data.code, data.name, data.description, data.estimated_duration, data.distance, data.difficulty, data.cover_image_url, data.status]
  );
  if (!row) throw new ApiError(404, 'ROUTE_NOT_FOUND', 'Culinary route not found.');
  return row;
}

async function deleteRoute(id) {
  const row = await db.getOne('DELETE FROM culinary_routes WHERE id = $1 RETURNING id', [id]);
  if (!row) throw new ApiError(404, 'ROUTE_NOT_FOUND', 'Culinary route not found.');
  return row;
}

async function addStop(routeId, { culinary_place_id, position, note }) {
  let pos = position;
  if (!pos) {
    const max = await db.getOne('SELECT COALESCE(MAX(position),0) AS m FROM route_stops WHERE route_id = $1', [routeId]);
    pos = (max?.m || 0) + 1;
  }
  await db.query('UPDATE route_stops SET position = position + 1 WHERE route_id = $1 AND position >= $2', [routeId, pos]);
  return db.getOne(
    `INSERT INTO route_stops (route_id, culinary_place_id, position, note) VALUES ($1,$2,$3,$4) RETURNING *`,
    [routeId, culinary_place_id, pos, note]
  );
}

async function updateStop(stopId, { position, note }) {
  return db.getOne(
    `UPDATE route_stops SET position = COALESCE($2, position), note = COALESCE($3, note) WHERE id = $1 RETURNING *`,
    [stopId, position, note]
  );
}

async function deleteStop(stopId) {
  const row = await db.getOne('DELETE FROM route_stops WHERE id = $1 RETURNING route_id, position', [stopId]);
  if (row) {
    await db.query('UPDATE route_stops SET position = position - 1 WHERE route_id = $1 AND position > $2', [row.route_id, row.position]);
  }
  return row;
}

module.exports = {
  listCategories, createCategory, updateCategory, deleteCategory,
  listLanguages, createLanguage, updateLanguage, deleteLanguage,
  listDishes, getDish, createDish, updateDish, deleteDish, upsertDishTranslation,
  listRoutes, getRoute, createRoute, updateRoute, deleteRoute, addStop, updateStop, deleteStop,
};
