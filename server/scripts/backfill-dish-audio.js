// Backfill TTS audio for every DISH translation in every active language.
//
// Usage:
//   node scripts/backfill-dish-audio.js            # only missing audio
//   node scripts/backfill-dish-audio.js --force    # regenerate everything
const db = require('../src/db');
const dishAudio = require('../src/services/dishAudioService');

const force = process.argv.includes('--force');

(async () => {
  const params = [];
  let sql = `
    SELECT dt.id AS id, dt.id AS translation_id, dt.dish_id, d.code, d.is_signature,
           l.code AS language_code, dt.name, dt.description, dt.ingredients,
           da.id AS existing_id
    FROM dish_translations dt
    JOIN languages l ON l.id = dt.language_id
    JOIN dishes d ON d.id = dt.dish_id
    LEFT JOIN dish_audio_guides da ON da.translation_id = dt.id
    WHERE l.is_active = true`;
  if (!force) sql += ` AND da.id IS NULL`;
  sql += ` ORDER BY d.id, l.id`;

  const rows = await db.getMany(sql, params);
  console.log(`${force ? 'Regenerating' : 'Generating missing audio for'} ${rows.length} dish translation(s).\n`);

  let created = 0;
  let failed = 0;
  for (const t of rows) {
    const label = `dish ${t.dish_id} (${t.code}) ${t.language_code}`.padEnd(38);
    try {
      const row = await dishAudio.generateForTranslation(t, { force });
      if (!row) {
        console.log(`  skip  ${label} (no text)`);
        continue;
      }
      console.log(`  ok    ${label} -> ${row.file_url}`);
      created++;
    } catch (err) {
      console.log(`  FAIL  ${label} -> ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone. created=${created} failed=${failed}`);

  const coverage = await db.getMany(`
    SELECT d.id, d.code,
      count(DISTINCT dt.id) AS translations,
      count(DISTINCT da.id) AS with_audio
    FROM dishes d
    JOIN dish_translations dt ON dt.dish_id = d.id
    LEFT JOIN dish_audio_guides da ON da.translation_id = dt.id
    GROUP BY d.id, d.code ORDER BY d.id
  `);
  console.log('\nDish coverage:');
  let gaps = 0;
  for (const c of coverage) {
    const ok = Number(c.with_audio) >= Number(c.translations);
    if (!ok) gaps++;
    console.log(`  ${ok ? 'OK ' : 'GAP'} dish ${c.id} ${c.code}: ${c.with_audio}/${c.translations}`);
  }
  if (!gaps) console.log('  → every dish has audio in all active languages.');

  await db.pool.end();
  process.exit(failed > 0 ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });