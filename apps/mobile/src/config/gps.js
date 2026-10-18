// Tunable constants for the GPS audio guide.
//
// Every threshold the guide depends on lives here so field tuning means editing
// one file rather than hunting through components. The values follow the spec's
// suggested starting point and are expected to be adjusted after real-device
// testing.

export const GPS_CONFIG = {
  // --- Location watcher ---
  // distanceInterval: ignore fixes that moved the device less than this.
  // timeInterval: hard ceiling on how often we are woken.
  distanceInterval: 10, // meters
  timeInterval: 3000, // ms

  // How long a single fix may take before we give up and show an error.
  fixTimeoutMs: 15000,

  // Accuracy (m) above which a fix is too vague to act on. Hysteresis already
  // stops jitter from re-triggering audio; this stops a 300m fix from being
  // treated as a real position at all.
  maxAcceptableAccuracy: 100,

  // --- Nearby dataset ---
  // Fetch radius is intentionally wider than any zone_radius so we never miss a
  // place the visitor is about to walk into.
  nearbyRadiusMeters: 500,
  nearbyLimit: 20,

  // Only re-fetch /nearby once the visitor has moved this far from the point
  // the cached dataset was fetched at. This is what keeps the app from hitting
  // the network on every tiny GPS movement (spec section 20).
  nearbyRefreshDistanceMeters: 60,

  // Hard ceiling on dataset age, so a visitor who stands still for a long time
  // still eventually gets fresh data.
  nearbyRefreshIntervalMs: 120000,

  // --- Zone hysteresis ---
  // Defaults are overridden per place by the backend: each place ships its own
  // zone_radius and zone_exit_buffer. These are the fallback values used when
  // the API does not provide them.
  defaultZoneRadiusMeters: 100,
  defaultZoneExitBufferMeters: 20,

  // Ignore a fix entirely when the reported accuracy is worse than this many
  // metres, so one bad reading cannot trigger or cancel a zone.
  ignoreFixWorseThanMeters: 150,
};

// Zone thresholds for one place. Enter at zone_radius, leave at
// zone_radius + zone_exit_buffer. That gap is the whole point: a visitor
// standing at 99m, 101m, 99m must not retrigger the audio three times.
export function zoneThresholds(place) {
  const radius = Number(place?.zone_radius) > 0
    ? Number(place.zone_radius)
    : GPS_CONFIG.defaultZoneRadiusMeters;
  const buffer = Number.isFinite(Number(place?.zone_exit_buffer))
    ? Number(place.zone_exit_buffer)
    : GPS_CONFIG.defaultZoneExitBufferMeters;
  return {
    enterMeters: radius,
    exitMeters: radius + Math.max(buffer, 0),
  };
}