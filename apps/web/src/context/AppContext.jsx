import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { api, getPreferredLanguage, setPreferredLanguage } from '../api/client';
import { UI_STRINGS } from '../utils/uiStrings';

export { UI_STRINGS };

// Used ONLY when the languages API is unreachable or empty — the picker must
// not be blank when the network fails. It is deliberately not merged into a
// successful response: a language an admin deleted (or deactivated) has to
// disappear from the site too, otherwise the fallback would resurrect it.
export const FALLBACK_LANGUAGES = [
  { code: 'vi', native_name: 'Tiếng Việt' },
  { code: 'en', native_name: 'English' },
  { code: 'zh', native_name: '中文' },
  { code: 'ko', native_name: '한국어' },
  { code: 'ja', native_name: '日本語' },
];

const AppContext = createContext(null);

async function getJson(path, options) {
  const res = await api.get(path, options);
  return res.data.data || res.data;
}

export function AppProvider({ children }) {
  const [languages, setLanguages] = useState([]);
  const [lang, setLangState] = useState(getPreferredLanguage());
  const [user, setUser] = useState(null);
  const [guestSession, setGuestSession] = useState(null);
  const [freeLanguages, setFreeLanguages] = useState([]);
  const [purchasedLanguages, setPurchasedLanguages] = useState([]);
  const [initialLoadError, setInitialLoadError] = useState(null);
  const sessionCreating = useRef(false);

  useEffect(() => {
    api.get('/languages?active_only=true')
      .then((res) => {
        const fromApi = res.data.data || [];
        setLanguages(fromApi.length ? fromApi : FALLBACK_LANGUAGES);
      })
      .catch(() => setLanguages(FALLBACK_LANGUAGES));
  }, []);

  // Restore the signed-in account: the JWT survives in localStorage, so read
  // /auth/me once on load. A stale token simply means "not signed in".
  useEffect(() => {
    if (!localStorage.getItem('d4_token')) return;
    api.get('/auth/me')
      .then((res) => setUser(res.data.data))
      .catch(() => localStorage.removeItem('d4_token'));
  }, []);

  // Guest session (opaque token + cookie) created ONCE per visitor, so the same
  // session holds the 2 free languages + paid unlocks across every page.
  // ref guard: React StrictMode mounts effects twice in dev — without it two
  // guest sessions are created back-to-back and one silently replaces the other.
  useEffect(() => {
    if (user || guestSession || sessionCreating.current) return;
    sessionCreating.current = true;
    api.post('/guest-sessions')
      .then((res) => {
        const data = res.data.data || res.data;
        setGuestSession(data.display_id || data.guest_session_id || data);
      })
      .catch((err) => {
        setInitialLoadError(err?.response?.data?.message || null);
      })
      .finally(() => { sessionCreating.current = false; });
  }, [user, guestSession]);

  // Keep one source of truth for the guest session. Any component may call
  // these setters after a successful API response instead of re-creating the
  // session itself.

  const setLang = useCallback((code) => {
    setLangState(code);
    setPreferredLanguage(code);
  }, []);

  // `t(key, vars)` fills {placeholders}; unknown keys fall back to the
  // Vietnamese string and finally to the key itself, so nothing renders blank.
  const t = useCallback((key, vars) => {
    const str = UI_STRINGS[lang]?.[key] ?? UI_STRINGS.vi[key] ?? key;
    if (!vars) return str;
    return str.replace(/\{(\w+)\}/g, (m, name) => (vars[name] ?? m));
  }, [lang]);

  const logout = useCallback(() => {
    localStorage.removeItem('d4_token');
    setUser(null);
    setGuestSession(null);
    setFreeLanguages([]);
    setPurchasedLanguages([]);
  }, []);

  return (
    <AppContext.Provider value={{
      languages, lang, setLang, t, user, setUser, logout,
      guestSession, freeLanguages, purchasedLanguages, initialLoadError,
      setGuestSession, setFreeLanguages, setPurchasedLanguages,
      getJson,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
