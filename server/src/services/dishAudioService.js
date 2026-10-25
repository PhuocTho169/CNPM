const media = require('./mediaService');
const narration = require('../utils/narration');

// Dish narration shares the unified storage: media_files rows keyed by
// (entity_type='translation', entity_id=<translation id>, kind='audio'), the
// same rows places use. File writing and TTS stay in mediaService so the
// provider configuration lives in exactly one place.

async function getAudioForTranslation(translationId) {
  return media.getAudioForTranslation(translationId);
}

async function attachAudio(translationId, result) {
  return media.attachAudio(translationId, result);
}

async function deleteAudio(audioId) {
  return media.deleteAudio(audioId);
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
