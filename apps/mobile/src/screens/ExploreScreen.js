import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { api, getLanguage, apiErrorMessage } from '../api';
import PlaceCard from '../components/PlaceCard';

export default function ExploreScreen({ navigation }) {
  const [q, setQ] = useState('');
  const [places, setPlaces] = useState([]);
  const [lang, setLang] = useState('vi');
  const [loading, setLoading] = useState(false);
  const [nearbyMode, setNearbyMode] = useState(false);
  const [nearbyError, setNearbyError] = useState(null);

  const search = useCallback(async (query = q, language = lang) => {
    setLoading(true);
    try {
      const res = await api.get(`/places?status=PUBLISHED&lang=${language}&limit=30${query ? `&q=${encodeURIComponent(query)}` : ''}`);
      setPlaces(res.data.data || []);
      setNearbyMode(false);
      setNearbyError(null);
    } catch (e) {
      setNearbyError(apiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [q, lang]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const stored = await getLanguage();
        setLang(stored);
        search('', stored);
      })();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  async function findNearby() {
    setLoading(true);
    setNearbyError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setNearbyError('Location permission denied. QR scanning remains the primary way to open a guide.');
        setLoading(false);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const stored = await getLanguage();
      const res = await api.get(`/places/nearby?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}&lang=${stored}&limit=10`);
      setPlaces(res.data.data || []);
      setNearbyMode(true);
    } catch (e) {
      setNearbyError(apiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          placeholder="Search places, dishes…"
          value={q}
          onChangeText={setQ}
          onSubmitEditing={() => search(q)}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.nearbyBtn} onPress={findNearby}>
          <Text style={styles.nearbyText}>📍 Nearby</Text>
        </TouchableOpacity>
      </View>
      {nearbyMode && <Text style={styles.modeText}>📍 Food near you — sorted by distance</Text>}
      {nearbyError && <Text style={styles.error}>{nearbyError}</Text>}
      <FlatList
        data={places}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <PlaceCard
            place={item}
            onPress={() => navigation.navigate('PlaceDetail', {
              id: item.id,
              title: item.translation?.name || item.code,
              distance_m: item.distance_m,
            })}
          />
        )}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => search(q)} />}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>No results.</Text> : null}
        contentContainerStyle={{ padding: 14, paddingTop: 6 }}
      />
      {loading && <ActivityIndicator style={{ position: 'absolute', top: 60, alignSelf: 'center' }} color="#e65100" />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#faf6f1' },
  searchRow: { flexDirection: 'row', gap: 8, padding: 14, paddingBottom: 6 },
  input: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e8e0d6', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14 },
  nearbyBtn: { backgroundColor: '#00838f', borderRadius: 12, paddingHorizontal: 14, justifyContent: 'center' },
  nearbyText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  modeText: { paddingHorizontal: 16, fontSize: 12, color: '#00838f', marginBottom: 4 },
  error: { paddingHorizontal: 16, color: '#b3261e', fontSize: 12, marginBottom: 4 },
  empty: { textAlign: 'center', color: '#6d6156', marginTop: 30, fontSize: 13 },
});
