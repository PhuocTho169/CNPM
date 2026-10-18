import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, apiErrorMessage } from '../api/client';

export default function AdminDishes() {
  const [dishes, setDishes] = useState([]);
  const [q, setQ] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      const qs = new URLSearchParams({ limit: 50, lang: 'vi' });
      if (q) qs.set('q', q);
      api.get(`/dishes?${qs}`)
        .then((res) => setDishes(res.data.data || []))
        .catch((e) => setError(apiErrorMessage(e)))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [q]);

  return (
    <>
      <div className="admin-header">
        <h1>Dishes</h1>
        <input type="search" placeholder="Search dishes…" value={q} onChange={(e) => setQ(e.target.value)}
          style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '0.45rem 0.7rem' }} />
      </div>
      {error && <div className="error-banner">{error}</div>}
      {loading ? <div className="spinner" /> : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Dish</th><th>Place</th><th>Category</th><th>Price</th><th>Signature</th><th>Languages</th><th></th></tr></thead>
            <tbody>
              {dishes.map((d) => (
                <tr key={d.id}>
                  <td><strong>{d.name || d.code}</strong></td>
                  <td>{d.place_code ? <Link to={`/admin/places/${d.culinary_place_id}`}>{d.place_code}</Link> : '—'}</td>
                  <td>{d.category_name || '—'}</td>
                  <td>{d.price}</td>
                  <td>{d.is_signature ? '⭐' : ''}</td>
                  <td style={{ fontSize: '0.8rem' }}>{(d.language_codes || []).join(', ')}</td>
                  <td><Link className="btn btn-sm btn-ghost" to={`/admin/places/${d.culinary_place_id}`}>Edit</Link></td>
                </tr>
              ))}
              {dishes.length === 0 && <tr><td colSpan={7}><div className="empty-state">No dishes found.</div></td></tr>}
            </tbody>
          </table>
        </div>
      )}
      <p style={{ color: 'var(--text-2)', fontSize: '0.82rem', marginTop: '0.8rem' }}>
        Dishes are managed inside each place editor (Dishes tab) together with their translations and images.
      </p>
    </>
  );
}
