import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Send, 
  MessageSquare, 
  Truck, 
  CreditCard, 
  User, 
  QrCode,
  Banknote,
  Building2,
  ShieldCheck
} from 'lucide-react';
import { api, formatRupiah } from '../services/api';
import { deliveryMapUrl, formatDistance } from '../services/shipping';
import PaymentInstructions from './PaymentInstructions';
import DeliveryDetails from './DeliveryDetails';
import LocationPicker from './LocationPicker';

const PAYMENT_ICONS = { cod: Banknote, qris: QrCode, transfer: Building2 };

export default function CheckoutModal({
  isOpen,
  onClose,
  cart,
  storeInfo,
  onSubmitOrder,
  isSubmitting,
  currentUser
}) {
  const [checkoutInfo, setCheckoutInfo] = useState(storeInfo);
  const paymentMethods = (checkoutInfo?.paymentMethods || []).filter((method) => method.enabled);
  const [formData, setFormData] = useState({
    customerName: currentUser?.name || '',
    customerPhone: currentUser?.phone || '',
    address: currentUser?.address || '',
    deliverySlot: storeInfo?.deliverySlots?.[0]?.label || 'Pengiriman Pagi 1 (06.00 - 08.00 WIB)',
    paymentMethodId: paymentMethods[0]?.id || '',
    notes: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [deliveryLocation, setDeliveryLocation] = useState(null);
  const [quoteState, setQuoteState] = useState({ key: '', data: null, error: '' });
  const [retryQuote, setRetryQuote] = useState(0);
  const [submitError, setSubmitError] = useState('');
  const submittingRef = useRef(false);
  const distanceEnabled = checkoutInfo?.shippingSettings?.enabled === true;

  // Reset dan isi kembali data penerima setiap checkout dibuka.
  useEffect(() => {
    if (!isOpen) return;

    setFormData({
      customerName: currentUser?.name || '',
      customerPhone: currentUser?.phone || '',
      address: currentUser?.address || '',
      deliverySlot: storeInfo?.deliverySlots?.[0]?.label || 'Pengiriman Pagi 1 (06.00 - 08.00 WIB)',
      paymentMethodId: storeInfo?.paymentMethods?.find((method) => method.enabled)?.id || '',
      notes: ''
    });
    setFormErrors({});
    setCheckoutInfo(storeInfo);
    setDeliveryLocation(null);
    setQuoteState({ key: '', data: null, error: '' });
    setSubmitError('');
  }, [isOpen, currentUser, storeInfo]);

  // Batalkan estimasi lama segera saat keranjang atau pin berubah, sebelum efek berikutnya.
  const quoteKey = JSON.stringify({
    items: cart.map(({ id, variantId, quantity, price }) => ({ id, variantId, quantity, price })),
    deliveryLocation, shippingSettings: checkoutInfo?.shippingSettings,
    deliveryFee: checkoutInfo?.deliveryFee, freeDeliveryMin: checkoutInfo?.freeDeliveryMin
  });
  useEffect(() => {
    if (!isOpen) return;
    const payload = JSON.parse(quoteKey);
    if (payload.shippingSettings?.enabled && !payload.deliveryLocation) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const data = await api.getShippingQuote({ items: payload.items, deliveryLocation: payload.deliveryLocation }, controller.signal);
        if (controller.signal.aborted) return;
        setQuoteState({ key: quoteKey, data, error: '' });
        setCheckoutInfo((previous) => ({ ...previous, ...data.shippingConfig }));
      } catch (error) {
        if (controller.signal.aborted) return;
        setQuoteState({ key: quoteKey, data: null, error: error.message });
        if (error.code?.startsWith('SHIPPING_')) {
          try {
            const latest = await api.getStoreInfo();
            if (!controller.signal.aborted) setCheckoutInfo(latest);
          } catch { /* Pesan estimasi tetap ditampilkan; pengguna dapat mencoba lagi. */ }
        }
      }
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [isOpen, quoteKey, retryQuote]);

  // Indikator apakah alamat berasal dari profil (belum diedit)
  const isAddressFromProfile = currentUser?.address &&
    formData.address.trim() === currentUser.address.trim();

  if (!isOpen) return null;

  const quote = quoteState.key === quoteKey ? quoteState.data : null;
  const quoteError = quoteState.key === quoteKey ? quoteState.error : '';
  const needsLocation = distanceEnabled && !deliveryLocation;
  const itemsTotal = quote?.itemsTotal ?? cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const deliveryFee = quote?.deliveryFee;
  const grandTotal = quote?.grandTotal;
  const selectedPayment = paymentMethods.find((method) => method.id === formData.paymentMethodId);

  const validate = () => {
    const errors = {};
    if (!formData.customerName.trim()) errors.customerName = 'Nama wajib diisi';
    if (!formData.customerPhone.trim()) {
      errors.customerPhone = 'Nomor WhatsApp wajib diisi';
    } else if (!/^[0-9+-\s]{8,16}$/.test(formData.customerPhone.trim())) {
      errors.customerPhone = 'Format nomor HP tidak valid';
    }
    if (!formData.address.trim()) errors.address = 'Alamat pengiriman wajib diisi';
    if (!selectedPayment) errors.paymentMethod = 'Pilih metode pembayaran yang tersedia.';
    if (!quote) errors.shipping = needsLocation ? 'Pilih pin tujuan pengiriman terlebih dahulu.' : 'Tunggu estimasi ongkir yang valid sebelum memesan.';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const submitOrder = async (e, orderMethod) => {
    e.preventDefault();
    if (isSubmitting || submittingRef.current || !validate()) return;
    submittingRef.current = true;
    setSubmitError('');
    const popup = orderMethod === 'whatsapp' ? window.open('about:blank', '_blank') : null;
    if (popup) popup.opener = null;
    let order;
    try {
      order = await onSubmitOrder({ ...formData, items: cart, orderMethod, deliveryLocation, shippingQuoteToken: quote.quoteToken });
    } catch (error) {
      popup?.close();
      setSubmitError(error.message || 'Gagal memproses pesanan. Silakan coba lagi.');
      setQuoteState({ key: '', data: null, error: '' });
      setRetryQuote((value) => value + 1);
      if (error.quote?.shippingConfig) setCheckoutInfo((previous) => ({ ...previous, ...error.quote.shippingConfig }));
      else if (error.code?.startsWith('SHIPPING_')) {
        try { setCheckoutInfo(await api.getStoreInfo()); } catch { /* Coba lagi dari estimasi ongkir. */ }
      }
      return;
    } finally {
      submittingRef.current = false;
    }
    if (!order) { popup?.close(); return; }
    if (orderMethod !== 'whatsapp') return;

    const orderItemsText = order.items.map((item, idx) =>
      `${idx + 1}. *${item.name}${item.variantName ? ` - ${item.variantName}` : ''}* (${item.quantity}x ${item.unit}) = ${formatRupiah(item.price * item.quantity)}`
    ).join('\n');

    const rawPhone = (storeInfo?.whatsapp || '6281234567890').replace(/[^0-9]/g, '');
    const message = `Halo *${storeInfo?.name || 'FreshMarket'}*, saya ingin memesan belanjaan segar:\n\n` +
      `• Nomor Pesanan: ${order.id}\n` +
      `👤 *Data Pemesan:*\n` +
      `• Nama: ${order.customerName}\n` +
      `• No. HP/WA: ${order.customerPhone}\n` +
      `• Alamat: ${order.address}\n` +
      (order.deliveryDetails?.mode === 'distance' ? `• Lokasi: ${deliveryMapUrl(order.deliveryDetails.destination)}\n• Jarak: ${formatDistance(order.deliveryDetails.distanceMeters)} (garis lurus)\n` : '') +
      `• Jadwal Kirim: ${order.deliverySlot}\n` +
      `• Pembayaran: ${order.paymentMethod}\n` +
      (order.notes ? `• Catatan: ${order.notes}\n` : '') +
      `\n🛒 *Daftar Belanjaan:*\n${orderItemsText}\n\n` +
      `• Subtotal: ${formatRupiah(order.itemsTotal)}\n` +
      `• Ongkir: ${order.deliveryFee === 0 ? 'GRATIS' : formatRupiah(order.deliveryFee)}\n` +
      `💰 *Total Pembayaran: ${formatRupiah(order.grandTotal)}*\n\n` +
      `Mohon segera diproses ya, terima kasih! 🙏`;

    const waUrl = `https://wa.me/${rawPhone}?text=${encodeURIComponent(message)}`;

    if (popup) popup.location.href = waUrl;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative bg-white rounded-3xl max-w-2xl min-w-0 w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-100 animate-scale-up">
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md px-6 py-4 border-b border-slate-100 flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-black text-slate-900">Form Pengiriman & Checkout</h2>
            <p className="text-xs text-slate-500">Lengkapi alamat agar sayur diantar tepat waktu & segar</p>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form className="p-6 space-y-6" onSubmit={(event) => event.preventDefault()}>
          <fieldset disabled={isSubmitting} className="space-y-6 min-w-0">
          {/* Login-as indicator */}
          {currentUser && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 flex items-center gap-2 text-xs text-emerald-900">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span className="min-w-0 break-words">
                Anda checkout sebagai <b>{currentUser.name}</b>
                <span className="text-emerald-700 break-all"> ({currentUser.email})</span>
              </span>
            </div>
          )}

          {/* Customer Info Section */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-4 h-4" /> Informasi Penerima
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Lengkap / Panggilan <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Misal: Ibu Ratna"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    className={`w-full text-sm px-3.5 py-2.5 rounded-xl border ${
                      formErrors.customerName ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 focus:border-emerald-500'
                    } focus:ring-2 focus:ring-emerald-200 outline-none`}
                  />
                </div>
                {formErrors.customerName && (
                  <span className="text-[11px] text-rose-500 mt-1 block">{formErrors.customerName}</span>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nomor WhatsApp / HP Aktif <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    placeholder="Misal: 081234567890"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                    className={`w-full text-sm px-3.5 py-2.5 rounded-xl border ${
                      formErrors.customerPhone ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 focus:border-emerald-500'
                    } focus:ring-2 focus:ring-emerald-200 outline-none`}
                  />
                </div>
                {formErrors.customerPhone && (
                  <span className="text-[11px] text-rose-500 mt-1 block">{formErrors.customerPhone}</span>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Alamat Lengkap & Patokan Rumah <span className="text-rose-500">*</span>
                </label>
                {currentUser?.address && !isAddressFromProfile && (
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, address: currentUser.address })}
                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
                  >
                    Pakai Alamat Profil
                  </button>
                )}
              </div>
              <textarea
                required
                rows="2"
                placeholder="Jl. Melati No. 5, RT 02/04 (Rumah pagar hitam sebelah warung Bu Siti)"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className={`w-full text-sm px-3.5 py-2 rounded-xl border ${
                  formErrors.address ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 focus:border-emerald-500'
                } focus:ring-2 focus:ring-emerald-200 outline-none`}
              />
              {isAddressFromProfile && (
                <span className="text-[11px] text-emerald-700 mt-1 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Alamat diambil otomatis dari profil Anda. Bisa diubah untuk pesanan ini.
                </span>
              )}
              {!currentUser?.address && currentUser && (
                <span className="text-[11px] text-amber-700 mt-1 block">
                  💡 Tip: Simpan alamat default di halaman <b>Profil Saya</b> agar tidak perlu isi ulang setiap checkout.
                </span>
              )}
              {formErrors.address && (
                <span className="text-[11px] text-rose-500 mt-1 block">{formErrors.address}</span>
              )}
            </div>
          </div>

          {distanceEnabled && (
            <div className="border-t border-slate-100 pt-4 space-y-3">
              <LocationPicker label="Lokasi pengiriman" value={deliveryLocation} onChange={setDeliveryLocation} origin={checkoutInfo.shippingSettings.storeLocation}
                radiusKm={checkoutInfo.shippingSettings.tiers.at(-1)?.upToKm} freeRadiusKm={checkoutInfo.shippingSettings.freeDeliveryRadiusKm} disabled={isSubmitting} />
              <p className="text-xs text-slate-600">Gratis ongkir: belanja minimal {formatRupiah(checkoutInfo.freeDeliveryMin ?? 150000)}, radius maksimal {checkoutInfo.shippingSettings.freeDeliveryRadiusKm} km.</p>
              {needsLocation && <p className="text-xs text-amber-800">Pilih pin alamat tujuan untuk menghitung ongkir.</p>}
            </div>
          )}

          {/* Delivery Slot Selection */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
              <Truck className="w-4 h-4" /> Pilih Jadwal Pengiriman Sayur
            </h3>
            <div className="grid grid-cols-1 gap-2.5">
              {(checkoutInfo?.deliverySlots || [
                { id: 'subuh', label: 'Pengiriman Pagi 1 (06.00 - 08.00 WIB)', desc: 'Paling disarankan untuk masak sarapan & sayur ter-segar' },
                { id: 'pagi', label: 'Pengiriman Pagi 2 (08.30 - 11.00 WIB)', desc: 'Cocok untuk persiapan makan siang' },
                { id: 'siang', label: 'Pengiriman Siang/Sore (13.00 - 16.00 WIB)', desc: 'Pengantaran kloter siang' }
              ]).map((slot) => {
                const isSelected = formData.deliverySlot === slot.label;
                return (
                  <label
                    key={slot.id || slot.label}
                    onClick={() => setFormData({ ...formData, deliverySlot: slot.label })}
                    className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-emerald-50/70 border-emerald-500 shadow-xs'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="deliverySlot"
                      checked={isSelected}
                      onChange={() => {}}
                      className="mt-1 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <div className="text-xs sm:text-sm font-bold text-slate-800 flex flex-wrap items-center gap-2">
                        <span>{slot.label}</span>
                        {slot.id === 'subuh' && (
                          <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            Paling Populer 🔥
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{slot.desc}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard className="w-4 h-4" /> Metode Pembayaran
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {paymentMethods.map((pay) => {
                const isSelected = formData.paymentMethodId === pay.id;
                const IconComponent = PAYMENT_ICONS[pay.id] || CreditCard;
                return (
                  <label
                    key={pay.id}
                    className={`flex flex-col p-3 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-emerald-50/70 border-emerald-500 shadow-xs'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <IconComponent className={`w-4 h-4 ${isSelected ? 'text-emerald-700' : 'text-slate-500'}`} />
                      <input
                         type="radio"
                         name="paymentMethod"
                         value={pay.id}
                         checked={isSelected}
                         onChange={() => setFormData({ ...formData, paymentMethodId: pay.id })}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-800">{pay.label}</span>
                    <span className="text-[10px] text-slate-500 mt-0.5">{pay.description}</span>
                  </label>
                );
              })}
            </div>

            {paymentMethods.length === 0 && (
              <p role="alert" className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900">
                Belum ada metode pembayaran yang aktif. Hubungi admin toko untuk melanjutkan pemesanan.
              </p>
            )}
            {formErrors.paymentMethod && <p role="alert" className="text-xs text-rose-600">{formErrors.paymentMethod}</p>}
            <PaymentInstructions payment={selectedPayment} showQrCode={false} />
          </div>

          {/* Notes */}
          <div className="pt-2 border-t border-slate-100">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Catatan Tambahan untuk Penjual / Kurir (Opsional)
            </label>
            <input
              type="text"
              placeholder="Misal: Tolong pilihkan bayam daun muda, cabai jangan terlalu pedas, titip di teras"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
            />
          </div>

          {/* Order Summary Box */}
          {quoteError && <div role="alert" className="bg-amber-50 text-amber-900 border border-amber-200 rounded-xl p-3 text-xs">
            <p>{quoteError}</p>
            <button type="button" onClick={() => { setQuoteState({ key: '', data: null, error: '' }); setRetryQuote((value) => value + 1); }} className="font-bold underline mt-2">Coba Hitung Ongkir Lagi</button>
          </div>}
          {formErrors.shipping && <p role="alert" className="text-xs text-rose-600">{formErrors.shipping}</p>}
          {submitError && <p role="alert" className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900">{submitError}</p>}
          <DeliveryDetails details={quote?.deliveryDetails} />
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
            <div className="font-bold text-slate-800">Ringkasan Biaya:</div>
            <div className="flex justify-between text-slate-600">
              <span>Total Belanja ({cart.length} item):</span>
              <span>{formatRupiah(itemsTotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Biaya Pengiriman:</span>
              <span>{!quote ? (needsLocation ? 'Pilih lokasi pengiriman' : quoteError ? 'Belum tersedia' : 'Menghitung…') : deliveryFee === 0 ? <b className="text-emerald-600">GRATIS</b> : formatRupiah(deliveryFee)}</span>
            </div>
            <div className="flex justify-between text-sm font-black text-slate-900 pt-1.5 border-t border-slate-200">
              <span>Total yang Harus Dibayar:</span>
              <span className="text-emerald-700">{quote ? formatRupiah(grandTotal) : 'Menunggu ongkir'}</span>
            </div>
          </div>

          {/* Dual Checkout CTA Buttons */}
          <div className="space-y-2.5 pt-2">
            <button
              type="button"
              onClick={(event) => submitOrder(event, 'whatsapp')}
              disabled={isSubmitting || !selectedPayment || !quote}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed active:scale-98 text-white font-bold py-3.5 px-4 rounded-2xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 text-sm transition-all"
            >
              <MessageSquare className="w-5 h-5 text-emerald-200" />
              <span>Pesan via WhatsApp (Rekomendasi Cepat)</span>
            </button>

            <button
              type="button"
              onClick={(event) => submitOrder(event, 'system')}
              disabled={isSubmitting || !selectedPayment || !quote}
              className="w-full bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-98 text-slate-800 font-bold py-3 px-4 rounded-2xl flex items-center justify-center gap-2 text-xs transition-all border border-slate-200"
            >
              <Send className="w-4 h-4 text-emerald-700" />
              <span>Pesan Langsung di Sistem Web (Tanpa Buka WA)</span>
            </button>
          </div>
          </fieldset>
        </form>
      </div>
    </div>
  );
}
