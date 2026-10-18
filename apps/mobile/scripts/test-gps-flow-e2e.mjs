// End-to-end check of the GPS guide against the *running* backend.
//
// The unit tests cover the state machine and the throttling. This one covers
// the thing they cannot: that the real API returns zones the real detector can
// use, and that the narration URL it hands back is a playable audio file.
//
// It walks a synthetic visitor along Nguyen Khoai street: starts outside every
// zone, crosses into Bánh Canh Cua Nguyễn Khoái, and must hear the guide
// exactly once.
//
// Requires the backend at EXPO_PUBLIC_API_URL (default http://localhost:5000/api).
//
// Run: node --import ./scripts/register.mjs scripts/test-gps-flow-e2e.mjs

import assert from 'node:assert/strict';
import { detectZoneEntry, rankByDistance, distanceMeters } from '../src/services/zoneDetectionService.js';
import { fetchNearbyZones, fetchNarration, resolveAudioUrl } from '../src/services/audioGuideService.js';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';
const LANGUAGE = process.env.E2E_LANG || 'vi';

// Nguyen Khoai street, Quận 4. Start ~350m south of Bánh Canh Cua Nguyễn Khoái
// (10.7575, 106.6955) and walk north towards it.
const START = { latitude: 10.7544, longitude: 106.6955 };
const WALK_STEP_M = 25;

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ok   ${name}`);
  } catch (err) {
    failed++;
    console.error(`  FAIL ${name}\n       ${err.message}`);
  }
}

console.log(`Backend: ${API_BASE}  language: ${LANGUAGE}\n`);

const places = await fetchNearbyZones({
  latitude: START.latitude,
  longitude: START.longitude,
  language: LANGUAGE,
});
console.log(`  /culinary-places/nearby returned ${places.length} zones\n`);

await test('backend returns zones with usable geometry', () => {
  assert.ok(places.length > 0, 'expected at least one nearby place');
  for (const p of places) {
    assert.ok(Number.isFinite(Number(p.id)), 'place needs an id');
    assert.ok(Number.isFinite(Number(p.latitude)), `place ${p.id} needs latitude`);
    assert.ok(Number.isFinite(Number(p.longitude)), `place ${p.id} needs longitude`);
    assert.ok(Number(p.zone_radius) > 0, `place ${p.id} needs zone_radius`);
  }
});

await test('the target place is present with a real radius', () => {
  const target = places.find((p) => p.id === 1);
  assert.ok(target, 'Bánh Canh Cua Nguyễn Khoái (id 1) should be within 500m of the start');
  assert.ok(target.zone_radius > 0);
  console.log(`       zone_radius=${target.zone_radius}m buffer=${target.zone_exit_buffer}m`);
});

await test('walking the street enters each zone once, in walking order', () => {
  const state = { insidePlaceIds: [] };
  const fired = [];

  const totalMeters = 400;
  for (let m = 0; m <= totalMeters; m += WALK_STEP_M) {
    const position = {
      latitude: START.latitude + m / 111320,
      longitude: START.longitude,
      accuracy: 12,
    };
    const result = detectZoneEntry({ places, position, state });
    state.insidePlaceIds = result.state.insidePlaceIds;
    if (result.enteredPlace) fired.push({ id: result.enteredPlace.id, at: m });
  }

  // Nguyen Khoai is a dense food street: place 1 (bánh canh) and place 6 (bánh
  // xèo) are 78m apart with overlapping zones, so this walk legitimately enters
  // two. What must hold is one entry per place, never a repeat.
  assert.ok(fired.length >= 1, 'the walk must enter at least one zone');
  assert.equal(fired[0].id, 1, 'the first zone entered must be the one the walk heads toward');

  const ids = fired.map((f) => f.id);
  assert.equal(new Set(ids).size, ids.length, `no place may fire twice: ${JSON.stringify(fired)}`);
  console.log(`       entered ${fired.map((f) => `${f.id}@${f.at}m`).join(', ')}`);
});

await test('standing still inside a zone never re-fires', () => {
  const insidePlace = places.find((p) => p.id === 6);
  const base = {
    latitude: insidePlace.latitude,
    longitude: insidePlace.longitude,
    accuracy: 8,
  };

  // Seed the state with every zone that genuinely covers this spot. On Nguyen
  // Khoai that is both place 6 and place 1 (78m apart, radii 80m and 90m), so a
  // correct detector must consider the visitor already inside both.
  const seedIds = places
    .filter((p) => distanceMeters(base.latitude, base.longitude, p.latitude, p.longitude) <= p.zone_radius)
    .map((p) => p.id);
  assert.ok(seedIds.length >= 1, 'test point must be inside at least one zone');

  let state = { insidePlaceIds: seedIds };
  let fired = 0;

  for (let i = 0; i < 200; i++) {
    const position = {
      latitude: base.latitude + (i % 2 ? 0.00002 : -0.00002),
      longitude: base.longitude,
      accuracy: 8 + (i % 5),
    };
    const result = detectZoneEntry({ places, position, state });
    state = result.state;
    if (result.enteredPlace) fired++;
  }

  assert.equal(fired, 0, `jitter must not re-trigger, fired ${fired} times`);
  assert.deepEqual([...state.insidePlaceIds].sort(), [...seedIds].sort(), 'must still be inside the same zones');
  console.log(`       standing inside zones ${seedIds.join(', ')} for 200 fixes, 0 re-triggers`);
});

await test('a fix too vague to trust opens no zone at all', () => {
  const deep = {
    latitude: places[0].latitude,
    longitude: places[0].longitude,
    accuracy: 400,
  };
  const result = detectZoneEntry({ places, position: deep, state: { insidePlaceIds: [] } });
  assert.equal(result.ignoredFix, true);
  assert.equal(result.enteredPlace, null);
  assert.deepEqual(result.state.insidePlaceIds, [], 'no zone may open from a 400m-accuracy fix');
});

await test('nearby list is ranked by real distance', () => {
  const ranked = rankByDistance(places, START);
  for (let i = 1; i < ranked.length; i++) {
    assert.ok(ranked[i].distance_m >= ranked[i - 1].distance_m, 'ranking must be ascending');
  }
  console.log(`       nearest: ${ranked[0].name} @ ${ranked[0].distance_m}m`);
});

await test('narration is available and the audio file actually plays bytes', async () => {
  const guide = await fetchNarration({ placeId: 1, language: LANGUAGE });
  assert.ok(guide, `expected narration for place 1 in ${LANGUAGE}`);
  assert.ok(guide.audioUrl, 'narration must include an audioUrl');
  assert.ok(guide.audioUrl.startsWith('http'), `audioUrl must be absolute, got ${guide.audioUrl}`);
  console.log(`       "${guide.title}" ${guide.duration}s → ${guide.audioUrl}`);

  const res = await fetch(guide.audioUrl, { method: 'GET', headers: { Range: 'bytes=0-1023' } });
  assert.ok(res.status === 200 || res.status === 206, `audio fetch returned ${res.status}`);
  const type = res.headers.get('content-type') || '';
  assert.ok(type.includes('audio'), `expected audio content-type, got ${type}`);

  const bytes = new Uint8Array(await res.arrayBuffer());
  assert.ok(bytes.length > 1000, `audio looks empty (${bytes.length} bytes)`);
  // Every mp3 starts with (or shortly after ID3) an MPEG frame sync word.
  const hasSync = bytes.some((b, i) => b === 0xff && (bytes[i + 1] & 0xe0) === 0xe0);
  assert.ok(hasSync, 'downloaded file does not look like an mp3');
  console.log(`       served ${bytes.length} bytes, ${type}, mp3 frame sync present`);
});

await test('a language with no guide fails softly, not loudly', async () => {
  const guide = await fetchNarration({ placeId: 1, language: 'xx' });
  assert.equal(guide, null, 'unknown language must resolve to null so the UI can explain');
});

console.log(`\n${passed} passed, ${failed} failed.`);
process.exitCode = failed ? 1 : 0;