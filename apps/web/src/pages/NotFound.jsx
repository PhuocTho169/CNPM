import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';

/**
 * Catch-all 404 rendered inside PublicLayout (covers wrong public & admin
 * paths). Empty-state design: the big "4🍜4" — the middle zero is a steaming
 * bowl for the district's food theme — one primary CTA home, one secondary to
 * the explorer, plus quick links to the main public pages.
 */
export default function NotFound() {
  const { t } = useApp();

  return (
    <main className="page-404">
      <div className="page-404-card">
        <div className="page-404-code" aria-hidden="true">
          <span>4</span>
          <span className="page-404-bowl">🍜</span>
          <span>4</span>
        </div>
        <h1>{t('notFoundTitle')}</h1>
        <p className="page-404-desc">{t('notFoundText')}</p>

        <div className="page-404-actions">
          <Link to="/" className="btn btn-orange">🏠 {t('notFoundBack')}</Link>
          <Link to="/explore" className="btn btn-ghost">🔎 {t('explore')}</Link>
        </div>

        <p className="page-404-links">
          <Link to="/routes">{t('routes')}</Link>
          {' · '}
          <Link to="/map">{t('map')}</Link>
          {' · '}
          <Link to="/about">{t('about')}</Link>
        </p>
      </div>
    </main>
  );
}
