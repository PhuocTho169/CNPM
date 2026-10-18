import { useEffect, useState } from 'react';
import { api } from '../api';

// Used ONLY when the languages API is unreachable or empty, so the picker is
// never blank on a network failure. It is not merged into a successful
// response: a language the admin deleted or deactivated must disappear here too.
const FALLBACK_LANGUAGES = [
  { code: 'vi', native_name: 'Tiếng Việt' },
  { code: 'en', native_name: 'English' },
  { code: 'zh', native_name: '中文' },
  { code: 'ko', native_name: '한국어' },
  { code: 'ja', native_name: '日本語' },
];

/**
 * Flag emoji for a 2-letter language code, built from the Unicode regional
 * indicator symbols: vi → 🇻🇳, fr → 🇫🇷, de → 🇩🇪. No per-language table to
 * extend when a new language is registered; anything else gets a globe.
 */
export function flagFor(code) {
  const c = String(code || '').toLowerCase();
  if (!/^[a-z]{2}$/.test(c)) return '🌐';
  const A = 0x1f1e6;
  return String.fromCodePoint(A + (c.charCodeAt(0) - 97), A + (c.charCodeAt(1) - 97));
}

/** Active languages from the API — the single source of truth for every picker. */
export default function useLanguages() {
  const [languages, setLanguages] = useState([]);

  useEffect(() => {
    let alive = true;
    api.get('/languages?active_only=true')
      .then((res) => {
        if (!alive) return;
        const rows = res.data.data || [];
        setLanguages(rows.length ? rows : FALLBACK_LANGUAGES);
      })
      .catch(() => { if (alive) setLanguages(FALLBACK_LANGUAGES); });
    return () => { alive = false; };
  }, []);

  return languages;
}
