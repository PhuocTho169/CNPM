import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useApp } from '../context/AppContext';
import PlaceCard from '../components/PlaceCard';

export default function Explore() {
  const { lang, t } = useApp();
  const [categories, setCategories] = useState([]);
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const [filters, setFilters] = useState({
    q: params.get('q') || '',
    category: params.get('category') || '',
    open_now: '',
    price: '',
    recommended: '',
  });

  useEffect(() => {
    api.get('/categories?applies_to=place').then((res) => setCategories(res.data.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    const qs = new URLSearchParams({ status: 'PUBLISHED', lang, limit: 24 });
    Object.entries(filters).forEach(([k, v]) => { if (v) qs.set(k, v); });
    setLoading(true);
    api.get(`/places?${qs}`)
      .then((res) => { setPlaces(res.data.data || []); setTotal(res.data.meta?.total || 0); })
      .catch(() => setPlaces([]))
      .finally(() => setLoading(false));
  }, [lang, filters]);

  return (
    <section className="section container">
      <span className="eyebrow">District 4</span>
      <h2 className="section-title">{t('explorePlaces')}</h2>
      <p className="section-sub">{t('exploreSub')}</p>

      <div className="filter-bar" role="search">
        <input
          type="search"
          placeholder={t('searchPlaceholder')}
          value={filters.q}
          onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
          aria-label="Search"
        />
        <select value={filters.category} onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))} aria-label="Category">
          <option value="">{t('allCategories')}</option>
          {categories.map((c) => <option key={c.code} value={c.code}>{c.icon} {c.name}</option>)}
        </select>
        <select value={filters.price} onChange={(e) => setFilters((f) => ({ ...f, price: e.target.value }))} aria-label="Price">
          <option value="">{t('priceRange')}</option>
          <option value="budget">≤ 70k ₫</option>
          <option value="mid">70k – 150k ₫</option>
          <option value="premium">150k+ ₫</option>
        </select>
        <label className="chip chip-outline" style={{ cursor: 'pointer' }}>
          <input type="checkbox" checked={filters.open_now === 'true'}
            onChange={(e) => setFilters((f) => ({ ...f, open_now: e.target.checked ? 'true' : '' }))} />
          {' '}{t('openNow')}
        </label>
        <label className="chip chip-outline" style={{ cursor: 'pointer' }}>
          <input type="checkbox" checked={filters.recommended === 'true'}
            onChange={(e) => setFilters((f) => ({ ...f, recommended: e.target.checked ? 'true' : '' }))} />
          ⭐ {t('recommended')}
        </label>
      </div>

      {loading ? (
        <div className="spinner" />
      ) : places.length === 0 ? (
        <div className="empty-state">{t('noResults')}</div>
      ) : (
        <>
          <p style={{ color: 'var(--text-2)', fontSize: '0.86rem', marginBottom: '1rem' }}>
            {total} {t('results')}
          </p>
          <div className="card-grid">
            {places.map((p) => <PlaceCard key={p.id} place={p} />)}
          </div>
        </>
      )}
    </section>
  );
}
