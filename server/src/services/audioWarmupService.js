const db = require('../db');
const media = require('./mediaService');
const dishAudio = require('./dishAudioService');
const narration = require('../utils/narration');

/**
 * Startup audio warm-up.
 *
 * Audio used to be generated lazily: only for the language a visitor happened to
 * be viewing, only once. A guide that was never opened in Korean therefore had no
 * Korean audio at all, and the player silently fell back to the browser voice —
 * which on most machines only exists for the OS language.
 *
 * On boot we fill every missing (translation × language) cell so the four
 * languages are always complete. Failures are logged and ignored: a missing
 * audio file must never stop the server from starting.
 */

// Voice per language, matching the durations we saw from edge-tts.
const isActive = true;

/**
 * Remove audio rows whose file is gone from disk. A docker rebuild or a
 * replaced volume keeps the DB (named volume) but wipes `./server/uploads` —
 * from then on every /uploads/audio URL is a 404 and the player is silent.
 * Deleting the stale rows feeds the standard "missing" queries below, so the
 * same warm-up regenerates them without extra logic.
 */
async function reconcileStaleAudioRows({ log = console.log } = {}) {
  const rows = await db.getMany(
    `SELECT m.id, m.url, m.entity_id AS translation_id, t.entity_type
     FROM media_files m
     JOIN translations t ON t.id = m.entity_id
     WHERE m.kind = 'audio'`
  );
  let removed = 0;
  for (const row of rows) {
    if (!media.audioFileMissing(row.url)) continue;
    await media.removeStaleAudio(row);
    removed++;
  }
  if (removed) log(`[audio] removed ${removed} stale audio row(s) — files missing on disk.`);
  return removed;
}

async function missingTranslations(limit = 200) {
  return db.getMany(
    `SELECT t.id AS translation_id, t.entity_id AS culinary_place_id, l.code AS language_code,
            t.name, t.short_description, t.description,
            t.history, t.cultural_significance, t.tourist_tips
     FROM translations t
     JOIN languages l ON l.id = t.language_id
     WHERE t.entity_type = 'place' AND l.is_active = $1
       AND NOT EXISTS (
         SELECT 1 FROM media_files m
         WHERE m.entity_type = 'translation' AND m.entity_id = t.id AND m.kind = 'audio'
       )
     ORDER BY t.entity_id, l.id
     LIMIT $2`,
    [isActive, limit]
  );
}

async function ensureAllAudio({ concurrency = 2, log = console.log } = {}) {
  // DB rows lacking a backing file must be dropped first, otherwise the
  // "missing audio" queries still see a healthy row.
  await reconcileStaleAudioRows({ log });
  const pending = await missingTranslations();
  if (!pending.length) {
    log('[audio] all translations already have audio.');
    return { created: 0, failed: 0, pending: 0 };
  }
  log(`[audio] ${pending.length} translation(s) missing audio — generating in background…`);

  let created = 0;
  let failed = 0;

  // Small worker pool: edge-tts is a network call, so serial would be slow but a
  // large pool gets rate-limited. Two at a time keeps it polite and quick.
  const queue = [...pending];
  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (queue.length) {
      const t2 = queue.shift();
      // Same ~30s script the lazy guide path builds (utils/narration).
      const text = narration.placeNarration(t2, t2.language_code);
      if (!text) continue;
      try {
        const result = await media.generateSpeech(text, t2.language_code);
        await media.attachAudio(t2.translation_id, result);
        created++;
        log(`[audio]   ✓ place ${t2.culinary_place_id} ${t2.language_code}`);
      } catch (err) {
        failed++;
        log(`[audio]   ✗ place ${t2.culinary_place_id} ${t2.language_code}: ${err.message}`);
      }
    }
  });
  await Promise.all(workers);

  log(`[audio] done. created=${created} failed=${failed}`);
  return { created, failed, pending: pending.length };
}

async function missingDishTranslations(limit = 500) {
  return db.getMany(
    `SELECT dt.id AS translation_id, dt.entity_id AS dish_id, l.code AS language_code,
            dt.name, dt.description, dt.ingredients
     FROM translations dt
     JOIN languages l ON l.id = dt.language_id
     WHERE dt.entity_type = 'dish' AND l.is_active = $1
       AND NOT EXISTS (
         SELECT 1 FROM media_files m
         WHERE m.entity_type = 'translation' AND m.entity_id = dt.id AND m.kind = 'audio'
       )
     ORDER BY dt.entity_id, l.id
     LIMIT $2`,
    [isActive, limit]
  );
}

async function ensureAllDishAudio({ concurrency = 2, log = console.log } = {}) {
  await reconcileStaleAudioRows({ log });
  const pending = await missingDishTranslations();
  if (!pending.length) {
    log('[audio] all dish translations already have audio.');
    return { created: 0, failed: 0, pending: 0 };
  }
  log(`[audio] ${pending.length} dish translation(s) missing audio — generating…`);

  let created = 0;
  let failed = 0;
  const queue = [...pending];
  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (queue.length) {
      const t = queue.shift();
      try {
        await dishAudio.generateForTranslation(t);
        created++;
        log(`[audio]   ✓ dish ${t.dish_id} ${t.language_code}`);
      } catch (err) {
        failed++;
        log(`[audio]   ✗ dish ${t.dish_id} ${t.language_code}: ${err.message}`);
      }
    }
  });
  await Promise.all(workers);

  log(`[audio] dish done. created=${created} failed=${failed}`);
  return { created, failed, pending: pending.length };
}

// Run detached so `server.listen` is never delayed by TTS.
function startInBackground() {
  setTimeout(() => {
    ensureAllAudio()
      .catch((err) => console.warn('[audio] warm-up skipped:', err.message))
      .then(() => ensureAllDishAudio().catch((err) => console.warn('[audio] dish warm-up skipped:', err.message)));
  }, 5000);
}

module.exports = {
  ensureAllAudio, missingTranslations,
  ensureAllDishAudio, missingDishTranslations,
  startInBackground,
};