// Browser-side mirror of `server/src/utils/narration.js`.
//
// The server composes the ~30s narration script for every generated MP3; this
// mirror keeps the browser-voice fallback (shown only while the file is still
// being generated, or when TTS is disabled) reading the SAME script instead of
// a shorter name + description excerpt. The two files must stay in sync — the
// server one is the source of truth and carries the measuring notes.

export const NARRATION_TARGET_SECONDS = 30;

// Characters spoken per second (measured against the shipped voices).
const CHARS_PER_SECOND = { vi: 12.6, en: 14.9, zh: 3.4, ko: 6.2, ja: 4.5 };
const DEFAULT_CHARS_PER_SECOND = 12;

function normalizePart(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function splitSentences(text) {
  return String(text)
    .split(/(?<=[.!?。！？…•])\s*/)
    .map((s) => s.replace(/^[•·\s]+|[•·\s]+$/g, '').trim())
    .filter(Boolean);
}

export function estimateNarrationSeconds(text, language) {
  const code = String(language || '').toLowerCase().split('-')[0];
  const cps = CHARS_PER_SECOND[code] || DEFAULT_CHARS_PER_SECOND;
  return String(text || '').length / cps;
}

function joinParts(parts) {
  return parts.reduce((acc, part) => {
    if (!acc) return part;
    if (/[.!?。！？…]$/.test(acc)) return `${acc} ${part}`;
    if (/[,;:]$/.test(acc)) return `${acc} ${part}`;
    return `${acc}. ${part}`;
  }, '');
}

function compose({ primary = [], optional = [], language, targetSeconds = NARRATION_TARGET_SECONDS } = {}) {
  const head = primary.map(normalizePart).filter(Boolean);
  const tail = optional.map(normalizePart).filter(Boolean);
  if (!head.length && !tail.length) return '';

  let text = joinParts(head.flatMap(splitSentences));
  const maxSeconds = targetSeconds * 1.1;
  for (const sentence of tail.flatMap(splitSentences)) {
    if (estimateNarrationSeconds(text, language) >= targetSeconds) break;
    const candidate = joinParts([text, sentence]);
    // Skipped, never truncated: the clip only contains whole sentences/bullets.
    if (estimateNarrationSeconds(candidate, language) > maxSeconds) continue;
    text = candidate;
  }
  return text;
}

/** Place narration: core fields in full, history/culture/tips while time allows. */
export function placeNarration(translation, language) {
  if (!translation) return null;
  const text = compose({
    primary: [translation.name, translation.short_description, translation.description],
    optional: [translation.history, translation.cultural_significance, translation.tourist_tips],
    language: language || translation.language_code,
  });
  return text || null;
}

/** Dish narration: name, description and the ingredient list. */
export function dishNarration(dish, language) {
  if (!dish) return null;
  const text = compose({
    primary: [dish.name, dish.description, dish.ingredients ? `Ingredients: ${dish.ingredients}` : ''],
    language: language || dish.language_code,
  });
  return text || null;
}
