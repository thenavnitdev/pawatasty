export const API_FEATURES = {
  USE_EDGE_MERCHANTS: true,
  USE_EDGE_STATIONS: true,
  USE_EDGE_CATEGORIES: true,
  USE_EDGE_DEALS: true,
  USE_EDGE_ORDERS: true,
  USE_EDGE_LIKED_MERCHANTS: true,
  USE_EDGE_PROFILE: true,
  USE_EDGE_SUBSCRIPTIONS: true,
  USE_EDGE_REVIEWS: true,
  USE_EDGE_PAYMENT_METHODS: true,
  USE_EDGE_PROMO_CODES: true,
  USE_EDGE_POINTS: true,
};

export function isFeatureEnabled(feature: keyof typeof API_FEATURES): boolean {
  return API_FEATURES[feature] === true;
}
