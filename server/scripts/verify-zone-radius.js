// Verify that the GPS audio-zone radius is genuinely admin-writable.
//
// The mobile guide trusts `zone_radius` / `zone_exit_buffer` from the backend, so
// these two columns have to be settable and must survive an unrelated admin
// edit. This exercises the real service against the real database and restores
// the original values.
//
// Usage: node scripts/verify-zone-radius.js
const db = require('../src/db');
const placeService = require('../src/services/placeService');

const PLACE_ID = 1;

let failed = 0;
function check(label, condition, detail) {
  if (condition) {
    console.log(`  ok   ${label}`);
  } else {
    failed++;
    console.error(`  FAIL ${label}${detail ? `\n       ${detail}` : ''}`);
  }
}

(async () => {
  const original = await db.getOne(
    'SELECT zone_radius, zone_exit_buffer, address FROM culinary_places WHERE id = $1',
    [PLACE_ID]
  );
  console.log(`  original: radius=${original.zone_radius}m buffer=${original.zone_exit_buffer}m\n`);

  try {
    // 1. Admin writes a new radius through the service used by PUT /places/:id.
    await placeService.update(PLACE_ID, { zone_radius: 250, zone_exit_buffer: 40 });
    let row = await db.getOne(
      'SELECT zone_radius, zone_exit_buffer FROM culinary_places WHERE id = $1',
      [PLACE_ID]
    );
    check('admin can widen the zone', row.zone_radius === 250 && row.zone_exit_buffer === 40,
      `got ${row.zone_radius}/${row.zone_exit_buffer}`);

    // 2. An unrelated edit (address only) must NOT reset the tuned radius.
    await placeService.update(PLACE_ID, { address: 'Ben Van Don, Ward 5, District 4' });
    row = await db.getOne(
      'SELECT zone_radius, zone_exit_buffer FROM culinary_places WHERE id = $1',
      [PLACE_ID]
    );
    check('unrelated edit preserves the tuned radius', row.zone_radius === 250 && row.zone_exit_buffer === 40,
      `got ${row.zone_radius}/${row.zone_exit_buffer}`);

    // 3. The value reaches the public GPS payload the phone reads.
    const zones = await require('../src/services/geoAudioService').findNearbyZones({
      latitude: 10.7575,
      longitude: 106.6955,
      radius: 500,
      lang: 'vi',
    });
    const zone = zones.find((z) => z.id === PLACE_ID);
    check('public nearby payload carries the new radius', zone && zone.zone_radius === 250,
      `got ${zone ? zone.zone_radius : 'place not in range'}`);

    // 4. The CHECK constraints reject nonsense a typo could produce.
    let rejectedRadius = false;
    try {
      await db.query('UPDATE culinary_places SET zone_radius = 99999 WHERE id = $1', [PLACE_ID]);
    } catch (err) {
      rejectedRadius = /chk_places_zone_radius/.test(err.message);
    }
    check('out-of-range radius is rejected by the database', rejectedRadius,
      'the CHECK constraint did not fire');

    // 5. decoratePlace exposes the columns to the admin form.
    const detail = await placeService.getById(PLACE_ID, 'vi');
    check('place payload exposes zone_radius to the admin UI',
      detail.zone_radius === 250 && detail.zone_exit_buffer === 40,
      `got ${detail.zone_radius}/${detail.zone_exit_buffer}`);
  } finally {
    // Every field this script touches must come back. Step 2 edits the address
    // to prove the radius survives an unrelated save, so restoring only the
    // radius would silently corrupt the place.
    await db.query(
      `UPDATE culinary_places
          SET zone_radius = $2, zone_exit_buffer = $3, address = $4
        WHERE id = $1`,
      [PLACE_ID, original.zone_radius, original.zone_exit_buffer, original.address]
    );
    const restored = await db.getOne(
      'SELECT zone_radius, zone_exit_buffer, address FROM culinary_places WHERE id = $1',
      [PLACE_ID]
    );
    console.log(`\n  restored: radius=${restored.zone_radius}m buffer=${restored.zone_exit_buffer}m`);
    console.log(`  address:  ${restored.address}`);
    if (restored.address !== original.address) {
      console.error('  FAIL restore did not put the address back');
      process.exitCode = 1;
    }
  }

  console.log(failed ? `\n${failed} check(s) FAILED.` : '\nAll checks passed.');
  process.exitCode = failed ? 1 : 0;
  await db.pool.end();
})().catch(async (err) => {
  console.error(err);
  process.exitCode = 1;
  await db.pool.end();
});