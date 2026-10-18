import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import audioGuideService from '../services/audioGuideService';
import { detectZoneEntry, rankByDistance } from '../services/zoneDetectionService';

// React adapter over zoneDetectionService.
//
// Owns the nearby-places cache and the movement gate that keeps /nearby off the
// critical path. Emits one signal: `onZoneEntered(place)`, which fires only on
// an OUTSIDE -> INSIDE transition.

export default function useZoneDetection({ position, language, onZoneEntered, enabled = true }) {
  const [nearbyPlaces, setNearbyPlaces] = useState([]);
  const [insidePlaceIds, setInsidePlaceIds] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [nearbyError, setNearbyError] = useState(null);

  const cacheRef = useRef(null);
  const insideRef = useRef([]);
  const lastFetchAtRef = useRef(0);
  // Held in a ref so changing the callback identity cannot re-run detection.
  const onEnteredRef = useRef(onZoneEntered);
  onEnteredRef.current = onZoneEntered;

  const refreshNearby = useCallback(
    async (origin, force = false) => {
      if (!enabled || !origin) return;
      // Two triggers can fire close together (mount + first fix); only one
      // network call per movement window.
      if (!force && Date.now() - lastFetchAtRef.current < 5000) return;

      setIsRefreshing(true);
      try {
        const places = await audioGuideService.fetchNearbyZones({
          latitude: origin.latitude,
          longitude: origin.longitude,
          language,
        });
        cacheRef.current = { places, fetchedAt: Date.now(), origin, language };
        lastFetchAtRef.current = Date.now();
        setNearbyPlaces(places);
        setNearbyError(null);
      } catch (err) {
        // Keep whatever cache we already have: stale zones still work, and the
        // visitor should not lose the feature because one request failed.
        setNearbyError(err?.message || 'Could not load nearby culinary places.');
      } finally {
        setIsRefreshing(false);
      }
    },
    [enabled, language]
  );

  // Re-evaluate on every fix. Pure local maths against the cached dataset.
  useEffect(() => {
    if (!enabled || !position) return;

    // Movement gate: only spend a request when the visitor has gone far enough
    // for the cached zones to plausibly be stale (spec section 20).
    if (audioGuideService.shouldRefreshNearby({ cache: cacheRef.current, position, language })) {
      refreshNearby(position);
    }

    const cache = cacheRef.current;
    if (!cache?.places?.length) return;

    const result = detectZoneEntry({
      places: cache.places,
      position,
      state: { insidePlaceIds: insideRef.current },
    });

    if (result.ignoredFix) return;

    if (JSON.stringify(result.state.insidePlaceIds) !== JSON.stringify(insideRef.current)) {
      insideRef.current = result.state.insidePlaceIds;
      setInsidePlaceIds(result.state.insidePlaceIds);
    }

    if (result.enteredPlace) {
      // The one and only path that starts narration.
      onEnteredRef.current?.(result.enteredPlace);
    }
  }, [position, language, enabled, refreshNearby]);

  // A language switch must not immediately re-narrate the zone the visitor is
  // standing in — the entry already happened. Drop the inside set so the next
  // genuine entry uses the new language.
  const languageRef = useRef(language);
  useEffect(() => {
    if (languageRef.current === language) return;
    languageRef.current = language;
    cacheRef.current = null;
    insideRef.current = [];
    setNearbyPlaces([]);
    setInsidePlaceIds([]);
  }, [language]);

  // Sorted copy for display; distances are recomputed locally on each fix.
  const rankedNearby = useMemo(
    () => rankByDistance(nearbyPlaces, position),
    [nearbyPlaces, position]
  );

  return {
    nearbyPlaces: rankedNearby,
    insidePlaceIds,
    isRefreshing,
    nearbyError,
    refreshNearby: () => refreshNearby(position, true),
    isInside: (placeId) => insideRef.current.map(Number).includes(Number(placeId)),
  };
}