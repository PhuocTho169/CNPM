import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, getSessionId } from '../api/client';
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

const FREE_EXEMPT_LANGUAGES = new Set(['vi']);

async function getJson(path, options) {
  const res = await api.get(path, options);
  return res.data.data || res.data;
}

export function AppProvider({ children }) {
  const [languages, setLanguages] = useState([]);
  const [lang, setLangState] = useState(getPreferredLanguage());
  const [user, setUser] = useState(null);

  // Guest session (opaque token + cookie) created ONCE per visitor, matching
  // the check at POST /api/guest-sessions. Free language + purchased list are
  // stored here so the entire page tree (header, guide, dish cards) can read them
  // without re-fetching or re-creating the session. 2 rows:

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

  // Keep one source of truth for the guest session. Any component may call
  // these setters after a successful API response instead of re-creating the
  // session itself.

  // If we are not logged in, the visitor needs a guest session before we can
  // show any paid content. Run early (does not delay the first render).
  useEffect(() => {
    if (!user && !guestSession) {
      api.post('/guest-sessions')
        .then((res) => {
          const data = res.data.data || res.data;
          setGuestSession(data.guest_session_id || data.id || data);
          // A brand-new scanner may pick one free language from the 5 supported.
          // The QR page itself drives the choice.
        })
        .catch(() => {
          // Network failure: we still render the page, but content stays locked
          // until the call succeeds. The UI shows a friendly message.
        });
    }  }, [user, guestSession]);

  // Keep one source of truth for the guest session. Any component may call
  // these setters after a successful API response instead of re-creating the
  // session itself.

  const setLang = useCallback((code) => {
    setLangState(code);
    setPreferredLanguage(code);
  }, []);

  const t = useCallback((key, vars) => {
    const str = UI_STRINGS[lang]?.[key] ?? UI_STRINGS.vi[key] ?? key;
    if (!vars) return str;
    return str.replace(/\{(\w+)\}/g, (m, name) => (vars[name] ?? m));
  }, [lang]);

  const logout = useCallback(() => {
    localStorage.removeItem('d4_token');
    setUser(null);
    setGuestSession(null);
    setFreeLanguage(null);
    setPurchasedLanguages([]);
  }, []);

  return (
    <AppContext.Provider value={{ languages, lang, setLang, t, user, setUser, logout, guestSession, freeLanguage, purchasedLanguages, setGuestSession, setFreeLanguage, setPurchasedLanguages, initialLoadError }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
