import { useCallback, useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { useApp } from '../context/AppContext';
import AudioPlayer from '../components/AudioPlayer';
import LanguageBanner from '../components/LanguageBanner';
import DishAudioButton from '../components/DishAudioButton';
import DishCard from '../components/DishCard';
import { dishBanner } from '../utils/dishBanner';
import { dishNarration } from '../utils/narration';
import { directionsUrl, osmMapUrl, getCurrentPosition } from '../utils/geo';

export default function DishDetail() {
  const { id } = useParams();
  const { lang, setLang, languages, t } = useApp();
  const [dish, setDish] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [placeDishes, setPlaceDishes] = useState([]);

  // Same GPS flow as the place guide / map page: ask for the visitor's
  // location first so directions start from where they actually are; if the
  // permission is denied, fall back to the plain OpenStreetMap of the place.
  const handleDirections = useCallback(() => {
    if (!dish?.place?.latitude || !dish?.place?.longitude) return;
    getCurrentPosition().then((here) => {
      const dest = { latitude: dish.place.latitude, longitude: dish.place.longitude };
      window.open(
        here ? directionsUrl(dest, `${here.latitude},${here.longitude}`) : osmMapUrl(dest),
        '_blank',
        'noopener'
      );
    });
  }, [dish?.place?.latitude, dish?.place?.longitude]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.get(`/dishes/${id}?lang=${lang}`)
      .then((res) => {
        if (res.data && res.data.data) {
          setDish(res.data.data);
        }
      })
      .catch((e) => setError(e?.response?.data?.message || 'Network error'))
      .finally(() => setLoading(false));
  }, [id, lang]);

  // Other dishes served at the same place — "Món nên thử tại quán này".
  useEffect(() => {
    if (!dish?.culinary_place_id) return undefined;
    api.get(`/places/${dish.culinary_place_id}/guide?lang=${lang}`)
      .then((res) => setPlaceDishes(res.data.data?.dishes || []))
      .catch(() => setPlaceDishes([]));
    return undefined;
  }, [dish?.culinary_place_id, lang]);

  if (loading) return <div className="spinner" />;

  if (error) {
    return (
      <div className="section container">
        <div className="error-banner">{error}</div>
        <Link to="/" className="btn btn-ghost" style={{ marginTop: '1rem' }}>← {t('home')}</Link>
      </div>
    );
  }

  if (!dish) return null;

  // Chọn translation theo ngôn ngữ hiện tại
  const name = dish.name || dish.code;
  const audio = dish.audio;
  const narrationText = dishNarration(dish, lang);
  const hasQr = !!dish.qr_value;
  const otherDishes = placeDishes.filter((x) => x.id !== dish.id);

  return (
    <div>
      {/* First thing on screen: the language-selection banner (2 free, 3rd+ pay 20.000đ once) */}
      <LanguageBanner />

      {/* Hero image */}
      <div className="guide-hero">
        {dish.image_url ? (
          <img className="guide-hero-img" src={dish.image_url} alt={name} />
        ) : (
          <div className="guide-hero-fallback">
            <img className="dish-banner" src={dishBanner(dish.category_code)} alt={name} />
          </div>
        )}
      </div>

      <div className="container">
        {/* Header */}
        <header className="guide-header">
          <h1>{name}</h1>
          <div className="badge-row">
            {dish.category && (
              <span className="chip">{dish.category?.icon || '🍽️'} {dish.category_name}</span>
            )}
            {dish.is_signature && <span className="chip chip-teal">⭐ {t('signature')}</span>}
            {dish.price && <span className="chip chip-outline">💰 {dish.price}</span>}
          </div>
          {dish.place?.address && (
            <p style={{ color: 'var(--text-2)', fontSize: '0.92rem', marginTop: '0.5rem' }}>
              📍 {dish.place.address}
              {dish.place.opening_time && dish.place.closing_time && <> · 🕐 {dish.place.opening_time.slice(0, 5)} – {dish.place.closing_time.slice(0, 5)}</>}
            </p>
          )}
        </header>

        {/* QR — góc phải, ngay trên phần nghe thuyết minh (giống trang quán) */}
        {hasQr && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.6rem', marginBottom: '0.8rem', flexWrap: 'wrap' }}>
            <strong style={{ fontSize: '0.82rem', color: 'var(--text-2)' }}>📱 {t('scanQrGuide')}</strong>
            {dish.qr_image_url && (
              <img src={dish.qr_image_url} alt="QR code" style={{ width: 96, height: 96, borderRadius: 6, border: '1px solid var(--border)' }} />
            )}
          </div>
        )}

        <AudioPlayer
          audioUrl={audio?.file_url}
          duration={audio?.duration}
          narrationText={narrationText}
          placeName={name}
          audioPending={dish.audio_pending}
        />

        {/* Mô tả */}
        {dish.description && (
          <section className="guide-section">
            <h2>{t('description') || 'Mô tả'}</h2>
            <div className="prose">{dish.description}</div>
          </section>
        )}

        {/* Ingredient list */}
        {dish.ingredients && (
          <section className="guide-section">
            <h2>{t('ingredients') || 'Nguyên liệu'}</h2>
            <div className="prose">{dish.ingredients}</div>
          </section>
        )}

        {/* Cultural information */}
        {dish.cultural_information && (
          <section className="guide-section">
            <h2>{t('culturalInfo') || 'Thông tin văn hóa'}</h2>
            <div className="prose">{dish.cultural_information}</div>
          </section>
        )}

        {/* Món nên thử tại quán (các món khác của cùng quán) */}
        {dish.culinary_place_id && otherDishes.length > 0 && (
          <section className="guide-section">
            <h2>{t('moreAtPlace')}</h2>
            <div className="try-grid">
              {otherDishes.map((d) => <DishCard key={d.id} d={d} lang={lang} />)}
            </div>
          </section>
        )}

        {/* Vị trí quán */}
        {dish.place && (
          <section className="guide-section">
            <h2>{t('atPlace') || 'Tại quán'}</h2>
            {dish.place.latitude && dish.place.longitude && (
              <div className="map-wrap" style={{ marginTop: '1rem', maxHeight: '400px', overflow: 'hidden' }}>
                <iframe
                  className="map-embed"
                  title="Vị trí quán"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${dish.place.longitude - 0.004},${dish.place.latitude - 0.003},${dish.place.longitude + 0.004},${dish.place.latitude + 0.003}&layer=mapnik&marker=${dish.place.latitude},${dish.place.longitude}`}
                  loading="lazy"
                />
              </div>
            )}
            <div className="prose" style={{ marginTop: '1rem' }}>
              <p><strong>📍 {dish.place.address || 'Địa chỉ'}</strong></p>
              {dish.place.opening_time && dish.place.closing_time && (
                <p><strong>🕐 {dish.place.opening_time.slice(0, 5)} – {dish.place.closing_time.slice(0, 5)}</strong></p>
              )}
              {dish.place.price_range && (
                <p><strong>💰 {dish.place.price_range}</strong></p>
              )}
            </div>
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-orange btn-sm"
                style={{ padding: '0.6rem 0.8rem' }}
                onClick={handleDirections}
              >
                🚶 {t('getDirections')}
              </button>
              <a
                className="btn btn-ghost btn-sm"
                href={osmMapUrl({ latitude: dish.place.latitude, longitude: dish.place.longitude })}
                target="_blank"
                rel="noreferrer"
                style={{ padding: '0.6rem 0.8rem' }}
              >
                🧭 {t('openMap')}
              </a>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
