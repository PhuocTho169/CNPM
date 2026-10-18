import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// IMPORTANT: For a real phone, EXPO_PUBLIC_API_URL must be your computer's LAN IP
// (e.g. http://192.168.1.100:5000/api), NOT localhost. Phone and computer must be
// on the same local network.
export const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

export const isUnsafeBaseUrl = API_BASE.includes('localhost') || API_BASE.includes('127.0.0.1');

export const api = axios.create({ baseURL: API_BASE, timeout: 15000 });

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('d4_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export async function getSessionId() {
  let sid = await AsyncStorage.getItem('d4_session');
  if (!sid) {
    sid = `s_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    await AsyncStorage.setItem('d4_session', sid);
  }
  return sid;
}

export async function getLanguage() {
  return (await AsyncStorage.getItem('d4_lang')) || 'vi';
}

export async function setLanguage(code) {
  await AsyncStorage.setItem('d4_lang', code);
}

export function apiErrorMessage(err) {
  return err?.response?.data?.message || err?.message || 'Network error';
}
