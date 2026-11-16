import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, apiErrorMessage } from '../api/client';

export default function AdminPlaces() {
  const navigate = useNavigate();
  const [places, setPlaces] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [flash, setFlash] = useState(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');

  const requestId = useRef(0);

  function load() {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    const qs = new URLSearchParams({ limit: 50, lang: 'vi' });
    if (q) qs.set('q', q);
    if (status) qs.set('status', status);
    if (category) qs.set('category', category);
    api.get(`/places?${qs}`)
      .then((res) => { if (id === requestId.current) setPlaces(res.data.data || []); })
      .catch((e) => { if (id === requestId.current) setError(apiErrorMessage(e)); })
      .finally(() => { if (id === requestId.current) setLoading(false); });
  }

  // Typing fired one request per keystroke and the responses could arrive out
  // of order, letting an old query overwrite the newest result. Debounce the
  // filter change and drop every response that is not the latest request.
  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [q, status, category]);
  useEffect(() => {
    api.get('/categories').then((res) => setCategories(res.data.data || [])).catch(() => {});
  }, []);

  async function updateStatus(id, newStatus) {
    try {
      await api.patch(`/places/${id}/status`, { status: newStatus });
      setFlash(`Status updated to ${newStatus}`);
      load();
    } catch (e) { setError(apiErrorMessage(e)); }
  }

  async function remove(id) {
    if (!window.confirm('Delete this culinary place permanently? All translations, dishes, images, audio and QR codes will be removed.')) return;
    try {
      await api.delete(`/places/${id}`);
      setFlash('Place deleted');
      load();
    } catch (e) { setError(apiErrorMessage(e)); }
  }

  async function generateQR(id) {
    try {
      await api.post(`/places/${id}/qr`);
      setFlash('QR code generated');
      load();
    } catch (e) { setError(apiErrorMessage(e)); }
  }

  useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(() => setFlash(null), 2500);
    return () => clearTimeout(timer);
  }, [flash]);

  return (
    <>
      <div className="admin-header">
        <h1>Culinary Places</h1>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input type="search" placeholder="Search name, dish, keyword…" value={q} onChange={(e) => setQ(e.target.value)} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '0.45rem 0.7rem' }} />
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="lang-select">
            <option value="">All statuses</option>
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
            <option value="ARCHIVED">Archived</option>
          </select>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="lang-select">
            <option value="">All categories</option>
            {categories.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
          <button className="btn btn-orange btn-sm" onClick={() => navigate('/admin/places/new')}>
            + Create place
          </button>
        </div>
      </div>

      {flash && <div className="success-banner">{flash}</div>}
      {error && <div className="error-banner">{error}</div>}
      {loading ? <div className="spinner" /> : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Image</th><th>Name</th><th>Category</th><th>Address</th><th>Status</th>
                <th>Languages</th><th>Audio</th><th>QR</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {places.map((p) => (
                <tr key={p.id}>
                  <td>
                    {p.primary_image ? <img className="table-thumb" src={p.primary_image} alt="" />
                      : <div className="table-thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{p.category?.icon || '🍽️'}</div>}
                  </td>
                  <td><strong>{p.translation?.name || p.code}</strong><br /><span style={{ color: 'var(--text-2)', fontSize: '0.78rem' }}>#{p.id} · {p.code}</span></td>
                  <td>{p.category?.name}</td>
                  <td style={{ maxWidth: 200, fontSize: '0.82rem', color: 'var(--text-2)' }}>{p.address}</td>
                  <td><span className={`status-badge status-${p.status}`}>{p.status}</span></td>
                  <td style={{ fontSize: '0.8rem' }}>{(p.language_codes || []).join(', ') || '—'}</td>
                  <td>{p.has_audio ? '🎧' : '—'}</td>
                  <td>{p.has_qr ? '🔳' : '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                      <Link className="btn btn-sm btn-ghost" to={`/place/${p.id}`} target="_blank">View</Link>
                      <button className="btn btn-sm btn-ghost" onClick={() => navigate(`/admin/places/${p.id}`)}>Edit</button>
                      {p.status !== 'PUBLISHED' && <button className="btn btn-sm btn-orange" onClick={() => updateStatus(p.id, 'PUBLISHED')}>Publish</button>}
                      {p.status === 'PUBLISHED' && <button className="btn btn-sm btn-ghost" onClick={() => updateStatus(p.id, 'ARCHIVED')}>Archive</button>}
                      <button className="btn btn-sm btn-ghost" onClick={() => generateQR(p.id)} title="Generate QR">{p.has_qr ? 'Re-QR' : 'QR'}</button>
                      <button className="btn btn-sm btn-danger" onClick={() => remove(p.id)}>Del</button>
                    </div>
                  </td>
                </tr>
              ))}
              {places.length === 0 && (
                <tr><td colSpan={9}><div className="empty-state">No places found. Create your first culinary place.</div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
