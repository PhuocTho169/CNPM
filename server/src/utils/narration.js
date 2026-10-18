// Shared narration composer for every TTS path.
//
// A visitor hears ONE clip per place × language no matter which door they came
// through (guide page lazy TTS, startup warm-up, GPS zone narration, backfill
// script), so the text is assembled here instead of at each call site. Before
// this, the guide paths read only name + short + description (~17s) while the
// GPS path read all six fields (45s+), so the same place sounded different
// depending on how it was opened.
//
// Every clip targets ~30 seconds of speech: the primary fields are always read
// in full, then whole sentences from the optional fields are appended until the
// clip is long enough for that language.

const TARGET_SECONDS = 30;

// Characters spoken per second, measured against the shipped voices (Google
// Translate keyless voices; edge-tts runs at a similar pace). Languages are not
// comparable here: 30s of Vietnamese is ~380 characters, 30s of Chinese ~100.
const CHARS_PER_SECOND = { vi: 12.6, en: 14.9, zh: 3.4, ko: 6.2, ja: 4.5 };
// Admins can add a language from the dashboard without touching this file —
// fall back to a Latin-script-ish rate instead of throwing.
const DEFAULT_CHARS_PER_SECOND = 12;

/** Collapse whitespace so TTS never reads stray newlines from the CMS. */
function normalizePart(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

/**
 * Sentence boundaries for both spaced (vi/en) and non-spaced (zh/ja) scripts:
 * the lookbehind accepts the terminator, `\s*` swallows the following space
 * only when there is one. `•` is treated as a boundary because tourist_tips is a
 * bullet list — each tip is a complete thought and makes a good stopping point
 * for a ~30s clip.
 */
function splitSentences(text) {
  return String(text)
    .split(/(?<=[.!?。！？…•])\s*/)
    .map((s) => s.replace(/^[•·\s]+|[•·\s]+$/g, '').trim())
    .filter(Boolean);
}

/** Estimated playback length of `text` in seconds for a language. */
function estimateSeconds(text, language) {
  const code = String(language || '').toLowerCase().split('-')[0];
  const cps = CHARS_PER_SECOND[code] || DEFAULT_CHARS_PER_SECOND;
  return String(text || '').length / cps;
}

/** Join sentences without producing "text. . Next" when a part ends in ".". */
function joinParts(parts) {
  return parts.reduce((acc, part) => {
    if (!acc) return part;
    if (/[.!?。！？…]$/.test(acc)) return `${acc} ${part}`;
    if (/[,;:]$/.test(acc)) return `${acc} ${part}`;
    return `${acc}. ${part}`;
  }, '');
}

/**
 * Build a narration script.
 *
 * `primary`   — always read in full (the content a visitor actually needs).
 * `optional`  — read sentence by sentence until the target length is reached;
 *                a field is never half-read, so the clip never stops mid-phrase.
 *                A sentence is only taken when it keeps the clip within
 *                targetSeconds × 1.1, so one long sentence cannot turn a 30s
 *                clip into a 40s one.
 * `language`  — drives the per-language character budget.
 */
function compose({ primary = [], optional = [], language, targetSeconds = TARGET_SECONDS } = {}) {
  const head = primary.map(normalizePart).filter(Boolean);
  const tail = optional.map(normalizePart).filter(Boolean);
  if (!head.length && !tail.length) return '';

  const sentences = head.flatMap(splitSentences);
  let text = joinParts(sentences);
  const maxSeconds = targetSeconds * 1.1;

  for (const sentence of tail.flatMap(splitSentences)) {
    if (estimateSeconds(text, language) >= targetSeconds) break;
    const candidate = joinParts([text, sentence]);
    // A sentence that would overshoot is skipped, never truncated: the clip only
    // ever contains whole sentences/bullets, and the budget stays at ≤1.1 × target.
    if (estimateSeconds(candidate, language) > maxSeconds) continue;
    text = candidate;
  }
  return text;
}

/** Place narration: core fields first, history/culture/tips only if time allows. */
function placeNarration(translation, language) {
  return compose({
    primary: [translation?.name, translation?.short_description, translation?.description],
    optional: [translation?.history, translation?.cultural_significance, translation?.tourist_tips],
    language: language || translation?.language_code,
  });
}

/** Dish narration: name, description and the ingredient list. */
function dishNarration(dish, language) {
  return compose({
    primary: [dish?.name, dish?.description, dish?.ingredients ? `Ingredients: ${dish.ingredients}` : ''],
    language: language || dish?.language_code,
  });
}

module.exports = {
  TARGET_SECONDS,
  CHARS_PER_SECOND,
  compose,
  placeNarration,
  dishNarration,
  estimateSeconds,
  splitSentences,
};
