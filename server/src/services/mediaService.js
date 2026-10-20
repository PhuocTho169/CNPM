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

/** Pick the best base URL for a scannable QR code. */
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
  // Only keep the current image when it already encodes the same URL — otherwise
  // the PNG on disk would still point at the OLD address.
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

// ---------------- DISH QR CODES ----------------

async function getDishQR(dishId) {
  return db.getOne('SELECT * FROM dish_qr_codes WHERE dish_id = $1', [dishId]);
}

async function generateDishQR(dishId, { regenerate = false, baseUrl, originHint } = {}) {
  const dish = await db.getOne('SELECT id, code, status FROM dishes WHERE id = $1', [dishId]);
  if (!dish) throw new ApiError(404, 'DISH_NOT_FOUND', 'The dish could not be found.');

  const qrBase = resolveQrBaseUrl({ baseUrl, originHint });
  const qrValue = `${qrBase}/dish/${dishId}`;

  const existing = await getDishQR(dishId);
  if (existing && !regenerate && existing.qr_value === qrValue) return existing;

  const fileName = `dish-${dishId}-${crypto.randomBytes(4).toString('hex')}.png`;
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
    const oldName = existing.image_url.split('/uploads/qr/')[1];
    if (oldName) {
      const oldPath = path.join(config.uploadDir, 'qr', oldName);
      if (fs.existsSync(oldPath)) { try { fs.unlinkSync(oldPath); } catch { /* ignore */ } }
    }
    return db.getOne(
      `UPDATE dish_qr_codes SET qr_value=$2, image_url=$3, updated_at=now() WHERE id=$1 RETURNING *`,
      [existing.id, qrValue, imageUrl]
    );
  }
  return db.getOne(
    `INSERT INTO dish_qr_codes (dish_id, qr_value, image_url) VALUES ($1,$2,$3) RETURNING *`,
    [dishId, qrValue, imageUrl]
  );
}

// ---------------- AUDIO (per place / per dish) ----------------

/** GET /api/culinary-places/:placeId/audio — audio row for the requested language. */
async function getAudioForPlace(placeId, language) {
  const lang = String(language || 'vi').toLowerCase();
  const translation = await db.getOne(
    `SELECT t.id, t.name, t.description, l.code AS language_code
     FROM culinary_place_translations t
     JOIN languages l ON l.id = t.language_id
     WHERE t.culinary_place_id = $1 AND l.code = $2`,
    [placeId, lang]
  );
  if (!translation) {
    throw new ApiError(404, 'NARRATION_UNAVAILABLE', `No ${lang} guide is available for this culinary place.`);
  }
  const audio = await db.getOne(
    'SELECT file_url, duration FROM audio_guides WHERE translation_id = $1',
    [translation.id]
  );
  return {
    placeId,
    language: lang,
    title: translation.name,
    audioUrl: audio?.file_url || null,
    duration: audio?.duration ?? null,
  };
}

/** GET /api/dishes/:dishId/audio — audio row for the requested language. */
async function getAudioForDish(dishId, language) {
  const lang = String(language || 'vi').toLowerCase();
  const translation = await db.getOne(
    `SELECT t.id, t.name, t.description, l.code AS language_code
     FROM dish_translations t
     JOIN languages l ON l.id = t.language_id
     WHERE t.dish_id = $1 AND l.code = $2`,
    [dishId, lang]
  );
  if (!translation) {
    throw new ApiError(404, 'NARRATION_UNAVAILABLE', `No ${lang} audio is available for this dish.`);
  }
  const audio = await db.getOne(
    'SELECT file_url, duration FROM dish_audio_guides WHERE translation_id = $1',
    [translation.id]
  );
  return {
    dishId,
    language: lang,
    title: translation.name,
    audioUrl: audio?.file_url || null,
    duration: audio?.duration ?? null,
  };
}

// ---------------- Language meta / TTS (unchanged from original) ----------------

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

function tlForLocale(locale) {
  const lower = String(locale || '').toLowerCase();
  if (lower.startsWith('zh')) return lower.includes('tw') ? 'zh-TW' : 'zh-CN';
  return lower.split('-')[0] || 'vi';
}

function voiceFromNote(note, provider) {
  if (!note || !provider) return null;
  const match = String(note).match(new RegExp(`${provider}\\s*[:=]\\s*([A-Za-z0-9_.-]+)`, 'i'));
  return match ? match[1] : null;
}

// ---------------- TTS (unchanged) ----------------

async function generateSpeech(text, languageCode) {
  const provider = String(config.ttsProvider || '').trim().toLowerCase();
  if (provider === 'none') {
    throw new ApiError(501, 'TTS_NOT_CONFIGURED', 'Server TTS is disabled (TTS_PROVIDER=none). Upload audio files manually or use the browser voice.');
  }

  const meta = await languageMeta(languageCode);
  const locale = await localeForLanguage(languageCode);

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

const VOICE_BY_TL = {
  vi: { edge: 'vi-VN-HoaiMyNeural', google: 'vi-VN-Neural-Female', elevenlabs: '21m00Tcm4TlvDq8ikWAM' },
  zh: { edge: 'zh-CN-XiaoxiaoNeural', google: 'zh-CN-Standard-A', elevenlabs: 'MF3mGyEYCl7XYWbV9V6O' },
  ko: { edge: 'ko-KR-SunHiNeural', google: 'ko-KR-Standard-A', elevenlabs: 'MF3mGyEYCl7XYWbV9V6O' },
  ja: { edge: 'ja-JP-NanamiNeural', google: 'ja-JP-Standard-A', elevenlabs: 'MF3mGyEYCl7XYWbV9V6O' },
  en: { edge: 'en-US-AriaNeural', google: 'en-US-Neural2-C', elevenlabs: '21m00Tcm4TlvDq8ikWAM' },
};

function voiceForLanguage(locale, provider, voiceNote) {
  if (!provider) return '';
  const override = voiceFromNote(voiceNote, provider);
  if (override) return override;
  const primary = String(locale || '').toLowerCase().split('-')[0];
  return VOICE_BY_TL[primary]?.[provider] || '';
}

function chunkText(text, max = 190) {
  const clean = String(text).replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  if (clean.length <= max) return [clean];
  const sentences = clean.split(/(?<=[.!?。！？…])\\s+/);
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

const ttsInFlight = new Set();
const TTS_TIMEOUT_MS = 20000;

function withTimeout(promise, ms, label) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      timer.refresh = undefined;
      const timedOut = new Error(`${label || 'TTS'} timed out after ${ms}ms`);
      reject(timedOut);
    }, ms);
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
  const text = narration.placeNarration(translation, translation.language_code);
  if (!text) return false;
  ttsInFlight.add(translation.id);
  setImmediate(() => {
    withTimeout(
      generateSpeech(text, translation.language_code)
        .then((result) => attachAudio(translation.id, result))
        .catch((err) => {
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
        try { if (fs.existsSync(filePath) && fs.statSync(filePath).size === 0) fs.unlinkSync(filePath); } catch { /* ignore */ }
        reject(new ApiError(502, 'TTS_PROVIDER_ERROR', `Edge TTS failed: ${stderr || 'Unknown error'}`));
      }
    });
  });
}

async function generateWithElevenLabs(text, locale, voiceNote) {
  if (!config.ttsApiKey) {
    throw new ApiError(501, 'TTS_NOT_CONFIGURED', 'TTS_API_KEY (ElevenLabs xi-api-key) is missing.');
  }
  const voiceMap = {
    vi: '21m00Tcm4TlvDq8ikWAM',
    zh: 'MF3mGyEYCl7XYWbV9V6O',
    ko: 'MF3mGyEYCl7XYWbV9V6O',
    ja: 'MF3mGyEYCl7XYWbV9V6O',
    en: '21m00Tcm4TlvDq8ikWAM',
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
  if (!config.ttsApiKey) {
    throw new ApiError(501, 'TTS_NOT_CONFIGURED', 'TTS_API_KEY is missing.');
  }
  const languageCodeFull = String(locale || 'vi');
  const voice = voiceForLanguage(languageCodeFull, 'google', voiceNote);

  const buildBody = (voiceName) => ({
    input: { text },
    voice: voiceName
      ? { languageCode: languageCodeFull, name: voiceName, ssmlGender: 'FEMALE' }
      : { languageCode: languageCodeFull, ssmlGender: 'FEMALE' },
    audioConfig: { audioEncoding: 'MP3', speakingRate: 1.0 },
  });

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
  getQR, generateQR,
  getDishQR, generateDishQR,
  getAudioForPlace, getAudioForDish,
  generateSpeech, scheduleTranslationAudio,
  localeForLanguage, invalidateLanguageCache,
};
