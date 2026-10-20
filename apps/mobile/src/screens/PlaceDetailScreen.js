import React, { useCallback, useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, Linking, ActivityIndicator, useWindowDimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Audio } from 'expo-av';
import { api, getLanguage, getSessionId, apiErrorMessage } from '../api';
import { isFavorite, toggleFavoriteLocal, pushHistory } from '../services/favorites';
import useLanguages from '../hooks/useLanguages';
import { t } from '../utils/i18n';
        {current?.history && (
          <>
            <Text style={styles.h2}>📜 {t('historyTitle', currentLocale)}</Text>
            <Text style={styles.body}>{current.history}</Text>
          </>
        )}

        )}

        {current?.cultural_significance && (
          <>
            <Text style={styles.h2}>🍜 {t('foodCulture', currentLocale)}</Text>
            <Text style={styles.body}>{current.cultural_significance}</Text>
          </>
        )}

        {current?.tourist_tips && (
          <>
            <Text style={styles.h2}>💡 {t('touristTips', currentLocale)}</Text>
            {current.tourist_tips.split(' • ').filter(Boolean).map((tip) => (
              <Text key={tip} style={styles.body}>✔ {tip}</Text>
            ))}
          </>
        )}


function fmt(sec) {
  if (!sec || !isFinite(sec)) return '00:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function PlaceDetailScreen({ route }) {
  const { id, distance_m } = route.params || {};
  const { width } = useWindowDimensions();
  const [lang, setLang] = useState('vi');
  const languages = useLanguages();
  const [place, setPlace] = useState(null);
  const [error, setError] = useState(null);
  const [fav, setFav] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const soundRef = React.useRef(null);

  async function loadGuide(language) {
    setError(null);
    try {
      const res = await api.get(`/places/${id}/guide?lang=${language}`);
      setPlace(res.data.data);
      const sessionId = await getSessionId();
      api.post(`/places/${id}/scan`, {
        language_code: language,
        device_type: 'mobile',
        platform: 'react-native',
        anonymous_session_id: sessionId,
      }).catch(() => {});
      pushHistory(Number(id));
    } catch (e) {
      setError(apiErrorMessage(e));
    }
  }

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const stored = await getLanguage();
        setLang(stored);
        setFav(await isFavorite(Number(id)));
        await loadGuide(stored);
      })();
      return () => {
        if (soundRef.current) {
          soundRef.current.unloadAsync().catch(() => {});
          soundRef.current = null;
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id])
  );

  // Resolve translation with fallback
  const translations = place?.translations || [];
  const current = place?.translation ||
    translations.find((t) => t.language_code === place?.current_language) ||
    translations[0] || null;

  async function togglePlay() {
    const audioUrl = current?.audio?.file_url;
    if (!audioUrl) return;
    if (soundRef.current) {
      const status = await soundRef.current.getStatusAsync();
      if (status.isLoaded) {
        if (playing) {
          await soundRef.current.pauseAsync();
          setPlaying(false);
        } else {
          await soundRef.current.playAsync();
          setPlaying(true);
        }
        return;
      }
    }
    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: false });
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { rate: speed, shouldPlay: true },
        (status) => {
          if (status.isLoaded) {
            setPosition(status.positionMillis / 1000);
            setDuration((status.durationMillis || 0) / 1000);
            if (status.didJustFinish) setPlaying(false);
          }
        }
      );
      soundRef.current = sound;
      setPlaying(true);
    } catch (e) {
      setError('Audio playback failed.');
    }
  }

  async function seekBy(delta) {
    const s = soundRef.current;
    if (!s) return;
    const status = await s.getStatusAsync();
    if (status.isLoaded) {
      const next = Math.max(0, (status.durationMillis || 0) / 1000 - 0.5, status.positionMillis / 1000 + delta);
      await s.setPositionAsync(next * 1000);
    }
  }

  async function changeSpeed(v) {
    setSpeed(v);
    if (soundRef.current) {
      await soundRef.current.setRateAsync(v, true);
    }
  }

  async function onFav() {
    if (!place) return;
    const next = await toggleFavoriteLocal({
      id: place.id,
      code: place.code,
      primary_image: place.images?.[0]?.image_url || null,
      translation: { name: current?.name },
      category: place.category,
      price_range: place.price_range,
    });
    setFav(next.some((f) => f.id === place.id));
  }

  if (error && !place) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }
  if (!place) return <ActivityIndicator style={{ marginTop: 40 }} color="#e65100" />;

  const name = current?.name || place.code;
  const audioUrl = current?.audio?.file_url;

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 40 }}>
      {place.images?.length ? (
        <Image source={{ uri: place.images[0].image_url }} style={{ width, height: width * 0.56 }} />
      ) : (
        <View style={[styles.heroFallback, { width, height: width * 0.45 }]}>
          <Text style={{ fontSize: 52 }}>{place.category?.icon || '🍽️'}</Text>
        </View>
      )}

      <View style={{ padding: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={[styles.h1, { flex: 1 }]}>{name}</Text>
          <TouchableOpacity onPress={onFav} style={styles.favBtn}>
            <Text style={{ fontSize: 20 }}>{fav ? '❤️' : '🤍'}</Text>
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
          {place.category && <Text style={styles.chip}>{place.category.icon} {place.category.name}</Text>}
          {place.is_recommended ? <Text style={styles.chip}>⭐ Recommended</Text> : null}
          {place.price_range ? <Text style={styles.chip}>💰 {place.price_range}</Text> : null}
          {distance_m ? <Text style={[styles.chip, { color: '#00838f' }]}>📍 {Math.round(distance_m)} m</Text> : null}
        </View>
        <Text style={styles.meta}>📍 {place.address}</Text>
        {place.opening_time && place.closing_time && (
          <Text style={styles.meta}>🕐 {String(place.opening_time).slice(0, 5)} – {String(place.closing_time).slice(0, 5)}</Text>
        )}

        {/* Language selector */}
        <Text style={styles.label}>🌐 Choose language</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {languages.map((l) => (
            <TouchableOpacity
              key={l.code}
              style={[styles.langPill, l.code === lang && styles.langPillActive]}
              onPress={async () => { setLang(l.code); await loadGuide(l.code); }}
            >
              <Text style={[styles.langText, l.code === lang && styles.langTextActive]}>{l.native_name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Audio player */}
        <View style={styles.player}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity style={styles.playBtn} onPress={togglePlay}>
              <Text style={{ color: '#fff', fontSize: 20 }}>{playing ? '❚❚' : '▶'}</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700', fontSize: 14 }}>🎧 Audio guide</Text>
              {audioUrl ? (
                <>
                  <View style={styles.track}>
                    <View style={[styles.trackFill, { width: `${duration ? (position / duration) * 100 : 0}%` }]} />
                  </View>
                  <Text style={styles.time}>{fmt(position)} / {fmt(duration)}</Text>
                </>
              ) : (
                <Text style={styles.meta}>Audio not available yet for this language.</Text>
              )}
            </View>
          </View>
          {audioUrl && (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <TouchableOpacity style={styles.ctrl} onPress={() => seekBy(-10)}><Text style={styles.ctrlText}>⏪ 10s</Text></TouchableOpacity>
              <TouchableOpacity style={styles.ctrl} onPress={() => seekBy(10)}><Text style={styles.ctrlText}>10s ⏩</Text></TouchableOpacity>
              {[0.75, 1, 1.25, 1.5].map((v) => (
                <TouchableOpacity key={v} style={[styles.ctrl, speed === v && styles.ctrlActive]} onPress={() => changeSpeed(v)}>
                  <Text style={[styles.ctrlText, speed === v && styles.ctrlTextActive]}>{v}x</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {current?.description && (
          <Text style={styles.h2}>ℹ️ About this place</Text>
          <Text style={styles.body}>{current.description}</Text>
        )}



            <Text style={styles.h2}>💡 {t('touristTips', currentLocale)}</Text>
            {current.tourist_tips.split(' \u2022 ').filter(Boolean).map((tip) => (
              <Text key={tip} style={styles.body}>✔ {tip}</Text>
            ))}
          </>
        )}

        {place.dishes?.length > 0 && (
          <>
            <Text style={styles.h2}>🥢 What to try</Text>
            {place.dishes.map((d) => (
              <View key={d.id} style={styles.dishCard}>
                <View style={{ flex: 1 }}>
                  {d.is_signature ? <Text style={styles.signature}>⭐ Signature</Text> : null}
                  <Text style={{ fontWeight: '700', fontSize: 14 }}>{d.name || d.code}</Text>
                  <Text style={styles.body} numberOfLines={6}>{d.description}</Text>
                  {d.ingredients ? (
                    <Text style={[styles.body, { color: '#6d6156' }]}>{d.ingredients}</Text>
                  ) : null}
                  {d.price ? <Text style={styles.chip}>💰 {d.price}</Text> : null}
                </View>
              </View>
            ))}
          </>
        )}

        {current?.history && (
          <>
            <Text style={styles.h2}>📜 Uniqueness</Text>
            <Text style={styles.body}>{current.history}</Text>
          </>
        )}
        {current?.cultural_significance && (
          <>
            <Text style={styles.h2}>🍜 Food culture</Text>
            <Text style={styles.body}>{current.cultural_significance}</Text>
          </>
        )}
        {current?.tourist_tips && (
          <>
            <Text style={styles.h2}>💡 Tourist tips</Text>
            {current.tourist_tips.split(' • ').filter(Boolean).map((tip, i) => (
              <Text key={i} style={styles.body}>✔ {tip}</Text>
            ))}
          </>
        )}

        {place.latitude && place.longitude && (
          <>
            <Text style={styles.h2}>🗺️ Location</Text>
            <TouchableOpacity
              style={styles.mapBtn}
              onPress={() => Linking.openURL(
                `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}&travelmode=walking`
              ).catch(() => {})}
            >
              <Text style={styles.mapBtnText}>🚶 Directions here</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.mapBtn, styles.mapBtnGhost]}
              onPress={() => Linking.openURL(
                `https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`
              ).catch(() => {})}
            >
              <Text style={[styles.mapBtnText, styles.mapBtnGhostText]}>🧭 View on map</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#faf6f1' },
  center: { flex: 1, alignItems: 'center', padding: 24, backgroundColor: '#faf6f1' },
  heroFallback: { backgroundColor: '#ffe8d3', alignItems: 'center', justifyContent: 'center' },
  h1: { fontSize: 22, fontWeight: '800', color: '#2b2118' },
  h2: { fontSize: 16, fontWeight: '800', color: '#ac1900', marginTop: 20, marginBottom: 6 },
  body: { fontSize: 13.5, color: '#2b2118', lineHeight: 21 },
  meta: { fontSize: 12.5, color: '#6d6156', marginTop: 4 },
  label: { fontSize: 12, fontWeight: '700', color: '#6d6156', marginTop: 14, marginBottom: 6, textTransform: 'uppercase' },
  chip: { fontSize: 11, color: '#ac1900', backgroundColor: '#fff3e6', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, overflow: 'hidden' },
  langPill: { borderWidth: 1, borderColor: '#e8e0d6', borderRadius: 18, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#fff' },
  langPillActive: { borderColor: '#e65100', backgroundColor: '#fff3e6' },
  langText: { fontSize: 13, color: '#6d6156' },
  langTextActive: { color: '#ac1900', fontWeight: '700' },
  player: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e8e0d6', borderRadius: 14, padding: 14, marginTop: 14 },
  playBtn: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#e65100', alignItems: 'center', justifyContent: 'center' },
  track: { height: 6, backgroundColor: '#f3ece3', borderRadius: 3, marginTop: 8 },
  trackFill: { height: 6, backgroundColor: '#e65100', borderRadius: 3 },
  time: { fontSize: 11, color: '#6d6156', marginTop: 3 },
  ctrl: { borderWidth: 1, borderColor: '#e8e0d6', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#fff' },
  ctrlActive: { borderColor: '#e65100', backgroundColor: '#fff3e6' },
  ctrlText: { fontSize: 12, color: '#2b2118' },
  ctrlTextActive: { color: '#ac1900', fontWeight: '700' },
  dishCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e8e0d6', borderRadius: 14, padding: 12, marginBottom: 8 },
  signature: { fontSize: 11, fontWeight: '700', color: '#e65100' },
  favBtn: { padding: 6 },
  mapBtn: { backgroundColor: '#e65100', borderRadius: 12, paddingVertical: 11, alignItems: 'center', marginBottom: 8 },
  mapBtnText: { color: '#fff', fontWeight: '700' },
  mapBtnGhost: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e65100' },
  mapBtnGhostText: { color: '#e65100' },
  error: { color: '#b3261e', fontSize: 13 },
});
