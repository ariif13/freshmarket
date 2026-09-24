export function formatDistance(meters) {
  return `${(meters / 1000).toLocaleString('id-ID', { maximumFractionDigits: 3 })} km`;
}

export function deliveryMapUrl(point) {
  if (!point || !Number.isFinite(point.lat) || !Number.isFinite(point.lng)) return '';
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${point.lat},${point.lng}`)}`;
}
