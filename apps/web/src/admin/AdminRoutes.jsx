import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '../api/client';

const EMPTY = { code: '', name: '', description: '', estimated_duration: '', distance: '', difficulty: 'EASY', status: 'DRAFT' };

export default function AdminRoutes() {
  const [routes, setRoutes] = useState([]);
  const [places, setPlaces] = useState([]);
  const [draft, setDraft] = useState(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState(null);
  const [flash, setFlash] = useState(null);

  function load() {
    api.get('/routes?lang=vi').then((res) => setRoutes(res.data.data || [])).catch((e) => setError(apiErrorMessage(e)));
  }
  useEffect(() => {
    load();
    api.get('/places?limit=100&lang=vi').then((res) => setPlaces(res.data.data || [])).catch(() => {});
  }, []);

  function notify(msg) { setFlash(msg); setTimeout(() => setFlash(null), 2000); }

  async function save() {
    setError(null);
    try {
      if (draft.id) await api.put(`/routes/${draft.id}`, draft);
      else await api.post('/routes', draft);
      setDraft(EMPTY); setShowForm(false); notify('Route saved'); load();
    } catch (e) { setError(apiErrorMessage(e)); }
  }

  async function remove(id) {
    if (!window.confirm('Delete this route?')) return;
    try { await api.delete(`/routes/${id}`); load(); } catch (e) { setError(apiErrorMessage(e)); }
  }

  async function addStop(route) {
    const select = document.getElementById(`stop-select-${route.id}`);
    const placeId = select?.value;
    if (!placeId) return;
    try { await api.post(`/routes/${route.id}/stops`, { culinary_place_id: Number(placeId) }); notify('Stop added'); load(); }
    catch (e) { setError(apiErrorMessage(e)); }
  }

  async function removeStop(stopId) {
    try { await api.delete(`/routes/stops/${stopId}`); load(); } catch (e) { setError(apiErrorMessage(e)); }
  }

  async function moveStop(route, stopId, dir) {
    const stops = route.stops;
    const idx = stops.findIndex((s) => s.id === stopId);
    const target = stops[idx + dir];
    if (!target) return;
    try {
      await api.put(`/routes/stops/${stopId}`, { position: target.position });
      await api.put(`/routes/stops/${target.id}`, { position: idx + 1 });
      load();
    } catch (e) { setError(apiErrorMessage(e)); }
  }

  return (
    <>
      <div className="admin-header">
        <h1>Culinary Routes</h1>
        <button className="btn btn-orange btn-sm" onClick={() => { setDraft(EMPTY); setShowForm(true); }}>+ Create route</button>
      </div>
      {flash && <div className="success-banner">{flash}</div>}
      {error && <div className="error-banner">{error}</div>}

      {showForm && (
        <div className="admin-form" style={{ marginBottom: '1.4rem' }}>
          <div className="form-field"><label>Code *</label>
            <input value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} placeholder="tour-toi-quan-4" disabled={!!draft.id} /></div>
          <div className="form-field"><label>Name *</label>
            <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></div>
          <div className="form-field full"><label>Description</label>
            <textarea value={draft.description || ''} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></div>
          <div className="form-field"><label>Duration</label>
            <input value={draft.estimated_duration || ''} onChange={(e) => setDraft({ ...draft, estimated_duration: e.target.value })} placeholder="3–4 giờ" /></div>
          <div className="form-field"><label>Distance</label>
            <input value={draft.distance || ''} onChange={(e) => setDraft({ ...draft, distance: e.target.value })} placeholder="≈ 2,5 km" /></div>
          <div className="form-field"><label>Difficulty</label>
            <select value={draft.difficulty} onChange={(e) => setDraft({ ...draft, difficulty: e.target.value })}>
              <option value="EASY">Easy</option><option value="MODERATE">Moderate</option><option value="HARD">Hard</option>
            </select></div>
          <div className="form-field"><label>Status</label>
            <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>
              <option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option><option value="ARCHIVED">Archived</option>
            </select></div>
          <div className="form-field" style={{ flexDirection: 'row', alignItems: 'flex-end', gap: '0.5rem' }}>
            <button className="btn btn-orange" onClick={save}>Save</button>
            <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gap: '1.2rem' }}>
        {routes.map((r) => (
          <div className="chart-box" key={r.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.6rem' }}>
              <div>
                <strong>🗺️ {r.name}</strong> <span className={`status-badge status-${r.status}`}>{r.status}</span>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-2)' }}>{r.estimated_duration} · {r.distance}</div>
              </div>
              <div style={{ display: 'flex', gap: '0.3rem' }}>
                <button className="btn btn-sm btn-ghost" onClick={() => { setDraft({ ...EMPTY, ...r }); setShowForm(true); }}>Edit</button>
                <button className="btn btn-sm btn-danger" onClick={() => remove(r.id)}>Del</button>
              </div>
            </div>
            <ol style={{ margin: '0.8rem 0 0.8rem 1.2rem', fontSize: '0.9rem' }}>
              {(r.stops || []).map((s) => (
                <li key={s.id} style={{ marginBottom: '0.3rem' }}>
                  {s.place_name || s.place_code}
                  <button className="btn btn-sm btn-ghost" style={{ marginLeft: '0.4rem' }} onClick={() => moveStop(r, s.id, -1)}>↑</button>
                  <button className="btn btn-sm btn-ghost" onClick={() => moveStop(r, s.id, 1)}>↓</button>
                  <button className="btn btn-sm btn-danger" onClick={() => removeStop(s.id)}>✕</button>
                </li>
              ))}
            </ol>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <select id={`stop-select-${r.id}`} className="lang-select" style={{ maxWidth: 320 }}>
                <option value="">— add a stop —</option>
                {places.filter((p) => !r.stops?.some((s) => s.place_id === p.id)).map((p) => (
                  <option key={p.id} value={p.id}>{p.translation?.name || p.code}</option>
                ))}
              </select>
              <button className="btn btn-sm btn-orange" onClick={() => addStop(r)}>+ Stop</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
