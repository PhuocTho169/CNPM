import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '../api/client';

const EMPTY = { code: '', name: '', native_name: '', bcl: '', voice_note: '', is_active: true };

export default function AdminLanguages() {
  const [rows, setRows] = useState([]);
  const [draft, setDraft] = useState(EMPTY);
  const [error, setError] = useState(null);
  const [flash, setFlash] = useState(null);

  function load() {
    api.get('/languages').then((res) => setRows(res.data.data || [])).catch((e) => setError(apiErrorMessage(e)));
  }
  useEffect(load, []);

  async function save() {
    setError(null);
    try {
      if (draft.id) await api.put(`/languages/${draft.id}`, draft);
      else await api.post('/languages', draft);
      setDraft(EMPTY); setFlash('Saved'); load();
    } catch (e) { setError(apiErrorMessage(e)); }
  }

  async function toggleActive(row) {
    try { await api.put(`/languages/${row.id}`, { is_active: !row.is_active }); load(); } catch (e) { setError(apiErrorMessage(e)); }
  }

  async function remove(id) {
    if (!window.confirm('Xoá ngôn ngữ này? Chỉ xoá được ngôn ngữ CHƯA có bản dịch nào (địa điểm / món ăn / route) — dữ liệu thống kê được giữ lại. Ngôn ngữ đã có nội dung sẽ bị chặn, chỉ tắt đi được.')) return;
    try {
      await api.delete(`/languages/${id}`);
      setFlash('Đã xoá');
      load();
    } catch (e) {
      // 409 từ server (ngôn ngữ đang có nội dung) hiện rõ dưới dạng thông báo,
      // không còn là lỗi 500 do khoá ngoại từ bảng thống kê.
      setError(apiErrorMessage(e));
    }
  }

  return (
    <>
      <div className="admin-header">
        <h1>Quản lý ngôn ngữ</h1>
        <span style={{ color: 'var(--text-2)', fontSize: '0.85rem' }}>Đăng ký ngôn ngữ mới mà không cần sửa code</span>
      </div>
      {flash && <div className="success-banner">{flash}</div>}
      {error && <div className="error-banner">{error}</div>}        <div className="admin-form" style={{ marginBottom: '1.4rem' }}>        <div className="form-field"><label>Mã (2 chữ cái) *</label>
          <input value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value.toLowerCase() })} placeholder="en" disabled={!!draft.id} /></div>
        <div className="form-field"><label>Tên *</label>
          <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="English" /></div>
        <div className="form-field"><label>Tên theo ngôn ngữ đó *</label>
          <input value={draft.native_name} onChange={(e) => setDraft({ ...draft, native_name: e.target.value })} placeholder="Tiếng Việt" /></div>
        <div className="form-field"><label>BCP-47 locale (voice + TTS)</label>
          <input value={draft.bcl} onChange={(e) => setDraft({ ...draft, bcl: e.target.value })} placeholder="vi-VN" />
          <div style={{ fontSize: '0.75rem', color: 'var(--text-2)', marginTop: 4 }}>VD: vi-VN, zh-CN, ko-KR, fr-FR… — để trống thì dùng thẳng mã ngôn ngữ</div></div>
        <div className="form-field"><label>Ghi chú voice / TTS</label>
          <input value={draft.voice_note} onChange={(e) => setDraft({ ...draft, voice_note: e.target.value })} placeholder="Edge: fr-FR-HenriNeural, Google: fr-FR-Neural2-A" />
          <div style={{ fontSize: '0.75rem', color: 'var(--text-2)', marginTop: 4 }}>Mỗi provider một mục, để trống thì tự lấy giọng mặc định</div></div>
          <div className="form-field" style={{ flexDirection: 'row', alignItems: 'flex-end', gap: '0.5rem' }}>
          <button className="btn btn-orange" onClick={save}>{draft.id ? 'Lưu' : 'Thêm'}</button>
          {draft.id && <button className="btn btn-ghost" onClick={() => setDraft(EMPTY)}>Hủy</button>}
          </div>
        </div>      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>Mã</th><th>Tên</th><th>Tên gốc</th><th>Trạng thái</th><th>BCP-47 locale (voice + TTS)</th><th>Ghi chú voice / TTS</th><th>Thao tác</th></tr></thead>
          <tbody>
            {            rows.map((l) => (
              <tr key={l.id}>
                <td><code>{l.code.toUpperCase()}</code></td>
                <td>{l.name}</td>
                <td>{l.native_name}</td>
                <td>{l.is_active ? '✅' : '⛔'}</td>
                <td>{l.bcl || '—'}</td>
                <td>{l.voice_note || '—'}</td>
                <td>
                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                    <button className="btn btn-sm btn-ghost" onClick={() => toggleActive(l)}>{l.is_active ? 'Tắt' : 'Bật'}</button>
                    <button className="btn btn-sm btn-ghost" onClick={() => setDraft(l)}>Sửa</button>
                    <button className="btn btn-sm btn-danger" onClick={() => remove(l.id)}>Xoá</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
