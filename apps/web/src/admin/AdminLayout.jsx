import { NavLink, Outlet, Navigate, useNavigate } from 'react-router-dom';
import { useAdmin, tokenStore } from './adminApi';
import { useApp } from '../context/AppContext';

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: '📊', end: true },
  { to: '/admin/places', label: 'Culinary Places', icon: '🍜' },
  { to: '/admin/dishes', label: 'Dishes', icon: '🥢' },
  { to: '/admin/categories', label: 'Categories', icon: '🏷️' },
  { to: '/admin/routes', label: 'Culinary Routes', icon: '🗺️' },
  { to: '/admin/languages', label: 'Languages', icon: '🌐' },
  { to: '/admin/users', label: 'Users & Roles', icon: '👥' },
  { to: '/admin/settings', label: 'Settings', icon: '⚙️' },
];

export default function AdminLayout() {
  const { user, checked } = useAdmin();
  const { logout: logoutPublic } = useApp();
  const navigate = useNavigate();

  if (!checked) return <div className="spinner" />;
  if (!user) return <Navigate to="/admin/login" replace />;

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="brand">🍜 D4 Admin</div>
        {NAV.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end}>
            <span>{item.icon}</span> {item.label}
          </NavLink>
        ))}
        <div style={{ marginTop: 'auto', padding: '0.8rem', fontSize: '0.8rem' }}>
          <div style={{ fontWeight: 700, color: '#fff' }}>{user.full_name || user.email}</div>
          <div style={{ color: '#ffb27a' }}>{user.role}</div>
          <button
            className="btn btn-sm btn-ghost"
            style={{ marginTop: '0.6rem', color: '#fff', borderColor: 'rgba(255,255,255,0.4)' }}
            onClick={() => { tokenStore.clear(); logoutPublic(); navigate('/admin/login'); }}
          >
            Logout
          </button>
          <NavLink to="/" style={{ display: 'block', marginTop: '0.4rem', fontSize: '0.78rem' }}>
            ← Public site
          </NavLink>
        </div>
      </aside>
      <main className="admin-main">
        <Outlet context={{ user }} />
      </main>
    </div>
  );
}
