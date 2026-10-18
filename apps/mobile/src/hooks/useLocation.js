import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import locationService from '../services/locationService';

// React adapter over locationService.
//
// Owns exactly one watcher for the lifetime of the screen. Exposes the state
// the spec calls for in section 3:
//
//   currentLocation, locationPermission, isTracking, gpsError, lastUpdated
//
// Only the latest position is kept — no GPS history in memory (section 19).

export default function useLocation({ enabled = true } = {}) {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationPermission, setLocationPermission] = useState('undetermined');
  const [isTracking, setIsTracking] = useState(false);
  const [gpsError, setGpsError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isLocating, setIsLocating] = useState(false);

  const trackerRef = useRef(null);
  // Consumers (zone detection) need the newest fix without re-subscribing.
  const positionRef = useRef(null);

  const applyPosition = useCallback((position) => {
    if (!position || !Number.isFinite(position.latitude)) return;
    positionRef.current = position;
    setCurrentLocation(position);
    setLastUpdated(position.timestamp || Date.now());
  }, []);

  const stop = useCallback(() => {
    trackerRef.current?.stop?.();
    trackerRef.current = null;
    setIsTracking(false);
  }, []);

  /**
   * Full start-up sequence from spec section 22:
   * permission → best-effort fix → continuous watcher.
   *
   * `requestBestEffortPosition()` runs first so zone detection has an initial
   * position without waiting for a cold GPS start; the watcher then replaces
   * it with live data.
   */
  const start = useCallback(async () => {
    if (!enabled) return false;
    setGpsError(null);

    const permission = await locationService.getPermissionStatus();
    setLocationPermission(permission);
    if (permission !== 'granted') {
      setIsTracking(false);
      return false;
    }

    setIsLocating(true);
    try {
      // 1. Immediate position (cached where possible).
      const best = await locationService.requestBestEffortPosition();
      applyPosition(best);

      // 2. Continuous updates. Reuse an existing watcher rather than
      //    restarting, which would drop the sensor warm-up and show a gap.
      if (trackerRef.current) return true;

      const tracker = await locationService.startTracking({
        onPosition: applyPosition,
        onError: setGpsError,
      });
      trackerRef.current = tracker;
      setIsTracking(true);
      return true;
    } catch (err) {
      setGpsError(err?.userMessage || 'Unable to determine your location.');
      setIsTracking(false);
      return false;
    } finally {
      setIsLocating(false);
    }
  }, [applyPosition, enabled]);

  const requestPermission = useCallback(async () => {
    const result = await locationService.requestPermission();
    setLocationPermission(result);
    if (result === 'granted') {
      setGpsError(null);
      await start();
    }
    return result;
  }, [start]);

  const retry = useCallback(() => start(), [start]);

  // Start on mount / when enabled, stop on unmount. Without the unmount cleanup
  // the GPS radio would stay on after the visitor leaves the screen.
  useEffect(() => {
    if (enabled) start();
    return () => {
      trackerRef.current?.stop?.();
      trackerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  // If the visitor kills and restores the app, iOS revokes nothing but our
  // watcher may be stale. A cheap re-validate on foreground avoids a dead map.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active' && enabled && trackerRef.current) {
        locationService.getPermissionStatus().then((status) => {
          setLocationPermission(status);
          if (status !== 'granted') {
            stop();
            setGpsError('Location permission is no longer granted.');
          }
        });
      }
    });
    return () => sub.remove();
  }, [enabled, stop]);

  return {
    currentLocation,
    positionRef,
    locationPermission,
    isTracking,
    isLocating,
    gpsError,
    lastUpdated,
    start,
    stop,
    retry,
    requestPermission,
    openSettings: locationService.openLocationSettings,
  };
}