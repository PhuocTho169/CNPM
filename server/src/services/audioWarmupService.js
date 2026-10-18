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

async function missingTranslations(limit = 200) {
  return db.getMany(
    `SELECT t.id AS translation_id, t.culinary_place_id, l.code AS language_code,
            t.name, t.short_description, t.description,
            t.history, t.cultural_significance, t.tourist_tips
     FROM culinary_place_translations t
     JOIN languages l ON l.id = t.language_id
     WHERE l.is_active = $1
       AND NOT EXISTS (SELECT 1 FROM audio_guides a WHERE a.translation_id = t.id)
     ORDER BY t.culinary_place_id, l.id
     LIMIT $2`,
    [isActive, limit]
  );
}

async function ensureAllAudio({ concurrency = 2, log = console.log } = {}) {
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
    `SELECT dt.id AS translation_id, dt.dish_id, l.code AS language_code,
            dt.name, dt.description, dt.ingredients
     FROM dish_translations dt
     JOIN languages l ON l.id = dt.language_id
     WHERE l.is_active = $1
       AND NOT EXISTS (SELECT 1 FROM dish_audio_guides a WHERE a.translation_id = dt.id)
     ORDER BY dt.dish_id, l.id
     LIMIT $2`,
    [isActive, limit]
  );
}

async function ensureAllDishAudio({ concurrency = 2, log = console.log } = {}) {
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