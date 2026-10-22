import { useState, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../api/client';
import { useApp } from '../context/AppContext';

const ERR_T = {
  INVALID_CREDENTIALS: 'invalidCredentials',
  ACCOUNT_DISABLED: 'accountDisabled',
};

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="9" stroke="rgba(255,255,255,0.85)" strokeWidth="1.4" />
      <path d="M6 10.2l2.4 2.4L14 7.6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="9" fill="#b3261e" />
      <path d="M10 5.5v5.2M10 13.2v1.3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, setUser } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const alertRef = useRef(null);

  const from = location.state?.from || '/';

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api.post('/auth/login', { email, password });
      localStorage.setItem('d4_token', res.data.data.token);
      setUser(res.data.data.user);
      navigate(from, { replace: true });
    } catch (err) {
      const code = err?.response?.data?.code;
      setError(code && ERR_T[code] ? t(ERR_T[code]) : t('loginFailed'));
      // Focusable error summary: keyboard + screen reader users land right on it.
      requestAnimationFrame(() => alertRef.current?.focus());
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <aside className="auth-brand" aria-hidden="true">
          <div>
            <p className="auth-eyebrow">{t('heroTagline')}</p>
            <h2 className="auth-display">{t('heroTitle')}</h2>
          </div>
          <ul className="auth-brand-list">
            <li><CheckIcon /> {t('audioGuides')}</li>
            <li><CheckIcon /> {t('exploreTitle')}</li>
            <li><CheckIcon /> {t('foodRoutes')}</li>
          </ul>
          <p className="auth-brand-note">District 4 · TP.HCM</p>
        </aside>

        <form className="auth-panel" onSubmit={submit}>
          <h1>🍜 {t('loginTitle')}</h1>
          <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', margin: '0.5rem 0 1.4rem' }}>{t('loginSub')}</p>
          {error && (
            <div className="auth-alert" role="alert" tabIndex={-1} ref={alertRef}>
              <ErrorIcon />
              <span>{error}</span>
            </div>
          )}
          <div className="form-field">
            <label htmlFor="login-email">{t('email')}</label>
            <input id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus autoComplete="email" />
          </div>
          <div className="form-field" style={{ marginTop: '0.9rem' }}>
            <label htmlFor="login-password">{t('password')}</label>
            <input id="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
          </div>
          <button className="btn btn-orange auth-submit" disabled={busy}>
            {busy ? t('loading') : t('login')}
          </button>
          <p className="auth-alt">
            {t('noAccount')}{' '}
            <Link to="/register">{t('register')}</Link>
          </p>
          <Link to="/" className="auth-home">← {t('home')}</Link>
        </form>
      </div>
    </div>
  );
}
