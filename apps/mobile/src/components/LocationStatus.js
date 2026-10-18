import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';

// GPS state banner (spec section 17). Every state the guide can be in gets a
// concrete recovery action rather than a dead end:
//   permission missing → Enable Location / Open Settings
//   locating          → spinner
//   services off      → Open Location Settings
//   active            → live lat/lng + accuracy

export default function LocationStatus({
  permission,
  isTracking,
  isLocating,
  currentLocation,
  gpsError,
  onRequestPermission,
  onRetry,
  onOpenSettings,
}) {
  if (permission !== 'granted') {
    const blocked = permission === 'deniedPermanently';
    return (
      <View style={[styles.card, styles.warnCard]}>
        <Text style={styles.warnTitle}>📍 Location permission is required</Text>
        <Text style={styles.warnBody}>
          to automatically detect nearby culinary destinations.
        </Text>
        <View style={styles.row}>
          <TouchableOpacity style={styles.primaryBtn} onPress={onRequestPermission}>
            <Text style={styles.primaryBtnText}>Enable Location</Text>
          </TouchableOpacity>
          {blocked && (
            <TouchableOpacity style={styles.ghostBtn} onPress={onOpenSettings}>
              <Text style={styles.ghostBtnText}>Open Settings</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  if (isLocating && !currentLocation) {
    return (
      <View style={[styles.card, styles.infoCard]}>
        <ActivityIndicator color="#00838f" />
        <Text style={styles.infoBody}>Getting your current location…</Text>
      </View>
    );
  }

  if (gpsError && !currentLocation) {
    return (
      <View style={[styles.card, styles.warnCard]}>
        <Text style={styles.warnTitle}>Unable to determine your location.</Text>
        <Text style={styles.warnBody}>Please check:{'\n'}• GPS{'\n'}• Location Services{'\n'}• App permissions</Text>
        <View style={styles.row}>
          <TouchableOpacity style={styles.primaryBtn} onPress={onRetry}>
            <Text style={styles.primaryBtnText}>Try again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.ghostBtn} onPress={onOpenSettings}>
            <Text style={styles.ghostBtnText}>Open Settings</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!currentLocation) {
    return (
      <View style={[styles.card, styles.infoCard]}>
        <Text style={styles.infoBody}>Waiting for a GPS signal…</Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, styles.okCard]}>
      <View style={styles.rowBetween}>
        <Text style={styles.okTitle}>🛰️ GPS Active</Text>
        {isTracking && <Text style={styles.badge}>tracking</Text>}
      </View>
      <Text style={styles.coords}>
        {currentLocation.latitude.toFixed(5)}, {currentLocation.longitude.toFixed(5)}
      </Text>
      <Text style={styles.meta}>
        Accuracy: ±{currentLocation.accuracy ?? '?'}m
        {gpsError ? `  •  ${gpsError}` : ''}
      </Text>
      {!isTracking && (
        <TouchableOpacity style={styles.ghostBtn} onPress={onRetry}>
          <Text style={styles.ghostBtnText}>Resume tracking</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, borderRadius: 14, marginBottom: 12, borderWidth: 1 },
  infoCard: { backgroundColor: '#e8f4f5', borderColor: '#bfe0e2', flexDirection: 'row', alignItems: 'center', gap: 10 },
  okCard: { backgroundColor: '#eaf7ee', borderColor: '#c3e6cd' },
  warnCard: { backgroundColor: '#fff4e5', borderColor: '#f3d3a4' },
  okTitle: { fontSize: 15, fontWeight: '800', color: '#1b5e20' },
  coords: { fontSize: 14, color: '#2b2118', marginTop: 6, fontVariant: ['tabular-nums'] },
  meta: { fontSize: 12, color: '#6d6156', marginTop: 2 },
  infoBody: { fontSize: 13, color: '#2b2118', flex: 1 },
  warnTitle: { fontSize: 14, fontWeight: '700', color: '#8a4b00' },
  warnBody: { fontSize: 13, color: '#6d6156', marginTop: 4, lineHeight: 19 },
  badge: { fontSize: 11, color: '#1b5e20', backgroundColor: '#c9e8d2', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, overflow: 'hidden' },
  row: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  primaryBtn: { backgroundColor: '#e65100', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  ghostBtn: { borderWidth: 1, borderColor: '#c9b9a6', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9, marginTop: 8 },
  ghostBtnText: { color: '#6d4a2a', fontWeight: '600', fontSize: 13 },
});