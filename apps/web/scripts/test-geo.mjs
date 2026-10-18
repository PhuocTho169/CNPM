// Tests for the turn-by-turn directions helpers added to the place page.
// Run: node apps/web/scripts/test-geo.mjs
//
// These are pure functions apart from getCurrentPosition, which is exercised
// here through a stubbed navigator so the permission-denied path is covered
// without a real browser.
import assert from 'node:assert/strict';
import {
  directionsUrl, osmMapUrl, distanceMeters, formatDistance, getCurrentPosition,
} from '../src/utils/geo.js';

let passed = 0;
let failed = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  ok   ${name}`);
    passed++;
  } catch (err) {
    console.log(`  FAIL ${name}\n       ${err.message}`);
    failed++;
  }
}
async function testAsync(name, fn) {
  try {
    await fn();
    console.log(`  ok   ${name}`);
    passed++;
  } catch (err) {
    console.log(`  FAIL ${name}\n       ${err.message}`);
    failed++;
  }
}

const Q4 = { latitude: 10.758, longitude: 106.682 };

// Node 20 exposes `navigator` as a getter-only global, so a plain assignment
// throws. Redefine the property to stub the browser's geolocation.
function stubNavigator(value) {
  Object.defineProperty(globalThis, 'navigator', {
    value,
    configurable: true,
    writable: true,
  });
}

console.log('\nDirections URL');

test('without origin it still routes to the destination', () => {
  const url = directionsUrl(Q4);
  assert.match(url, /^https:\/\/www\.google\.com\/maps\/dir\//);
  assert.match(url, /destination=10\.758,106\.682/);
});

test('with origin it routes from the visitor to the place', () => {
  const url = directionsUrl(Q4, '10.750,106.700');
  assert.match(url, /origin=10\.750,106\.700/);
  assert.match(url, /destination=10\.758,106\.682/);
});

test('walking is the default mode for a district food tour', () => {
  assert.match(directionsUrl(Q4), /travelmode=walking/);
});

test('the OSM fallback centres on the place at street zoom', () => {
  const url = osmMapUrl(Q4);
  assert.match(url, /openstreetmap\.org/);
  assert.match(url, /mlat=10\.758/);
  assert.match(url, /#map=17\/10\.758\/106\.682/);
});

console.log('\nDistance');

test('zero distance for the same point', () => {
  assert.equal(distanceMeters(Q4, { ...Q4 }), 0);
});

test('a known Quận 4 distance is within a plausible range', () => {
  const m = distanceMeters(Q4, { latitude: 10.7575, longitude: 106.6955 });
  // ~1.5 km apart in real terms; allow 10% for the spherical approximation.
  assert.ok(m > 1300 && m < 1700, `expected ~1476 m, got ${m}`);
});

test('a missing coordinate yields null rather than NaN', () => {
  assert.equal(distanceMeters(null, Q4), null);
  assert.equal(distanceMeters(Q4, { latitude: null, longitude: 1 }), null);
});

test('distance is symmetric', () => {
  const a = distanceMeters(Q4, { latitude: 10.7, longitude: 106.6 });
  const b = distanceMeters({ latitude: 10.7, longitude: 106.6 }, Q4);
  assert.equal(a, b);
});

test('formatting switches to km above 1000 m', () => {
  assert.equal(formatDistance(0), '0 m');
  assert.equal(formatDistance(78), '78 m');
  assert.equal(formatDistance(999), '999 m');
  assert.equal(formatDistance(1476), '1.5 km');
  assert.equal(formatDistance(null), null);
});

console.log('\nGeolocation fallback');

await testAsync('resolves the position when the visitor allows GPS', async () => {
  stubNavigator({
    geolocation: {
      getCurrentPosition: (ok) => ok({ coords: { latitude: 10.75, longitude: 106.69 } }),
    },
  });
  const here = await getCurrentPosition();
  assert.deepEqual(here, { latitude: 10.75, longitude: 106.69 });
});

await testAsync('resolves null when permission is denied (no throw)', async () => {
  stubNavigator({ geolocation: { getCurrentPosition: (ok, fail) => fail({ code: 1 }) } });
  assert.equal(await getCurrentPosition(), null);
});

await testAsync('resolves null when the browser has no geolocation', async () => {
  stubNavigator({});   // navigator exists, geolocation does not
  assert.equal(await getCurrentPosition(), null);
});

await testAsync('times out instead of hanging when no callback arrives', async () => {
  stubNavigator({ geolocation: { getCurrentPosition: () => {} } });
  const started = Date.now();
  assert.equal(await getCurrentPosition({ timeoutMs: 120 }), null);
  assert.ok(Date.now() - started < 2000, 'should not hang past the timeout');
});

console.log(`\n${passed} passed, ${failed} failed.`);
process.exit(failed === 0 ? 0 : 1);