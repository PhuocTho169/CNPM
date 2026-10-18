import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Switch } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getLanguage, setLanguage } from '../api';
import useLanguages, { flagFor } from '../hooks/useLanguages';
import useLocation from '../hooks/useLocation';
import useZoneDetection from '../hooks/useZoneDetection';
import useAudioGuide from '../hooks/useAudioGuide';
import LocationStatus from '../components/LocationStatus';
import NearbyPlaceCard from '../components/NearbyPlaceCard';
import AudioGuidePlayer from '../components/AudioGuidePlayer';
import ZoneNotification from '../components/ZoneNotification';

// GPS Audio Guide — the mobile home of the geo-zone experience.
//
// This screen owns no GPS, distance or audio logic of its own; it wires the
// three hooks together and renders. The flow it produces:
//
//   open → permission → best-effort fix → watcher → nearby (cached)
//        → Haversine vs zone_radius → OUTSIDE→INSIDE → narration plays
//
// It is deliberately not a web feature (spec rule 2): continuous GPS tracking
// has no place in the React Web app.

export default function GPSAudioGuideScreen({ navigation }) {
  const languages = useLanguages();
  const [language, setLanguageState] = useState('vi');
  const [autoPlay, setAutoPlay] = useState(true);
  const [activePlace, setActivePlace] = useState(null);
  const [toastVisible, setToastVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setLanguageState(await getLanguage());
      })();
    }, [])
  );

  const location = useLocation();
  const audio = useAudioGuide({ language });

  // The single place where zone entry turns into sound. Fires at most once per
  // genuine entry, never on a repeat fix inside the same zone.
  const handleZoneEntered = useCallback(
    (place) => {
      setActivePlace(place);
      setToastVisible(true);
      if (autoPlay) {
        audio.playForPlace(place);
      }
    },
    [autoPlay, audio]
  );

  const zones = useZoneDetection({
    position: location.currentLocation,
    language,
    onZoneEntered: handleZoneEntered,
  });

  // Leaving a zone re-arms it, but the toast must not outlive the place.
  useEffect(() => {
    if (activePlace && !zones.insidePlaceIds.map(Number).includes(Number(activePlace.id))) {
      setToastVisible(false);
    }
  }, [zones.insidePlaceIds, activePlace]);

  const changeLanguage = useCallback(
    (code) => {
      setLanguage(code);
      setLanguageState(code);
    },
    []
  );

  const renderHeader = () => (
    <View>
      <Text style={styles.title}>GPS Audio Guide</Text>
      <Text style={styles.subtitle}>
        Walk through District 4 — narration starts automatically when you enter a food zone.
      </Text>

      <View style={styles.langRow}>
        {languages.map((l) => (
          <TouchableOpacity
            key={l.code}
            style={[styles.langPill, l.code === language && styles.langPillActive]}
            onPress={() => changeLanguage(l.code)}
          >
            <Text style={[styles.langPillText, l.code === language && styles.langPillTextActive]}>
              {flagFor(l.code)} {l.code.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.autoRow}>
        <Text style={styles.autoLabel}>🎧 Auto-play on zone entry</Text>
        <Switch value={autoPlay} onValueChange={setAutoPlay} />
      </View>

      <LocationStatus
        permission={location.locationPermission}
        isTracking={location.isTracking}
        isLocating={location.isLocating}
        currentLocation={location.currentLocation}
        gpsError={location.gpsError}
        onRequestPermission={location.requestPermission}
        onRetry={location.retry}
        onOpenSettings={location.openSettings}
      />

      <ZoneNotification
        place={activePlace}
        visible={toastVisible}
        onDismiss={() => setToastVisible(false)}
      />

      <AudioGuidePlayer
        narration={audio.narration}
        isPlaying={audio.isPlaying}
        positionMs={audio.positionMs}
        durationMs={audio.durationMs}
        volume={audio.volume}
        isLoading={audio.isLoading}
        error={audio.error}
        onToggle={audio.toggle}
        onSeek={audio.seekTo}
        onVolume={audio.setVolume}
        onClose={audio.close}
      />

      <Text style={styles.sectionTitle}>Nearby Culinary Places</Text>
      {zones.nearbyError && <Text style={styles.error}>{zones.nearbyError}</Text>}
    </View>
  );

  return (
    <View style={styles.root}>
      <FlatList
        data={zones.nearbyPlaces}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={renderHeader}
        renderItem={({ item }) => (
          <NearbyPlaceCard
            place={item}
            inside={zones.isInside(item.id)}
            onPress={() =>
              navigation.navigate('PlaceDetail', { id: item.id, title: item.name })
            }
            onPlay={() => {
              setActivePlace(item);
              audio.playForPlace(item);
            }}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={zones.isRefreshing}
            onRefresh={zones.refreshNearby}
            tintColor="#00838f"
          />
        }
        ListEmptyComponent={
          location.locationPermission === 'granted' ? (
            <Text style={styles.empty}>
              {zones.isRefreshing
                ? 'Looking for culinary places near you…'
                : 'No culinary places within range yet.'}
            </Text>
          ) : null
        }
        contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#faf6f1' },
  title: { fontSize: 20, fontWeight: '800', color: '#2b2118' },
  subtitle: { fontSize: 12.5, color: '#6d6156', marginTop: 4, lineHeight: 18 },
  langRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  langPill: { borderWidth: 1, borderColor: '#e8e0d6', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: '#fff' },
  langPillActive: { borderColor: '#00838f', backgroundColor: '#e8f4f5' },
  langPillText: { fontSize: 12.5, color: '#6d6156' },
  langPillTextActive: { color: '#00646e', fontWeight: '800' },
  autoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, marginBottom: 4 },
  autoLabel: { fontSize: 13, color: '#2b2118', fontWeight: '600' },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#2b2118', marginTop: 18, marginBottom: 8 },
  error: { fontSize: 12, color: '#b3261e', marginBottom: 8 },
  empty: { textAlign: 'center', color: '#6d6156', marginTop: 24, fontSize: 13 },
});