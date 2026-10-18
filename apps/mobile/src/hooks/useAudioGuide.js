import { useCallback, useEffect, useRef, useState } from 'react';
import { Audio } from 'expo-av';
import audioGuideService from '../services/audioGuideService';

// React adapter over expo-av for the automatic narration player.
//
// Owns exactly one Sound object at a time. Loading a new track always unloads
// the previous one first — expo-av keeps the old sound object alive otherwise,
// which is how you end up with two narrations talking over each other.
//
// Zone overlap is the norm in District 4, not an edge case: neighbouring stalls
// sit 60-80m apart, closer than the sum of their radii, so walking Nguyen Khoai
// street genuinely enters a second zone while the first narration is still
// playing. Cutting the guide off mid-sentence is jarring and loses context, so
// a zone entered during playback is held and started when the current track
// ends. Only the most recent pending place is kept — by the time it plays, the
// visitor has moved on and the earlier ones are stale.

export default function useAudioGuide({ language }) {
  const [narration, setNarration] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [error, setError] = useState(null);
  const [hasPendingPlace, setHasPendingPlace] = useState(false);

  const soundRef = useRef(null);
  const languageRef = useRef(language);
  languageRef.current = language;

  // Zone entered while something is playing. Size 1, newest wins.
  const pendingRef = useRef(null);
  // Mirrors isPlaying/loading in refs so the playback callbacks (which expo-av
  // invokes long after render) never act on a stale closure.
  const playingRef = useRef(false);
  const loadingRef = useRef(false);
  const startPlaybackRef = useRef(null);

  const unload = useCallback(async () => {
    const sound = soundRef.current;
    soundRef.current = null;
    if (!sound) return;
    try {
      sound.setOnPlaybackStatusUpdate(null);
      await sound.unloadAsync();
    } catch {
      // Already unloaded.
    }
  }, []);

  const queue = useCallback((place, lang) => {
    pendingRef.current = { place, lang };
    setHasPendingPlace(true);
  }, []);

  const drainQueue = useCallback(() => {
    const next = pendingRef.current;
    if (!next) return;
    pendingRef.current = null;
    setHasPendingPlace(false);
    startPlaybackRef.current?.(next.place, next.lang);
  }, []);

  const startPlayback = useCallback(
    async (place, langOverride) => {
      if (!place?.id) return null;

      const lang = langOverride || languageRef.current;
      setError(null);

      // A second entry while the first fetch is still in flight just replaces
      // the one we are about to play.
      if (loadingRef.current) {
        queue(place, langOverride);
        return null;
      }

      loadingRef.current = true;
      setIsLoading(true);
      try {
        const guide = await audioGuideService.fetchNarration({
          placeId: place.id,
          language: lang,
        });

        if (!guide) {
          setError(`No ${lang.toUpperCase()} guide is available for this place yet.`);
          return null;
        }

        // Always drop the previous track before loading the next.
        await unload();

        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });

        const { sound } = await Audio.Sound.createAsync(
          { uri: guide.audioUrl },
          { shouldPlay: true, volume },
          (status) => {
            if (!soundRef.current) return;
            setIsPlaying(!!status.isPlaying);
            if (status.durationMillis != null) setDurationMs(status.durationMillis);
            if (status.positionMillis != null) setPositionMs(status.positionMillis);
            if (status.didJustFinish) {
              playingRef.current = false;
              setIsPlaying(false);
              setPositionMs(durationMs);
              // A zone crossed during playback gets its turn now.
              drainQueue();
            }
          }
        );
        soundRef.current = sound;
        playingRef.current = true;
        setNarration(guide);
        // Trust the file over the DB estimate when expo-av has measured it.
        if (guide.duration && !durationMs) setDurationMs(guide.duration * 1000);
        return guide;
      } catch (err) {
        setError(err?.message || 'Could not play the audio guide.');
        return null;
      } finally {
        loadingRef.current = false;
        setIsLoading(false);
      }
    },
    [drainQueue, durationMs, queue, unload, volume]
  );

  startPlaybackRef.current = startPlayback;

  /** Zone entry: play now, or queue behind whatever is currently playing. */
  const playForPlace = useCallback(
    async (place, langOverride) => {
      if (!place?.id) return null;
      if (playingRef.current) {
        queue(place, langOverride);
        return null;
      }
      return startPlayback(place, langOverride);
    },
    [queue, startPlayback]
  );

  const pause = useCallback(async () => {
    if (!soundRef.current) return;
    try { await soundRef.current.pauseAsync(); } catch { /* already stopped */ }
    playingRef.current = false;
    setIsPlaying(false);
  }, []);

  const resume = useCallback(async () => {
    if (!soundRef.current) return;
    try { await soundRef.current.playAsync(); } catch { /* already playing */ }
    playingRef.current = true;
    setIsPlaying(true);
  }, []);

  const toggle = useCallback(() => {
    if (isPlaying) return pause();
    return resume();
  }, [isPlaying, pause, resume]);

  const stop = useCallback(async () => {
    pendingRef.current = null;
    setHasPendingPlace(false);
    await unload();
    playingRef.current = false;
    setIsPlaying(false);
    setPositionMs(0);
  }, [unload]);

  const seekTo = useCallback(async (ms) => {
    if (!soundRef.current) return;
    const clamped = Math.max(0, Math.min(ms, durationMs || ms));
    try { await soundRef.current.setPositionAsync(clamped); } catch { /* no-op */ }
    setPositionMs(clamped);
  }, [durationMs]);

  const setVolume = useCallback(async (next) => {
    const v = Math.max(0, Math.min(1, next));
    setVolumeState(v);
    if (soundRef.current) {
      try { await soundRef.current.setVolumeAsync(v); } catch { /* no-op */ }
    }
  }, []);

  const close = useCallback(async () => {
    // Closing the player is an explicit "stop the tour guide" — drop any queued
    // narration too, otherwise it would start after the user dismissed it.
    pendingRef.current = null;
    setHasPendingPlace(false);
    await unload();
    playingRef.current = false;
    setNarration(null);
    setPositionMs(0);
    setDurationMs(0);
    setIsPlaying(false);
  }, [unload]);

  // Never leave audio playing after the screen goes away.
  useEffect(() => () => { unload(); }, [unload]);

  return {
    narration,
    isLoading,
    isPlaying,
    positionMs,
    durationMs,
    volume,
    error,
    hasPendingPlace,
    playForPlace,
    toggle,
    pause,
    resume,
    stop,
    close,
    seekTo,
    setVolume,
  };
}