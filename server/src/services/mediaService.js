const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const QRCode = require('qrcode');
const db = require('../db');
const config = require('../config');
const { ApiError } = require('../utils/errors');
const { measureAudioDuration } = require('../utils/audioDuration');
const narration = require('../utils/narration');

// ---------------- AUDIO ----------------
async function getAudioForTranslation(translationId) {
  return db.getOne('SELECT * FROM audio_guides WHERE translation_id = $1 ORDER BY id DESC LIMIT 1', [translationId]);
}

async function attachAudio(translationId, { file_url, duration, file_size, mime_type, source }) {
  // No TTS provider reports a duration, so rows used to be written as NULL and
  // the mobile player had to load the file just to learn how long it is. A
  // provider-supplied duration always wins; otherwise measure the file we just
  // wrote. Keeps the DB correct for newly generated audio without a backfill.
  const seconds = Number(duration) > 0 ? Math.round(Number(duration)) : measureAudioDuration(file_url);
  const existing = await getAudioForTranslation(translationId);
  if (existing) {
    return db.getOne(
      `UPDATE audio_guides SET file_url=$2, duration=$3, file_size=$4, mime_type=$5, source=$6
       WHERE id=$1 RETURNING *`,
      [existing.id, file_url, seconds, file_size, mime_type, source]
    );
  }
  return db.getOne(
    `INSERT INTO audio_guides (translation_id, file_url, duration, file_size, mime_type, source)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [translationId, file_url, seconds, file_size, mime_type, source]
  );
}

async function deleteAudio(audioId) {
  const row = await db.getOne('SELECT * FROM audio_guides WHERE id = $1', [audioId]);
  if (!row) throw new ApiError(404, 'AUDIO_NOT_FOUND', 'Audio guide not found.');
  deleteAudioFile(row.file_url);
  await db.query('DELETE FROM audio_guides WHERE id = $1', [audioId]);
  return { id: audioId };
}

// Remove an audio file from disk when it lives in our uploads folder. Shared with
// dishAudioService so both tables clean up identically.
function deleteAudioFile(fileUrl) {
  if (!fileUrl || !fileUrl.includes('/uploads/audio/')) return;
  const fileName = fileUrl.split('/uploads/audio/')[1].split('?')[0];
  const filePath = path.join(config.uploadDir, 'audio', fileName);
  if (fs.existsSync(filePath)) {
    try { fs.unlinkSync(filePath); } catch { /* ignore */ }
  }
}

// ---------------- QR CODES ----------------
async function getQR(placeId) {
  return db.getOne('SELECT * FROM qr_codes WHERE culinary_place_id = $1', [placeId]);
}

function isLocalUrl(url) {
  try {
    const host = new URL(url).hostname;
    return ['localhost', '127.0.0.1', '0.0.0.0', '[::1]', '::1'].includes(host);
  } catch {
    return false;
  }
}

function normalizeOrigin(url) {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

/**
 * Pick the best base URL for a scannable QR code:
 *   1. explicit override sent by the admin dashboard (base_url)
 *   2. PUBLIC_BASE_URL from .env — when set to a real (non-localhost) address
 *   3. the origin the admin's browser is using (works on LAN / docker)
 *   4. PUBLIC_BASE_URL as-is (localhost fallback)
 */
function resolveQrBaseUrl({ baseUrl, originHint } = {}) {
  if (baseUrl) {
    const normalized = normalizeOrigin(baseUrl);
    if (!normalized) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'base_url must be a valid http(s) URL, e.g. http://192.168.1.5:5173');
    }
    return normalized;
  }
  if (config.publicBaseUrl && !isLocalUrl(config.publicBaseUrl)) {
    return config.publicBaseUrl.replace(/\/$/, '');
  }
  if (originHint) {
    const origin = normalizeOrigin(originHint);
    if (origin) return origin;
  }
  return config.publicBaseUrl.replace(/\/$/, '');
}

async function generateQR(placeId, { regenerate = false, baseUrl, originHint } = {}) {
  const place = await db.getOne('SELECT id, code, status FROM culinary_places WHERE id = $1', [placeId]);
  if (!place) throw new ApiError(404, 'PLACE_NOT_FOUND', 'The culinary location could not be found.');

  const qrBase = resolveQrBaseUrl({ baseUrl, originHint });
  const qrValue = `${qrBase}/place/${placeId}`;

  const existing = await getQR(placeId);
  // Only keep the current image when it already encodes the same URL —
  // otherwise the PNG on disk would still point at the OLD address.
  if (existing && !regenerate && existing.qr_value === qrValue) return existing;

  const fileName = `place-${placeId}-${crypto.randomBytes(4).toString('hex')}.png`;
  const dir = path.join(config.uploadDir, 'qr');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, fileName);
  await QRCode.toFile(filePath, qrValue, {
    width: 512,
    margin: 2,
    color: { dark: '#212121', light: '#FFFFFF' },
    errorCorrectionLevel: 'M',
  });
  const imageUrl = `/uploads/qr/${fileName}`;

  if (existing) {
    // delete old image file
    const oldName = existing.image_url.split('/uploads/qr/')[1];
    if (oldName) {
      const oldPath = path.join(config.uploadDir, 'qr', oldName);
      if (fs.existsSync(oldPath)) { try { fs.unlinkSync(oldPath); } catch { /* ignore */ } }
    }
    return db.getOne(
      `UPDATE qr_codes SET qr_value=$2, image_url=$3, updated_at=now() WHERE id=$1 RETURNING *`,
      [existing.id, qrValue, imageUrl]
    );
  }
  return db.getOne(
    `INSERT INTO qr_codes (culinary_place_id, qr_value, image_url) VALUES ($1,$2,$3) RETURNING *`,
    [placeId, qrValue, imageUrl]
  );
}

// ---------------- Language → locale / voice ----------------
// Every TTS path derives its locale and voice from the language registry
// (languages.code / bcl / voice_note) instead of a code-side list, so a
// language an admin adds from the dashboard narrates with no code change:
//   1. `bcl`     — the BCP-47 locale the admin registered (e.g. fr-FR)
//   2. `code`    — the locale itself when no bcl was given (e.g. fr)
//   3. `voice_note` — optional per-provider voice override, e.g.
//      "Edge: fr-FR-HenriNeural, Google: fr-FR-Neural2-A, ElevenLabs: <id>"
//
// The cache keeps the guide page off the DB for every request; the admin
// language form invalidates it on create/update/delete.
let languageCache = new Map();
const LANGUAGE_CACHE_MS = 30000;

function invalidateLanguageCache() {
  languageCache = new Map();
}

async function languageMeta(code) {
  const key = String(code || '').trim().toLowerCase();
  if (!key) return { bcl: null, voice_note: null };
  const hit = languageCache.get(key);
  if (hit && Date.now() - hit.at < LANGUAGE_CACHE_MS) return hit.value;
  const row = await db.getOne(
    'SELECT bcl, voice_note FROM languages WHERE code = $1',
    [key]
  );
  const value = { bcl: row?.bcl || null, voice_note: row?.voice_note || null };
  languageCache.set(key, { value, at: Date.now() });
  return value;
}

/** BCP-47 locale for a language: its registered `bcl`, else the code itself. */
async function localeForLanguage(code) {
  const { bcl } = await languageMeta(code);
  const locale = String(bcl || code || '').trim();
  if (!locale) return 'vi';
  return locale.toLowerCase().includes('-') ? locale : locale.toLowerCase();
}

/**
 * `tl` for the keyless Google Translate endpoint. It accepts a primary subtag
 * for most languages (fr, de, es…); Chinese needs a region, so zh-CN/zh-TW are
 * normalised here rather than in a lookup table admins would have to extend.
 */
function tlForLocale(locale) {
  const lower = String(locale || '').toLowerCase();
  if (lower.startsWith('zh')) return lower.includes('tw') ? 'zh-TW' : 'zh-CN';
  return lower.split('-')[0] || 'vi';
}

/**
 * Read an optional per-provider voice out of the admin's `voice_note` field.
 * "Edge: fr-FR-HenriNeural" → 'fr-FR-HenriNeural' for the edge provider.
 */
function voiceFromNote(note, provider) {
  if (!note || !provider) return null;
  const match = String(note).match(new RegExp(`${provider}\\s*[:=]\\s*([A-Za-z0-9_.-]+)`, 'i'));
  return match ? match[1] : null;
}

// ---------------- TTS (optional) ----------------
async function generateSpeech(text, languageCode) {
  const provider = String(config.ttsProvider || '').trim().toLowerCase();
  if (provider === 'none') {
    throw new ApiError(
      501,
      'TTS_NOT_CONFIGURED',
      'Server TTS is disabled (TTS_PROVIDER=none). Upload audio files manually or use the browser voice.'
    );
  }

  const meta = await languageMeta(languageCode);
  const locale = await localeForLanguage(languageCode);

  // Preferred provider first, then the keyless Google Translate voice as a
  // safety net. A provider outage (edge-tts returns 403), a missing API key or
  // a language it has no voice for must never leave a translation silent.
  const chain = [];
  if (provider === 'google') chain.push(['google', () => generateWithGoogle(text, locale, meta.voice_note)]);
  else if (provider === 'elevenlabs') chain.push(['elevenlabs', () => generateWithElevenLabs(text, locale, meta.voice_note)]);
  else if (provider === 'edge') chain.push(['edge', () => generateWithEdgeTTS(text, locale, meta.voice_note)]);
  chain.push(['google-translate', () => generateWithGoogleTranslate(text, locale)]);

  let lastError = null;
  for (const [name, run] of chain) {
    try {
      return await run();
    } catch (err) {
      lastError = err;
      if (chain.length > 1) {
        console.warn(`[audio] ${name} TTS failed for ${languageCode} (${locale}): ${err.message}`);
      }
    }
  }
  throw lastError || new ApiError(502, 'TTS_PROVIDER_ERROR', 'TTS provider returned no audio.');
}

// Built-in native voice per provider (edge-tts / google-cloud / elevenlabs) for
// the languages this project ships with. It is a default, not a requirement:
// an admin can override it per language through `voice_note`, and a language
// with no entry here simply falls back to the keyless voice below.
const VOICE_BY_TL = {
  vi: { edge: 'vi-VN-HoaiMyNeural', google: 'vi-VN-Neural-Female', elevenlabs: '21m00Tcm4TlvDq8ikWAM' },
  zh: { edge: 'zh-CN-XiaoxiaoNeural', google: 'zh-CN-Standard-A', elevenlabs: 'MF3mGyEYCl7XYWbV9V6O' },
  ko: { edge: 'ko-KR-SunHiNeural', google: 'ko-KR-Standard-A', elevenlabs: 'MF3mGyEYCl7XYWbV9V6O' },
  ja: { edge: 'ja-JP-NanamiNeural', google: 'ja-JP-Standard-A', elevenlabs: 'MF3mGyEYCl7XYWbV9V6O' },
  en: { edge: 'en-US-AriaNeural', google: 'en-US-Neural2-C', elevenlabs: '21m00Tcm4TlvDq8ikWAM' },
};

// Provider voice for a locale: the admin's `voice_note` wins, then the built-in
// default matched on the primary subtag (so `zh-CN`, `zh-TW` and `zh` all hit
// the Chinese voice), then '' when the provider takes no voice id
// (google-translate returns a `tl` only).
//
// An empty string is not an error by itself — generateSpeech falls back to the
// keyless provider when a provider has no voice for a language.
function voiceForLanguage(locale, provider, voiceNote) {
  if (!provider) return '';
  const override = voiceFromNote(voiceNote, provider);
  if (override) return override;
  const primary = String(locale || '').toLowerCase().split('-')[0];
  return VOICE_BY_TL[primary]?.[provider] || '';
}

// Endpoint giới hạn ~200 ký tự/lần gọi → chia nhỏ theo câu rồi ghép MP3 lại.
function chunkText(text, max = 190) {
  const clean = String(text).replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  if (clean.length <= max) return [clean];
  const sentences = clean.split(/(?<=[.!?。！？…])\s+/);
  const chunks = [];
  let cur = '';
  const push = () => { if (cur.trim()) chunks.push(cur.trim()); cur = ''; };
  for (const sentence of sentences) {
    if (sentence.length > max) {
      for (const word of sentence.split(' ')) {
        if ((cur + ' ' + word).trim().length > max) push();
        cur = (cur + ' ' + word).trim();
      }
      push();
    } else if ((cur ? cur.length + 1 : 0) + sentence.length > max) {
      push();
      cur = sentence;
    } else {
      cur = (cur ? cur + ' ' : '') + sentence;
    }
  }
  push();
  return chunks.length ? chunks : [clean.slice(0, max)];
}

async function generateWithGoogleTranslate(text, languageCode) {
  const tl = tlForLocale(languageCode);
  const chunks = chunkText(text);
  if (!chunks.length) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Text is empty, nothing to narrate.');
  }
  const buffers = [];
  for (const chunk of chunks) {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${encodeURIComponent(tl)}&q=${encodeURIComponent(chunk)}`;
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        'Referer': 'https://translate.google.com/',
      },
    });
    if (!resp.ok) {
      throw new ApiError(502, 'TTS_PROVIDER_ERROR', `Google Translate TTS returned HTTP ${resp.status}`);
    }
    buffers.push(Buffer.from(await resp.arrayBuffer()));
  }
  const audioContent = Buffer.concat(buffers);

  const dir = path.join(config.uploadDir, 'audio');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const fileName = `tts-${crypto.randomBytes(8).toString('hex')}.mp3`;
  const filePath = path.join(dir, fileName);
  fs.writeFileSync(filePath, audioContent);

  return {
    file_url: `/uploads/audio/${fileName}`,
    file_size: audioContent.length,
    mime_type: 'audio/mpeg',
    source: 'TTS',
    voice: `google-translate:${tl} (native voice)`,
  };
}

// ---- Background auto-TTS: guide mở mà bản dịch chưa có audio → tự tạo, lưu vào DB ----
const ttsInFlight = new Set();

const TTS_TIMEOUT_MS = 20000;

function withTimeout(promise, ms, label) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      timer.refresh = undefined;
      const timedOut = new Error(`${label || 'TTS'} timed out after ${ms}ms`);
      reject(timedOut);
    }, ms);
    // reset timeout on settle so a slow-but-successful audio is not killed
    promise.then(() => {
      if (timer.refresh) clearTimeout(timer.refresh);
      timer.refresh = undefined;
      resolve(promise);
    }).catch((err) => {
      if (timer.refresh) clearTimeout(timer.refresh);
      timer.refresh = undefined;
      reject(err);
    });
  });
}

function scheduleTranslationAudio(translation) {
  if (!translation?.id || ttsInFlight.has(translation.id)) return false;
  // ~30s clip: core fields in full, then history/culture/tips while time allows
  // (see utils/narration). Every entry point builds the same text.
  const text = narration.placeNarration(translation, translation.language_code);
  if (!text) return false;
  ttsInFlight.add(translation.id);
  setImmediate(() => {      // Each language is narrated by a native voice; Edge/Google have their own
      // voice files, so the generated MP3 runs the full ~30s and is
      // self-contained.
    withTimeout(
      generateSpeech(text, translation.language_code)
        .then((result) => attachAudio(translation.id, result))
        .catch((err) => {
          // offline / provider lỗi → bỏ qua, browser TTS vẫn fallback
          // but keep the message visible in the log so admins can react
          console.warn(`[audio] TTS failed for translation ${translation.id}:`, err.message);
        })
        .finally(() => ttsInFlight.delete(translation.id)),
      TTS_TIMEOUT_MS,
      '[audio] TTS'
    );
  });
  return true;
}

async function generateWithEdgeTTS(text, locale, voiceNote) {
  // Microsoft Edge TTS (free, no API key required).
  // Uses the Python `edge-tts` package installed in the container.
  const voice = voiceForLanguage(locale, 'edge', voiceNote);
  if (!voice) {
    throw new ApiError(501, 'TTS_NOT_CONFIGURED', `Edge TTS has no voice for "${locale}" — set one in the language's voice_note field.`);
  }

  const { spawn } = require('child_process');
  const fs = require('fs');
  const path = require('path');
  const crypto = require('crypto');

  return new Promise((resolve, reject) => {
    const dir = path.join(config.uploadDir, 'audio');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const fileName = `tts-${crypto.randomBytes(8).toString('hex')}.mp3`;
    const filePath = path.join(dir, fileName);

    const proc = spawn('python3', ['-m', 'edge_tts', '--voice', voice, '--text', text, '--write-media', filePath]);
    let stderr = '';
    proc.stderr.on('data', (data) => { stderr += data.toString(); });
    proc.on('close', (code) => {
      if (code === 0 && fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        resolve({
          file_url: `/uploads/audio/${fileName}`,
          file_size: stats.size,
          mime_type: 'audio/mpeg',
          source: 'TTS',
          voice: `edge-${voice}`,
        });
      } else {
        // edge-tts creates the target file before it fails, so a rejected run
        // would otherwise leave a 0-byte mp3 behind for every retry.
        try { if (fs.existsSync(filePath) && fs.statSync(filePath).size === 0) fs.unlinkSync(filePath); } catch { /* ignore */ }
        reject(new ApiError(502, 'TTS_PROVIDER_ERROR', `Edge TTS failed: ${stderr || 'Unknown error'}`));
      }
    });
  });
}

async function generateWithElevenLabs(text, locale, voiceNote) {
  // ElevenLabs TTS via REST API. Requires TTS_API_KEY (xi-api-key) and internet access.
  // Uses multilingual v2 model with voices that support multiple languages.
  if (!config.ttsApiKey) {
    throw new ApiError(501, 'TTS_NOT_CONFIGURED', 'TTS_API_KEY (ElevenLabs xi-api-key) is missing.');
  }
  // Voice mapping for target languages (using ElevenLabs voices optimized for each language).
  // Replace these voice IDs with your preferred voices from https://elevenlabs.io/app/voice-library
  // Override per language from the dashboard via `voice_note` = "ElevenLabs: <voice-id>".
  const voiceMap = {
    vi: '21m00Tcm4TlvDq8ikWAM',  // Rachel - multilingual v2, good for Vietnamese
    zh: 'MF3mGyEYCl7XYWbV9V6O',  // Elli - Chinese (multilingual v2)
    ko: 'MF3mGyEYCl7XYWbV9V6O',  // Elli - Korean (multilingual v2)
    ja: 'MF3mGyEYCl7XYWbV9V6O',  // Elli - Japanese (multilingual v2)
    en: '21m00Tcm4TlvDq8ikWAM',  // Rachel - English
  };
  const primary = String(locale || '').toLowerCase().split('-')[0];
  const voiceId = voiceFromNote(voiceNote, 'elevenlabs') || voiceMap[primary] || voiceMap.vi;
  const modelId = 'eleven_multilingual_v2';

  const resp = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': config.ttsApiKey,
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    }
  );

  if (!resp.ok) {
    const detail = await resp.text();
    throw new ApiError(502, 'TTS_PROVIDER_ERROR', `ElevenLabs error: ${detail.slice(0, 300)}`);
  }

  const audioBuffer = await resp.arrayBuffer();
  const audioContent = Buffer.from(audioBuffer);

  const dir = path.join(config.uploadDir, 'audio');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const fileName = `tts-${crypto.randomBytes(8).toString('hex')}.mp3`;
  const filePath = path.join(dir, fileName);
  fs.writeFileSync(filePath, audioContent);

  return {
    file_url: `/uploads/audio/${fileName}`,
    file_size: audioContent.length,
    mime_type: 'audio/mpeg',
    source: 'TTS',
    voice: `elevenlabs-${voiceId}`,
    durationSec: measureAudioDuration(`/uploads/audio/${fileName}`),
  };
}

async function generateWithGoogle(text, locale, voiceNote) {
  // Google Cloud TTS via REST API. Requires TTS_API_KEY (API key) and internet access.
  // Each language is narrated by a native voice of that language; the locale
  // comes from the language registry (`bcl` → `code`), so a newly added
  // language works without touching this file.
  if (!config.ttsApiKey) {
    throw new ApiError(501, 'TTS_NOT_CONFIGURED', 'TTS_API_KEY is missing.');
  }
  const languageCodeFull = String(locale || 'vi');
  const voice = voiceForLanguage(languageCodeFull, 'google', voiceNote);

  const buildBody = (voiceName) => ({
    input: { text },
    voice: voiceName
      ? { languageCode: languageCodeFull, name: voiceName, ssmlGender: 'FEMALE' }
      // No known voice for this locale: let Google pick one for languageCode.
      : { languageCode: languageCodeFull, ssmlGender: 'FEMALE' },
    audioConfig: { audioEncoding: 'MP3', speakingRate: 1.0 },
  });

  // First the configured voice, then Google's own choice for the locale.
  const attempts = [voice || null, null].filter((name, index, all) => all.indexOf(name) === index);

  let audioContent = null;
  let lastError = null;
  for (const voiceOfAttempt of attempts) {
    try {
      const resp = await fetch(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${config.ttsApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildBody(voiceOfAttempt)),
        }
      );
      if (!resp.ok) {
        const detail = await resp.text();
        throw new ApiError(502, 'TTS_PROVIDER_ERROR', `TTS provider error: ${detail.slice(0, 300)}`);
      }
      const json = await resp.json();
      audioContent = Buffer.from(json.audioContent, 'base64');
      break;
    } catch (err) {
      lastError = err;
    }
  }
  if (!audioContent) {
    throw lastError || new ApiError(502, 'TTS_PROVIDER_ERROR', 'TTS provider returned no audio.');
  }

  const dir = path.join(config.uploadDir, 'audio');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const fileName = `tts-${crypto.randomBytes(8).toString('hex')}.mp3`;
  const filePath = path.join(dir, fileName);
  fs.writeFileSync(filePath, audioContent);

  return {
    file_url: `/uploads/audio/${fileName}`,
    file_size: audioContent.length,
    mime_type: 'audio/mpeg',
    source: 'TTS',
    voice: voice,
    durationSec: measureAudioDuration(`/uploads/audio/${fileName}`),
  };
}

module.exports = {
  getAudioForTranslation, attachAudio, deleteAudio, deleteAudioFile,
  getQR, generateQR, resolveQrBaseUrl,
  generateSpeech, scheduleTranslationAudio,
  localeForLanguage, invalidateLanguageCache,
};
