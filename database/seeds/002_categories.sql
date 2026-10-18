-- 002: Culinary categories
INSERT INTO categories (code, name, applies_to, icon) VALUES
  ('vietnamese-cuisine', 'Vietnamese Cuisine', 'place', '🍜'),
  ('seafood',            'Seafood',            'both',  '🦐'),
  ('street-food',        'Street Food',        'both',  '🥢'),
  ('dessert',            'Desserts',           'both',  '🍧'),
  ('drinks-cafe',        'Cafe & Drinks',      'place', '☕'),
  ('market',             'Markets',            'place', '🏪'),
  ('night-food',         'Night Food',         'place', '🌙'),
  ('local-specialty',    'Local Specialties',  'both',  '⭐')
ON CONFLICT (code) DO NOTHING;
