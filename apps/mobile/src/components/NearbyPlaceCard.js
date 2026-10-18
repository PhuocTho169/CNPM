import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { zoneThresholds } from '../config/gps';

// One nearby culinary place with its live distance and zone geometry.
// `inside` marks the places the visitor is currently standing in, so the list
// reflects the hysteresis state rather than just raw distance.

function formatDistance(meters) {
  if (!Number.isFinite(meters)) return '—';
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

export default function NearbyPlaceCard({ place, inside, onPress, onPlay }) {
  const { enterMeters, exitMeters } = zoneThresholds(place);

  return (
    <View style={[styles.card, inside && styles.cardInside]}>
      <View style={styles.iconWrap}>
        <Text style={{ fontSize: 22 }}>{place.category_icon || '🍽️'}</Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{place.name}</Text>
        <View style={styles.metaRow}>
          <Text style={[styles.distance, inside && styles.distanceInside]}>
            {inside ? '🎧 Inside zone' : `📍 ${formatDistance(place.distance_m)} away`}
          </Text>
          {!inside && <Text style={styles.zone}>zone {enterMeters}m</Text>}
        </View>
      </View>

      <View style={styles.actions}>
        {onPlay && (
          <TouchableOpacity style={styles.playBtn} onPress={onPlay}>
            <Text style={styles.playBtnText}>▶</Text>
          </TouchableOpacity>
        )}
        {onPress && (
          <TouchableOpacity style={styles.gotoBtn} onPress={onPress}>
            <Text style={styles.gotoText}>Details</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Show the hysteresis band so the numbers are not mysterious. */}
      <Text style={styles.hint}>auto-guide {enterMeters}–{exitMeters}m</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e8e0d6',
    padding: 12, marginBottom: 10,
  },
  cardInside: { borderColor: '#00838f', backgroundColor: '#f0fafb' },
  iconWrap: { width: 42, height: 42, borderRadius: 10, backgroundColor: '#efe6da', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 14.5, fontWeight: '700', color: '#2b2118' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 },
  distance: { fontSize: 12.5, color: '#00838f', fontWeight: '600' },
  distanceInside: { color: '#e65100' },
  zone: { fontSize: 11, color: '#6d6156' },
  hint: { position: 'absolute', right: 12, bottom: 4, fontSize: 9.5, color: '#b3a596' },
  actions: { alignItems: 'flex-end', gap: 6 },
  playBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#e65100', alignItems: 'center', justifyContent: 'center' },
  playBtnText: { color: '#fff', fontSize: 13, marginLeft: 2 },
  gotoBtn: { paddingHorizontal: 8, paddingVertical: 3 },
  gotoText: { fontSize: 11, color: '#6d6156' },
});