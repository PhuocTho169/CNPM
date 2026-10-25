import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, getSessionId } from '../api/client';
import { useApp } from '../context/AppContext';
import AudioPlayer from '../components/AudioPlayer';
import DishCard from '../components/DishCard';
import { directionsUrl, osmMapUrl, distanceMeters, formatDistance, getCurrentPosition } from '../utils/geo';
import { placeNarration } from '../utils/narration';
import BaseMap from '../components/BaseMap';

export default function PlaceGuide() {
  const { id } = useParams();
  const { lang, setLang, languages, t } = useApp();
  const [place, setPlace] = useState(null);
  const [nearby, setNearby] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deviceType, setDeviceType] = useState('desktop');
  const [visitorLocation, setVisitorLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locationNote, setLocationNote] = useState(null);

  const detectDevice = useCallback(() => {
    const ua = navigator.userAgent;
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
    const isTablet = /iPad|Tablet/i.test(ua);
    setDeviceType(isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop');
  }, []);

  useEffect(() => { detectDevice(); }, [detectDevice]);

  // Main load: guide + scan logging + history
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api.get(`/places/${id}/guide?lang=${lang}`)
      .then((res) => {
        if (cancelled) return;
        setPlace(res.data.data);
        // Record the QR scan + visitor history (anonymous)
        const sessionId = getSessionId();
        api.post(`/places/${id}/scan`, {
          language_code: lang,
          device_type: deviceType,
          platform: navigator.platform || '',
          anonymous_session_id: sessionId,
        }).catch(() => {});
        api.post('/history', { session_id: sessionId, culinary_place_id: Number(id) }).catch(() => {});
      })
      .catch((e) => {
        if (!cancelled) setError(e?.response?.data?.message || 'Network error');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id, lang, deviceType]);

  // Nearby places
  useEffect(() => {
    if (!place?.latitude || !place?.longitude) return;
    api.get(`/places/nearby?lat=${place.latitude}&lng=${place.longitude}&lang=${lang}&limit=4`)
      .then((res) => setNearby((res.data.data || []).filter((n) => n.id !== place.id)))
      .catch(() => {});
  }, [place, lang]);

  // Turn-by-turn route. Ask for GPS first so the link can start from where the
  // visitor actually is; if they decline, fall back to the map — a denied
  // permission must not dead-end the button.
  //
  // Declared with the other hooks, BEFORE any early return: a hook below a
  // conditional return breaks the rules of hooks (React changes the hook count
  // between the loading render and the loaded render).
  const handleDirections = useCallback(async () => {
    if (!place?.latitude || !place?.longitude) return;
    setLocating(true);
    setLocationNote(null);
    const here = await getCurrentPosition();
    setLocating(false);
    const dest = { latitude: place.latitude, longitude: place.longitude };
    if (here) {
      setVisitorLocation(here);
      window.open(directionsUrl(dest, `${here.latitude},${here.longitude}`), '_blank', 'noopener');
      return;
    }
    setLocationNote(t('locationDenied'));
    window.open(osmMapUrl(dest), '_blank', 'noopener');
  }, [place?.latitude, place?.longitude, t]);

  if (loading) return <div className="spinner" />;

  if (error) {
    return (
      <div className="section container">
        <div className="error-banner">{error}</div>
        <Link to="/explore" className="btn btn-ghost" style={{ marginTop: '1rem' }}>← {t('explore')}</Link>
      </div>
    );
  }

  if (!place) return null;

  // Resolve the translation for the chosen language, falling back to the first
  // available language so the guide is never empty.
  // NOTE: prefer entries from `translations` — they carry the per-language
  // `audio` record. `place.translation` is the summary object and has no audio,
  // so using it first would hide every generated audio file and force the
  // browser voice (always the default language) for all 4 languages.
  const translations = place.translations || [];
  const currentTranslation =
    translations.find((tr) => tr.language_code === lang) ||
    translations.find((tr) => tr.language_code === place.current_language) ||
    translations[0] ||
    place.translation ||
    null;

  const name = currentTranslation?.name || place.code;
  const audio = currentTranslation?.audio;
  // Same ~30s script the server writes into the MP3 (utils/narration), so the
  // browser-voice fallback says what the generated file says.
  const narrationText = placeNarration(currentTranslation, lang);

  // Straight-line distance from the visitor, once they have allowed GPS. Shown
  // so they can tell at a glance whether walking is worth it.
  const straightLine = formatDistance(
    distanceMeters(visitorLocation, { latitude: place.latitude, longitude: place.longitude })
  );

  return (
    <div>
      {/* Hero image */}
      <div className="guide-hero">
        {place.images?.length ? (
          <img className="guide-hero-img" src={place.images[0].image_url} alt={place.images[0].alt_text || name} />
        ) : (
          <div className="guide-hero-fallback">{place.category?.icon || '🍽️'}</div>
        )}
      </div>

      <div className="container">
        {/* Header — QR góc phải, ngang hàng với title */}
        <header
          className="guide-header"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1.5rem', flexWrap: 'wrap' }}
        >
          <div style={{ minWidth: 0 }}>
            <h1>{name}</h1>
            <div className="badge-row">
              {place.category && <span className="chip">{place.category.icon} {place.category.name}</span>}
              {place.is_recommended && <span className="chip chip-teal">⭐ {t('recommended')}</span>}
              {place.price_range && <span className="chip chip-outline">💰 {place.price_range}</span>}
            </div>
            <p style={{ color: 'var(--text-2)', fontSize: '0.92rem', marginTop: '0.5rem' }}>
              📍 {place.address}
              {place.opening_time && place.closing_time && <> · 🕐 {place.opening_time.slice(0, 5)} – {place.closing_time.slice(0, 5)}</>}
            </p>
          </div>

          {place.has_qr && place.qr_image_url && (
            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.6rem', paddingTop: '0.4rem' }}>
              <strong style={{ fontSize: '0.82rem', color: 'var(--text-2)', maxWidth: '8.5rem', textAlign: 'right' }}>{t('scanQrGuide')}</strong>
              <img src={place.qr_image_url} alt="QR code" style={{ width: 96, height: 96, borderRadius: 6, border: '1px solid var(--border)' }} />
            </div>
          )}
        </header>

        {/* Audio player */}
        <AudioPlayer
          audioUrl={audio?.file_url}
          duration={audio?.duration}
          narrationText={narrationText}
          placeName={name}
          audioPending={currentTranslation?.audio_pending}
        />

        {/* About this place */}
        {currentTranslation?.description && (
          <section className="guide-section">
            <h2>{t('aboutPlace')}</h2>
            <div className="prose">{currentTranslation.description}</div>
          </section>
        )}
 {currentTranslation?.tourist_tips && (
          <section className="guide-section">
            <h2>{t('touristTips')}</h2>
            <ul className="tips-list">
              {currentTranslation.tourist_tips.split(' • ').filter(Boolean).map((tip, i) => (
                <li key={i}>{tip}</li>
              ))}
            </ul>
          </section>
        )}

        {/* What to try */}
        {place.dishes?.length > 0 && (
          <section className="guide-section">
            <h2>{t('whatToTry')}</h2>
            <div className="try-grid">
              {place.dishes.map((d) => <DishCard key={d.id} d={d} lang={lang} />)}
            </div>
          </section>
        )}

        {/* History & culture */}
        {currentTranslation?.history && (
          <section className="guide-section">
            <h2>📜 {t('historyTitle')}</h2>
            <div className="prose">{currentTranslation.history}</div>
          </section>
        )}
        {currentTranslation?.cultural_significance && (
          <section className="guide-section">
            <h2>{t('foodCulture')}</h2>
            <div className="prose">{currentTranslation.cultural_significance}</div>
          </section>
        )}

        {/* Tourist tips */}
        {currentTranslation?.tourist_tips && (
          <section className="guide-section">
            <h2>{t('touristTips')}</h2>
            <ul className="tips-list">
              {currentTranslation.tourist_tips.split(' • ').filter(Boolean).map((tip, i) => (
                <li key={i}>{tip}</li>
              ))}
            </ul>
          </section>
        )}

        {/* Location */}
        {place.latitude && place.longitude && (
          <section className="guide-section">
            <h2>{t('location')}</h2>
            <div className="map-wrap">
              <BaseMap
                center={[place.latitude, place.longitude]}
                zoom={16}
                markers={[{ latitude: place.latitude, longitude: place.longitude, name }]}
              />
              <div className="map-actions">
                <button
                  type="button"
                  className="btn btn-orange btn-sm"
                  onClick={handleDirections}
                  disabled={locating}
                >
                  🚶 {locating ? t('gettingLocation') : t('getDirections')}
                </button>
                <a
                  className="btn btn-ghost btn-sm"
                  href={osmMapUrl({ latitude: place.latitude, longitude: place.longitude })}
                  target="_blank"
                  rel="noreferrer"
                >
                  🧭 {t('openMap')}
                </a>
              </div>
              {straightLine && (
                <p style={{ fontSize: '0.88rem', color: 'var(--text-2)', marginTop: '0.5rem' }}>
                  📏 ~{straightLine} {t('straightLine')}
                </p>
              )}
              {locationNote && (
                <p role="status" style={{ fontSize: '0.88rem', color: 'var(--text-2)', marginTop: '0.5rem' }}>
                  {locationNote}
                </p>
              )}
            </div>
            {place.phone && <p style={{ fontSize: '0.88rem', color: 'var(--text-2)', marginTop: '0.5rem' }}>☎️ {place.phone}</p>}
          </section>
        )}

        {/* Nearby */}
        {nearby.length > 0 && (
          <section className="guide-section">
            <h2>📍 {t('nearby')}</h2>
            <div className="card-grid">
              {nearby.map((n) => (
                <Link to={`/place/${n.id}`} className="card" key={n.id} style={{ flexDirection: 'row', padding: '0.9rem', gap: '0.9rem' }}>
                  {n.primary_image ? (
                    <img src={n.primary_image} alt={n.name} style={{ width: 64, height: 64, borderRadius: 10, objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: 64, height: 64, borderRadius: 10, background: '#efe6da', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem' }}>
                      {n.category_icon || '🍽️'}
                    </div>
                  )}
                  <div>
                    <div className="card-title" style={{ fontSize: '0.95rem' }}>{n.name || n.code}</div>
                    <div className="card-meta">
                      <span>{Math.round(n.distance_m)} m</span>
                      {n.category_name && <> · {n.category_name}</>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
