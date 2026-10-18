import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import { tokenStore } from './adminApi';
import { apiErrorMessage } from '../api/client';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api.post('/auth/login', { email, password });
      tokenStore.set(res.data.data.token);
      navigate('/admin');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit}>
        <h1>🍜 District 4 Admin</h1>
        <p style={{ color: 'var(--text-2)', fontSize: '0.88rem', marginBottom: '1.2rem' }}>
          Culinary Tourism &amp; Audio Guide CMS
        </p>
        {error && <div className="error-banner">{error}</div>}
        <div className="form-field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </div>
        <div className="form-field" style={{ marginTop: '0.8rem' }}>
          <label htmlFor="password">Password</label>
          <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <button className="btn btn-orange" style={{ width: '100%', justifyContent: 'center', marginTop: '1.2rem' }} disabled={busy}>
          {busy ? '…' : 'Login'}
        </button>
        <div className="hint">
          <strong>Development-only demo accounts</strong><br />
          admin@district4.local / Admin@123456<br />
          staff@district4.local / Staff@123456
        </div>
        <Link to="/" style={{ display: 'block', textAlign: 'center', marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-2)' }}>
          ← Back to public site
        </Link>
      </form>
    </div>
  );
}
