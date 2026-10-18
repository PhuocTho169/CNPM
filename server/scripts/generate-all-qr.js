// One-off maintenance script: make sure every place has a QR code row.
// Run: node scripts/generate-all-qr.js
const db = require('../src/db');
const media = require('../src/services/mediaService');

(async () => {
  const places = await db.getMany(
    "SELECT id, code FROM culinary_places WHERE status = 'PUBLISHED' ORDER BY id"
  );
  for (const p of places) {
    // No originHint: fall back to PUBLIC_BASE_URL from .env (the LAN address),
    // which is what a real phone camera needs to reach.
    const row = await media.generateQR(p.id, { regenerate: false });
    console.log(`${p.id} ${p.code} -> ${row.qr_value}`);
  }
  console.log(`Done. ${places.length} place(s) processed.`);
  await db.pool.end();
})().catch(async (err) => {
  console.error('FAILED:', err.message);
  process.exit(1);
});