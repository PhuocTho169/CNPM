import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

// Compact narration player (spec section 14). Deliberately a card, not a
// full-screen modal: the visitor is walking and reading the street, so the
// player must never take over navigation. Everything here is reachable with one
// thumb while the phone is held one-handed.

const LANG_LABEL = { vi: 'Vietnamese', en: 'English', ko: 'Korean', ja: 'Japanese', zh: 'Chinese' };

function fmt(ms) {
  if (!Number.isFinite(ms) || ms < 0) return '00:00';
  const total = Math.floor(ms / 1000);
  const m = String(Math.floor(total / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${m}:${s}`;
}

export default function AudioGuidePlayer({
  narration,
  isPlaying,
  positionMs,
  durationMs,
  volume,
  isLoading,
  error,
  onToggle,
  onSeek,
  onVolume,
  onClose,
}) {
  // Track width is measured so a tap maps to a real timestamp. Guessing with a
  // percentage would make seeking wrong on every screen size.
  const [trackWidth, setTrackWidth] = useState(0);

  if (!narration && !error) return null;

  const total = durationMs || (narration?.duration ? narration.duration * 1000 : 0);
  const progress = total > 0 ? Math.min(1, positionMs / total) : 0;

  const handleSeekPress = (event) => {
    if (!total || !trackWidth) return;
    const ratio = Math.max(0, Math.min(1, event.nativeEvent.locationX / trackWidth));
    onSeek(ratio * total);
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.icon}>🎧</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            {narration?.title || 'District 4 Culinary Guide'}
          </Text>
          <Text style={styles.lang}>{LANG_LABEL[narration?.language] || narration?.language || ''}</Text>
        </View>
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.close}>✕</Text>
        </TouchableOpacity>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity
        style={styles.trackHit}
        onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
        onPress={handleSeekPress}
        activeOpacity={0.8}
        disabled={!total}
      >
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${progress * 100}%` }]} />
        </View>
      </TouchableOpacity>

      <Text style={styles.time}>
        {fmt(positionMs)} / {fmt(total)}
      </Text>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => onSeek(Math.max(0, positionMs - 10000))}>
          <Text style={styles.secondaryText}>−10s</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.playBtn} onPress={onToggle} disabled={isLoading}>
          <Text style={styles.playText}>{isLoading ? '…' : isPlaying ? '⏸' : '▶'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={() => onSeek(Math.min(total, positionMs + 10000))}>
          <Text style={styles.secondaryText}>+10s</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={onClose}>
          <Text style={styles.secondaryText}>✕ Stop</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.volumeRow}>
        <Text style={styles.volumeLabel}>🔈</Text>
        <View style={styles.volumeTrack}>
          <View style={[styles.volumeFill, { width: `${volume * 100}%` }]} />
        </View>
        <Text style={styles.volumeLabel}>🔊</Text>
        <View style={styles.volumeSteps}>
          {[0, 0.25, 0.5, 0.75, 1].map((level) => (
            <TouchableOpacity
              key={level}
              onPress={() => onVolume(level)}
              style={[styles.volumeStep, volume >= level && styles.volumeStepOn]}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e8e0d6',
    padding: 14, marginBottom: 12,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { fontSize: 20 },
  title: { fontSize: 14.5, fontWeight: '700', color: '#2b2118' },
  lang: { fontSize: 11.5, color: '#6d6156', marginTop: 2 },
  close: { fontSize: 16, color: '#6d6156', paddingHorizontal: 4 },
  error: { fontSize: 12, color: '#b3261e', marginTop: 8 },
  trackHit: { marginTop: 12, paddingVertical: 8 },
  track: { height: 6, borderRadius: 3, backgroundColor: '#efe6da', overflow: 'hidden' },
  fill: { height: 6, backgroundColor: '#e65100' },
  time: { fontSize: 11.5, color: '#6d6156', marginTop: 2, fontVariant: ['tabular-nums'] },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 8 },
  playBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#e65100', alignItems: 'center', justifyContent: 'center' },
  playText: { color: '#fff', fontSize: 18, marginLeft: 2 },
  secondaryBtn: { paddingHorizontal: 8, paddingVertical: 6 },
  secondaryText: { fontSize: 12.5, color: '#6d4a2a', fontWeight: '600' },
  volumeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  volumeLabel: { fontSize: 13 },
  volumeTrack: { flex: 1, height: 4, borderRadius: 2, backgroundColor: '#efe6da' },
  volumeFill: { height: 4, backgroundColor: '#00838f' },
  volumeSteps: { flexDirection: 'row', gap: 4 },
  volumeStep: { width: 12, height: 12, borderRadius: 6, borderWidth: 1, borderColor: '#c9b9a6' },
  volumeStepOn: { backgroundColor: '#00838f', borderColor: '#00838f' },
});