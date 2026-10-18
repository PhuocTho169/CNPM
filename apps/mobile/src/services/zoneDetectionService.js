import { GPS_CONFIG, zoneThresholds } from '../config/gps';

// Pure zone logic — no GPS, no React, no network. Given a position and a set of
// nearby places it answers exactly one question: "did the visitor just walk
// into a place's zone?".
//
// Keeping this free of side effects is what lets the transition rules in spec
// sections 6-9 be reasoned about and tested on their own.

const EARTH_RADIUS_M = 6371000;
const toRad = (deg) => (deg * Math.PI) / 180;

/**
 * Haversine great-circle distance in meters.
 * Accurate to well under a meter at city scale, which is far tighter than any
 * consumer GPS fix we will ever see.
 */
export function distanceMeters(lat1, lng1, lat2, lng2) {
  if (![lat1, lng1, lat2, lng2].every(Number.isFinite)) return NaN;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * Annotate each place with its live distance, sorted nearest first.
 * Runs on the cached nearby dataset — deliberately cheap, so it is safe to call
 * on every position update instead of re-querying the backend.
 */
export function rankByDistance(places, position) {
  if (!Array.isArray(places) || !position) return [];
  return places
    .map((place) => {
      const distance = distanceMeters(
        position.latitude,
        position.longitude,
        Number(place.latitude),
        Number(place.longitude)
      );
      return { ...place, distance_m: Math.round(distance) };
    })
    .filter((place) => Number.isFinite(place.distance_m))
    .sort((a, b) => a.distance_m - b.distance_m);
}

/**
 * The state machine, as a pure reducer over previous and current zones.
 *
 * With hysteresis, "am I inside" is not a function of the current distance
 * alone — it depends on how we got here:
 *
 *   outside --d <= enter--> inside       (fires the audio)
 *   inside  --d <= exit-->   inside       (jitter at the boundary, no event)
 *   inside  --d >  exit-->   outside      (re-arms the place for re-entry)
 *   outside --d <= exit-->   outside      (still outside, nothing happens)
 *
 * `previousZone` is per place, so standing inside stall A never silences the
 * zone around stall B next door.
 */
export function evaluateZone({ place, distance, isInside }) {
  const { enterMeters, exitMeters } = zoneThresholds(place);

  if (isInside) {
    // Stay inside until we are clearly out. This is the anti-jitter band.
    return {
      isInside: distance <= exitMeters,
      entered: false,
      exited: distance > exitMeters,
      enterMeters,
      exitMeters,
    };
  }

  const nowInside = distance <= enterMeters;
  return {
    isInside: nowInside,
    // OUTSIDE -> INSIDE is the only transition allowed to start audio.
    entered: nowInside,
    exited: false,
    enterMeters,
    exitMeters,
  };
}

/**
 * Apply a new position to the whole tracker state and report what the UI and
 * the audio player need to react to.
 *
 * `state` shape:
 *   { insidePlaceIds: number[] }  — which zones we are currently within
 *
 * Returns the next state plus:
 *   enteredPlace  the place just walked into (fires narration, at most one per
 *                 position update even if two zones overlap)
 *   exitedPlaceId the place just walked out of (re-arms it for re-entry)
 */
export function detectZoneEntry({ places, position, state }) {
  const insideIds = new Set((state?.insidePlaceIds || []).map(Number));

  // A fix this vague cannot honestly place anyone inside a 100m zone.
  if (position?.accuracy != null && position.accuracy > GPS_CONFIG.ignoreFixWorseThanMeters) {
    return { state, enteredPlace: null, exitedPlaceId: null, ignoredFix: true };
  }

  let enteredPlace = null;
  let exitedPlaceId = null;
  let bestEnteredDistance = Infinity;

  for (const place of places || []) {
    const placeId = Number(place.id);
    if (!Number.isFinite(placeId)) continue;

    const distance = distanceMeters(
      position.latitude,
      position.longitude,
      Number(place.latitude),
      Number(place.longitude)
    );
    if (!Number.isFinite(distance)) continue;

    const wasInside = insideIds.has(placeId);
    const result = evaluateZone({ place, distance, isInside: wasInside });

    if (result.isInside) insideIds.add(placeId);
    else insideIds.delete(placeId);

    if (result.entered && distance < bestEnteredDistance) {
      // When two zones overlap the visitor is physically closer to one of them,
      // and that is the more useful narration. Comparing distance rather than
      // taking the first hit means this does not depend on the order the API
      // happened to return the places in.
      bestEnteredDistance = distance;
      enteredPlace = { ...place, distance_m: Math.round(distance) };
    }
    if (result.exited && exitedPlaceId == null) {
      exitedPlaceId = placeId;
    }
  }

  return {
    state: { insidePlaceIds: [...insideIds] },
    enteredPlace,
    exitedPlaceId,
    ignoredFix: false,
  };
}

export default { distanceMeters, rankByDistance, evaluateZone, detectZoneEntry };