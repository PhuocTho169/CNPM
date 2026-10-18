const db = require('../db');
const media = require('./mediaService');
const { ApiError } = require('../utils/errors');
const { measureAudioDuration } = require('../utils/audioDuration');
const narration = require('../utils/narration');

// Dish narration lives in its own table (dish_audio_guides) because
// audio_guides.translation_id is FK-bound to culinary_place_translations.
// File writing and TTS are shared with the place flow via mediaService, so the
// provider configuration stays in exactly one place.

async function getAudioForTranslation(translationId) {
  return db.getOne(
    'SELECT * FROM dish_audio_guides WHERE translation_id = $1 ORDER BY id DESC LIMIT 1',
    [translationId]
  );
}

async function attachAudio(translationId, { file_url, duration, file_size, mime_type, source }) {
  // Same rule as mediaService.attachAudio: a provider duration wins, otherwise
  // measure the file so dish rows are not left at NULL.
  const seconds = Number(duration) > 0 ? Math.round(Number(duration)) : measureAudioDuration(file_url);
  const existing = await getAudioForTranslation(translationId);
  if (existing) {
    return db.getOne(
      `UPDATE dish_audio_guides
         SET file_url=$2, duration=$3, file_size=$4, mime_type=$5, source=$6
       WHERE id=$1 RETURNING *`,
      [existing.id, file_url, seconds, file_size, mime_type, source]
    );
  }
  return db.getOne(
    `INSERT INTO dish_audio_guides (translation_id, file_url, duration, file_size, mime_type, source)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [translationId, file_url, seconds, file_size, mime_type, source]
  );
}

async function deleteAudio(audioId) {
  const row = await db.getOne('SELECT * FROM dish_audio_guides WHERE id = $1', [audioId]);
  if (!row) throw new ApiError(404, 'AUDIO_NOT_FOUND', 'Audio guide not found.');
  // Let the shared service remove the physical file when it lives in uploads.
  await media.deleteAudioFile(row.file_url);
  await db.query('DELETE FROM dish_audio_guides WHERE id = $1', [audioId]);
  return { id: audioId };
}

/**
 * Text used for dish narration: name, description and the ingredient list, which
 * is exactly what a visitor wants to hear before ordering. Built by the shared
 * composer so a long ingredient list is capped at the ~30s target too.
 */
function narrationText(dish) {
  return narration.dishNarration(dish, dish?.language_code);
}

/**
 * Generate + attach dish audio for one translation. Returns the row, or null when
 * there is nothing to narrate.
 *
 * Accepts either `id` or `translation_id` as the key so callers can pass a raw
 * DB row without having to know which alias a query used.
 */
async function generateForTranslation(translation, { force = false } = {}) {
  const id = translation.id ?? translation.translation_id;
  if (!id) throw new Error('generateForTranslation: missing translation id');
  if (!force) {
    const existing = await getAudioForTranslation(id);
    if (existing) return existing;
  }
  const text = narrationText(translation);
  if (!text) return null;
  const result = await media.generateSpeech(text, translation.language_code);
  return attachAudio(id, result);
}

// Same lazy-background pattern as place audio, keyed on dish translations.
const inFlight = new Set();

function scheduleTranslationAudio(translation) {
  const id = translation?.id ?? translation?.translation_id;
  if (!id || inFlight.has(id)) return false;
  const text = narrationText(translation);
  if (!text) return false;
  inFlight.add(id);
  setImmediate(() => {
    generateForTranslation(translation)
      .catch(() => { /* provider offline → browser TTS remains the fallback */ })
      .finally(() => inFlight.delete(id));
  });
  return true;
}

module.exports = {
  getAudioForTranslation, attachAudio, deleteAudio,
  generateForTranslation, scheduleTranslationAudio, narrationText,
};