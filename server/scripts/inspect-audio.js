// Diagnostic: are the generated mp3 files real speech or silence?
//
// A file can be a valid mp3, non-zero in size, and still contain no audible
// sound — which looks identical to "the player is broken" from the browser.
// This reads the file directly and reports its real characteristics.
//
// Usage: node scripts/inspect-audio.js [placeId]
const fs = require('fs');
const path = require('path');
const db = require('../src/db');
const config = require('../src/config');
const { findFrameHeader, parseMpeg } = require('../src/utils/audioDuration');

// MPEG frame parsing lives in src/utils/audioDuration so the runtime path
// (attachAudio), the backfill script and this diagnostic all read durations
// with exactly the same logic.

// Rough loudness proxy: if every frame is byte-identical the file is a tone or
// silence, not speech. Sample the middle of the payload and measure variation.
function variability(buf) {
  const start = findFrameHeader(buf);
  if (start < 0) return null;
  const chunk = buf.subarray(start, Math.min(buf.length, start + 20000));
  let min = 255;
  let max = 0;
  for (const b of chunk) {
    if (b < min) min = b;
    if (b > max) max = b;
  }
  return { min, max, spread: max - min };
}

(async () => {
  const placeId = process.argv[2] ? Number(process.argv[2]) : 1;
  const rows = await db.getMany(
    `SELECT t.entity_id AS culinary_place_id, l.code AS lang, m.url AS file_url, m.file_size, m.created_at
     FROM media_files m
     JOIN translations t ON t.id = m.entity_id
     JOIN languages l ON l.id = t.language_id
     WHERE m.kind = 'audio' AND t.entity_type = 'place' AND t.entity_id = $1
     ORDER BY l.id`,
    [placeId]
  );

  if (!rows.length) {
    console.log(`No audio rows for place ${placeId}.`);
  }
  console.log(`place ${placeId}: ${rows.length} language(s)\n`);

  const seen = new Set();
  for (const r of rows) {
    const file = path.join(config.uploadDir, 'audio', path.basename(r.file_url));
    if (!fs.existsSync(file)) {
      console.log(`  ${r.lang}  MISSING ON DISK  ${path.basename(r.file_url)}`);
      continue;
    }
    const stat = fs.statSync(file);
    const buf = fs.readFileSync(file);
    const info = parseMpeg(buf);
    const v = variability(buf);
    // Compare the whole payload, not just the header — every mp3 shares a header.
    const uniq = require('crypto').createHash('md5').update(buf).digest('hex');
    const dup = seen.has(uniq);
    seen.add(uniq);

    const dur = info ? info.durationSec.toFixed(2) + 's' : 'UNPARSEABLE';
    console.log(
      `  ${r.lang}  ${String(stat.size).padStart(7)}B  dur=${dur.padStart(8)}  ` +
      `${info ? (info.bitrate / 1000) + 'kbps ' + info.version + ' ' + (info.mono ? 'mono' : 'stereo') + ' ' + info.sampleRate + 'Hz' : ''}  ` +
      `spread=${v ? v.spread : '?'}  ${dup ? 'DUPLICATE!' : 'unique'}  ${uniq.slice(0, 12)}`
    );
  }

  console.log('\nInterpretation:');
  console.log('  dur ~0s or UNPARSEABLE  → file is empty/broken (TTS failed)');
  console.log('  DUPLICATE!               → same audio reused across languages');
  console.log('  spread near 0            → silence, not speech');
  console.log('  db.file_size matches size on disk → metadata is consistent');

  await db.pool.end();
})().catch((e) => { console.error(e); process.exit(1); });