import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getFavoritesLocal } from '../services/favorites';
import PlaceCard from '../components/PlaceCard';

export default function FavoritesScreen({ navigation }) {
  const [favorites, setFavorites] = useState([]);

  useFocusEffect(
    useCallback(() => {
      getFavoritesLocal().then(setFavorites);
    }, [])
  );

  return (
    <View style={styles.root}>
      <Text style={styles.heading}>❤️ Saved places</Text>
      <FlatList
        data={favorites}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <PlaceCard
            place={item}
            onPress={() => navigation.navigate('PlaceDetail', { id: item.id, title: item.translation?.name || item.code })}
          />
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>
            No favorites yet. Tap 🤍 on any place to save it — no account needed.
          </Text>
        }
        contentContainerStyle={{ padding: 14, paddingTop: 4 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#faf6f1' },
  heading: { fontSize: 17, fontWeight: '800', color: '#2b2118', paddingHorizontal: 14, paddingTop: 10, marginBottom: 6 },
  empty: { textAlign: 'center', color: '#6d6156', marginTop: 30, fontSize: 13, paddingHorizontal: 30 },
});
