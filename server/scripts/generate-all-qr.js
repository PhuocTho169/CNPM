// One-off maintenance script: make sure every published place AND dish has a QR code row.
// Run: node scripts/generate-all-qr.js
const db = require('../src/db');
const media = require('../src/services/mediaService');

(async () => {
  // Places
  const places = await db.getMany(
    "SELECT id, code FROM culinary_places WHERE status = 'PUBLISHED' ORDER BY id"
  );
  for (const p of places) {
    const row = await media.generateQR(p.id, { regenerate: false });
    console.log(`place ${p.id} ${p.code} -> ${row.qr_value}`);
  }
  console.log(`Places done: ${places.length} processed.`);

  // Dishes
  const dishes = await db.getMany(
    "SELECT id, code FROM dishes WHERE status = 'PUBLISHED' ORDER BY id"
  );
  for (const d of dishes) {
    const row = await media.generateDishQR(d.id, { regenerate: false });
    console.log(`dish ${d.id} ${d.code} -> ${row.qr_value}`);
  }
  console.log(`Dishes done: ${dishes.length} processed.`);

  await db.pool.end();
  console.log('All done.');
})().catch(async (err) => {
  console.error('FAILED:', err.message);
  process.exit(1);
});