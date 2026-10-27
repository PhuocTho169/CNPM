const db = require('../db');
const { ApiError } = require('../utils/errors');
const media = require('./mediaService');
const dishAudio = require('./dishAudioService');

const TRANSLATION_COLS = `t.id, t.entity_id AS place_id, t.language_id, l.code AS language_code,
  t.name, t.short_description, t.description, t.history, t.cultural_significance, t.tourist_tips`;

function publicUrl(req, filePath) {
  return `${req.protocol}://${req.get('host')}/${String(filePath).replace(/\\/g, '/')}`;
}

function decoratePlace(row, lang) {
  return {
    id: row.id,
    code: row.code,
    status: row.status,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    // GPS audio-zone geometry (migration 002, per-place admin values)
    zone_radius: row.zone_radius ?? 100,
    zone_exit_buffer: row.zone_exit_buffer ?? 20,
    phone: row.phone,
    website: row.website,
    price_range: row.price_range,
    opening_time: row.opening_time,
    closing_time: row.closing_time,
    is_recommended: row.is_recommended,
    category: { id: row.category_id, code: row.category_code, name: row.category_name, icon: row.category_icon },
    primary_image: row.primary_image || null,
    image_count: row.image_count ? Number(row.image_count) : 0,
    dish_count: row.dish_count ? Number(row.dish_count) : 0,
    language_codes: row.language_codes || [],
    has_audio: row.has_audio || false,
    has_qr: !!row.has_qr,
    qr_value: row.qr_value || null,
    qr_image_url: row.qr_image_url || null,
    translation: row.t_name !== null && row.t_name !== undefined
      ? {
          name: row.t_name,
          short_description: row.t_short_description,
          description: row.t_description,
          history: row.t_history,
          cultural_significance: row.t_cultural_significance,
          tourist_tips: row.t_tourist_tips,
        }
      : null,
    _requested_lang: lang,
  };
}

function listSelect(lang) {
  return `
    SELECT p.*, c.code AS category_code, c.name AS category_name, c.icon AS category_icon,
      prim.url AS primary_image,
      (SELECT count(*) FROM media_files i
        WHERE i.entity_type = 'place' AND i.entity_id = p.id AND i.kind = 'image') AS image_count,
      (SELECT count(*) FROM dishes d WHERE d.culinary_place_id = p.id) AS dish_count,
      (SELECT array_agg(l2.code ORDER BY l2.code) FROM translations t2
        JOIN languages l2 ON l2.id = t2.language_id
        WHERE t2.entity_type = 'place' AND t2.entity_id = p.id) AS language_codes,
      EXISTS (SELECT 1 FROM translations t3 JOIN media_files a
        ON a.entity_type = 'translation' AND a.entity_id = t3.id AND a.kind = 'audio'
        WHERE t3.entity_type = 'place' AND t3.entity_id = p.id) AS has_audio,
      (SELECT qr.metadata->>'qr_value' FROM media_files qr
        WHERE qr.entity_type = 'place' AND qr.entity_id = p.id AND qr.kind = 'qr' LIMIT 1) AS qr_value,
      (SELECT qr.url FROM media_files qr
        WHERE qr.entity_type = 'place' AND qr.entity_id = p.id AND qr.kind = 'qr' LIMIT 1) AS qr_image_url,
      EXISTS (SELECT 1 FROM media_files qr2
        WHERE qr2.entity_type = 'place' AND qr2.entity_id = p.id AND qr2.kind = 'qr') AS has_qr,
      t.name AS t_name, t.short_description AS t_short_description, t.description AS t_description,
      t.history AS t_history, t.cultural_significance AS t_cultural_significance, t.tourist_tips AS t_tourist_tips
    FROM culinary_places p
    LEFT JOIN categories c ON c.id = p.category_id
    LEFT JOIN translations t
      ON t.entity_type = 'place' AND t.entity_id = p.id
      AND t.language_id = (SELECT id FROM languages WHERE code = $1)
    LEFT JOIN LATERAL (
      SELECT url FROM media_files pi
      WHERE pi.entity_type = 'place' AND pi.entity_id = p.id AND pi.kind = 'image'
      ORDER BY pi.is_primary DESC, pi.sort_order ASC LIMIT 1
    ) prim ON true`;
}

async function list({ lang, category, q, status, price, openNow, recommended, page, limit, offset, sort }) {
  const params = [lang];
  const where = [];
  if (status === 'PUBLISHED') where.push(`p.status = 'PUBLISHED'`);
  else if (status) where.push(`p.status = $${params.push(status)}`);
  if (category) where.push(`c.code = $${params.push(category)}`);
  if (price === 'budget') where.push(`p.price_max <= 70000`);
  if (price === 'mid') where.push(`p.price_max BETWEEN 70000 AND 150000`);
  if (price === 'premium') where.push(`p.price_max > 150000`);
  if (openNow === 'true') {
    where.push(`p.opening_time IS NOT NULL AND p.closing_time IS NOT NULL
      AND (
        (p.opening_time < p.closing_time AND (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::time
          BETWEEN p.opening_time AND p.closing_time)
        OR
        (p.opening_time > p.closing_time AND (
          (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::time >= p.opening_time
          OR (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::time <= p.closing_time
        ))
      )`);
  }
  if (recommended) where.push(`p.is_recommended = true`);
  if (q) {
    params.push(`%${q}%`);
    const idx = params.length;
    where.push(`(
      t.name ILIKE $${idx} OR c.name ILIKE $${idx}
      OR EXISTS (SELECT 1 FROM translations t2
        WHERE t2.entity_type = 'place' AND t2.entity_id = p.id AND t2.name ILIKE $${idx})
      OR EXISTS (SELECT 1 FROM translations dt JOIN dishes d
                   ON d.id = dt.entity_id AND dt.entity_type = 'dish'
                 WHERE d.culinary_place_id = p.id
                   AND (dt.name ILIKE $${idx} OR COALESCE(dt.ingredients, '') ILIKE $${idx}))
    )`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const orderSql =
    sort === 'name' ? 'ORDER BY t.name NULLS LAST, p.id' : 'ORDER BY p.is_recommended DESC, p.id ASC';

  const total = await db.getOne(
    `SELECT count(*)::int AS c FROM culinary_places p
     LEFT JOIN categories c ON c.id = p.category_id
     LEFT JOIN translations t
       ON t.entity_type = 'place' AND t.entity_id = p.id
       AND t.language_id = (SELECT id FROM languages WHERE code = $1)
     ${whereSql}`,
    params
  );

  const rows = await db.getMany(
    `${listSelect(lang)} ${whereSql} ${orderSql} LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
    params
  );

  return {
    items: rows.map((r) => decoratePlace(r, lang)),
    meta: { page, limit, total: total?.c || 0, total_pages: Math.ceil((total?.c || 0) / limit) },
  };
}

async function getById(id, lang) {
  const row = await db.getOne(`${listSelect(lang)} WHERE p.id = $2`, [lang, id]);
  if (!row) throw new ApiError(404, 'PLACE_NOT_FOUND', 'The culinary location could not be found.');
  return decoratePlace(row, lang);
}

async function getFullDetail(id, lang) {
  const place = await getById(id, lang);

  const translations = await db.getMany(
    `SELECT ${TRANSLATION_COLS} FROM translations t JOIN languages l ON l.id = t.language_id
     WHERE t.entity_type = 'place' AND t.entity_id = $1 ORDER BY t.language_id`,
    [id]
  );

  const audioRows = await db.getMany(
    `SELECT a.id, t.id AS translation_id, a.url AS file_url, a.duration, a.file_size, a.mime_type, a.source, a.created_at
     FROM media_files a
     JOIN translations t ON t.id = a.entity_id
     WHERE a.entity_type = 'translation' AND a.kind = 'audio'
       AND t.entity_type = 'place' AND t.entity_id = $1`,
    [id]
  );
  // Drop rows whose file vanished from disk (container rebuild, cleanup): they
  // 404 in the player and silence the guide. Removing the row lets the
  // audio_pending flow below regenerate the narration for that language.
  for (const a of audioRows) {
    if (a.file_url && media.audioFileMissing(a.file_url)) {
      await media.removeStaleAudio({ id: a.id, url: a.file_url });
      a._stale = true;
      const fullTranslation = translations.find((t) => t.id === a.translation_id);
      if (fullTranslation) media.scheduleTranslationAudio(fullTranslation);
    }
  }
  const audioByTranslation = {};
  for (const a of audioRows) {
    if (a._stale || audioByTranslation[a.translation_id]) continue;
    audioByTranslation[a.translation_id] = a;
  }

  place.translations = translations.map((t) => ({
    ...t,
    audio: audioByTranslation[t.id]
      ? { id: audioByTranslation[t.id].id, file_url: audioByTranslation[t.id].file_url, duration: audioByTranslation[t.id].duration, source: audioByTranslation[t.id].source }
      : null,
  }));

  // Resolve the current translation against `place.translations` — the rows
  // already decorated with their `audio` record above. Testing the raw rows was
  // a bug: they carry no `audio` key, so every request looked like a missing
  // file and re-generated the narration (a fresh MP3, a fresh DB write) on
  // every single guide view.
  const current = place.translations.find((t) => t.language_code === lang);
  place.current_language = current ? current.language_code : place.translations[0]?.language_code || null;

  // Auto-TTS: nếu bản dịch đang chọn chưa có file giọng đọc, tạo nền bằng giọng bản xứ
  // (keyless). Lần mở guide này vẫn fallback sang browser TTS; các lần sau phát file ngay.
  const currentTranslation = current || place.translations[0] || null;
  if (currentTranslation && !currentTranslation.audio) {
    if (media.scheduleTranslationAudio(currentTranslation)) {
      // Set on the object that is actually serialised, so the player can tell
      // the visitor that the official file is being generated.
      currentTranslation.audio_pending = true;
    }
  }

  // The visitor picked a language with no translation at all. Rather than show an
  // empty guide, fall back to the richest available translation (one that has
  // audio) so the page is never blank.
  if (!current) {
    const withAudio = place.translations.find((t) => t.audio) || place.translations[0];
    if (withAudio) place.translation_fallback_language = withAudio.language_code;
  }

  place.images = await db.getMany(
    `SELECT id, url AS image_url, alt_text, sort_order, is_primary
     FROM media_files
     WHERE entity_type = 'place' AND entity_id = $1 AND kind = 'image'
     ORDER BY is_primary DESC, sort_order ASC`,
    [id]
  );

  const dishes = await db.getMany(
    `SELECT d.id, d.code, d.price, d.image_url, d.is_signature, d.status,
            c.code AS category_code, c.name AS category_name,
            dt.id AS translation_id, dt.name, dt.description, dt.ingredients,
            da.url AS audio_url, da.duration AS audio_duration, da.source AS audio_source
     FROM dishes d
     LEFT JOIN categories c ON c.id = d.category_id
     LEFT JOIN translations dt
       ON dt.entity_type = 'dish' AND dt.entity_id = d.id
       AND dt.language_id = (SELECT id FROM languages WHERE code = $2)
     LEFT JOIN media_files da
       ON da.entity_type = 'translation' AND da.entity_id = dt.id AND da.kind = 'audio'
     WHERE d.culinary_place_id = $1 AND d.status = 'PUBLISHED'
     ORDER BY d.is_signature DESC, d.id ASC`,
    [id, lang]
  );

  // Dish fallback: nếu ngôn ngữ yêu cầu chưa có bản dịch món, dùng bản tiếng Việt
  // để card món không bao giờ trống.
  const dishFallbacks = await db.getMany(
    `SELECT dt.entity_id AS dish_id, dt.name, dt.description
     FROM translations dt
     JOIN languages l ON l.id = dt.language_id
     WHERE dt.entity_type = 'dish' AND l.code = 'vi'
       AND dt.entity_id IN (SELECT id FROM dishes WHERE culinary_place_id = $1)`,
    [id]
  );
  const fbMap = {};
  for (const fb of dishFallbacks) fbMap[fb.dish_id] = fb;

  // Dish audio rows pointing at files that no longer exist would 404 in the
  // player. Drop the row and let the regeneration below schedule a fresh file.
  for (const d of dishes) {
    if (d.audio_url && media.audioFileMissing(d.audio_url)) {
      if (d.translation_id) {
        await db.query(
          `DELETE FROM media_files WHERE entity_type = 'translation' AND entity_id = $1 AND kind = 'audio'`,
          [d.translation_id]
        );
      }
      console.warn(`[audio] stale dish audio removed: ${d.audio_url}`);
      d.audio_url = null;
    }
  }

  place.dishes = dishes.map((d) => ({
    ...d,
    name: d.name || fbMap[d.id]?.name || null,
    description: d.description || fbMap[d.id]?.description || null,
    _fallback: !d.name && !!fbMap[d.id],
    // Per-dish narration for the requested language.
    audio: d.audio_url
      ? { file_url: d.audio_url, duration: d.audio_duration, source: d.audio_source }
      : null,
  }));

  // Kick off dish narration for any dish in the current language that has none,
  // so the player does not fall back to the browser voice.
  for (const d of place.dishes) {
    if (!d.audio && d.translation_id) {
      dishAudio.scheduleTranslationAudio({
        id: d.translation_id,
        name: d.name,
        description: d.description,
        ingredients: d.ingredients,
        language_code: lang,
      });
      d.audio_pending = true;
    }
  }

  return place;
}

async function create(data) {
  const row = await db.getOne(
    `INSERT INTO culinary_places (code, category_id, address, latitude, longitude, phone, website,
       price_range, price_min, price_max, opening_time, closing_time, is_recommended, status,
       zone_radius, zone_exit_buffer)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
    [data.code, data.category_id, data.address, data.latitude, data.longitude, data.phone, data.website,
     data.price_range, data.price_min, data.price_max, data.opening_time, data.closing_time,
     data.is_recommended ?? false, data.status || 'DRAFT',
     data.zone_radius ?? 100, data.zone_exit_buffer ?? 20]
  );
  // Tự động tạo QR code khi place được publish
  if (row && row.status === 'PUBLISHED') {
    try {
      await media.generateQR(row.id, { regenerate: false });
    } catch (err) {
      console.warn(`[placeService] Failed to auto-generate QR for place ${row.id}:`, err.message);
    }
  }
  return row;
}

async function update(id, data) {
  const row = await db.getOne(
    `UPDATE culinary_places SET
       code = COALESCE($2, code), category_id = COALESCE($3, category_id),
       address = COALESCE($4, address), latitude = COALESCE($5, latitude), longitude = COALESCE($6, longitude),
       phone = COALESCE($7, phone), website = COALESCE($8, website),
       price_range = COALESCE($9, price_range), price_min = COALESCE($10, price_min), price_max = COALESCE($11, price_max),
       opening_time = COALESCE($12, opening_time), closing_time = COALESCE($13, closing_time),
       is_recommended = COALESCE($14, is_recommended), status = COALESCE($15, status),
       zone_radius = COALESCE($16, zone_radius), zone_exit_buffer = COALESCE($17, zone_exit_buffer)
     WHERE id = $1 RETURNING *`,
    [id, data.code, data.category_id, data.address, data.latitude, data.longitude, data.phone, data.website,
     data.price_range, data.price_min, data.price_max, data.opening_time, data.closing_time,
     data.is_recommended, data.status, data.zone_radius, data.zone_exit_buffer]
  );
  if (!row) throw new ApiError(404, 'PLACE_NOT_FOUND', 'The culinary location could not be found.');
  return row;
}

async function setStatus(id, status) {
  const row = await db.getOne(
    `UPDATE culinary_places SET status = $2 WHERE id = $1 RETURNING id, status`,
    [id, status]
  );
  if (!row) throw new ApiError(404, 'PLACE_NOT_FOUND', 'The culinary location could not be found.');
  return row;
}

async function remove(id) {
  const row = await db.getOne('DELETE FROM culinary_places WHERE id = $1 RETURNING id', [id]);
  if (!row) throw new ApiError(404, 'PLACE_NOT_FOUND', 'The culinary location could not be found.');
  return row;
}

async function getTranslation(placeId, lang) {
  return db.getOne(
    `SELECT t.id, t.entity_id AS place_id, t.language_id, l.code AS language_code,
            t.name, t.short_description, t.description, t.history, t.cultural_significance, t.tourist_tips
     FROM translations t
     JOIN languages l ON l.id = t.language_id
     WHERE t.entity_type = 'place' AND t.entity_id = $1 AND l.code = $2`,
    [placeId, lang]
  );
}

async function listTranslations(placeId) {
  return db.getMany(
    `SELECT ${TRANSLATION_COLS} FROM translations t JOIN languages l ON l.id = t.language_id
     WHERE t.entity_type = 'place' AND t.entity_id = $1 ORDER BY t.language_id`,
    [placeId]
  );
}

async function upsertTranslation(placeId, { language_id, name, short_description, description, history, cultural_significance, tourist_tips }) {
  if (!language_id || !name) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'language_id and name are required.');
  }
  const lang = await db.getOne('SELECT id FROM languages WHERE id = $1', [language_id]);
  if (!lang) throw new ApiError(404, 'LANGUAGE_NOT_FOUND', 'The language could not be found.');

  return db.getOne(
    `INSERT INTO translations
       (entity_type, entity_id, language_id, name, short_description, description, history, cultural_significance, tourist_tips)
     VALUES ('place', $1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (entity_type, entity_id, language_id) DO UPDATE SET
       name = EXCLUDED.name, short_description = EXCLUDED.short_description, description = EXCLUDED.description,
       history = EXCLUDED.history, cultural_significance = EXCLUDED.cultural_significance, tourist_tips = EXCLUDED.tourist_tips
     RETURNING *`,
    [placeId, language_id, name, short_description, description, history, cultural_significance, tourist_tips]
  );
}

async function deleteTranslation(translationId) {
  await db.query("DELETE FROM translations WHERE id = $1 AND entity_type = 'place'", [translationId]);
}

async function listImages(placeId) {
  return db.getMany(
    `SELECT id, url AS image_url, alt_text, sort_order, is_primary, created_at FROM media_files
     WHERE entity_type = 'place' AND entity_id = $1 AND kind = 'image'
     ORDER BY is_primary DESC, sort_order ASC`,
    [placeId]
  );
}

async function addImage(placeId, { image_url, alt_text, is_primary }) {
  if (is_primary) {
    await db.query(
      "UPDATE media_files SET is_primary = false WHERE entity_type = 'place' AND entity_id = $1 AND kind = 'image'",
      [placeId]
    );
  }
  return db.getOne(
    `INSERT INTO media_files (entity_type, entity_id, kind, url, alt_text, is_primary)
     VALUES ('place', $1, 'image', $2, $3, $4) RETURNING *`,
    [placeId, image_url, alt_text || null, !!is_primary]
  );
}

async function updateImage(placeId, imageId, { alt_text, sort_order, is_primary }) {
  if (is_primary) {
    await db.query(
      "UPDATE media_files SET is_primary = false WHERE entity_type = 'place' AND entity_id = $1 AND kind = 'image'",
      [placeId]
    );
  }
  return db.getOne(
    `UPDATE media_files SET
       alt_text = COALESCE($3, alt_text), sort_order = COALESCE($4, sort_order), is_primary = COALESCE($5, is_primary)
     WHERE id = $2 AND entity_type = 'place' AND entity_id = $1 AND kind = 'image' RETURNING *`,
    [placeId, imageId, alt_text ?? null, sort_order ?? null, is_primary ?? null]
  );
}

async function deleteImage(placeId, imageId) {
  await db.query(
    "DELETE FROM media_files WHERE id = $2 AND entity_type = 'place' AND entity_id = $1 AND kind = 'image'",
    [placeId, imageId]
  );
}

async function nearby(lat, lng, radiusMeters = 2000, lang = 'vi', limit = 10) {
  const rows = await db.getMany(
    `SELECT p.id, p.code, p.address, p.latitude, p.longitude, p.price_range, p.is_recommended,
            p.zone_radius, p.zone_exit_buffer,
            c.code AS category_code, c.name AS category_name, c.icon AS category_icon,
            prim.url AS primary_image, t.name, t.short_description,
            (6371000 * acos(least(1.0, greatest(-1.0,
              cos(radians($1)) * cos(radians(p.latitude)) * cos(radians(p.longitude) - radians($2))
              + sin(radians($1)) * sin(radians(p.latitude))
            )))) AS distance_m
     FROM culinary_places p
     LEFT JOIN categories c ON c.id = p.category_id
     LEFT JOIN translations t
       ON t.entity_type = 'place' AND t.entity_id = p.id
       AND t.language_id = (SELECT id FROM languages WHERE code = $3)
     LEFT JOIN LATERAL (
       SELECT url FROM media_files pi
       WHERE pi.entity_type = 'place' AND pi.entity_id = p.id AND pi.kind = 'image'
       ORDER BY pi.is_primary DESC, pi.sort_order ASC LIMIT 1
     ) prim ON true
     WHERE p.status = 'PUBLISHED' AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL
       AND t.name IS NOT NULL
     ORDER BY distance_m ASC
     LIMIT $4`,
    [lat, lng, lang, limit]
  );
  return rows.filter((r) => r.distance_m <= radiusMeters);
}

module.exports = {
  list, getById, getFullDetail, create, update, setStatus, remove,
  getTranslation, listTranslations, upsertTranslation, deleteTranslation,
  listImages, addImage, updateImage, deleteImage, nearby, publicUrl,
};
