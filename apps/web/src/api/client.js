import axios from 'axios';

export const API_BASE = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({ baseURL: API_BASE, timeout: 15000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('d4_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !location.pathname.startsWith('/admin')) {
      // public pages ignore auth errors
    }
    return Promise.reject(err);
  }
);

// ---------- Anonymous visitor session ----------
export function getSessionId() {
  let sid = localStorage.getItem('d4_session');
  if (!sid) {
    sid = `s_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    localStorage.setItem('d4_session', sid);
  }
  return sid;
}

// ---------- Language preference ----------
export function getPreferredLanguage() {
  return localStorage.getItem('d4_lang') || 'vi';
}

export function setPreferredLanguage(code) {
  localStorage.setItem('d4_lang', code);
}

export function apiErrorMessage(err) {
  return err?.response?.data?.message || err?.message || 'Network error. Please try again.';
}
