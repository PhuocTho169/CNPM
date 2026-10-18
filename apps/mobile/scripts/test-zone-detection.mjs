// Behavioural tests for the geo-zone state machine.
//
// This is the part of the feature that decides *when a visitor hears
// something*, so it is worth pinning down outside a device. zoneDetectionService
// is deliberately pure — no GPS, no network, no React — so it can be driven
// with synthetic positions here.
//
// Run: node --import ./scripts/register.mjs scripts/test-zone-detection.mjs

import assert from 'node:assert/strict';
import {
  distanceMeters,
  rankByDistance,
  evaluateZone,
  detectZoneEntry,
} from '../src/services/zoneDetectionService.js';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ok   ${name}`);
  } catch (err) {
    failed++;
    console.error(`  FAIL ${name}\n       ${err.message}`);
  }
}

// Cho Quan 4 sits at 10.7565, 106.7085 with zone_radius 180 / exit buffer 20.
const MARKET = { id: 9, name: 'Chợ Quận 4', latitude: 10.7565, longitude: 106.7085, zone_radius: 180, zone_exit_buffer: 20 };
// Oc Oanh: zone_radius 80 / buffer 15.
const SNAILS = { id: 3, name: 'Ốc Oanh', latitude: 10.754, longitude: 106.706, zone_radius: 80, zone_exit_buffer: 15 };

/** Offset a place by roughly `meters` due north, for building test positions. */
function offsetNorth(place, meters) {
  return { latitude: place.latitude + meters / 111320, longitude: place.longitude };
}

console.log('Haversine distance');

test('known distance is accurate to under 1%', () => {
  const d = distanceMeters(10.7565, 106.7085, 10.7665, 106.7085);
  assert.ok(Math.abs(d - 1112) < 12, `expected ~1112m, got ${d.toFixed(1)}m`);
});

test('identical points are 0m apart', () => {
  assert.equal(distanceMeters(10.7565, 106.7085, 10.7565, 106.7085), 0);
});

test('non-numeric input yields NaN rather than a wrong number', () => {
  assert.ok(Number.isNaN(distanceMeters(10.7, 106.7, undefined, 106.7)));
});

test('ranking sorts nearest first and annotates distance', () => {
  const ranked = rankByDistance([MARKET, SNAILS], offsetNorth(MARKET, 50));
  assert.equal(ranked[0].id, 9);
  assert.ok(ranked[0].distance_m <= 60);
  assert.ok(ranked[1].distance_m > ranked[0].distance_m);
});

console.log('\nHysteresis thresholds');

test('enter at 100m, leave at 120m by default', () => {
  assert.deepEqual(evaluateZone({ place: {}, distance: 100, isInside: false }), {
    isInside: true, entered: true, exited: false, enterMeters: 100, exitMeters: 120,
  });
});

test('per-place radius is honoured, not a global constant', () => {
  const t = evaluateZone({ place: SNAILS, distance: 100, isInside: false });
  assert.equal(t.isInside, false, '100m must be outside an 80m zone');
  assert.equal(t.enterMeters, 80);
  assert.equal(t.exitMeters, 95);
});

test('the jitter band stays inside and does not re-fire', () => {
  // 105m is past the 80m entry edge but inside the 95m+ buffer of a 80/15 zone.
  const t = evaluateZone({ place: SNAILS, distance: 85, isInside: true });
  assert.equal(t.isInside, true);
  assert.equal(t.entered, false);
});

console.log('\nZone entry transitions');

test('OUTSIDE → INSIDE fires exactly once', () => {
  const places = [MARKET];
  let state = { insidePlaceIds: [] };

  const far = detectZoneEntry({ places, position: offsetNorth(MARKET, 400), state });
  assert.equal(far.enteredPlace, null, 'must not fire from outside');

  state = far.state;
  const near = detectZoneEntry({ places, position: offsetNorth(MARKET, 50), state });
  assert.equal(near.enteredPlace?.id, 9, 'must fire on entry');
  state = near.state;

  const stillNear = detectZoneEntry({ places, position: offsetNorth(MARKET, 45), state });
  assert.equal(stillNear.enteredPlace, null, 'must NOT fire again while inside');
});

test('GPS jitter at the boundary never re-triggers audio', () => {
  // The spec's exact scenario: 99 → 101 → 99 → 101 around a 100m radius.
  const places = [{ ...MARKET, zone_radius: 100, zone_exit_buffer: 20 }];
  let state = { insidePlaceIds: [] };
  const readings = [400, 99, 101, 99, 101, 98];
  let fired = 0;

  for (const meters of readings) {
    const result = detectZoneEntry({ places, position: offsetNorth(places[0], meters), state });
    state = result.state;
    if (result.enteredPlace) fired++;
  }

  assert.equal(fired, 1, `audio must fire once across the jitter sequence, fired ${fired}`);
  assert.deepEqual(state.insidePlaceIds, [9], 'must still be inside after the jitter');
});

test('leaving then re-entering fires again', () => {
  const places = [MARKET];
  let state = { insidePlaceIds: [] };

  state = detectZoneEntry({ places, position: offsetNorth(MARKET, 50), state }).state;
  assert.deepEqual(state.insidePlaceIds, [9], 'entered');

  // 250m is past 180 + 20, so the zone closes and the place is re-armed.
  const out = detectZoneEntry({ places, position: offsetNorth(MARKET, 250), state });
  assert.deepEqual(out.state.insidePlaceIds, [], 'zone must reset on exit');
  assert.equal(out.exitedPlaceId, 9);
  state = out.state;

  const back = detectZoneEntry({ places, position: offsetNorth(MARKET, 60), state });
  assert.equal(back.enteredPlace?.id, 9, 're-entry must fire again');
});

test('a fix too vague to trust is ignored entirely', () => {
  const places = [MARKET];
  const result = detectZoneEntry({
    places,
    position: { ...offsetNorth(MARKET, 10), accuracy: 400 },
    state: { insidePlaceIds: [] },
  });
  assert.equal(result.ignoredFix, true);
  assert.equal(result.enteredPlace, null, 'a 400m-accuracy fix must not open a zone');
});

test('when two zones overlap the nearest one wins', () => {
  // The real District 4 zones do not overlap (390m apart vs 180+80m of reach),
  // so build a pair that genuinely does: A and B 222m apart, both 300m wide.
  const A = { id: 1, name: 'A', latitude: 10.7565, longitude: 106.7085, zone_radius: 300, zone_exit_buffer: 20 };
  const B = { id: 2, name: 'B', latitude: 10.7585, longitude: 106.7085, zone_radius: 300, zone_exit_buffer: 20 };
  const places = [A, B];

  // ~80m from A and ~142m from B: inside both, A is the closer narration.
  const nearA = detectZoneEntry({
    places,
    position: { latitude: 10.7565 + 80 / 111320, longitude: 106.7085 },
    state: { insidePlaceIds: [] },
  });
  assert.equal(nearA.enteredPlace?.id, 1, 'must pick the nearer of two overlapping zones');

  // ~166m from A and ~55m from B, and B is listed second on purpose.
  const nearB = detectZoneEntry({
    places,
    position: { latitude: 10.7565 + 166 / 111320, longitude: 106.7085 },
    state: { insidePlaceIds: [] },
  });
  assert.equal(nearB.enteredPlace?.id, 2, 'must pick the nearer zone regardless of list order');

  // Both zones register as inside even though only one triggers audio.
  assert.deepEqual(nearB.state.insidePlaceIds.sort(), [1, 2]);
});

test('no GPS history is retained between evaluations', () => {
  const places = [MARKET];
  const first = detectZoneEntry({ places, position: offsetNorth(MARKET, 400), state: { insidePlaceIds: [] } });
  assert.deepEqual(Object.keys(first.state), ['insidePlaceIds'], 'state holds only zone membership');
});

console.log(`\n${passed} passed, ${failed} failed.`);
process.exitCode = failed ? 1 : 0;