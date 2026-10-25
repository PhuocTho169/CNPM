// Backfill TTS audio for EVERY place translation in EVERY active language.
//
// Why this exists: audio was previously generated lazily — only for the language
// a visitor happened to be viewing, only once. That left places with 1 or 2 of
// the 4 languages having audio at all. This script fills the whole matrix.
//
// Usage:
//   node scripts/backfill-all-audio.js              # only missing audio
//   node scripts/backfill-all-audio.js --force      # regenerate everything
//   node scripts/backfill-all-audio.js --place 1    # one place only
const db = require('../src/db');
const media = require('../src/services/mediaService');
const narration = require('../src/utils/narration');

const force = process.argv.includes('--force');
const onlyPlace = (() => {
  const i = process.argv.indexOf('--place');
  return i !== -1 ? Number(process.argv[i + 1]) : null;
})();

(async () => {
  const params = [];
  let sql = `
    SELECT t.id AS translation_id, t.entity_id AS culinary_place_id, p.code, p.status,
           l.code AS language_code, t.name, t.short_description, t.description,
           t.history, t.cultural_significance, t.tourist_tips
    FROM translations t
    JOIN languages l ON l.id = t.language_id
    JOIN culinary_places p ON p.id = t.entity_id
    WHERE t.entity_type = 'place' AND l.is_active = true`;
  if (onlyPlace) {
    params.push(onlyPlace);
    sql += ` AND p.id = $${params.length}`;
  }
  sql += ` ORDER BY p.id, l.id`;

  const rows = await db.getMany(sql, params);
  console.log(`Found ${rows.length} translation(s) to process.\n`);

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const t of rows) {
    const existing = await media.getAudioForTranslation(t.translation_id);
    if (existing && !force) {
      console.log(`  skip  place ${t.culinary_place_id} ${t.language_code} (already has ${existing.file_url})`);
      skipped++;
      continue;
    }

    const label = `place ${t.culinary_place_id} ${t.language_code}`.padEnd(16);
    try {
      // Same ~30s script every other entry point narrates (utils/narration).
      const text = narration.placeNarration(t, t.language_code);
      if (!text) {
        console.log(`  skip  ${label} (no text to narrate)`);
        skipped++;
        continue;
      }
      const result = await media.generateSpeech(text, t.language_code);
      const row = await media.attachAudio(t.translation_id, result);
      console.log(`  ok    ${label} -> ${row.file_url}`);
      created++;
    } catch (err) {
      console.log(`  FAIL  ${label} -> ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone. created=${created} skipped=${skipped} failed=${failed}`);

  // Final report straight from the DB so the numbers are verifiable.
  const coverage = await db.getMany(`
    SELECT p.id, p.code,
      count(DISTINCT t.id) AS translations,
      count(DISTINCT m.id) AS with_audio
    FROM culinary_places p
    JOIN translations t
      ON t.entity_type = 'place' AND t.entity_id = p.id
    LEFT JOIN media_files m
      ON m.entity_type = 'translation' AND m.entity_id = t.id AND m.kind = 'audio'
    GROUP BY p.id, p.code ORDER BY p.id
  `);
  console.log('\nCoverage per place:');
  for (const c of coverage) {
    const ok = Number(c.with_audio) >= Number(c.translations) ? 'OK ' : 'GAP';
    console.log(`  ${ok} place ${c.id} ${c.code}: ${c.with_audio}/${c.translations}`);
  }

  await db.pool.end();
  process.exit(failed > 0 ? 1 : 0);
})().catch(async (err) => {
  console.error('FAILED:', err);
  process.exit(1);
});