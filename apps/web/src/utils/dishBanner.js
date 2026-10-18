// Map a category code to its designed banner image (used when a dish has no photo).
const BANNER_BY_CATEGORY = {
  seafood: 'seafood',
  'vietnamese-cuisine': 'noodles',
  'night-food': 'noodles',
  'street-food': 'street',
  'local-specialty': 'street',
  dessert: 'dessert',
  'drinks-cafe': 'drinks',
};

export function dishBanner(categoryCode) {
  const name = BANNER_BY_CATEGORY[categoryCode] || 'default';
  return `/banners/dish-${name}.svg`;
}
