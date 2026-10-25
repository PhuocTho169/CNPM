import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '../api/client';

// Shared dish QR editor — same UX as the place editor's "Mã QR" tab
// (PlaceEditor.QrTab), reused on the Dishes page and inside the place editor's
// "Món ăn" tab. Endpoints: GET/POST /dishes/:id/qr(/regenerate).
export default function DishQrEditor({ dish, onNotify, onRefresh, onClose }) {
  const [qr, setQr] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [baseUrl, setBaseUrl] = useState('');

  function load() {
    api.get(`/dishes/${dish.id}/qr`).then((res) => setQr(res.data.data)).catch(() => {});
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [dish.id]);

  async function generate(regenerate) {
    setBusy(true);
    setError(null);
    try {
      const payload = baseUrl.trim()
        ? { base_url: baseUrl.trim() }
        : { origin_hint: window.location.origin };
      const res = await api.post(`/dishes/${dish.id}/qr${regenerate ? '/regenerate' : ''}`, payload);
      setQr(res.data.data);
      onNotify(regenerate ? 'Mã QR đã tạo lại' : 'Mã QR đã tạo');
      onRefresh();
    } catch (e) { setError(apiErrorMessage(e)); } finally { setBusy(false); }
  }

  const localhostWarning = qr && isLocalhostUrl(qr.qr_value);

  return (
    <>
      {error && <div className="error-banner">{error}</div>}
      {localhostWarning && (
        <div className="error-banner" style={{ maxWidth: 560 }}>
          ⚠️ QR này đang trỏ tới <strong>localhost</strong> — điện thoại quét sẽ không mở được.
          Thay <code>localhost</code> bằng IP LAN của máy (Windows: gõ <code>ipconfig</code>, VD <code>http://192.168.1.5:5173</code>),
          hoặc bấm <strong>📍 Dùng trang này</strong> nếu bạn đang mở dashboard qua IP LAN. Sau đó tạo lại QR.
          Nếu điện thoại vẫn không mở được, kiểm tra firewall máy tính đã cho phép port đó (5173/8080).
        </div>
      )}

      {qr ? (
        <div className="admin-form" style={{ maxWidth: 480 }}>
          <div className="form-field full" style={{ alignItems: 'center' }}>
            <img src={qr.image_url} alt="QR code" style={{ width: 260, height: 260, border: '1px solid var(--border)', borderRadius: 12 }} />
            <code style={{ fontSize: '0.8rem', marginTop: '0.6rem', wordBreak: 'break-all' }}>{qr.qr_value}</code>
          </div>
          <div className="form-field full">
            <label>Base URL tuỳ chỉnh (dùng khi QR trỏ sai địa chỉ)</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <input
                style={{ flex: 1, minWidth: 220 }}
                placeholder="http://192.168.1.5:5173"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
              />
              <button className="btn btn-ghost btn-sm" type="button" onClick={() => setBaseUrl(window.location.origin)}>
                📍 Dùng trang này
              </button>
              <button className="btn btn-orange btn-sm" onClick={() => generate(true)} disabled={busy}>
                🔄 Tạo lại mã QR với URL này
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <a className="btn btn-ghost btn-sm" href={qr.image_url} download>⬇ Tải QR</a>
            <a className="btn btn-ghost btn-sm" href={qr.qr_value} target="_blank" rel="noreferrer">🔗 Kiểm tra QR</a>
            <button className="btn btn-ghost btn-sm" onClick={() => generate(true)} disabled={busy}>🔄 Tạo lại</button>
          </div>
        </div>
      ) : (
        <div className="empty-state">
          <p>Món ăn này chưa có mã QR nào.</p>
          <button className="btn btn-orange" onClick={() => generate(false)} disabled={busy}>🔳 Tạo mã QR</button>
        </div>
      )}

      <p style={{ color: 'var(--text-2)', fontSize: '0.84rem', marginTop: '1rem', maxWidth: 560 }}>
        QR trỏ tới trang hướng dẫn công khai của món ăn. Server tự chọn địa chỉ theo cách bạn đang truy cập dashboard;
        nếu vẫn sai, hãy đặt <code>PUBLIC_BASE_URL</code> trong <code>server/.env</code> thành địa chỉ thật
        (domain hoặc IP LAN) rồi tạo lại QR. Sau khi quét thử thành công, tải PNG để in dán tại quán.
      </p>
    </>
  );
}

export function isLocalhostUrl(value) {
  try {
    const host = new URL(value).hostname;
    return ['localhost', '127.0.0.1', '0.0.0.0'].includes(host);
  } catch {
    return false;
  }
}
