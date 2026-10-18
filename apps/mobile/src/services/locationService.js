import * as Location from 'expo-location';
import { Linking, Platform } from 'react-native';
import { GPS_CONFIG } from '../config/gps';

// All device position handling lives here so the UI never touches
// expo-location directly (spec section 21: keep GPS logic out of components).
//
// Exports a plain object rather than a hook so the same watcher can be started
// and stopped explicitly; useLocation.js adapts it to React.

/**
 * Permission status, normalised to one of:
 *   granted | denied | deniedPermanently | undetermined
 *
 * iOS 13+ only ever returns 'granted' or 'denied' — there is no way to tell
 * "not asked yet" from "asked and refused", so we ask the system whether we
 * are still able to prompt. Android does expose the blocked state, and we
 * trust it when present.
 */
export async function getPermissionStatus() {
  const { status, canAskAgain } = await Location.getForegroundPermissionsAsync();
  if (status === Location.PermissionStatus.GRANTED) return 'granted';
  if (status === Location.PermissionStatus.DENIED) {
    return canAskAgain === false ? 'deniedPermanently' : 'denied';
  }
  return 'undetermined';
}

/** Prompt for foreground location. Safe to call repeatedly. */
export async function requestPermission() {
  const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
  if (status === Location.PermissionStatus.GRANTED) return 'granted';
  return canAskAgain === false ? 'deniedPermanently' : 'denied';
}

/** Send the visitor to the OS settings page when permission is permanently blocked. */
export async function openLocationSettings() {
  if (Platform.OS === 'ios') {
    return Linking.openSettings();
  }
  // Android: the intent for "Location" needs a permission name.
  const intent = 'android.settings.LOCATION_SOURCE_SETTINGS';
  try {
    await Linking.sendIntent(intent);
  } catch {
    return Linking.openSettings();
  }
}

/**
 * Whether the device's location service is switched on at all.
 * Returns null on platforms/versions where we cannot tell.
 */
export async function isLocationEnabled() {
  try {
    const enabled = await Location.hasServicesEnabledAsync();
    return typeof enabled === 'boolean' ? enabled : null;
  } catch {
    return null;
  }
}

/**
 * Best-effort first fix.
 *
 * The goal is to hand zone detection *something* immediately instead of making
 * the visitor stare at a spinner while the GPS cold-start. We therefore:
 *   1. read the last known position the OS is already caching (no hardware
 *      spin-up, returns in single-digit ms),
 *   2. fall back to a normal fix if there is no cache.
 *
 * Either way the result is provisional: startTracking() replaces it with live
 * data as soon as the watcher delivers. A cached fix also arrives with a
 * `maxAge`, which we surface so callers can tell a stale position apart from a
 * fresh one instead of trusting it blindly.
 */
export async function requestBestEffortPosition() {
  // 1. Cached fix — fast, possibly old.
  try {
    const cached = await Location.getLastKnownPositionAsync();
    if (cached && Number.isFinite(cached.coords?.latitude)) {
      return {
        ...normalise(cached),
        source: 'cached',
        // A cached position older than this should not trigger narration.
        stale: Date.now() - (cached.timestamp || 0) > GPS_CONFIG.fixTimeoutMs * 4,
      };
    }
  } catch {
    // No cache available on this device — fall through to a live fix.
  }

  // 2. Live fix.
  try {
    const fresh = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
      timeInterval: GPS_CONFIG.fixTimeoutMs,
    });
    return { ...normalise(fresh), source: 'live', stale: false };
  } catch (err) {
    throw toFriendlyError(err);
  }
}

/**
 * Continuous position watcher.
 *
 * Returns an unsubscribe function. Callers must keep it and call it on
 * teardown — an orphaned watcher keeps the GPS radio awake and drains the
 * battery, which is exactly what the perf rules forbid.
 *
 * Never restart this to "refresh" the position: that throws away the sensor
 * warm-up and produces a visible gap in the track.
 */
export async function startTracking({ onPosition, onError }) {
  const permission = await getPermissionStatus();
  if (permission !== 'granted') {
    throw toFriendlyError({ code: 'PERMISSION_DENIED', message: 'Location permission not granted.' });
  }

  const subscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.Balanced,
      distanceInterval: GPS_CONFIG.distanceInterval,
      timeInterval: GPS_CONFIG.timeInterval,
      // Do not let the OS hand us a position it knows is stale.
      mayShowUserSettingsDialog: true,
    },
    ({ coords, timestamp }) => {
      onPosition?.({ ...normalise({ coords, timestamp }), source: 'watch', stale: false });
    }
  );

  // watchPositionAsync surfaces some failures through an event rather than a
  // rejected promise (notably when location services are turned off mid-session).
  let sub = subscription;
  if (subscription && typeof subscription.add === 'function') {
    sub = subscription;
  }

  return {
    subscription: sub,
    stop() {
      try {
        sub?.remove?.();
      } catch {
        // Already removed — nothing to clean up.
      }
    },
    // Exposed so the screen can surface a GPS-off banner if the OS reports it.
    onError: onError,
  };
}

function normalise(position) {
  const { latitude, longitude, accuracy } = position.coords;
  return {
    latitude: Number(latitude),
    longitude: Number(longitude),
    accuracy: accuracy == null ? null : Math.round(Number(accuracy)),
    timestamp: position.timestamp || Date.now(),
  };
}

/**
 * Turn expo-location's error codes into something a visitor can act on.
 * A raw "Location.Unavailable" tells the user nothing.
 */
export function toFriendlyError(err) {
  const code = err?.code || '';
  if (code === 'PERMISSION_DENIED') {
    return Object.assign(new Error('Location permission denied.'), {
      code: 'PERMISSION_DENIED',
      userMessage: 'Location permission is required to detect nearby culinary destinations.',
    });
  }
  if (code === 'LOCATION_UNAVAILABLE' || code === 'LOCATION_SERVICES_DISABLED') {
    return Object.assign(new Error('Location services are off.'), {
      code: 'LOCATION_SERVICES_DISABLED',
      userMessage: 'Location services are turned off. Switch on GPS to detect nearby places.',
    });
  }
  if (code === 'TIMEOUT') {
    return Object.assign(new Error('Timed out waiting for a GPS fix.'), {
      code: 'TIMEOUT',
      userMessage: 'GPS took too long. Move to an open area and try again.',
    });
  }
  return Object.assign(new Error(err?.message || 'Unable to determine your location.'), {
    code: code || 'UNKNOWN',
    userMessage: err?.message || 'Unable to determine your location.',
  });
}

export default {
  getPermissionStatus,
  requestPermission,
  openLocationSettings,
  isLocationEnabled,
  requestBestEffortPosition,
  startTracking,
  toFriendlyError,
};