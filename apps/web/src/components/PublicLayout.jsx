import { NavLink, Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api, getSessionId } from '../api/client';
import { pingVisit } from '../utils/onlineTracker';

export default function PublicLayout() {
  const { t, user, logout, guestSession } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  // "Visitors online" tracking: one ping when a public page opens, then a
  // heartbeat every 2 minutes (shorter than the dashboard's 5-minute window,
  // and suppressed while the tab is hidden) so idling visitors still count.
  useEffect(() => {
    pingVisit(location.pathname);
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') pingVisit(location.pathname);
    }, 120000);
    return () => clearInterval(timer);
  }, [location.pathname]);


  return (
    <>
      <nav className="navbar">
        <div className="container navbar-inner">
          <Link to="/" className="brand">
            <span aria-hidden="true">🍜</span>
            <span className="brand-text">District 4 Food Guide</span>
          </Link>
          <ul className="nav-links">
            <li><NavLink to="/" end>{t('home')}</NavLink></li>
            <li><NavLink to="/explore">{t('explore')}</NavLink></li>
            <li><NavLink to="/routes">{t('routes')}</NavLink></li>
            <li><NavLink to="/map">{t('map')}</NavLink></li>
            <li><NavLink to="/about">{t('about')}</NavLink></li>
            <li><NavLink to="/admin" title={t('adminPanel')}>⚙️</NavLink></li>
          </ul>
          <div className="nav-actions">
            {!guestSession && !user ? (
              <span className="subtitle">{t('scanQrGuide')}</span>
            ) : user ? (
              <span className="subtitle">👤 {user.full_name || user.email}</span>
            ) : null}
          </div>
        </div>
      </nav>

      <Outlet />
}

      <footer>
        <div className="container">
          <div>
            <strong style={{ color: '#fff' }}>🍜 District 4 Culinary Guide</strong>
            <p style={{ marginTop: '0.4rem' }}>{t('footerTagline')}</p>
          </div>
          <div>
            <Link to="/about">{t('about')}</Link> · <Link to="/explore">{t('explore')}</Link> · <Link to="/routes">{t('routes')}</Link>
          </div>
        </div>
      </footer>
    </>
  );
}
