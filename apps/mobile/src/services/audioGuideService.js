import { api, API_BASE } from '../api';
import { GPS_CONFIG } from '../config/gps';

// Backend access for the GPS guide.
//
// Both endpoints are public on purpose: a visitor standing in front of a stall
// must hear the guide without an account (spec rule 13). No token is attached
// and none is required.

/**
 * Turn a stored `/uploads/...` path into something the phone can stream.
 *
 * The API and the static uploads can be reached at different hosts in this
 * deployment (API on :5001, uploads also served by nginx on :8080), so
 * resolving against the API origin is the only reliable default — it is the
 * host we already know the phone can talk to.
 */
export function resolveAudioUrl(audioUrl) {
  if (!audioUrl) return null;
  if (/^https?:\/\//i.test(audioUrl)) return audioUrl;
  const origin = String(API_BASE).replace(/\/api\/?$/, '');
  return `${origin}${audioUrl.startsWith('/') ? '' : '/'}${audioUrl}`;
}

/**
 * Nearby places whose audio zones matter from this position.
 * Cached by the caller — see useZoneDetection for the movement gate.
 */
export async function fetchNearbyZones({ latitude, longitude, language, radius, limit }) {
  const res = await api.get('/culinary-places/nearby', {
    params: {
      latitude,
      longitude,
      radius: radius || GPS_CONFIG.nearbyRadiusMeters,
      limit: limit || GPS_CONFIG.nearbyLimit,
      lang: language || 'vi',
    },
    // The nearby list drives zone detection; a stale list makes us miss a zone,
    // so fail fast rather than blocking the GPS loop on a slow network.
    timeout: 8000,
  });
  return res.data?.data?.places || [];
}

/**
 * Narration for one place in the visitor's selected language.
 * Resolves to null when the backend has no guide for that language, so the
 * caller can explain rather than just failing silently.
 */
export async function fetchNarration({ placeId, language }) {
  try {
    const res = await api.get(`/culinary-places/${placeId}/audio`, {
      params: { language: language || 'vi' },
      timeout: 20000,
    });
    const data = res.data?.data || null;
    if (!data?.audioUrl) return null;
    return {
      placeId: data.placeId ?? Number(placeId),
      language: data.language || language,
      title: data.title || '',
      audioUrl: resolveAudioUrl(data.audioUrl),
      duration: data.duration ?? null,
    };
  } catch (err) {
    // A missing translation is a normal outcome, not a crash.
    if (err?.response?.status === 404) return null;
    throw err;
  }
}

/**
 * Should we spend a network round-trip on fresh nearby data?
 *
 * Spec sections 19-20: never call /nearby on every fix. We refresh when the
 * visitor has physically moved far enough that the cached zones might be
 * stale, or when the cache has simply aged out. Stationary visitors therefore
 * generate no requests at all.
 */
export function shouldRefreshNearby({ cache, position, language }) {
  if (!cache?.places?.length) return true;
  if (cache.language !== language) return true;
  if (!position) return false;

  const age = Date.now() - (cache.fetchedAt || 0);
  if (age > GPS_CONFIG.nearbyRefreshIntervalMs) return true;

  const moved = Math.hypot(
    (position.latitude - cache.origin.latitude) * 111320,
    (position.longitude - cache.origin.longitude) * 111320 * Math.cos(toRad(position.latitude))
  );
  return moved >= GPS_CONFIG.nearbyRefreshDistanceMeters;
}

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

export default { fetchNearbyZones, fetchNarration, resolveAudioUrl, shouldRefreshNearby };