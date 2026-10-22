import { Link } from 'react-router-dom';
import DishAudioButton from './DishAudioButton';
import { dishBanner } from '../utils/dishBanner';
import { dishNarration } from '../utils/narration';

// Dish card in two variants:
//  - 'compact' (default): small horizontal-friendly card for the "What to try"
//    grids inside the place/dish guides.
//  - 'card': same visual language as PlaceCard (image top, body, actions row)
//    for the Explore results.
// The photo/name area links to the dish page; the price chip and the play
// button stay OUTSIDE the Link so tapping them does not navigate away.
export default function DishCard({ d, lang, variant = 'compact' }) {
  const priceChip = d.price && <span className="chip chip-outline">💰 {d.price}</span>;
  const placeChip = d.place_code && <span className="chip chip-outline" title={d.place_name || d.place_code}>📍 {d.place_code}</span>;
  const audioBtn = (
    <DishAudioButton
      audioUrl={d.audio?.file_url}
      pending={d.audio_pending}
      label={d.name || d.code}
      narrationText={dishNarration(d, lang)}
    />
  );

  if (variant === 'card') {
    return (
      <div className="card">
        <Link to={`/dish/${d.id}`} className="dish-card-link">
          <div style={{ position: 'relative' }}>
            <img className="card-img" src={d.image_url || dishBanner(d.category_code)} alt={d.name || d.code} loading="lazy" />
            {d.is_signature && <span className="try-signature">⭐ Signature</span>}
          </div>
          <div className="card-body">
            <div className="card-title">{d.name || d.code}</div>
            {d.description && <p className="card-desc">{d.description}</p>}
            <div className="card-meta">
              {d.category_name && <span className="chip">{d.category_name}</span>}
              {placeChip}
            </div>
          </div>
        </Link>
        <div className="card-meta" style={{ padding: '0 1.1rem 1.1rem', marginTop: 'auto', flexWrap: 'wrap' }}>
          {priceChip}
          {audioBtn}
        </div>
      </div>
    );
  }

  return (
    <div className="try-card">
      <Link to={`/dish/${d.id}`} className="try-card-link">
        <div className="try-thumb">
          <img src={d.image_url || dishBanner(d.category_code)} alt={d.name || d.code} loading="lazy" />
          {d.is_signature && <span className="try-signature">⭐ Signature</span>}
        </div>
        <div className="try-body">
          <div className="try-name">{d.name || d.code}</div>
          {d.description && <p className="try-desc">{d.description}</p>}
        </div>
      </Link>
      <div className="try-actions">
        {priceChip}
        {placeChip}
        {audioBtn}
      </div>
    </div>
  );
}
