import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { useApp } from '../context/AppContext';
import PlaceCard from '../components/PlaceCard';
import DishCard from '../components/DishCard';

export default function Explore() {
  const { lang, t } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [places, setPlaces] = useState([]);
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPlaces, setTotalPlaces] = useState(0);
  const [totalDishes, setTotalDishes] = useState(0);

  // Filters live in the URL (?category=dessert…) so links like
  // /explore?category=dessert from the Home page land pre-filtered.
  const filters = {
    q: searchParams.get('q') || '',
    category: searchParams.get('category') || '',
    open_now: searchParams.get('open_now') || '',
    price: searchParams.get('price') || '',
    recommended: searchParams.get('recommended') || '',
  };

  const setFilter = (key, value) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value); else next.delete(key);
      return next;
    }, { replace: true });
  };

  useEffect(() => {
    api.get('/categories').then((res) => setCategories(res.data.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    const placeQs = new URLSearchParams({ status: 'PUBLISHED', lang, limit: 24 });
    Object.entries(filters).forEach(([k, v]) => { if (v) placeQs.set(k, v); });

    // Dishes support the free-text search; the category dropdown mixes place
    // and dish categories, so dishes are filtered client-side by category_code.
    const dishQs = new URLSearchParams({ lang, limit: 50, status: 'PUBLISHED' });
    if (filters.q) dishQs.set('q', filters.q);

    setLoading(true);
    Promise.all([
      api.get(`/places?${placeQs}`).then((res) => {
        setPlaces(res.data.data || []);
        setTotalPlaces(res.data.meta?.total || 0);
      }),
      api.get(`/dishes?${dishQs}`).then((res) => {
        setDishes(res.data.data || []);
        setTotalDishes(res.data.meta?.total || 0);
      }),
    ])
      .catch(() => { setPlaces([]); setDishes([]); })
      .finally(() => setLoading(false));
  }, [lang, searchParams]);

  const dishList = dishes.filter((d) => !filters.category || d.category_code === filters.category);
  const total = totalPlaces + dishList.length;

  return (
    <section className="section container">
      <span className="eyebrow">District 4</span>
      <h2 className="section-title">{t('exploreTitle')}</h2>
      <p className="section-sub">{t('exploreSub')}</p>

      <div className="filter-bar" role="search">
        <input
          type="search"
          placeholder={t('searchPlaceholder')}
          value={filters.q}
          onChange={(e) => setFilter('q', e.target.value)}
          aria-label="Search"
        />
        <select value={filters.category} onChange={(e) => setFilter('category', e.target.value)} aria-label="Category">
          <option value="">{t('allCategories')}</option>
          {categories.map((c) => <option key={c.id} value={c.code}>{c.icon} {c.name}</option>)}
        </select>
        <select value={filters.price} onChange={(e) => setFilter('price', e.target.value)} aria-label="Price">
          <option value="">{t('priceRange')}</option>
          <option value="budget">≤ 70k ₫</option>
          <option value="mid">70k – 150k ₫</option>
          <option value="premium">150k+ ₫</option>
        </select>
        <label className="chip chip-outline" style={{ cursor: 'pointer' }}>
          <input type="checkbox" checked={filters.open_now === 'true'}
            onChange={(e) => setFilter('open_now', e.target.checked ? 'true' : '')} />
          {' '}{t('openNow')}
        </label>
        <label className="chip chip-outline" style={{ cursor: 'pointer' }}>
          <input type="checkbox" checked={filters.recommended === 'true'}
            onChange={(e) => setFilter('recommended', e.target.checked ? 'true' : '')} />
          ⭐ {t('recommended')}
        </label>
      </div>

      {loading ? (
        <div className="spinner" />
      ) : (places.length === 0 && dishList.length === 0) ? (
        <div className="empty-state">{t('noResults')}</div>
      ) : (
        <>
          <p style={{ color: 'var(--text-2)', fontSize: '0.86rem', marginBottom: '0.4rem' }}>
            {total} {t('results')}
          </p>

          {places.length > 0 && (
            <>
              <h3 className="results-heading">📍 {t('resultsPlaces')} <span className="results-count">{places.length}</span></h3>
              <div className="card-grid">
                {places.map((p) => <PlaceCard key={p.id} place={p} />)}
              </div>
            </>
          )}

          {dishList.length > 0 && (
            <>
              <h3 className="results-heading">🍜 {t('resultsDishes')} <span className="results-count">{dishList.length}</span></h3>
              <div className="card-grid">
                {dishList.map((d) => <DishCard key={d.id} d={d} lang={lang} variant="card" />)}
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
