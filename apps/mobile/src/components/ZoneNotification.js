import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

// Zone-entry toast (spec section 15).
//
// Explicitly NOT a modal: the visitor is walking. An Alert-style popup would
// block navigation and interrupt them. This slides in at the top, announces the
// guide is starting, and fades itself out — while pause/stop/close stay
// available on the player card below.

export default function ZoneNotification({ place, visible, onDismiss, durationMs = 6000 }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-16)).current;

  useEffect(() => {
    if (visible) {
      opacity.setValue(0);
      translateY.setValue(-16);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 8 }),
      ]).start();
    } else {
      opacity.setValue(0);
    }
  }, [visible, opacity, translateY]);

  // Self-dismisses so a stale toast never sits on screen after the guide has
  // finished. Re-keyed on the place so a new entry re-arms the timer.
  useEffect(() => {
    if (!visible || !place || durationMs <= 0) return undefined;
    const timer = setTimeout(() => onDismiss?.(), durationMs);
    return () => clearTimeout(timer);
  }, [visible, place, durationMs, onDismiss]);

  if (!place) return null;

  return (
    <Animated.View style={[styles.wrap, { opacity, transform: [{ translateY }] }]}>
      <View style={styles.card}>
        <View style={styles.topRow}>
          <Text style={styles.title}>🎧 Nearby Culinary Guide</Text>
          <Text style={styles.close} onPress={onDismiss}>✕</Text>
        </View>
        <Text style={styles.body}>
          You are near: <Text style={styles.place}>{place.name}</Text>
        </Text>
        <Text style={styles.status}>Starting audio guide…</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  card: {
    backgroundColor: '#fff4e5', borderRadius: 14, borderWidth: 1, borderColor: '#f3d3a4', padding: 12,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 13.5, fontWeight: '800', color: '#8a4b00' },
  close: { fontSize: 14, color: '#a67c00', paddingHorizontal: 4 },
  body: { fontSize: 13, color: '#6d6156', marginTop: 6 },
  place: { fontWeight: '700', color: '#2b2118' },
  status: { fontSize: 12, color: '#00838f', marginTop: 4, fontWeight: '600' },
});