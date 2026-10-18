import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useApp } from '../context/AppContext';

export default function FoodRoutes() {
  const { lang, t } = useApp();
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/routes?status=PUBLISHED&lang=${lang}`)
      .then((res) => setRoutes(res.data.data || []))
      .catch(() => setRoutes([]))
      .finally(() => setLoading(false));
  }, [lang]);

  if (loading) return <div className="spinner" />;

  const labels = {
    start: { vi: 'Xuất phát', en: 'Start', zh: '出发', ko: '출발', ja: 'スタート' },
  };

  return (
    <section className="section container">
      <span className="eyebrow">Routes</span>
      <h2 className="section-title">{t('foodRoutes')}</h2>
      <p className="section-sub">{t('routesSub')}</p>

      {routes.length === 0 ? (
        <div className="empty-state">{t('noResults')}</div>
      ) : (
        <div style={{ display: 'grid', gap: '1.4rem' }}>
          {routes.map((r) => (
            <article className="card" key={r.id} style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', color: 'var(--primary-dark)' }}>🗺️ {r.name}</h3>
                  <p className="card-desc" style={{ marginTop: '0.3rem', maxWidth: 640 }}>{r.description}</p>
                </div>
                <div className="card-meta">
                  <span className="chip">⏱ {r.estimated_duration}</span>
                  <span className="chip chip-outline">📏 {r.distance}</span>
                  <span className="chip chip-teal">{r.stops?.length} {t('stops')}</span>
                </div>
              </div>

              <div className="route-stops">
                {(r.stops || []).map((s) => (
                  <div className="route-stop" key={s.id || s.position}>
                    <span className="route-stop-num">
                      {s.position}. {s.position === 1 ? (labels.start[lang] || t('routeStart')) : ''}
                    </span>{' '}
                    <Link to={`/place/${s.place_id}`}>{s.place_name || s.place_code}</Link>
                    {s.note && <p>💬 {s.note}</p>}
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
