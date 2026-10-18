import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useApp } from '../context/AppContext';

const D4_BBOX = '106.6880,10.7480,106.7120,10.7640';

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

  return (
    <section className="section container">
      <span className="eyebrow">Map</span>
      <h2 className="section-title">{t('mapTitle')}</h2>
      <p className="section-sub">{t('mapSub')}</p>

      <iframe
        className="map-embed"
        title="district4-map"
        style={{ aspectRatio: '16/8' }}
        src={`https://www.openstreetmap.org/export/embed.html?bbox=${D4_BBOX}&layer=mapnik`}
        loading="lazy"
      />

      {loading ? (
        <div className="spinner" />
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
