import { useEffect, useState } from 'react';
import { api, apiErrorMessage, API_BASE } from '../api/client';

export default function AdminSettings() {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState(null);
  const [langs, setLangs] = useState([]);

  useEffect(() => {
    api.get('/health')
      .then((res) => setHealth(res.data))
      .catch((e) => setError(apiErrorMessage(e)));
    api.get('/languages').then((res) => setLangs(res.data.data || [])).catch(() => {});
  }, []);

  return (
    <>
      <div className="admin-header"><h1>Settings</h1></div>
      {error && <div className="error-banner">{error}</div>}

      <div className="chart-box">
        <h3>🩺 API health</h3>
        {health ? (
          <ul style={{ fontSize: '0.9rem', listStyle: 'none' }}>
            <li>Service: <strong>{health.service}</strong> {health.success ? '✅' : '❌'}</li>
            <li>Database: <strong>{health.database}</strong></li>
            <li>API base: <code>{API_BASE}</code></li>
          </ul>
        ) : (
          <div className="spinner" />
        )}
      </div>

      <div className="chart-box">
        <h3>🌐 Installed languages ({langs.length})</h3>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-2)' }}>
          Manage languages from the Languages page. Adding a new language here makes it instantly
          available to visitors and in translation forms — no code changes needed.
        </p>
        <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
          {langs.map((l) => (
            <div key={l.id} className="card" style={{ padding: '0.9rem', flexDirection: 'row', gap: '0.6rem', alignItems: 'center' }}>
              <strong>{l.native_name}</strong>
              <code>{l.code}</code>
              <span style={{ marginLeft: 'auto' }}>{l.is_active ? '✅' : '⛔'}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="chart-box">
        <h3>🔧 Deployment notes</h3>
        <ul style={{ fontSize: '0.88rem', paddingLeft: '1.2rem' }}>
          <li><strong>JWT_SECRET</strong> — change the default value in <code>server/.env</code> before any real deployment.</li>
          <li><strong>PUBLIC_BASE_URL</strong> — must match the public website URL so QR codes point to the right guide pages.</li>
          <li><strong>TTS_PROVIDER</strong> — leave empty for the free keyless Google Translate voices; set <code>google</code>/<code>elevenlabs</code> (+ <code>TTS_API_KEY</code>) or <code>edge</code> to prefer that provider. When it fails or has no voice for a language, the server automatically falls back to the free voice, so narration is never missing. <code>none</code> turns server TTS off.</li>
          <li>Demo accounts are <strong>development-only</strong>: admin@district4.local / staff@district4.local. Remove them in production.</li>
        </ul>
      </div>
    </>
  );
}
