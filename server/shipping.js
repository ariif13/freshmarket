const { createHmac } = require('crypto');

function shippingError(message, code = 'SHIPPING_INVALID', status = 400) {
  return Object.assign(new Error(message), { status, code });
}

function defaultShippingSettings() {
  return {
    enabled: false,
    storeLocation: null,
    tiers: [{ upToKm: 3, fee: 5000 }, { upToKm: 5, fee: 8000 }, { upToKm: 10, fee: 12000 }],
    freeDeliveryRadiusKm: 3
  };
}

function number(value, label, max, integer = false) {
  if ((typeof value !== 'number' && typeof value !== 'string') || String(value).trim() === '') {
    throw shippingError(`${label} wajib berupa angka.`);
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > max || (integer && !Number.isSafeInteger(parsed))) {
    throw shippingError(`${label} harus ${integer ? 'bilangan bulat ' : ''}antara 0 dan ${max}.`);
  }
  return parsed;
}

function normalizeMoney(value, label) {
  return number(value, label, 1000000000, true);
}

function normalizeLocation(location) {
  if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number' ||
      !Number.isFinite(location.lat) || !Number.isFinite(location.lng) ||
      Math.abs(location.lat) > 90 || Math.abs(location.lng) > 180) {
    throw shippingError('Pilih titik lokasi yang valid pada peta.', 'SHIPPING_LOCATION_REQUIRED');
  }
  return { lat: location.lat, lng: location.lng };
}

function normalizeShippingSettings(settings) {
  if (!settings || typeof settings.enabled !== 'boolean') throw shippingError('Status ongkir jarak tidak valid.');
  const storeLocation = settings.storeLocation == null ? null : normalizeLocation(settings.storeLocation);
  if (settings.enabled && !storeLocation) throw shippingError('Tentukan pin lokasi toko sebelum mengaktifkan ongkir jarak.');
  if (!Array.isArray(settings.tiers) || settings.tiers.length < 1 || settings.tiers.length > 20) {
    throw shippingError('Isi antara 1 hingga 20 rentang jarak pengiriman.');
  }
  let previous = 0;
  const tiers = settings.tiers.map((tier) => {
    const upToKm = number(tier?.upToKm, 'Batas jarak (km)', 1000);
    if (upToKm <= previous) throw shippingError('Batas jarak harus lebih dari nol dan berurutan dari kecil ke besar.');
    previous = upToKm;
    return { upToKm, fee: normalizeMoney(tier?.fee, 'Tarif ongkir') };
  });
  const freeDeliveryRadiusKm = number(settings.freeDeliveryRadiusKm, 'Radius gratis ongkir (km)', 1000);
  if (freeDeliveryRadiusKm <= 0 || freeDeliveryRadiusKm > previous) {
    throw shippingError('Radius gratis ongkir harus lebih dari nol dan tidak melebihi jarak maksimal layanan.');
  }
  return { enabled: settings.enabled, storeLocation, tiers, freeDeliveryRadiusKm };
}

function getShippingSettings(storeInfo = {}) {
  return normalizeShippingSettings(storeInfo.shippingSettings ?? defaultShippingSettings());
}

function distanceMeters(from, to) {
  const radians = (degrees) => degrees * Math.PI / 180;
  const a = Math.sin(radians(to.lat - from.lat) / 2) ** 2 +
    Math.cos(radians(from.lat)) * Math.cos(radians(to.lat)) * Math.sin(radians(to.lng - from.lng) / 2) ** 2;
  // Pembulatan naik ke meter; toleransi hanya untuk galat floating point tepat pada batas.
  return Math.max(0, Math.ceil(6371000 * 2 * Math.atan2(Math.sqrt(Math.min(1, a)), Math.sqrt(Math.max(0, 1 - a))) - 1e-6));
}

function calculateDelivery(storeInfo, itemsTotal, location) {
  const settings = getShippingSettings(storeInfo);
  const freeDeliveryMin = normalizeMoney(storeInfo.freeDeliveryMin ?? 150000, 'Minimal belanja gratis ongkir');
  let baseFee = normalizeMoney(storeInfo.deliveryFee ?? 8000, 'Ongkir standar');
  let destination = null;
  let meters = null;
  let tier = null;
  if (settings.enabled) {
    destination = normalizeLocation(location);
    meters = distanceMeters(settings.storeLocation, destination);
    const index = settings.tiers.findIndex((entry) => meters <= entry.upToKm * 1000);
    if (index < 0) {
      throw shippingError(`Tujuan di luar area pengiriman. Maksimal ${settings.tiers.at(-1).upToKm} km dari toko.`, 'SHIPPING_OUT_OF_RANGE', 422);
    }
    tier = { fromKm: index === 0 ? 0 : settings.tiers[index - 1].upToKm, ...settings.tiers[index] };
    baseFee = tier.fee;
  }
  const freeDeliveryApplied = itemsTotal >= freeDeliveryMin &&
    (!settings.enabled || meters <= settings.freeDeliveryRadiusKm * 1000);
  return {
    mode: settings.enabled ? 'distance' : 'flat',
    calculation: settings.enabled ? 'straight_line' : null,
    storeLocation: settings.enabled ? settings.storeLocation : null,
    destination,
    distanceMeters: meters,
    tier,
    baseFee,
    freeDeliveryMin,
    freeDeliveryRadiusKm: settings.enabled ? settings.freeDeliveryRadiusKm : null,
    freeDeliveryApplied,
    deliveryFee: freeDeliveryApplied ? 0 : baseFee
  };
}

function createDeliveryQuote(storeInfo, items, location, userId, secret) {
  const itemsTotal = Math.round(items.reduce((total, item) => total + item.price * item.quantity, 0) * 100) / 100;
  const deliveryDetails = calculateDelivery(storeInfo, itemsTotal, location);
  const deliveryFee = deliveryDetails.deliveryFee;
  const grandTotal = Math.round((itemsTotal + deliveryFee) * 100) / 100;
  const pricedItems = items.map(({ id, variantId, quantity, price }) => ({ id, variantId: variantId || '', quantity, price }))
    .sort((a, b) => `${a.id}:${a.variantId}`.localeCompare(`${b.id}:${b.variantId}`));
  const signature = createHmac('sha256', secret).update(JSON.stringify({
    userId, pricedItems, deliveryDetails, settings: getShippingSettings(storeInfo)
  })).digest('hex');
  return { itemsTotal, deliveryFee, grandTotal, deliveryDetails, quoteToken: signature,
    shippingConfig: { shippingSettings: getShippingSettings(storeInfo), deliveryFee: storeInfo.deliveryFee ?? 8000, freeDeliveryMin: deliveryDetails.freeDeliveryMin } };
}

module.exports = { defaultShippingSettings, getShippingSettings, normalizeShippingSettings, normalizeMoney, normalizeLocation, distanceMeters, calculateDelivery, createDeliveryQuote };
