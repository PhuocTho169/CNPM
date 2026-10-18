import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';

export default function PlaceCard({ place, onPress }) {
  const name = place.translation?.name || place.name || place.code;
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      {place.primary_image ? (
        <Image source={{ uri: place.primary_image }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.imageFallback]}>
          <Text style={{ fontSize: 30 }}>{place.category?.icon || '🍽️'}</Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{name}</Text>
        {place.category && <Text style={styles.meta}>{place.category.icon} {place.category.name}</Text>}
        {place.translation?.short_description ? (
          <Text numberOfLines={2} style={styles.desc}>{place.translation.short_description}</Text>
        ) : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
          {place.price_range ? <Text style={styles.chip}>💰 {place.price_range}</Text> : null}
          {place.is_recommended ? <Text style={[styles.chip, { color: '#00838f' }]}>⭐ Recommended</Text> : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', gap: 10, padding: 12, marginBottom: 10,
    backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e8e0d6',
  },
  image: { width: 84, height: 84, borderRadius: 10, backgroundColor: '#efe6da' },
  imageFallback: { alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 15, fontWeight: '700', color: '#2b2118' },
  meta: { fontSize: 12, color: '#6d6156', marginTop: 2 },
  desc: { fontSize: 12.5, color: '#6d6156', marginTop: 3 },
  chip: { fontSize: 11, color: '#ac1900', backgroundColor: '#fff3e6', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginRight: 6, marginTop: 4, overflow: 'hidden' },
});
