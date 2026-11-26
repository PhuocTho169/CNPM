import { useEffect } from 'react';
import { NavLink, Outlet, Navigate, useNavigate, useOutletContext } from 'react-router-dom';
import { useAdmin, tokenStore } from './adminApi';
import { useApp } from '../context/AppContext';

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: '📊', end: true },
  { to: '/admin/places', label: 'Culinary Places', icon: '🍜' },
  { to: '/admin/dishes', label: 'Dishes', icon: '🥢' },
  { to: '/admin/categories', label: 'Categories', icon: '🏷️' },
  { to: '/admin/routes', label: 'Culinary Routes', icon: '🗺️' },
  // These two call ADMIN-only APIs (/languages write, /users), so STAFF must
  // not see them: the link would only land on a 403.
  { to: '/admin/languages', label: 'Languages', icon: '🌐', roles: ['ADMIN'] },
  { to: '/admin/users', label: 'Users & Roles', icon: '👥', roles: ['ADMIN'] },
  { to: '/admin/settings', label: 'Settings', icon: '⚙️' },
];

// Route guard for pages backed by ADMIN-only endpoints. It reads the user from
// the layout's Outlet context, so it does not refetch /auth/me.
export function AdminOnly({ children }) {
  const { user } = useOutletContext();
  if (user?.role !== 'ADMIN') return <Navigate to="/admin" replace />;
  return children;
}

export default function AdminLayout() {
  const { user, checked } = useAdmin();
  const { logout: logoutPublic } = useApp();
  const navigate = useNavigate();

  // Opening /admin with a visitor token must not keep a signed-in shell around.
  useEffect(() => {
    if (checked && user && user.role !== 'ADMIN' && user.role !== 'STAFF') {
      tokenStore.clear();
      logoutPublic();
    }
  }, [checked, user, logoutPublic]);

  if (!checked) return <div className="spinner" />;
  if (!user) return <Navigate to="/admin/login" replace />;

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="brand">🍜 D4 Admin</div>
        {NAV.filter((item) => !item.roles || item.roles.includes(user.role)).map((item) => (
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