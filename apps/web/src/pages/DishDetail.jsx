import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { useApp } from '../context/AppContext';
import AudioPlayer from '../components/AudioPlayer';
import DishAudioButton from '../components/DishAudioButton';
import { dishBanner } from '../utils/dishBanner';
import { dishNarration } from '../utils/narration';

export default function DishDetail() {
  const { id } = useParams();
  const { lang, setLang, languages, t } = useApp();
  const [dish, setDish] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  return (
    <div>
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
        </header>

        {/* Audio player */}
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

        {/* Vị trí quán */}
        {dish.place && (
          <section className="guide-section">
            <h2>{t('atPlace') || 'Tại quán'}</h2>
            {dish.place.latitude && dish.place.longitude && (
              <div className="map-wrap" style={{ marginTop: '1rem' }}>
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
              <Link to={`/place/${dish.culinary_place_id}`} className="btn btn-primary" style={{ marginTop: '1rem' }}>
                📍 {t('viewPlace') || 'Xem quán'}
              </Link>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
