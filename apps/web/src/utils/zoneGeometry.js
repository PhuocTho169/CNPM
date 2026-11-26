// Geometry helpers for the GPS audio zones drawn on the public map and in the
// admin place editor.
//
// A place's zone is a circle on the ground (centre = place coordinate, radius =
// zone_radius in metres). When two zones overlap, the mobile app can switch
// between narrations inside the lens-shaped intersection, so the admin needs to
// SEE that lens. Leaflet can draw circles but has no "circle ∩ circle" shape, so
// the intersection polygon is built here in a local metre-based plane and
// converted back to lat/lng.

const EARTH_RADIUS_M = 6371000;
const METERS_PER_DEG_LAT = 111320;
const toRad = (deg) => (deg * Math.PI) / 180;

export function distanceMeters(a, b) {
  const lat1 = Number(a?.latitude);
  const lng1 = Number(a?.longitude);
  const lat2 = Number(b?.latitude);
  const lng2 = Number(b?.longitude);
  if (![lat1, lng1, lat2, lng2].every(Number.isFinite)) return null;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function zoneRadius(place) {
  const r = Number(place?.zone_radius ?? place?.radius);
  return Number.isFinite(r) && r > 0 ? r : 0;
}

function polygonArea(points) {
  let sum = 0;
  for (let i = 0; i < points.length; i += 1) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum) / 2;
}

function fullCirclePolygon(center, radius, segments = 72) {
  const lat = Number(center.latitude);
  const lng = Number(center.longitude);
  const mPerLng = METERS_PER_DEG_LAT * Math.cos(toRad(lat));
  const points = [];
  for (let i = 0; i < segments; i += 1) {
    const t = (2 * Math.PI * i) / segments;
    const x = radius * Math.cos(t);
    const y = radius * Math.sin(t);
    points.push([lat + y / METERS_PER_DEG_LAT, lng + x / mPerLng]);
  }
  return points;
}

/**
 * Intersection polygon of two zones, or null when they do not overlap.
 * Returns { polygon: [[lat,lng], …], areaM2, distanceM }.
 *
 * Construction: with circle A at the origin and B at (d, 0), the boundary is
 * the arc of A that lies inside B plus the arc of B that lies inside A. The two
 * arcs meet at the circle-circle intersection points. The whole shape is
 * computed in metres then projected back, which is accurate at District-4
 * scale (zones are at most a few hundred metres across).
 */
export function circleIntersection(a, b, segments = 64) {
  const r1 = zoneRadius(a);
  const r2 = zoneRadius(b);
  const lat1 = Number(a?.latitude);
  const lng1 = Number(a?.longitude);
  const lat2 = Number(b?.latitude);
  const lng2 = Number(b?.longitude);
  if (!r1 || !r2 || ![lat1, lng1, lat2, lng2].every(Number.isFinite)) return null;

  const lat0 = (lat1 + lat2) / 2;
  const mPerLng = METERS_PER_DEG_LAT * Math.cos(toRad(lat0));
  if (!mPerLng) return null;

  // B relative to A in metres.
  const bx = (lng2 - lng1) * mPerLng;
  const by = (lat2 - lat1) * METERS_PER_DEG_LAT;
  const d = Math.hypot(bx, by);

  if (d >= r1 + r2) return null; // separate or merely touching

  // One circle completely contains the other: the intersection is the smaller
  // circle.
  if (d <= Math.abs(r1 - r2)) {
    const smaller = r1 <= r2 ? a : b;
    const smallerRadius = Math.min(r1, r2);
    return {
      polygon: fullCirclePolygon(smaller, smallerRadius, segments),
      areaM2: Math.PI * smallerRadius ** 2,
      distanceM: d,
    };
  }

  const aLen = (r1 ** 2 - r2 ** 2 + d ** 2) / (2 * d);
  const h = Math.sqrt(Math.max(0, r1 ** 2 - aLen ** 2));
  const ux = bx / d;
  const uy = by / d;
  const px = -uy;
  const py = ux;

  const angleB = Math.atan2(by, bx);
  const alpha = Math.atan2(h, aLen); // half-angle of A's inner arc
  const beta = Math.atan2(h, d - aLen); // half-angle of B's inner arc

  const local = [];
  // A arc: starts at one crossing, sweeps through the direction of B.
  for (let i = 0; i <= segments; i += 1) {
    const t = angleB - alpha + (2 * alpha * i) / segments;
    local.push([r1 * Math.cos(t), r1 * Math.sin(t)]);
  }
  // B arc: starts at the other crossing, sweeps through the direction of A.
  for (let i = 1; i <= segments; i += 1) {
    const t = angleB + Math.PI - beta + (2 * beta * i) / segments;
    local.push([bx + r2 * Math.cos(t), by + r2 * Math.sin(t)]);
  }

  const polygon = local.map(([x, y]) => [
    lat1 + y / METERS_PER_DEG_LAT,
    lng1 + x / mPerLng,
  ]);

  return { polygon, areaM2: polygonArea(local), distanceM: d };
}

function placeName(place) {
  return place?.translation?.name || place?.name || place?.code || `#${place?.id ?? '?'}`;
}

/**
 * All pairwise zone overlaps. Pass `focusId` to keep only overlaps that involve
 * one particular place (used by the admin editor to answer "does the place I am
 * editing collide with anything?").
 */
export function findZoneIntersections(places = [], { focusId } = {}) {
  const list = places
    .filter((p) => zoneRadius(p) > 0 && Number.isFinite(Number(p.latitude)) && Number.isFinite(Number(p.longitude)))
    .map((p) => ({ ...p, radius: zoneRadius(p) }));

  const out = [];
  for (let i = 0; i < list.length; i += 1) {
    for (let j = i + 1; j < list.length; j += 1) {
      const a = list[i];
      const b = list[j];
      if (focusId !== undefined && a.id !== focusId && b.id !== focusId) continue;
      const hit = circleIntersection(a, b);
      if (!hit) continue;
      out.push({
        key: `${a.id ?? 'a'}-${b.id ?? 'b'}`,
        aId: a.id,
        bId: b.id,
        aName: placeName(a),
        bName: placeName(b),
        a,
        b,
        ...hit,
      });
    }
  }
  return out;
}

export function formatArea(m2) {
  if (!Number.isFinite(m2)) return null;
  if (m2 < 10000) return `${Math.round(m2)} m²`;
  return `${(m2 / 1000000).toFixed(2)} km²`;
}
