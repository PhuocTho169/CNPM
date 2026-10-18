import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api, apiErrorMessage } from '../api/client';

const EMPTY = { email: '', password: '', full_name: '', role: 'STAFF' };

export default function AdminUsers() {
  const { user: me } = useOutletContext();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [draft, setDraft] = useState(EMPTY);
  const [error, setError] = useState(null);
  const [flash, setFlash] = useState(null);

  function load() {
    api.get('/users').then((res) => setUsers(res.data.data || [])).catch((e) => setError(apiErrorMessage(e)));
    api.get('/roles').then((res) => setRoles(res.data.data || [])).catch(() => {});
  }
  useEffect(load, []);

  function notify(msg) { setFlash(msg); setTimeout(() => setFlash(null), 2200); }

  async function createUser() {
    setError(null);
    try {
      await api.post('/users', draft);
      setDraft(EMPTY);
      notify('User created');
      load();
    } catch (e) { setError(apiErrorMessage(e)); }
  }

  async function toggleActive(u) {
    try { await api.put(`/users/${u.id}`, { is_active: !u.is_active }); load(); } catch (e) { setError(apiErrorMessage(e)); }
  }

  async function resetPassword(u) {
    const pw = window.prompt(`New password for ${u.email} (min 8 chars):`);
    if (!pw) return;
    try { await api.put(`/users/${u.id}/password`, { password: pw }); notify('Password updated'); } catch (e) { setError(apiErrorMessage(e)); }
  }

  async function remove(u) {
    if (!window.confirm(`Delete user ${u.email}?`)) return;
    try { await api.delete(`/users/${u.id}`); load(); } catch (e) { setError(apiErrorMessage(e)); }
  }

  return (
    <>
      <div className="admin-header"><h1>Users &amp; Roles</h1></div>
      {flash && <div className="success-banner">{flash}</div>}
      {error && <div className="error-banner">{error}</div>}

      <div className="admin-form" style={{ marginBottom: '1.4rem' }}>
        <div className="form-field"><label>Email *</label>
          <input type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /></div>
        <div className="form-field"><label>Password *</label>
          <input type="password" value={draft.password} onChange={(e) => setDraft({ ...draft, password: e.target.value })} /></div>
        <div className="form-field"><label>Full name</label>
          <input value={draft.full_name} onChange={(e) => setDraft({ ...draft, full_name: e.target.value })} /></div>
        <div className="form-field"><label>Role</label>
          <select value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })}>
            {roles.map((r) => <option key={r.id} value={r.code}>{r.name}</option>)}
          </select></div>
        <div className="form-field" style={{ justifyContent: 'flex-end' }}>
          <button className="btn btn-orange" onClick={createUser}>+ Add user</button>
        </div>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>Email</th><th>Name</th><th>Role</th><th>Active</th><th>Last login</th><th>Actions</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.email}</td>
                <td>{u.full_name}</td>
                <td><span className="chip">{u.role}</span></td>
                <td>{u.is_active ? '✅' : '⛔'}</td>
                <td style={{ fontSize: '0.8rem' }}>{u.last_login_at ? new Date(u.last_login_at).toLocaleString() : '—'}</td>
                <td>
                  <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                    <button className="btn btn-sm btn-ghost" onClick={() => toggleActive(u)}>{u.is_active ? 'Disable' : 'Enable'}</button>
                    <button className="btn btn-sm btn-ghost" onClick={() => resetPassword(u)}>Password</button>
                    {u.id !== me?.id && <button className="btn btn-sm btn-danger" onClick={() => remove(u)}>Del</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 style={{ margin: '1.6rem 0 0.8rem' }}>Role permissions</h3>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>Role</th><th>Permissions</th></tr></thead>
          <tbody>
            {roles.map((r) => (
              <tr key={r.id}>
                <td><strong>{r.code}</strong> — {r.name}</td>
                <td style={{ fontSize: '0.8rem' }}>{(r.permissions || []).join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
