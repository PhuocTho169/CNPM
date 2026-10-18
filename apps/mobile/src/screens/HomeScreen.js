import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api, getLanguage, setLanguage, apiErrorMessage, isUnsafeBaseUrl, API_BASE } from '../api';
import PlaceCard from '../components/PlaceCard';
import useLanguages, { flagFor } from '../hooks/useLanguages';

export default function HomeScreen({ navigation }) {
  const languages = useLanguages();
  const [places, setPlaces] = useState([]);
  const [lang, setLangState] = useState('vi');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const stored = await getLanguage();
        setLangState(stored);
        setLoading(true);
        setError(null);
        try {
          const res = await api.get(`/places?status=PUBLISHED&recommended=true&limit=10&lang=${stored}`);
          setPlaces(res.data.data || []);
        } catch (e) {
          setError(apiErrorMessage(e));
        } finally {
          setLoading(false);
        }
      })();
    }, [])
  );

  async function switchLang(code) {
    await setLanguage(code);
    setLangState(code);
    setLoading(true);
    try {
      const res = await api.get(`/places?status=PUBLISHED&recommended=true&limit=10&lang=${code}`);
      setPlaces(res.data.data || []);
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      {isUnsafeBaseUrl && (
        <Text style={styles.warn}>
          ⚠️ API URL is {API_BASE}. For a real phone set EXPO_PUBLIC_API_URL to your computer&apos;s LAN IP.
        </Text>
      )}
      <View style={styles.langRow}>
        {languages.map((l) => (
          <TouchableOpacity
            key={l.code}
            style={[styles.langPill, l.code === lang && styles.langPillActive]}
            onPress={() => switchLang(l.code)}
          >
            <Text style={[styles.langText, l.code === lang && styles.langTextActive]}>{flagFor(l.code)} {l.native_name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.heading}>⭐ Featured Culinary Places</Text>
      {error && <Text style={styles.error}>{error}</Text>}
      <FlatList
        data={places}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <PlaceCard
            place={item}
            onPress={() => navigation.navigate('PlaceDetail', { id: item.id, title: item.translation?.name || item.code })}
          />
        )}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => switchLang(lang)} />}
        ListEmptyComponent={!loading && !error ? <Text style={styles.empty}>No places yet — run the server and seed data.</Text> : null}
        contentContainerStyle={{ padding: 14, paddingTop: 4 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#faf6f1' },
  warn: { fontSize: 12, color: '#a67c00', backgroundColor: '#fff7e0', padding: 8, marginHorizontal: 14, marginTop: 8, borderRadius: 8 },
  langRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 14, paddingVertical: 10 },
  langPill: { borderWidth: 1, borderColor: '#e8e0d6', borderRadius: 18, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#fff' },
  langPillActive: { borderColor: '#e65100', backgroundColor: '#fff3e6' },
  langText: { fontSize: 13, color: '#6d6156' },
  langTextActive: { color: '#ac1900', fontWeight: '700' },
  heading: { fontSize: 17, fontWeight: '800', color: '#2b2118', paddingHorizontal: 14, marginBottom: 6 },
  error: { color: '#b3261e', paddingHorizontal: 14, marginBottom: 6, fontSize: 13 },
  empty: { textAlign: 'center', color: '#6d6156', marginTop: 30, fontSize: 13 },
});
