import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api, getLanguage, setLanguage, getSessionId, API_BASE, isUnsafeBaseUrl } from '../api';
import useLanguages, { flagFor } from '../hooks/useLanguages';

export default function SettingsScreen() {
  const languages = useLanguages();
  const [lang, setLangState] = useState('vi');
  const [sessionId, setSessionId] = useState('');
  const [dbStatus, setDbStatus] = useState('…');

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setLangState(await getLanguage());
        setSessionId(await getSessionId());
        try {
          const res = await api.get('/health');
          setDbStatus(res.data?.database === 'connected' ? '✅ Connected' : '❌ Disconnected');
        } catch {
          setDbStatus('❌ Unreachable');
        }
      })();
    }, [])
  );

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.heading}>🌐 Guide language</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {languages.map((l) => (
          <TouchableOpacity
            key={l.code}
            style={[styles.pill, l.code === lang && styles.pillActive]}
            onPress={() => { setLanguage(l.code); setLangState(l.code); }}
          >
            <Text style={[styles.pillText, l.code === lang && styles.pillTextActive]}>{flagFor(l.code)} {l.native_name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.heading}>🔌 API connection</Text>
      <Text style={styles.body}>Base URL: <Text style={{ fontWeight: '700' }}>{API_BASE}</Text></Text>
      <Text style={styles.body}>Database: {dbStatus}</Text>
      {isUnsafeBaseUrl && (
        <Text style={[styles.body, { color: '#a67c00', marginTop: 6 }]}>
          ⚠️ Using localhost. For a real phone, set EXPO_PUBLIC_API_URL to your computer&apos;s LAN IP
          (e.g. http://192.168.1.100:5000/api) and make sure the phone and computer are on the same Wi-Fi.
        </Text>
      )}

      <Text style={styles.heading}>🆔 Anonymous session</Text>
      <Text style={styles.body}>{sessionId || '…'}</Text>
      <Text style={styles.body}>
        Your favorites and visit history are stored on this device and linked to this anonymous
        session id — no account or personal data required.
      </Text>

      <Text style={styles.heading}>🍜 About</Text>
      <Text style={styles.body}>
        District 4 Culinary Guide — multilingual food tourism &amp; audio guide for Quận 4, TP.HCM.
        Scan the QR code at each food location to hear the narration in your language.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#faf6f1' },
  heading: { fontSize: 15, fontWeight: '800', color: '#2b2118', marginTop: 18, marginBottom: 8 },
  body: { fontSize: 13, color: '#2b2118', lineHeight: 20 },
  pill: { borderWidth: 1, borderColor: '#e8e0d6', borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fff' },
  pillActive: { borderColor: '#e65100', backgroundColor: '#fff3e6' },
  pillText: { fontSize: 13, color: '#6d6156' },
  pillTextActive: { color: '#ac1900', fontWeight: '700' },
});
