import { useEffect, useState } from 'react';
import { api } from '../api/client';

export const tokenStore = {
  get: () => localStorage.getItem('d4_token'),
  set: (t) => localStorage.setItem('d4_token', t),
  clear: () => localStorage.removeItem('d4_token'),
};

export function useAdmin() {
  const [user, setUser] = useState(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!tokenStore.get()) { setChecked(true); return; }
    api.get('/auth/me')
      .then((res) => setUser(res.data.data))
      .catch(() => tokenStore.clear())
      .finally(() => setChecked(true));
  }, []);

  return { user, checked };
}
