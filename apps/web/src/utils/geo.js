// Turn-by-turn navigation helpers.
//
// The place page needs two different things and they are easy to confuse:
//   - openMapUrl   → just show where the place is (works with no GPS permission)
//   - directionsUrl → route the visitor from where they ARE to the place
// Google Maps Directions is the one link that does real turn-by-turn on both
// iOS and Android, so that is what "Chỉ đường" opens.

export const GOOGLE_MAPS_DIRS = 'https://www.google.com/maps/dir/';

/**
 * Google Maps directions URL.
 * Pass `origin` (lat,lng) when the visitor's position is already known;
 * omit it and Google asks the phone for the current location itself, which is
 * the more reliable path on mobile.
 */
export function directionsUrl({ latitude, longitude }, origin) {
  const dest = `${latitude},${longitude}`;
  const qs = ['api=1', `destination=${dest}`, `travelmode=walking`];
  if (origin) qs.push(`origin=${origin}`);
  return `${GOOGLE_MAPS_DIRS}?${qs.join('&')}`;
}

/** OpenStreetMap fallback — no Google account, no tracking params.
 *  Uses the German OSM mirror: the main www.openstreetmap.org host is
 *  unreachable (NXDOMAIN) on some networks, and a dead link must not
 *  dead-end the "open map" button. */
export function osmMapUrl({ latitude, longitude }) {
  return `https://www.openstreetmap.de/karte.html?zoom=17&lat=${latitude}&lon=${longitude}`;
}

/** Straight-line distance in metres, or null when either point is missing. */
export function distanceMeters(from, to) {
  if (!from?.latitude || !to?.latitude) return null;
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(to.latitude - from.latitude);
  const dLng = toRad(to.longitude - from.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.latitude)) * Math.cos(toRad(to.latitude)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
}

export function formatDistance(meters) {
  if (meters == null) return null;
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Ask the browser where the visitor is.
 * Resolves to null on denial or timeout — callers must degrade to plain map
 * rather than failing, since a permissions prompt should never dead-end the
 * page.
 */
export function getCurrentPosition({ timeoutMs = 10000 } = {}) {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    let settled = false;
    const done = (value) => { if (!settled) { settled = true; resolve(value); } };
    // A second timer covers browsers that sit on the permission prompt.
    const timer = setTimeout(() => done(null), timeoutMs);
    navigator.geolocation.getCurrentPosition(
      (pos) => { clearTimeout(timer); done({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }); },
      () => { clearTimeout(timer); done(null); },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60000 }
    );
  });
}