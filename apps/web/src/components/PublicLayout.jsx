import { NavLink, Link, Outlet, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function PublicLayout() {
  const { languages, lang, setLang, t } = useApp();
  const navigate = useNavigate();

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
            <select
              className="lang-select"
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              aria-label={t('language')}
            >
              {(languages.length ? languages : [{ code: lang, native_name: lang }]).map((l) => (
                <option key={l.code} value={l.code}>{l.native_name}</option>
              ))}
            </select>
            <button className="btn-scan" onClick={() => navigate('/explore?focus=scan')}>
              ⟲ {t('scanQr')}
            </button>
          </div>
        </div>
      </nav>

      <Outlet />

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
