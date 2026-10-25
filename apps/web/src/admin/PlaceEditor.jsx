import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api, apiErrorMessage } from '../api/client';
import { placeNarration } from '../utils/narration';
import DishQrEditor from './DishQrEditor';

const TABS = [
  ['info', 'Thông tin cơ bản'],
  ['translations', 'Bản dịch & Thư viện giọng đọc'],
  ['dishes', 'Món ăn'],
  ['images', 'Hình ảnh'],
  ['qr', 'Mã QR'],
];

// Mirrors the hysteresis rule the mobile app applies: enter at zone_radius,
// leave at zone_radius + zone_exit_buffer. Shown live so an admin can see the
// real band while tuning, instead of guessing what the numbers mean.
function zoneBand(place) {
  const enter = Number(place?.zone_radius) > 0 ? Number(place.zone_radius) : 100;
  const buffer = Number.isFinite(Number(place?.zone_exit_buffer)) && place?.zone_exit_buffer !== ''
    ? Number(place.zone_exit_buffer)
    : 20;
  return { enterMeters: enter, exitMeters: enter + Math.max(buffer, 0) };
}

function blankToNull(value) {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

const EMPTY_PLACE = {
  code: '', category_id: '', address: '', latitude: '', longitude: '',
  phone: '', website: '', price_range: '', price_min: '', price_max: '',
  opening_time: '', closing_time: '', is_recommended: false, status: 'DRAFT',
  zone_radius: 100, zone_exit_buffer: 20,
};

// Every language the API returns is a valid column in this editor — no core
// list to extend when an admin registers a new one.
function languageLabel(code) {
  return String(code || '').toUpperCase();
}

export default function PlaceEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === 'new';
  const [tab, setTab] = useState('info');
  const [place, setPlace] = useState(isNew ? EMPTY_PLACE : null);
  const [languages, setLanguages] = useState([]);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState(null);
  const [flash, setFlash] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/languages').then((res) => setLanguages(res.data.data || [])).catch(() => {});
    api.get('/categories').then((res) => setCategories(res.data.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (isNew) return;
    setError(null);
    api.get(`/places/${id}`)
      .then((res) => setPlace({ ...EMPTY_PLACE, ...res.data.data }))
      .catch((e) => setError(apiErrorMessage(e)));
  }, [id, isNew]);

  function notify(msg) {
    setFlash(msg);
    setTimeout(() => setFlash(null), 2500);
  }

  async function saveBasic() {
    setBusy(true);
    setError(null);
    try {
      const payload = {
        ...place,
        category_id: place.category_id || null,
        latitude: place.latitude || null,
        longitude: place.longitude || null,
        price_min: place.price_min || null,
        price_max: place.price_max || null,
        // Send null (not 0 / '') when blank so an untouched field never
        // overwrites a radius a curator already tuned.
        zone_radius: blankToNull(place.zone_radius),
        zone_exit_buffer: blankToNull(place.zone_exit_buffer),
      };
      let saved;
      if (isNew) {
        const res = await api.post('/places', payload);
        saved = res.data.data;
        navigate(`/admin/places/${saved.id}`, { replace: true });
        notify('Địa điểm đã tạo — bây giờ thêm bản dịch');
      } else {
        const res = await api.put(`/places/${id}`, payload);
        saved = res.data.data;
        notify('Đã lưu');
      }
      setPlace((p) => ({ ...p, ...saved }));
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (error && !place) return <div className="error-banner">{error}</div>;
  if (!place) return <div className="spinner" />;

  const setField = (k, v) => setPlace((p) => ({ ...p, [k]: v }));

  return (
    <>
      <div className="admin-header">
        <div>
          <h1>{isNew ? 'Tạo địa điểm ẩm thực' : `Sửa: ${place.translation?.name || place.code}`}</h1>
          <span style={{ color: 'var(--text-2)', fontSize: '0.82rem' }}>
            #{place.id || '—'} · <span className={`status-badge status-${place.status}`}>{place.status}</span>
          </span>
        </div>
        <Link to="/admin/places" className="btn btn-sm btn-ghost">← Tất cả địa điểm</Link>
      </div>

      {flash && <div className="success-banner">{flash}</div>}
      {error && <div className="error-banner">{error}</div>}      <div className="admin-tabs" role="tablist">
        {TABS.map(([key, label]) => (
          <button key={key} role="tab" aria-selected={tab === key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'info' && (
        <>
          <div className="admin-form">
            <div className="form-field">
              <label>Mã địa điểm (duy nhất) *</label>
              <input value={place.code || ''} onChange={(e) => setField('code', e.target.value)} placeholder="vd: oc-oanh" />
            </div>
            <div className="form-field">
              <label>Danh mục</label>
              <select value={place.category_id || ''} onChange={(e) => setField('category_id', e.target.value)}>
                <option value="">— không rõ —</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
            <div className="form-field full">
              <label>Địa chỉ</label>
              <input value={place.address || ''} onChange={(e) => setField('address', e.target.value)} />
            </div>
            <div className="form-field">
              <label>Vĩ độ</label>
              <input value={place.latitude ?? ''} onChange={(e) => setField('latitude', e.target.value)} placeholder="10.7540" />
            </div>
            <div className="form-field">
              <label>Kinh độ</label>
              <input value={place.longitude ?? ''} onChange={(e) => setField('longitude', e.target.value)} placeholder="106.7060" />
            </div>
            <div className="form-field">
              <label>Điện thoại</label>
              <input value={place.phone || ''} onChange={(e) => setField('phone', e.target.value)} />
            </div>
            <div className="form-field">
              <label>Website</label>
              <input value={place.website || ''} onChange={(e) => setField('website', e.target.value)} />
            </div>
            <div className="form-field">
              <label>Giờ mở cửa</label>
              <input type="time" value={(place.opening_time || '').slice(0, 5)} onChange={(e) => setField('opening_time', e.target.value)} />
            </div>
            <div className="form-field">
              <label>Giờ đóng cửa</label>
              <input type="time" value={(place.closing_time || '').slice(0, 5)} onChange={(e) => setField('closing_time', e.target.value)} />
            </div>
            <div className="form-field">
              <label>Phân khúc giá (ghi chú)</label>
              <input value={place.price_range || ''} onChange={(e) => setField('price_range', e.target.value)} placeholder="50.000–200.000đ" />
            </div>
            <div className="form-field">
              <label>Giá thấp nhất (₫)</label>
              <input type="number" value={place.price_min ?? ''} onChange={(e) => setField('price_min', e.target.value)} />
            </div>
            <div className="form-field">
              <label>Giá cao nhất (₫)</label>
              <input type="number" value={place.price_max ?? ''} onChange={(e) => setField('price_max', e.target.value)} />
            </div>
            <div className="form-field">
              <label>Trạng thái</label>
              <select value={place.status || 'DRAFT'} onChange={(e) => setField('status', e.target.value)}>
                <option value="DRAFT">Bản nháp</option>
                <option value="PUBLISHED">Đã công khai</option>
                <option value="ARCHIVED">Đã ẩn (archive)</option>
              </select>
            </div>
            <div className="form-field">
              <label>Vùng phát âm thanh tự động — bán kính vào (m)</label>
              <input
                type="number" min={25} max={1000} step={5}
                value={place.zone_radius ?? ''}
                onChange={(e) => setField('zone_radius', e.target.value)}
                placeholder="100"
              />
              <span style={{ fontSize: '0.76rem', color: 'var(--text-2)' }}>
                Điện thoại khách sẽ tự động phát thuyết minh khi đi vào bán kính này.
              </span>
            </div>            <div className="form-field">
              <label>Bán kính thoát (m)</label>
              <input
                type="number" min={0} max={500} step={5}
                value={place.zone_exit_buffer ?? ''}
                onChange={(e) => setField('zone_exit_buffer', e.target.value)}
                placeholder="20"
              />
              <span style={{ fontSize: '0.76rem', color: 'var(--text-2)' }}>
                Âm thanh chỉ dừng lúc <strong>{zoneBand(place).exitMeters}m</strong> — vùng đệm tránh bị cắt do GPS dao động (vào lúc {' '}
                {zoneBand(place).enterMeters}m).
              </span>
            </div>
            <div className="form-field">
              <label>&nbsp;</label>
              <label style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                <input type="checkbox" checked={!!place.is_recommended} onChange={(e) => setField('is_recommended', e.target.checked)} />
                ⭐ Khuyến nghị
              </label>
            </div>
          </div>
          <button className="btn btn-orange" style={{ marginTop: '1.2rem' }} onClick={saveBasic} disabled={busy}>
            {busy ? 'Đang lưu…' : isNew ? 'Tạo địa điểm' : 'Lưu thông tin cơ bản'}
          </button>
        </>
      )}

      {tab === 'translations' && (place.id
        ? <TranslationsTab placeId={place.id} languages={languages} onNotify={notify} />
        : <div className="empty-state">Hãy tạo địa điểm trước (tab Thông tin cơ bản).</div>)}

      {tab === 'dishes' && (place.id
        ? <DishesTab placeId={place.id} languages={languages} categories={categories} onNotify={notify} />
        : <div className="empty-state">Hãy tạo địa điểm trước (tab Thông tin cơ bản).</div>)}

      {tab === 'images' && (place.id
        ? <ImagesTab placeId={place.id} onNotify={notify} />
        : <div className="empty-state">Hãy tạo địa điểm trước (tab Thông tin cơ bản).</div>)}

      {tab === 'qr' && (place.id
        ? <QrTab placeId={place.id} onNotify={notify} />
        : <div className="empty-state">Hãy tạo địa điểm trước (tab Thông tin cơ bản).</div>)}
    </>
  );
}

/* ---------------- Translations & Audio tab ---------------- */
function TranslationsTab({ placeId, languages, onNotify }) {
  const [rows, setRows] = useState([]); // translations from server
  const [drafts, setDrafts] = useState({}); // keyed by language_id
  const [activeLang, setActiveLang] = useState(languages[0]?.id);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  function load() {
    api.get(`/places/${placeId}/translations`)
      .then((res) => {
        const list = res.data.data || [];
        setRows(list);
        const next = {};
        for (const l of languages) {
          const found = list.find((r) => r.language_id === l.id);
          next[l.id] = found || { language_id: l.id, name: '', short_description: '', description: '', history: '', cultural_significance: '', tourist_tips: '', audio: null };
        }
        setDrafts(next);
        if (!activeLang && languages[0]) setActiveLang(languages[0].id);
      })
      .catch((e) => setError(apiErrorMessage(e)));
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [placeId, languages]);

  const draft = drafts[activeLang] || {};
  const setDraft = (k, v) => setDrafts((d) => ({ ...d, [activeLang]: { ...d[activeLang], [k]: v } }));

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const { audio, ...fields } = draft;
      await api.post(`/places/${placeId}/translations`, fields);
      onNotify(`Bản dịch đã lưu (${languages.find((l) => l.id === activeLang)?.native_name})`);
      load();
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function uploadAudio(file) {
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('audio', file);
      const translation = rows.find((r) => r.language_id === activeLang);
      if (!translation) throw new Error('Lưu bản dịch trước, sau đó tải file âm thanh lên.');
      await api.post(`/translations/${translation.id}/audio`, fd);
      onNotify('File âm thanh đã tải lên');
      load();
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function generateTTS() {
    setBusy(true);
    setError(null);
    try {
      const translation = rows.find((r) => r.language_id === activeLang);
      if (!translation) throw new Error('Lưu bản dịch trước, sau đó tạo giọng đọc.');
      const langCode = languages.find((l) => l.id === activeLang)?.code;
      // Same ~30s script every other entry point narrates (utils/narration) —
      // building it here again would regenerate a shorter clip than the guide.
      const text = placeNarration(draft, langCode);
      await api.post('/tts', { text, language_code: langCode, translation_id: translation.id });
      onNotify('Giọng đọc TTS đã tạo');
      load();
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  // Tạo giọng đọc cho MỌI ngôn ngữ đã có bản dịch trong một lần bấm
  async function generateAllTTS() {
    setBusy(true);
    setError(null);
    try {
      let done = 0;
      for (const l of languages) {
        const tr = rows.find((r) => r.language_id === l.id);
        if (!tr) continue;
        const text = placeNarration(tr, l.code);
        if (!text) continue;
        try {
          await api.post('/tts', { text, language_code: l.code, translation_id: tr.id });
          done += 1;
        } catch { /* ngôn ngữ lỗi thì bỏ qua, vẫn chạy tiếp các ngôn ngữ khác */ }
      }
      onNotify(done ? `Đã tạo giọng đọc cho ${done} ngôn ngữ` : 'Chưa có bản dịch nào để tạo giọng đọc');
      load();
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function deleteAudio(audioId) {
    if (!window.confirm('Xoá file thuyết minh này?')) return;
    try {
      await api.delete(`/audio/${audioId}`);
      onNotify('File âm thanh đã xoá');
      load();
    } catch (e) { setError(apiErrorMessage(e)); }
  }

  return (
    <>
      {error && <div className="error-banner">{error}</div>}
      <div className="lang-picker">
        {languages.map((l) => (
          <button key={l.id} className={`lang-pill ${l.id === activeLang ? 'active' : ''}`} onClick={() => setActiveLang(l.id)}>
            {l.native_name} {rows.some((r) => r.language_id === l.id) ? '✔' : '○'}{rows.find((r) => r.language_id === l.id)?.audio ? ' 🔊' : ''}
          </button>
        ))}
      </div>

      {languages.map((l) => l.id).includes(activeLang) && (
        <div className="admin-form" style={{ marginTop: '0.6rem' }}>
          <div className="form-field full">
            <label>Tên ({languages.find((l) => l.id === activeLang)?.native_name}) *</label>
            <input value={draft.name || ''} onChange={(e) => setDraft('name', e.target.value)} />
          </div>
          <div className="form-field full">
            <label>Mô tả ngắn</label>
            <textarea rows={2} value={draft.short_description || ''} onChange={(e) => setDraft('short_description', e.target.value)} />
          </div>
          <div className="form-field full">
            <label>Mô tả</label>
            <textarea rows={4} value={draft.description || ''} onChange={(e) => setDraft('description', e.target.value)} />
          </div>
          <div className="form-field full">
            <label>Lịch sử</label>
            <textarea rows={2} value={draft.history || ''} onChange={(e) => setDraft('history', e.target.value)} />
          </div>
          <div className="form-field full">
            <label>Ý nghĩa văn hóa</label>
            <textarea rows={2} value={draft.cultural_significance || ''} onChange={(e) => setDraft('cultural_significance', e.target.value)} />
          </div>
          <div className="form-field full">
            <label>Mẹo cho du khách (ngăn cách bằng " • ")</label>
            <textarea rows={2} value={draft.tourist_tips || ''} onChange={(e) => setDraft('tourist_tips', e.target.value)} />
          </div>
        </div>
      )}
      {draft.description && draft.description.length < 40 && (
        <div style={{ color: 'var(--text-2)', fontSize: '0.8rem', marginBottom: '0.4rem' }}>
          📝 Ghi chú: mô tả món ăn nên dài hơn {draft.description.length} ký tự — kiểm tra bản dịch đầy đủ trong mỗi ngôn ngữ.
        </div>
      )}
      <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1rem', flexWrap: 'wrap' }}>
        <button className="btn btn-orange" onClick={save} disabled={busy}>💾 Lưu bản dịch</button>
        {draft.audio ? (
          <>
            <audio controls src={draft.audio.file_url} style={{ height: 36 }} />
            <button className="btn btn-sm btn-danger" onClick={() => deleteAudio(draft.audio.id)}>🗑 Xoá file âm thanh</button>
          </>
        ) : (
          <>
            <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>
              🎤 Tải MP3/WAV/M4A lên
              <input type="file" accept=".mp3,.wav,.m4a,audio/mpeg,audio/wav,audio/x-m4a" hidden onChange={(e) => e.target.files?.[0] && uploadAudio(e.target.files[0])} />
            </label>
            <button className="btn btn-ghost btn-sm" onClick={generateTTS} disabled={busy}>🤖 Tạo giọng đọc</button>
            <button className="btn btn-orange btn-sm" onClick={generateAllTTS} disabled={busy}>
              🤖 Tạo giọng đọc tất cả ngôn ngữ
            </button>
          </>
        )}
      </div>
    </>
  );
}

/* ---------------- Dishes tab ---------------- */
function DishesTab({ placeId, languages, categories, onNotify }) {
  const [dishes, setDishes] = useState([]);
  const [editing, setEditing] = useState(null); // dish draft or 'new'
  const [qrDish, setQrDish] = useState(null); // dish whose QR editor is open
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  function load() {
    api.get(`/dishes?place_id=${placeId}&limit=50&lang=vi`)
      .then((res) => setDishes(res.data.data || []))
      .catch((e) => setError(apiErrorMessage(e)));
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [placeId]);

  async function saveDish() {
    setBusy(true);
    setError(null);
    try {
      const isNew = !editing.id;
      const payload = {
        code: editing.code, culinary_place_id: placeId, category_id: editing.category_id || null,
        price: editing.price, is_signature: !!editing.is_signature, status: editing.status || 'PUBLISHED',
      };
      let dishId = editing.id;
      if (isNew) {
        const res = await api.post('/dishes', { ...payload, code: editing.code || `dish-${Date.now()}` });
        dishId = res.data.data.id;
      } else {
        await api.put(`/dishes/${dishId}`, payload);
      }
      // Món ăn trong hệ thống dùng 4 ngôn ngữ cốt lõi (vi/en/zh/ko/ja);
      // chỉ gửi bản dịch khi tên đã có chữ — tránh gửi blank chiếm khoản cứu
      for (const l of languages) {
        const tr = (editing.translations || {})[l.id];
        if (tr && tr.name && tr.name.trim()) {
          await api.post(`/dishes/${dishId}/translations`, {
            language_id: l.id, name: tr.name, description: tr.description || '', ingredients: tr.ingredients || '',
          });
        }
      }
      if (editing._imageFile) {
        const fd = new FormData();
        fd.append('image', editing._imageFile);
        await api.post(`/dishes/${dishId}/image`, fd);
      }
      onNotify('Món ăn đã lưu');
      setEditing(null);
      load();
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function removeDish(dishId) {
    if (!window.confirm('Xoá món ăn này?')) return;
    try { await api.delete(`/dishes/${dishId}`); load(); } catch (e) { setError(apiErrorMessage(e)); }
  }

  return (
    <>
      {error && <div className="error-banner">{error}</div>}
      {!editing && (
        <button className="btn btn-orange btn-sm" style={{ marginBottom: '1rem' }}
          onClick={() => setEditing({ code: '', price: '', is_signature: false, translations: {} })}>
          + Thêm món ăn
        </button>
      )}

      {editing && (
        <div className="admin-form" style={{ marginBottom: '1.4rem' }}>
          <div className="form-field">
            <label>Mã món (duy nhất)</label>
            <input value={editing.code || ''} onChange={(e) => setEditing({ ...editing, code: e.target.value })} placeholder="vd: oc-huong" disabled={!!editing.id} />
          </div>
          <div className="form-field">
            <label>Danh mục</label>
            <select value={editing.category_id || ''} onChange={(e) => setEditing({ ...editing, category_id: e.target.value })}>
              <option value="">— không rõ —</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label>Giá</label>
            <input value={editing.price || ''} onChange={(e) => setEditing({ ...editing, price: e.target.value })} placeholder="80.000–150.000đ" />
          </div>
          <div className="form-field">
            <label>&nbsp;</label>
            <label style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              <input type="checkbox" checked={!!editing.is_signature} onChange={(e) => setEditing({ ...editing, is_signature: e.target.checked })} />
              ⭐ Món đặc trưng
            </label>
          </div>            <div className="form-field full">
              <label>Hình ảnh</label>
              <input type="file" accept="image/*" onChange={(e) => setEditing({ ...editing, _imageFile: e.target.files?.[0] })} />
            </div>
            {languages.map((l) => (
            <div className="form-field full" key={l.id}>
              <label>{l.native_name} — tên &amp; mô tả</label>
              <input placeholder={`Tên (${l.native_name})`} value={editing.translations?.[l.id]?.name || ''}
                onChange={(e) => setEditing({ ...editing, translations: { ...editing.translations, [l.id]: { ...editing.translations?.[l.id], name: e.target.value } } })} />
              <textarea rows={2} placeholder="Mô tả" value={editing.translations?.[l.id]?.description || ''}
                onChange={(e) => setEditing({ ...editing, translations: { ...editing.translations, [l.id]: { ...editing.translations?.[l.id], description: e.target.value } } })} />
              <input placeholder="Nguyên liệu" value={editing.translations?.[l.id]?.ingredients || ''}
                onChange={(e) => setEditing({ ...editing, translations: { ...editing.translations, [l.id]: { ...editing.translations?.[l.id], ingredients: e.target.value } } })} />
            </div>
          ))}
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button className="btn btn-orange" onClick={saveDish} disabled={busy}>{busy ? 'Đang lưu…' : '💾 Lưu món ăn'}</button>
            <button className="btn btn-ghost" onClick={() => setEditing(null)}>Hủy</button>
          </div>
        </div>
      )}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>Món ăn</th><th>Giá</th><th>Đặc trưng</th><th>Ngôn ngữ</th><th>Thao tác</th></tr></thead>
          <tbody>
            {dishes.map((d) => (
              <tr key={d.id}>
                <td><strong>{d.name || d.code}</strong><br /><span style={{ fontSize: '0.78rem', color: 'var(--text-2)' }}>{d.code}</span></td>
                <td>{d.price}</td>
                <td>{d.is_signature ? '⭐' : ''}</td>
                <td style={{ fontSize: '0.8rem' }}>{(d.language_codes || []).map(languageLabel).join(', ') || '—'}</td>
                <td>
                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                    <button
                      className={`btn btn-sm ${qrDish?.id === d.id ? 'btn-orange' : 'btn-ghost'}`}
                      onClick={() => setQrDish(qrDish?.id === d.id ? null : d)}
                      title={d.has_qr ? 'Chỉnh sửa mã QR' : 'Tạo mã QR'}
                    >
                      {d.has_qr ? '🔳 Sửa QR' : '🔳 Tạo QR'}
                    </button>
                    <button className="btn btn-sm btn-ghost"
                onClick={() => setEditing({ ...d, translations: {} })}>Sửa</button>
                    <button className="btn btn-sm btn-danger" onClick={() => removeDish(d.id)}>Xoá</button>
                  </div>
                </td>
              </tr>
            ))}
            {dishes.length === 0 && <tr><td colSpan={5}><div className="empty-state">Chưa có món ăn nào.</div></td></tr>}
          </tbody>
        </table>
      </div>

      {/* QR editor giống tab "Mã QR" của chính editor này */}
      {qrDish && (
        <div style={{ marginTop: '1.2rem', padding: '1rem', backgroundColor: '#faf6f1', border: '1px solid var(--border)', borderRadius: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap', marginBottom: '0.6rem' }}>
            <h3 style={{ fontSize: '1.05rem' }}>🔳 Mã QR — {qrDish.name || qrDish.code}</h3>
            <button className="btn btn-sm btn-ghost" onClick={() => setQrDish(null)}>Đóng</button>
          </div>
          <DishQrEditor dish={qrDish} onNotify={onNotify} onRefresh={load} />
        </div>
      )}
    </>
  );
}

/* ---------------- Images tab ---------------- */
function ImagesTab({ placeId, onNotify }) {
  const [images, setImages] = useState([]);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  function load() {
    api.get(`/places/${placeId}`).then((res) => setImages(res.data.data?.images || [])).catch((e) => setError(apiErrorMessage(e)));
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [placeId]);

  async function upload(file) {
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('image', file);
      await api.post(`/places/${placeId}/images`, fd);
      onNotify('Hình ảnh đã tải lên');
      load();
    } catch (e) { setError(apiErrorMessage(e)); } finally { setBusy(false); }
  }

  async function setPrimary(imageId) {
    try { await api.put(`/places/${placeId}/images/${imageId}`, { is_primary: true }); load(); onNotify('Ảnh chính đã cập nhật'); }
    catch (e) { setError(apiErrorMessage(e)); }
  }

  async function reorder(imageId, dir) {
    const idx = images.findIndex((i) => i.id === imageId);
    const target = images[idx + dir];
    if (!target) return;
    try {
      await api.put(`/places/${placeId}/images/${imageId}`, { sort_order: target.sort_order ?? idx + dir });
      await api.put(`/places/${placeId}/images/${target.id}`, { sort_order: idx });
      load();
    } catch (e) { setError(apiErrorMessage(e)); }
  }

  async function remove(imageId) {
    if (!window.confirm('Xoá ảnh này?')) return;
    try { await api.delete(`/places/${placeId}/images/${imageId}`); load(); } catch (e) { setError(apiErrorMessage(e)); }
  }

  return (
    <>
      {error && <div className="error-banner">{error}</div>}
      <label className="btn btn-orange btn-sm" style={{ cursor: 'pointer', marginBottom: '1rem' }}>
        📤 Tải ảnh lên (JPG/PNG/WebP, tối đa 10MB)
        <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      </label>
      {busy && <div className="spinner" />}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.9rem' }}>
        {images.map((img, i) => (
          <div className="card" key={img.id} style={{ padding: '0.6rem' }}>
            <img src={img.image_url} alt={img.alt_text || ''} style={{ borderRadius: 8, aspectRatio: '4/3', objectFit: 'cover' }} />
            {img.is_primary && <span className="chip chip-teal" style={{ marginTop: '0.4rem' }}>⭐ Ảnh chính</span>}
            <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
              {!img.is_primary && <button className="btn btn-sm btn-ghost" onClick={() => setPrimary(img.id)}>Tạo ảnh chính</button>}
              <button className="btn btn-sm btn-ghost" onClick={() => reorder(img.id, -1)} disabled={i === 0}>↑</button>
              <button className="btn btn-sm btn-ghost" onClick={() => reorder(img.id, 1)} disabled={i === images.length - 1}>↓</button>
              <button className="btn btn-sm btn-danger" onClick={() => remove(img.id)}>🗑</button>
            </div>
          </div>
        ))}
        {images.length === 0 && !busy && <div className="empty-state">Chưa có ảnh nào. Hãy tải ảnh đầu tiên lên.</div>}
      </div>
    </>
  );
}

/* ---------------- QR tab ---------------- */
function isLocalhostUrl(value) {
  try {
    const host = new URL(value).hostname;
    return ['localhost', '127.0.0.1', '0.0.0.0'].includes(host);
  } catch {
    return false;
  }
}

function QrTab({ placeId, onNotify }) {
  const [qr, setQr] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [baseUrl, setBaseUrl] = useState('');

  function load() {
    api.get(`/places/${placeId}/qr`).then((res) => setQr(res.data.data)).catch(() => {});
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [placeId]);

  async function generate(regenerate) {
    setBusy(true);
    setError(null);
    try {
      const payload = baseUrl.trim()
        ? { base_url: baseUrl.trim() }
        : { origin_hint: window.location.origin };
      const res = await api.post(`/places/${placeId}/qr${regenerate ? '/regenerate' : ''}`, payload);
      setQr(res.data.data);
      onNotify(regenerate ? 'Mã QR đã tạo lại' : 'Mã QR đã tạo');
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
          <p>Chưa có mã QR nào.</p>
          <button className="btn btn-orange" onClick={() => generate(false)} disabled={busy}>🔳 Tạo mã QR</button>
        </div>
      )}
      <p style={{ color: 'var(--text-2)', fontSize: '0.84rem', marginTop: '1rem', maxWidth: 560 }}>
        QR trỏ tới trang hướng dẫn công khai. Server tự chọn địa chỉ theo cách bạn đang truy cập dashboard;
        nếu vẫn sai, hãy đặt <code>PUBLIC_BASE_URL</code> trong <code>server/.env</code> thành địa chỉ thật
        (domain hoặc IP LAN) rồi tạo lại QR. Sau khi quét thử thành công, tải PNG để in dán tại địa điểm.
      </p>
    </>
  );
}
