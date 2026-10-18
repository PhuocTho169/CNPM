import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '../api/client';

const EMPTY = { code: '', name: '', applies_to: 'both', icon: '' };

export default function AdminCategories() {
  const [rows, setRows] = useState([]);
  const [draft, setDraft] = useState(EMPTY);
  const [error, setError] = useState(null);
  const [flash, setFlash] = useState(null);

  function load() {
    api.get('/categories').then((res) => setRows(res.data.data || [])).catch((e) => setError(apiErrorMessage(e)));
  }
  useEffect(load, []);

  async function save() {
    setError(null);
    try {
      if (draft.id) await api.put(`/categories/${draft.id}`, draft);
      else await api.post('/categories', draft);
      setDraft(EMPTY);
      setFlash('Saved');
      load();
    } catch (e) { setError(apiErrorMessage(e)); }
  }

  async function remove(id) {
    if (!window.confirm('Delete this category?')) return;
    try { await api.delete(`/categories/${id}`); load(); } catch (e) { setError(apiErrorMessage(e)); }
  }

  return (
    <>
      <div className="admin-header"><h1>Categories</h1></div>
      {flash && <div className="success-banner">{flash}</div>}
      {error && <div className="error-banner">{error}</div>}

      <div className="admin-form" style={{ marginBottom: '1.4rem' }}>
        <div className="form-field"><label>Code *</label>
          <input value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} placeholder="street-food" disabled={!!draft.id} /></div>
        <div className="form-field"><label>Name *</label>
          <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Street Food" /></div>
        <div className="form-field"><label>Applies to</label>
          <select value={draft.applies_to} onChange={(e) => setDraft({ ...draft, applies_to: e.target.value })}>
            <option value="place">Place</option><option value="dish">Dish</option><option value="both">Both</option>
          </select></div>
        <div className="form-field"><label>Icon (emoji)</label>
          <input value={draft.icon || ''} onChange={(e) => setDraft({ ...draft, icon: e.target.value })} placeholder="🥢" /></div>
        <div className="form-field" style={{ justifyContent: 'flex-end', flexDirection: 'row', gap: '0.5rem', alignItems: 'center' }}>
          <button className="btn btn-orange" onClick={save}>{draft.id ? 'Save' : 'Add'}</button>
          {draft.id && <button className="btn btn-ghost" onClick={() => setDraft(EMPTY)}>Cancel</button>}
        </div>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>Icon</th><th>Code</th><th>Name</th><th>Applies to</th><th>Actions</th></tr></thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <td style={{ fontSize: '1.2rem' }}>{c.icon}</td>
                <td><code>{c.code}</code></td>
                <td>{c.name}</td>
                <td>{c.applies_to}</td>
                <td>
                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                    <button className="btn btn-sm btn-ghost" onClick={() => setDraft(c)}>Edit</button>
                    <button className="btn btn-sm btn-danger" onClick={() => remove(c.id)}>Del</button>
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
