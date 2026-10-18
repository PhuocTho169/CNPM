import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function PlaceCard({ place }) {
  const { t } = useApp();
  const name = place.translation?.name || place.name || place.code;
  const img = place.primary_image;
  const hasDishes = Number(place.dish_count) > 0;
  return (
    <Link to={`/place/${place.id}`} className="card">
      {img ? (
        <img className="card-img" src={img} alt={name} loading="lazy" />
      ) : (
        <div className="card-img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.4rem' }}>
          {place.category?.icon || '🍽️'}
        </div>
      )}
      <div className="card-body">
        <div className="card-title">{name}</div>
        <div className="card-meta">
          {place.category && <span className="chip">{place.category.icon} {place.category.name}</span>}
          {place.is_recommended && <span className="chip chip-teal">⭐ {t('recommended')}</span>}
        </div>
        {place.translation?.short_description && <p className="card-desc">{place.translation.short_description}</p>}
        <div className="card-meta">
          <span>📍 {place.address?.split(',').slice(-2).join(',').trim()}</span>
        </div>
        <div className="card-meta" style={{ marginTop: 'auto' }}>
          {place.price_range && <span className="chip chip-outline">💰 {place.price_range}</span>}
          {place.has_audio && <span className="chip chip-teal">🎧</span>}
          {hasDishes && (
            <Link to={`/dishes?place_id=${place.id}`} className="chip chip-outline">
              ⟶ {t('seeDishes')} ({place.dish_count})
            </Link>
          )}
        </div>
      </div>
    </Link>
  );
}
