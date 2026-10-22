import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, apiErrorMessage } from '../api/client';

export default function AdminDishes() {
  const [dishes, setDishes] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qrBusy, setQrBusy] = useState(null);

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

  const regenerateDishQR = async (id) => {
    setError(null);
    setQrBusy(id);
    try {
      await api.post(`/dishes/${id}/qr/regenerate`);
      await loadDishes();
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setQrBusy(null);
    }
  };

  return (
    <>
      <div className="admin-header">
        <h1>Dishes</h1>
      </div>
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
                    {d.has_qr ? (
                      <>
                        <a className="btn btn-ghost btn-sm" href={d.qr_value} target="_blank" rel="noreferrer" title="Mở trang hướng dẫn">🔳 Xem</a>
                        <a className="btn btn-ghost btn-sm" href={d.qr_image_url} download title="Tải mã QR">⬇ QR</a>
                        <button className="btn btn-ghost btn-sm" onClick={() => regenerateDishQR(d.id)} disabled={qrBusy === d.id} title="Tạo lại QR với địa chỉ hiện tại">
                          {qrBusy === d.id ? '…' : '🔄'}
                        </button>
                      </>
                    ) : (
                      <button className="btn btn-sm btn-ghost" onClick={() => regenerateDishQR(d.id)} disabled={qrBusy === d.id} title="Tạo mã QR">
                        {qrBusy === d.id ? '…' : 'QR'}
                      </button>
                    )}
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
          {dishes.length > 0 && <DishQRDetail dishes={dishes} />}
        </div>
      )}
      <p style={{ color: 'var(--text-2)', fontSize: '0.82rem', marginTop: '0.8rem' }}>
        QR codes point at the public dish guide page. Server picks the right address.
      </p>
    </>
  );
}

/* ---------------- Dish QR detail (inline) ---------------- */

function DishQRDetail({ dishes }) {
  const localhostWarning = dishes.some((d) => d.qr_value && isLocalhostUrl(d.qr_value));

  return (
    <div style={{ marginTop: '1rem', padding: '0.8rem 1rem', backgroundColor: '#faf6f1', border: '1px solid var(--border)', borderRadius: 10, maxWidth: 900 }}>
      <div style={{ fontSize: '0.82rem', color: 'var(--text-2)', marginBottom: '0.6rem' }}>
        <strong>QR danh mục món:</strong> &nbsp;
        <span style={{ color: 'var(--text-2)' }}>
          Mỗi món ăn có mã QR riêng → quét bằng máy ảnh để mở nhanh hướng dẫn.
        </span>
      </div>

      {localhostWarning && (
        <div className="error-banner" style={{ marginBottom: '0.6rem' }}>
          ⚠️ Một số QR đang trỏ tới <strong>localhost</strong> — điện thoại quét sẽ không mở được.
          Hãy đảm bảo <code style={{ fontSize: '0.75rem' }}>PUBLIC_BASE_URL</code> trong <code>server/.env</code> là IP LAN/domain thật.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.8rem' }}>
        {dishes.map((d) => (
          <div key={d.id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '0.7rem', backgroundColor: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{d.name || d.code} <span style={{ color: 'var(--text-2)', fontSize: '0.72rem' }}>#{d.id}</span></div>
                {d.qr_value ? (
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-2)', wordBreak: 'break-all', marginTop: 2 }}>
                    <a href={d.qr_value} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)' }}>{d.qr_value} ↗</a>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-2)', marginTop: 2 }}>Chưa có QR</div>
                )}
              </div>
              {d.has_qr && d.qr_image_url && (
                <a className="btn btn-ghost btn-sm" href={d.qr_image_url} download title="Tải mã QR">⬇ QR</a>
              )}
            </div>
          </div>
        ))}
        {dishes.length === 0 && <div className="empty-state" style={{ gridColumn: '1 / -1' }}>No dishes yet</div>}
      </div>
    </div>
  );
}

function isLocalhostUrl(value) {
  try {
    const host = new URL(value).hostname;
    return ['localhost', '127.0.0.1', '0.0.0.0'].includes(host);
  } catch {
    return false;
  }
}
