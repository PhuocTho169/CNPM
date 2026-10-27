// One-off maintenance script: make sure every published place AND dish has a
// QR code row. Optionally re-encode the QR VALUE to a new base URL — needed
// after the site moves (new ngrok domain / new LAN IP), since a QR bakes its
// full URL at generation time and an old URL makes the QR un-openable on a
// phone (it encodes http://localhost:5173/... = the phone itself).
//
// Run (from server/): node scripts/generate-all-qr.js [https://new-base-url]
//   with a base URL  : places/dishes whose qr_value ALREADY encodes it are
//                      skipped (idempotent - safe to re-run)
//   without          : only missing QR rows are created, existing URLs stay
const db = require('../src/db');
const media = require('../src/services/mediaService');

const baseUrl = process.argv[2];
if (baseUrl && !/^https?:\/\/.+/.test(baseUrl)) {
  console.error('Base URL must be an http(s) URL, e.g. https://sub.ngrok-free.app');
  process.exit(1);
}
if (baseUrl && /\/$/.test(baseUrl)) {
  console.error('Base URL must not end with a slash.');
  process.exit(1);
}

(async () => {
  // Places
  const places = await db.getMany(
    "SELECT id, code FROM culinary_places WHERE status = 'PUBLISHED' ORDER BY id"
  );
  for (const p of places) {
    const row = await media.generateQR(p.id, { regenerate: false, baseUrl });
    console.log(`place ${p.id} ${p.code} -> ${row.qr_value}`);
  }
  console.log(`Places done: ${places.length} processed.`);

  // Dishes
  const dishes = await db.getMany(
    "SELECT id, code FROM dishes WHERE status = 'PUBLISHED' ORDER BY id"
  );
  for (const d of dishes) {
    const row = await media.generateDishQR(d.id, { regenerate: false, baseUrl });
    console.log(`dish ${d.id} ${d.code} -> ${row.qr_value}`);
  }
  console.log(`Dishes done: ${dishes.length} processed.`);

  await db.pool.end();
  console.log('All done.');
})().catch(async (err) => {
  console.error('FAILED:', err.message);
  process.exit(1);
});