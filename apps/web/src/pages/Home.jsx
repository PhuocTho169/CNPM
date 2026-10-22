import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useApp } from '../context/AppContext';
import PlaceCard from '../components/PlaceCard';
import { dishBanner } from '../utils/dishBanner';
import { LANG_FLAG } from '../utils/langs';

/* H1 with one highlighted word (t('heroAccent') = 'hương vị' / 'flavours' /
   '美味' / '맛' / '味'). Falls back to plain h1 when the accent is absent. */
function HeroTitle({ text, accent }) {
  const idx = text && accent ? text.indexOf(accent) : -1;
  if (!text || idx < 0) return <h1>{text}</h1>;
  return (
    <h1>
      {text.slice(0, idx)}
      <span className="hero-accent">{accent}</span>
      {text.slice(idx + accent.length)}
    </h1>
  );
}

export default function Home() {
  const { languages, lang, t } = useApp();
  const [places, setPlaces] = useState([]);
  const [dishes, setDishes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      api.get('/places?status=PUBLISHED&recommended=true&limit=6&lang=' + lang),
      api.get('/dishes?limit=8&lang=' + lang),
      api.get('/categories?applies_to=place'),
      api.get('/routes?status=PUBLISHED&lang=' + lang),
    ])
      .then(([p, d, c, r]) => {
        setPlaces(p.data.data || []);
        setDishes(d.data.data || []);
        setCategories(c.data.data || []);
        setRoutes(r.data.data || []);
      })
      .catch((e) => setError(e?.response?.data?.message || 'Network error'))
      .finally(() => setLoading(false));
  }, [lang]);

  if (loading) return <div className="spinner" />;

  return (
    <>
      <section className="hero">
        <div className="hero-inner container">
          <div className="hero-copy">
            <span className="hero-eyebrow">
              🍜 District 4 · TP. Hồ Chí Minh <span className="hero-dot">•</span> {t('heroTagline')}
            </span>
            <HeroTitle text={t('heroTitle')} accent={t('heroAccent')} />
            <p>{t('heroSubtitle')}</p>
            <div className="hero-actions">
              <Link to="/explore" className="btn btn-primary">🧭 {t('explorePlaces')} →</Link>
              <Link to="/map" className="btn btn-dark">📍 {t('map')}</Link>
            </div>
            {places.length > 0 && (
              <div className="hero-suggest">
                <span className="hero-suggest-label">{t('heroSuggest')}</span>
                {places.slice(0, 3).map((p) => (
                  <Link key={p.id} to={`/place/${p.id}`}>{p.name || p.code}</Link>
                ))}
              </div>
            )}
          </div>
          <div className="hero-art">
            <div className="hero-photo-card">
              <div
                className="hero-photo"
                role="img"
                aria-label="Hương vị Quận 4"
                style={{ backgroundImage: "url('/images/hero/hero-pho.png')" }}
              />
              <div className="hero-photo-caption" aria-hidden="true">
                <span className="cap-1">DISTRICT 4</span>
                <span className="cap-2">ẨM THỰC • AUDIO GUIDE</span>
              </div>
            </div>
            <span className="hero-badge">
              🎧 {t('heroBadge')} <span className="badge-dot" />
            </span>
          </div>
        </div>
      </section>

      {error && (
        <div className="section container">
          <div className="error-banner">{error} — <Link to="/">{t('retry')}</Link></div>
        </div>
      )}

      {places.length > 0 && (
        <section className="section container">
          <span className="eyebrow">District 4</span>
          <h2 className="section-title">{t('featuredPlaces')}</h2>
          <p className="section-sub">{t('featuredSub')}</p>
          <div className="card-grid">
            {places.map((p) => <PlaceCard key={p.id} place={p} />)}
          </div>
          <div style={{ marginTop: '1.4rem' }}>
            <Link to="/explore" className="btn btn-ghost">{t('explorePlaces')} →</Link>
          </div>
        </section>
      )}

      {dishes.length > 0 && (
        <section className="section section-alt">
          <div className="container">
            <span className="eyebrow">Signature</span>
            <h2 className="section-title">{t('popularDishes')}</h2>
            <p className="section-sub">{t('dishesSub')}</p>
            <div className="card-grid">
              {dishes.slice(0, 8).map((d) => (
                <Link to={`/dish/${d.id}`} key={d.id} className="card">
                  {d.image_url ? (
                    <img className="card-img" src={d.image_url} alt={d.name || ''} loading="lazy" />
                  ) : (
                    <img className="card-img" src={dishBanner(d.category_code)} alt={d.name || d.code} loading="lazy" />
                  )}
                  <div className="card-body">
                    <div className="card-title">{d.name || d.code}</div>
                    {d.is_signature && <span className="signature-tag">⭐ Signature</span>}
                    <p className="card-desc menu-desc">{d.description}</p>
                    {d.price && <span className="chip chip-outline" style={{ alignSelf: 'flex-start' }}>💰 {d.price}</span>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {categories.length > 0 && (
        <section className="section container">
          <span className="eyebrow">Explore</span>
          <h2 className="section-title">{t('categories')}</h2>
          <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
            {categories.map((c) => (
              <Link key={c.id} to={`/explore?category=${c.code}`} className="card" style={{ padding: '1.1rem' }}>
                <div style={{ fontSize: '1.9rem' }}>{c.icon || '🍽️'}</div>
                <div className="card-title" style={{ marginTop: '0.3rem' }}>{c.name}</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {routes.length > 0 && (
        <section className="section section-alt">
          <div className="container">
            <span className="eyebrow">Routes</span>
            <h2 className="section-title">{t('foodRoutes')}</h2>
            <div className="card-grid">
              {routes.slice(0, 3).map((r) => (
                <Link to="/routes" key={r.id} className="card" style={{ padding: '1.2rem' }}>
                  <div className="card-title">🗺️ {r.name}</div>                   <p className="card-desc route-desc">{r.description}</p>
                  <div className="card-meta">
                    <span className="chip">⏱ {r.estimated_duration}</span>
                    <span className="chip chip-outline">📏 {r.distance}</span>
                    <span className="chip chip-teal">{r.stops?.length || 0} {t('stops')}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="section container">
        <span className="eyebrow">🎧 {t('audioGuides')}</span>
        <h2 className="section-title">{t('audioTitle')}</h2>
        <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          {/* Built from the active language list, not a hardcoded array of four,
              so English appears here as soon as it is a supported language. */}
          {languages.map((l) => (
            <div key={l.code} className={`card ${l.code === lang ? 'card-active' : ''}`} style={{ padding: '1.3rem', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ fontSize: '2.2rem' }}>{LANG_FLAG[l.code] || '🌐'}</div>
              <div className="card-title">{l.native_name}</div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
