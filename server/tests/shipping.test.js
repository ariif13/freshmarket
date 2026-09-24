const { test } = require('node:test');
const assert = require('node:assert/strict');
const { defaultShippingSettings, normalizeShippingSettings, normalizeMoney, calculateDelivery, createDeliveryQuote } = require('../shipping');

const config = () => ({ deliveryFee: 8000, freeDeliveryMin: 150000,
  shippingSettings: { ...defaultShippingSettings(), enabled: true, storeLocation: { lat: 0, lng: 0 } } });
const pointAt = (meters) => ({ lat: 0, lng: meters / 6371000 * 180 / Math.PI });

test('tarif di setiap batas rentang dan satu meter setelahnya', () => {
  for (const [meters, fee] of [[0, 5000], [2999, 5000], [3000, 5000], [3001, 8000], [5000, 8000], [5001, 12000], [10000, 12000]]) {
    const details = calculateDelivery(config(), 10000, pointAt(meters));
    assert.equal(details.distanceMeters, meters);
    assert.equal(details.deliveryFee, fee);
  }
  assert.throws(() => calculateDelivery(config(), 999999, pointAt(10001)), { status: 422, code: 'SHIPPING_OUT_OF_RANGE' });
});

test('gratis ongkir memerlukan minimum belanja DAN radius yang sesuai', () => {
  assert.equal(calculateDelivery(config(), 149999, pointAt(3000)).deliveryFee, 5000);
  assert.equal(calculateDelivery(config(), 150000, pointAt(3000)).deliveryFee, 0);
  assert.equal(calculateDelivery(config(), 150000, pointAt(3001)).deliveryFee, 8000);
  assert.equal(calculateDelivery(config(), 999999, pointAt(9000)).freeDeliveryApplied, false);
});

test('ongkir nol dan minimum belanja nol tidak diganti oleh nilai default', () => {
  assert.equal(calculateDelivery({ deliveryFee: 0, freeDeliveryMin: 150000 }, 1000).deliveryFee, 0);
  assert.equal(calculateDelivery({ deliveryFee: 8000, freeDeliveryMin: 0 }, 1000).deliveryFee, 0);
  const info = config();
  info.freeDeliveryMin = 0;
  assert.equal(calculateDelivery(info, 1, pointAt(3000)).deliveryFee, 0);
  assert.equal(calculateDelivery(info, 1, pointAt(3001)).deliveryFee, 8000);
});

test('konfigurasi jarak, radius dan uang tidak valid ditolak', () => {
  const base = config().shippingSettings;
  for (const change of [
    { enabled: 'true' }, { storeLocation: null }, { tiers: [] },
    { tiers: [{ upToKm: 0, fee: 0 }] },
    { tiers: [{ upToKm: 3, fee: 1 }, { upToKm: 3, fee: 2 }] },
    { tiers: [{ upToKm: 5, fee: 1 }, { upToKm: 3, fee: 2 }] },
    { tiers: [{ upToKm: 5, fee: -1 }] }, { tiers: [{ upToKm: 5, fee: '' }] },
    { freeDeliveryRadiusKm: 0 }, { freeDeliveryRadiusKm: 11 }
  ]) assert.throws(() => normalizeShippingSettings({ ...base, ...change }), { status: 400 });
  for (const value of [null, false, '', ' ', Infinity, -1, 1.5, 1000000001]) {
    assert.throws(() => normalizeMoney(value, 'Tarif'), { status: 400 });
  }
  assert.equal(normalizeMoney('0', 'Tarif'), 0);
});

test('koordinat hilang, palsu, dan di luar rentang geografis ditolak', () => {
  for (const point of [null, {}, { lat: null, lng: 0 }, { lat: '0', lng: 0 }, { lat: 91, lng: 0 }, { lat: 0, lng: 181 }, { lat: NaN, lng: 0 }]) {
    assert.throws(() => calculateDelivery(config(), 10000, point), { status: 400, code: 'SHIPPING_LOCATION_REQUIRED' });
  }
});

test('estimasi terikat pelanggan, pin, isi keranjang, harga, dan aturan ongkir', () => {
  const items = [{ id: 'a', variantId: 'v1', quantity: 2, price: 10000 }, { id: 'b', quantity: 1, price: 20000 }];
  const quote = (info = config(), cart = items, location = pointAt(1000), userId = 'user-1') => createDeliveryQuote(info, cart, location, userId, 'qa-shipping-secret');
  const original = quote();
  assert.equal(original.itemsTotal, 40000);
  assert.equal(original.grandTotal, 45000);
  assert.equal(quote(config(), [...items].reverse()).quoteToken, original.quoteToken);
  assert.notEqual(quote(config(), items, pointAt(1000), 'user-2').quoteToken, original.quoteToken);
  assert.notEqual(quote(config(), items, pointAt(1001)).quoteToken, original.quoteToken);
  assert.notEqual(quote(config(), [{ ...items[0], price: 12000 }]).quoteToken, original.quoteToken);
  const changed = config();
  changed.shippingSettings.tiers[0].fee = 6000;
  assert.notEqual(quote(changed).quoteToken, original.quoteToken);
  // Snapshot tarif lama tidak ikut berubah ketika konfigurasi diganti.
  assert.equal(original.deliveryDetails.baseFee, 5000);
});
