import React, { useState, useEffect } from 'react';
import { 
  X, 
  Send, 
  MessageSquare, 
  Truck, 
  CreditCard, 
  MapPin, 
  User, 
  Phone, 
  FileText, 
  Check, 
  QrCode,
  Banknote,
  Building2,
  ShieldCheck
} from 'lucide-react';
import { formatRupiah } from '../services/api';

export default function CheckoutModal({
  isOpen,
  onClose,
  cart,
  storeInfo,
  onSubmitOrder,
  isSubmitting,
  currentUser
}) {
  if (!isOpen) return null;

  const [formData, setFormData] = useState({
    customerName: currentUser?.name || '',
    customerPhone: currentUser?.phone || '',
    address: currentUser?.address || '',
    deliverySlot: storeInfo?.deliverySlots?.[0]?.label || 'Pengiriman Pagi 1 (06.00 - 08.00 WIB)',
    paymentMethod: 'COD (Bayar di Tempat)',
    notes: ''
  });

  // Sinkronkan pre-fill saat user login berubah
  useEffect(() => {
    if (currentUser) {
      setFormData((prev) => ({
        ...prev,
        customerName: prev.customerName || currentUser.name || '',
        customerPhone: prev.customerPhone || currentUser.phone || '',
        address: prev.address || currentUser.address || ''
      }));
    }
  }, [currentUser]);

  // Indikator apakah alamat berasal dari profil (belum diedit)
  const isAddressFromProfile = currentUser?.address &&
    formData.address.trim() === currentUser.address.trim();

  const [formErrors, setFormErrors] = useState({});

  const itemsTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const freeMin = storeInfo?.freeDeliveryMin || 150000;
  const deliveryFee = itemsTotal >= freeMin ? 0 : (storeInfo?.deliveryFee || 8000);
  const grandTotal = itemsTotal + deliveryFee;

  const validate = () => {
    const errors = {};
    if (!formData.customerName.trim()) errors.customerName = 'Nama wajib diisi';
    if (!formData.customerPhone.trim()) {
      errors.customerPhone = 'Nomor WhatsApp wajib diisi';
    } else if (!/^[0-9+-\s]{8,16}$/.test(formData.customerPhone.trim())) {
      errors.customerPhone = 'Format nomor HP tidak valid';
    }
    if (!formData.address.trim()) errors.address = 'Alamat pengiriman wajib diisi';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSystemSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmitOrder({
      ...formData,
      items: cart,
      orderMethod: 'system'
    });
  };

  const handleWhatsAppSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    // Build formatted WhatsApp message
    const orderItemsText = cart.map((item, idx) => 
      `${idx + 1}. *${item.name}* (${item.quantity}x ${item.unit}) = ${formatRupiah(item.price * item.quantity)}`
    ).join('\n');

    const rawPhone = (storeInfo?.whatsapp || '6281234567890').replace(/[^0-9]/g, '');
    const message = `Halo *${storeInfo?.name || 'FreshMarket'}*, saya ingin memesan belanjaan segar:\n\n` +
      `👤 *Data Pemesan:*\n` +
      `• Nama: ${formData.customerName}\n` +
      `• No. HP/WA: ${formData.customerPhone}\n` +
      `• Alamat: ${formData.address}\n` +
      `• Jadwal Kirim: ${formData.deliverySlot}\n` +
      `• Pembayaran: ${formData.paymentMethod}\n` +
      (formData.notes ? `• Catatan: ${formData.notes}\n` : '') +
      `\n🛒 *Daftar Belanjaan:*\n${orderItemsText}\n\n` +
      `• Subtotal: ${formatRupiah(itemsTotal)}\n` +
      `• Ongkir: ${deliveryFee === 0 ? 'GRATIS' : formatRupiah(deliveryFee)}\n` +
      `💰 *Total Pembayaran: ${formatRupiah(grandTotal)}*\n\n` +
      `Mohon segera diproses ya, terima kasih! 🙏`;

    const waUrl = `https://wa.me/${rawPhone}?text=${encodeURIComponent(message)}`;

    // Submit order to database as well
    onSubmitOrder({
      ...formData,
      items: cart,
      orderMethod: 'whatsapp'
    });

    // Open WhatsApp in new window
    window.open(waUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-100 animate-scale-up">
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md px-6 py-4 border-b border-slate-100 flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-black text-slate-900">Form Pengiriman & Checkout</h2>
            <p className="text-xs text-slate-500">Lengkapi alamat agar sayur diantar tepat waktu & segar</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form className="p-6 space-y-6">
          {/* Login-as indicator */}
          {currentUser && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 flex items-center gap-2 text-xs text-emerald-900">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>
                Anda checkout sebagai <b>{currentUser.name}</b>
                <span className="text-emerald-700"> ({currentUser.email})</span>
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

          {/* Delivery Slot Selection */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
              <Truck className="w-4 h-4" /> Pilih Jadwal Pengiriman Sayur
            </h3>
            <div className="grid grid-cols-1 gap-2.5">
              {(storeInfo?.deliverySlots || [
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
                      <div className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-2">
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
              {[
                { 
                  id: 'COD', 
                  label: 'COD (Bayar di Tempat)', 
                  desc: 'Bayar tunai ke kurir saat sayur tiba',
                  icon: Banknote 
                },
                { 
                  id: 'QRIS', 
                  label: 'QRIS / E-Wallet', 
                  desc: 'Gopay, OVO, Dana, ShopeePay',
                  icon: QrCode 
                },
                { 
                  id: 'Transfer', 
                  label: 'Transfer Bank', 
                  desc: 'BCA, Mandiri, BRI',
                  icon: Building2 
                }
              ].map((pay) => {
                const isSelected = formData.paymentMethod === pay.label;
                const IconComponent = pay.icon;
                return (
                  <label
                    key={pay.id}
                    onClick={() => setFormData({ ...formData, paymentMethod: pay.label })}
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
                        checked={isSelected}
                        onChange={() => {}}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-800">{pay.label}</span>
                    <span className="text-[10px] text-slate-500 mt-0.5">{pay.desc}</span>
                  </label>
                );
              })}
            </div>

            {/* QRIS / Bank Transfer Simulation Notice */}
            {formData.paymentMethod.includes('QRIS') && (
              <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-center gap-3 text-xs text-emerald-900">
                <div className="w-12 h-12 bg-white rounded-lg p-1 border border-emerald-300 flex items-center justify-center shrink-0">
                  <QrCode className="w-9 h-9 text-slate-800" />
                </div>
                <div>
                  <span className="font-bold block">QRIS FreshMarket Otomatis:</span>
                  <span>Kode QRIS toko akan ditampilkan setelah pesanan dibuat untuk discan dari e-wallet / m-banking Anda.</span>
                </div>
              </div>
            )}

            {formData.paymentMethod.includes('Transfer') && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-900 space-y-1">
                <span className="font-bold block">Nomor Rekening FreshMarket:</span>
                <div>• BCA: <b>8720-123-456</b> (a.n. FreshMarket)</div>
                <div>• Mandiri: <b>137-00-987654-1</b> (a.n. FreshMarket)</div>
              </div>
            )}
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
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
            <div className="font-bold text-slate-800">Ringkasan Biaya:</div>
            <div className="flex justify-between text-slate-600">
              <span>Total Belanja ({cart.length} item):</span>
              <span>{formatRupiah(itemsTotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Biaya Pengiriman:</span>
              <span>{deliveryFee === 0 ? <b className="text-emerald-600">GRATIS</b> : formatRupiah(deliveryFee)}</span>
            </div>
            <div className="flex justify-between text-sm font-black text-slate-900 pt-1.5 border-t border-slate-200">
              <span>Total yang Harus Dibayar:</span>
              <span className="text-emerald-700">{formatRupiah(grandTotal)}</span>
            </div>
          </div>

          {/* Dual Checkout CTA Buttons */}
          <div className="space-y-2.5 pt-2">
            <button
              type="button"
              onClick={handleWhatsAppSubmit}
              disabled={isSubmitting}
              className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold py-3.5 px-4 rounded-2xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 text-sm transition-all"
            >
              <MessageSquare className="w-5 h-5 text-emerald-200" />
              <span>Pesan via WhatsApp (Rekomendasi Cepat)</span>
            </button>

            <button
              type="button"
              onClick={handleSystemSubmit}
              disabled={isSubmitting}
              className="w-full bg-slate-100 hover:bg-slate-200 active:scale-98 text-slate-800 font-bold py-3 px-4 rounded-2xl flex items-center justify-center gap-2 text-xs transition-all border border-slate-200"
            >
              <Send className="w-4 h-4 text-emerald-700" />
              <span>Pesan Langsung di Sistem Web (Tanpa Buka WA)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
