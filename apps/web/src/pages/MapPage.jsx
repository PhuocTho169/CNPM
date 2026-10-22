import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useApp } from '../context/AppContext';
import BaseMap from '../components/BaseMap';

const D4_CENTER = [10.7560, 106.7000];

export default function MapPage() {
  const { lang, t } = useApp();
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/places?status=PUBLISHED&lang=${lang}&limit=50`)
      .then((res) => setPlaces(res.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [lang]);

  const markers = places
    .filter((p) => p.latitude && p.longitude)
    .map((p) => ({
      latitude: p.latitude,
      longitude: p.longitude,
      name: p.translation?.name || p.code,
      href: `/place/${p.id}`,
    }));

  return (
    <section className="section container">
      <span className="eyebrow">Map</span>
      <h2 className="section-title">{t('mapTitle')}</h2>
      <p className="section-sub">{t('mapSub')}</p>

      <div className="map-wrap" style={{ position: 'relative' }}>
        <BaseMap
          center={D4_CENTER}
          zoom={14}
          markers={markers}
          fit={markers.length > 1}
          style={{ aspectRatio: '16/8', height: 380 }}
        />
      </div>

      {loading ? (
        <div className="spinner" style={{ marginTop: '1.4rem' }} />
      ) : (
        <div className="card-grid" style={{ marginTop: '1.4rem' }}>
          {places.filter((p) => p.latitude && p.longitude).map((p) => (
            <Link to={`/place/${p.id}`} className="card" key={p.id}>
              {p.primary_image ? (
                <img className="card-img" src={p.primary_image} alt={p.translation?.name || p.code} loading="lazy" />
              ) : (
                <div className="card-img" style={{ background: '#efe6da', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
                  {p.category?.icon || '📍'}
                </div>
              )}
              <div className="card-body">
                <div className="card-title">{p.translation?.name || p.code}</div>
                <div className="card-meta">{p.category?.name} · {p.address?.split(',').slice(-2).join(',').trim()}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
