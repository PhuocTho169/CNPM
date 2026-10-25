import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, apiErrorMessage } from '../api/client';
import DishQrEditor from './DishQrEditor';

export default function AdminDishes() {
  const [dishes, setDishes] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState(null);
  // Dish whose QR editor (same UI as the place editor's "Mã QR" tab) is open.
  const [qrDishId, setQrDishId] = useState(null);

  function notify(msg) {
    setFlash(msg);
    setTimeout(() => setFlash(null), 2500);
  }

  const loadDishes = () => {
    const qs = new URLSearchParams({ limit: 50, lang: 'vi' });
    return api.get(`/dishes?${qs}`).then((res) => setDishes(res.data.data || []));
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      loadDishes()
        .catch((e) => setError(apiErrorMessage(e)))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const qrDish = dishes.find((d) => d.id === qrDishId) || null;

  return (
    <>
      <div className="admin-header">
        <h1>Dishes</h1>
      </div>
      {flash && <div className="success-banner">{flash}</div>}
      {error && <div className="error-banner">{error}</div>}
      {loading ? <div className="spinner" /> : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Dish</th><th>Place</th><th>Category</th><th>Price</th>
                <th>Signature</th><th>Languages</th><th>QR</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {dishes.map((d) => (
                <tr key={d.id}>
                  <td><strong>{d.name || d.code}</strong></td>
                  <td>{d.place_code ? <Link to={`/admin/places/${d.culinary_place_id}`}>{d.place_code}</Link> : '—'}</td>
                  <td>{d.category_name || '—'}</td>
                  <td>{d.price}</td>
                  <td>{d.is_signature ? '⭐' : ''}</td>
                  <td style={{ fontSize: '0.8rem' }}>{(d.language_codes || []).join(', ') || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                      {d.has_qr && d.qr_image_url && (
                        <a className="btn btn-ghost btn-sm" href={d.qr_image_url} download title="Tải mã QR">⬇</a>
                      )}
                      <button
                        className={`btn btn-sm ${qrDishId === d.id ? 'btn-orange' : 'btn-ghost'}`}
                        onClick={() => setQrDishId(qrDishId === d.id ? null : d.id)}
                        title={d.has_qr ? 'Chỉnh sửa mã QR' : 'Tạo mã QR'}
                      >
                        {d.has_qr ? '🔳 Sửa QR' : '🔳 Tạo QR'}
                      </button>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                      <Link className="btn btn-sm btn-ghost" to={`/admin/places/${d.culinary_place_id}`}>Edit</Link>
                    </div>
                  </td>
                </tr>
              ))}
              {dishes.length === 0 && <tr><td colSpan={8}><div className="empty-state">No dishes found.</div></td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* QR editor mirroring the Culinary Places editor's "Mã QR" tab */}
      {qrDish && (
        <div className="admin-table-wrap" style={{ marginTop: '1.2rem' }}>
          <div className="admin-header" style={{ marginBottom: '0.8rem' }}>
            <div>
              <h2 style={{ fontSize: '1.1rem' }}>🔳 Mã QR — {qrDish.name || qrDish.code}</h2>
              <span style={{ color: 'var(--text-2)', fontSize: '0.8rem' }}>
                #{qrDish.id} · {qrDish.code} · QR trỏ tới trang hướng dẫn món ăn công khai
              </span>
            </div>
            <button className="btn btn-sm btn-ghost" onClick={() => setQrDishId(null)}>← Tất cả món ăn</button>
          </div>
          <DishQrEditor
            dish={qrDish}
            onNotify={notify}
            onRefresh={loadDishes}
          />
        </div>
      )}
    </>
  );
}


