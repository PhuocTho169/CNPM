import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, getSessionId } from '../api';

const FAV_KEY = 'd4_favorites';
const HIST_KEY = 'd4_history';

export async function getFavoritesLocal() {
  const raw = await AsyncStorage.getItem(FAV_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function toggleFavoriteLocal(place) {
  const favs = await getFavoritesLocal();
  const exists = favs.some((f) => f.id === place.id);
  const next = exists ? favs.filter((f) => f.id !== place.id) : [place, ...favs];
  await AsyncStorage.setItem(FAV_KEY, JSON.stringify(next));

  // Optional backend sync with anonymous session id
  const sessionId = await getSessionId();
  const endpoint = exists ? '/favorites' : '/favorites';
  try {
    if (exists) {
      await api.delete(endpoint, { data: { session_id: sessionId, culinary_place_id: place.id } });
    } else {
      await api.post(endpoint, { session_id: sessionId, culinary_place_id: place.id });
    }
  } catch {
    // offline-friendly: local list is the source of truth
  }
  return next;
}

export async function isFavorite(placeId) {
  const favs = await getFavoritesLocal();
  return favs.some((f) => f.id === placeId);
}

export async function pushHistory(placeId) {
  const raw = await AsyncStorage.getItem(HIST_KEY);
  let hist = raw ? JSON.parse(raw) : [];
  hist = [{ id: placeId, viewed_at: Date.now() }, ...hist.filter((h) => h.id !== placeId)].slice(0, 20);
  await AsyncStorage.setItem(HIST_KEY, JSON.stringify(hist));
  const sessionId = await getSessionId();
  try {
    await api.post('/history', { session_id: sessionId, culinary_place_id: placeId });
  } catch {
    // ignore network errors — local history remains
  }
}

export async function getHistoryLocal() {
  const raw = await AsyncStorage.getItem(HIST_KEY);
  return raw ? JSON.parse(raw) : [];
}
