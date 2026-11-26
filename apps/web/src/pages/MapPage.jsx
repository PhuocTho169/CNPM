import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useApp } from '../context/AppContext';
import BaseMap, { ZONE_COLORS } from '../components/BaseMap';
import { directionsUrl, osmMapUrl, getCurrentPosition } from '../utils/geo';
import { findZoneIntersections, formatArea } from '../utils/zoneGeometry';

const D4_CENTER = [10.7560, 106.7000];

export default function MapPage() {
  const { lang, t } = useApp();
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef(null);

  useEffect(() => {
    api.get(`/places?status=PUBLISHED&lang=${lang}&limit=50`)
      .then((res) => setPlaces(res.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [lang]);

  const attachMap = useCallback((map) => { mapRef.current = map; }, []);

  const located = useMemo(
    () => places.filter((p) => p.latitude && p.longitude),
    [places]
  );

  // Each place broadcasts audio inside its zone_radius. Draw those circles and
  // fill the lens where two of them overlap — that is the area where the phone
  // can hear two narrations, so it deserves to be obvious on the map.
  const zones = useMemo(
    () => located.map((p, i) => ({
      id: p.id,
      latitude: p.latitude,
      longitude: p.longitude,
      radius: p.zone_radius,
      name: p.translation?.name || p.code,
      color: ZONE_COLORS[i % ZONE_COLORS.length],
    })),
    [located]
  );

  const intersections = useMemo(() => findZoneIntersections(located), [located]);

  const zoomToOverlap = useCallback((hit) => {
    if (!mapRef.current || !hit?.polygon?.length) return;
    mapRef.current.fitBounds(hit.polygon, { padding: [45, 45], maxZoom: 18, animate: true });
  }, []);

  // Same GPS flow as PlaceGuide: ask for the visitor's location first so the
  // directions link starts from where they actually are; if they decline,
  // fall back to the plain OpenStreetMap of the destination.
  const handleDirections = useCallback(async (p) => {
    const here = await getCurrentPosition();
    const dest = { latitude: p.latitude, longitude: p.longitude };
    window.open(
      here ? directionsUrl(dest, `${here.latitude},${here.longitude}`) : osmMapUrl(dest),
      '_blank',
      'noopener'
    );
  }, []);

  const markers = located.map((p) => ({
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
          zones={zones}
          intersections={intersections}
          fit={markers.length > 1}
          onRef={attachMap}
          style={{ aspectRatio: '16/8', height: 380 }}
        />
        <div className="zone-legend" aria-label="Chú thích bản đồ">
          <span><i className="zone-swatch zone-swatch-zone" /> Vùng phát âm thanh</span>
          <span><i className="zone-swatch zone-swatch-overlap" /> Vùng giao</span>
        </div>
      </div>

      {intersections.length > 0 && (
        <div className="zone-overlap-panel">
          <strong>⚠️ {intersections.length} vùng giao giữa các địa điểm</strong>
          <p>Trong vùng tô đỏ, khách có thể nghe thuyết minh của cả hai địa điểm.</p>
          <div className="zone-overlap-list">
            {intersections.map((hit) => (
              <button
                type="button"
                key={hit.key}
                className="zone-overlap-item"
                onClick={() => zoomToOverlap(hit)}
                title="Phóng to vùng giao"
              >
                <span>{hit.aName} ↔ {hit.bName}</span>
                <span className="zone-overlap-area">{formatArea(hit.areaM2)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

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
              )}              <div className="card-body">
                <div className="card-title">{p.translation?.name || p.code}</div>
                <div className="card-meta">{p.category?.name} · {p.address?.split(',').slice(-2).join(',').trim()}</div>
                {p.latitude && p.longitude && (
                  <button
                    type="button"
                    className="btn btn-orange btn-sm"
                    style={{ alignSelf: 'flex-start', marginTop: '0.5rem' }}
                    onClick={(e) => {
                      // Stop the Link above from navigating: this button opens
                      // turn-by-turn directions instead of the place detail.
                      e.preventDefault();
                      e.stopPropagation();
                      handleDirections(p);
                    }}
                  >
                    🚶 {t('getDirections')}
                  </button>
                )}
              </div>
            </Link>
          ))
        }
      </div>
      )}
    </section>
  );
}
