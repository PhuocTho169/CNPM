// Tests for the request-throttling layer (spec sections 19-20).
//
// The rule being protected: a GPS fix must not cost a network request. The app
// only re-fetches /nearby when the visitor has moved far enough that the cached
// zones could be stale, or when the cache has aged out.
//
// Run: node --import ./scripts/register.mjs scripts/test-api-throttling.mjs

import assert from 'node:assert/strict';
import { shouldRefreshNearby, resolveAudioUrl } from '../src/services/audioGuideService.js';
import { GPS_CONFIG } from '../src/config/gps.js';

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

const ORIGIN = { latitude: 10.7565, longitude: 106.7085 };

function cacheAt(ageMs = 0, overrides = {}) {
  return {
    places: [{ id: 9 }, { id: 3 }],
    origin: ORIGIN,
    fetchedAt: Date.now() - ageMs,
    language: 'vi',
    ...overrides,
  };
}

/** Offset ORIGIN by roughly `meters` north. */
function movedNorth(meters) {
  return { latitude: ORIGIN.latitude + meters / 111320, longitude: ORIGIN.longitude, accuracy: 10 };
}

console.log('Nearby refresh throttling');

test('an empty cache always fetches', () => {
  assert.equal(shouldRefreshNearby({ cache: null, position: ORIGIN, language: 'vi' }), true);
});

test('standing still produces no requests', () => {
  assert.equal(shouldRefreshNearby({ cache: cacheAt(1000), position: ORIGIN, language: 'vi' }), false);
  assert.equal(shouldRefreshNearby({ cache: cacheAt(5000), position: movedNorth(3), language: 'vi' }), false);
});

test('drifting inside the threshold produces no requests', () => {
  // 20m of drift is well under the 60m refresh distance.
  assert.equal(shouldRefreshNearby({ cache: cacheAt(1000), position: movedNorth(20), language: 'vi' }), false);
});

test('moving past the threshold triggers exactly one refresh', () => {
  assert.equal(shouldRefreshNearby({ cache: cacheAt(1000), position: movedNorth(80), language: 'vi' }), true);
});

test('a stale cache refreshes even when standing still', () => {
  const age = GPS_CONFIG.nearbyRefreshIntervalMs + 1000;
  assert.equal(shouldRefreshNearby({ cache: cacheAt(age), position: ORIGIN, language: 'vi' }), true);
});

test('a fresh cache does not refresh just because time passed', () => {
  const age = GPS_CONFIG.nearbyRefreshIntervalMs - 5000;
  assert.equal(shouldRefreshNearby({ cache: cacheAt(age), position: ORIGIN, language: 'vi' }), false);
});

test('switching language forces a refetch in the new language', () => {
  assert.equal(shouldRefreshNearby({ cache: cacheAt(1000), position: ORIGIN, language: 'en' }), true);
});

test('100 consecutive sub-threshold fixes cause zero requests', () => {
  let requests = 0;
  const cache = cacheAt(0);
  for (let i = 0; i < 100; i++) {
    // Wander back and forth within the refresh radius, as a slow walker would.
    const position = movedNorth(i < 50 ? i : 100 - i);
    if (shouldRefreshNearby({ cache, position, language: 'vi' })) requests++;
  }
  assert.equal(requests, 0, `expected no requests while wandering, made ${requests}`);
});

console.log('\nAudio URL resolution');

test('relative upload paths resolve against the API origin', () => {
  assert.equal(resolveAudioUrl('/uploads/audio/place-1-vi.mp3'), 'http://localhost:5000/uploads/audio/place-1-vi.mp3');
});

test('absolute URLs are passed through untouched', () => {
  const url = 'http://192.168.1.53:8080/uploads/audio/x.mp3';
  assert.equal(resolveAudioUrl(url), url);
});

test('a missing url stays null rather than becoming a broken string', () => {
  assert.equal(resolveAudioUrl(null), null);
  assert.equal(resolveAudioUrl(''), null);
});

console.log(`\n${passed} passed, ${failed} failed.`);
process.exitCode = failed ? 1 : 0;