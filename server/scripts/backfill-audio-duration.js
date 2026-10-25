// Fill media_files.duration for narration audio from the mp3 files.
//
// The TTS providers report no duration, so every row sits at NULL and the
// mobile player would have to load the file just to learn how long it is.
// Parsing the frame headers locally is cheap and needs no ffmpeg.
//
// Usage: node scripts/backfill-audio-duration.js
const fs = require('fs');
const path = require('path');
const db = require('../src/db');
const config = require('../src/config');
const { measureAudioDuration } = require('../src/utils/audioDuration');

const UPLOAD_DIR = path.resolve(__dirname, '..', config.uploadDir || 'uploads');

function absolutePath(fileUrl) {
  if (!fileUrl) return null;
  // Rows hold either an absolute URL (http://host/uploads/...) or a path.
  const m = String(fileUrl).match(/\/uploads\/(.+)$/);
  if (!m) return null;
  return path.join(UPLOAD_DIR, m[1]);
}

// attachAudio() now measures new TTS files itself, so this script only has to
// cover rows written before that fix.
function measure(fileUrl) {
  return measureAudioDuration(fileUrl);
}

async function backfill(label) {
  const rows = await db.getMany(
    `SELECT id, url AS file_url, duration
       FROM media_files
      WHERE kind = 'audio' AND duration IS NULL`
  );
  if (!rows.length) {
    console.log(`[duration] ${label}: nothing to do`);
    return 0;
  }

  let updated = 0;
  let missing = 0;
  for (const row of rows) {
    const seconds = measure(row.file_url);
    if (!seconds) {
      missing++;
      continue;
    }
    await db.query('UPDATE media_files SET duration = $2 WHERE id = $1', [row.id, seconds]);
    updated++;
  }
  console.log(
    `[duration] ${label}: updated=${updated} unresolved=${missing} (of ${rows.length} NULL rows)`
  );
  return updated;
}

(async () => {
  try {
    const updated = await backfill('translation audio');
    console.log(`[duration] done. updated=${updated}`);
  } catch (err) {
    console.error('[duration] failed:', err.message);
    process.exitCode = 1;
  } finally {
    await db.pool.end();
  }
})();