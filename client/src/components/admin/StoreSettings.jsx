import React, { useState } from 'react';
import { 
  Store, 
  Save, 
  Phone, 
  Clock, 
  MapPin, 
  Truck, 
  Check, 
  Sparkles, 
  Layout, 
  Sliders, 
  Layers,
  HelpCircle,
  Eye
} from 'lucide-react';
import { api, formatRupiah } from '../../services/api';

const QUICK_EMOJIS = ['⏰', '🛵', '💵', '📲', '🥬', '🥦', '🚚', '⭐', '🛡️', '🧺', '🏷️', '🍳', '🥕', '🍗', '🌾', '💯'];

export default function StoreSettings({ storeInfo, onUpdateStoreInfo }) {
  const [activeSection, setActiveSection] = useState('banner'); // 'banner' | 'general'

  const [formData, setFormData] = useState({
    name: storeInfo?.name || '',
    tagline: storeInfo?.tagline || '',
    whatsapp: storeInfo?.whatsapp || '',
    address: storeInfo?.address || '',
    openHours: storeInfo?.openHours || '',
    deliveryFee: storeInfo?.deliveryFee || 8000,
    freeDeliveryMin: storeInfo?.freeDeliveryMin || 150000,
    heroBanner: storeInfo?.heroBanner || {
      badge: 'Garansi Segar: Layu atau Rusak Kami Ganti 100%!',
      title: 'Sayur Segar Panen Subuh,',
      titleHighlight: 'Langsung Sampai di Dapur Anda',
      subtitle: 'Pesan sekarang sebelum jam 21.00 WIB untuk dikirim pagi besok (06.00 - 08.00 WIB). Kualitas terjamin, bersih, dan hemat belanja harian keluarga.',
      features: [
        {
          id: 'feat-1',
          icon: '⏰',
          title: 'Kirim Pagi 06.00',
          desc: 'Tiba tepat waktu sebelum mulai masak sarapan'
        },
        {
          id: 'feat-2',
          icon: '🛵',
          title: 'Gratis Ongkir',
          desc: 'Otomatis gratis ongkir belanja min. Rp 150.000'
        },
        {
          id: 'feat-3',
          icon: '💵',
          title: 'Bisa Bayar COD',
          desc: 'Cek sayuran dulu baru bayar tunai di tempat'
        },
        {
          id: 'feat-4',
          icon: '📲',
          title: 'Order via WhatsApp',
          desc: 'Bisa pesan langsung terhubung ke chat admin'
        }
      ]
    }
  });

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // Helper to update a feature card
  const handleFeatureChange = (index, field, value) => {
    setFormData(prev => {
      const currentFeatures = [...(prev.heroBanner?.features || [])];
      if (!currentFeatures[index]) {
        currentFeatures[index] = { id: `feat-${index + 1}`, icon: '⭐', title: '', desc: '' };
      }
      currentFeatures[index] = {
        ...currentFeatures[index],
        [field]: value
      };
      return {
        ...prev,
        heroBanner: {
          ...prev.heroBanner,
          features: currentFeatures
        }
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const updated = await api.updateStoreInfo({
        ...formData,
        deliveryFee: Number(formData.deliveryFee),
        freeDeliveryMin: Number(formData.freeDeliveryMin)
      });
      onUpdateStoreInfo(updated);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      alert('Gagal menyimpan pengaturan: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const features = formData.heroBanner?.features || [];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-emerald-700" />
            <span>Pengaturan Toko & Tampilan Banner</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Sesuaikan teks banner, ikon 4 kartu keunggulan, tarif ongkir, dan kontak WhatsApp
          </p>
        </div>

        {success && (
          <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 animate-fade-in self-start sm:self-center">
            <Check className="w-3.5 h-3.5" /> Pengaturan Tersimpan!
          </span>
        )}
      </div>

      {/* Section Switcher Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
        <button
          type="button"
          onClick={() => setActiveSection('banner')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeSection === 'banner'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layout className="w-4 h-4" />
          <span>🎨 Tampilan Banner & 4 Kartu Fitur</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('general')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeSection === 'general'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>🏪 Profil Toko & Tarif Ongkir</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SECTION 1: HERO BANNER & 4 FEATURE CARDS */}
        {activeSection === 'banner' && (
          <div className="space-y-6">
            {/* Live Mini Preview Box */}
            <div className="bg-slate-900 text-white p-5 rounded-3xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
                <span className="flex items-center gap-1.5 font-bold text-emerald-400">
                  <Eye className="w-4 h-4" /> Pratinjau Tampilan Beranda (Live Preview)
                </span>
                <span className="text-[11px] text-slate-500">Tampilan real-time sesuai ketikan Anda</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                {/* Left Side Preview */}
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-800/80 text-emerald-200 text-[10px] font-medium">
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    <span>{formData.heroBanner?.badge || 'Badge Garansi'}</span>
                  </div>
                  <h4 className="text-lg font-black text-white leading-snug">
                    {formData.heroBanner?.title || 'Judul Utama,'}{' '}
                    <span className="text-emerald-300 underline decoration-amber-400 decoration-wavy decoration-1">
                      {formData.heroBanner?.titleHighlight || 'Teks Berwarna'}
                    </span>
                  </h4>
                  <p className="text-xs text-emerald-100/80 line-clamp-2">
                    {formData.heroBanner?.subtitle || 'Deskripsi jadwal pengiriman...'}
                  </p>
                </div>

                {/* Right Side Preview (The 4 Feature Cards) */}
                <div className="grid grid-cols-2 gap-2.5">
                  {features.slice(0, 4).map((f, i) => (
                    <div key={i} className="bg-emerald-950/60 border border-emerald-600/30 p-2.5 rounded-xl">
                      <div className="text-lg mb-1">{f.icon || '⭐'}</div>
                      <div className="font-bold text-xs text-white truncate">{f.title || `Fitur ${i + 1}`}</div>
                      <div className="text-[10px] text-emerald-200/80 line-clamp-2 leading-tight mt-0.5">
                        {f.desc || 'Keterangan fitur...'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Banner Main Texts Setting */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 text-xs shadow-2xs">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5 pb-2 border-b border-slate-100">
                <span>1. Teks Banner Utama</span>
              </h4>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Label Garansi / Badge Kecil
                </label>
                <input
                  type="text"
                  value={formData.heroBanner?.badge || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    heroBanner: { ...formData.heroBanner, badge: e.target.value }
                  })}
                  placeholder="Misal: Garansi Segar: Layu atau Rusak Kami Ganti 100%!"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Judul Banner (Baris Pertama)
                  </label>
                  <input
                    type="text"
                    value={formData.heroBanner?.title || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      heroBanner: { ...formData.heroBanner, title: e.target.value }
                    })}
                    placeholder="Misal: Sayur Segar Panen Subuh,"
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Judul Highlight (Warna Hijau & Bergelombang)
                  </label>
                  <input
                    type="text"
                    value={formData.heroBanner?.titleHighlight || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      heroBanner: { ...formData.heroBanner, titleHighlight: e.target.value }
                    })}
                    placeholder="Misal: Langsung Sampai di Dapur Anda"
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none font-bold text-emerald-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Keterangan / Subtitle Banner
                </label>
                <textarea
                  rows="2"
                  value={formData.heroBanner?.subtitle || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    heroBanner: { ...formData.heroBanner, subtitle: e.target.value }
                  })}
                  placeholder="Pesan sekarang sebelum jam 21.00 WIB untuk dikirim pagi besok..."
                  className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none"
                />
              </div>
            </div>

            {/* 4 Feature Highlight Cards Configuration */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-5 text-xs shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-3 border-b border-slate-100">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">
                    2. Pengaturan 4 Kartu Fitur (Ikon, Judul & Keterangan)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Kartu ini tampil di sebelah kanan banner untuk meyakinkan pelanggan berbelanja
                  </p>
                </div>
              </div>

              {/* Grid of 4 Cards Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[0, 1, 2, 3].map((index) => {
                  const card = features[index] || { icon: '⭐', title: '', desc: '' };
                  return (
                    <div 
                      key={index} 
                      className="bg-slate-50/90 rounded-2xl p-4 border border-slate-200 space-y-3 relative hover:border-emerald-300 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-800 text-xs bg-emerald-100/80 px-2.5 py-0.5 rounded-lg">
                          Kartu Fitur #{index + 1}
                        </span>
                        <span className="text-2xl">{card.icon || '⭐'}</span>
                      </div>

                      {/* Icon / Emoji Input & Quick Palette */}
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Ikon / Emoji:
                        </label>
                        <div className="flex items-center gap-2 mb-2">
                          <input
                            type="text"
                            value={card.icon || ''}
                            onChange={(e) => handleFeatureChange(index, 'icon', e.target.value)}
                            placeholder="⏰"
                            className="w-16 text-center text-lg py-1 rounded-xl border border-slate-300 bg-white font-bold outline-none focus:border-emerald-500"
                          />
                          <span className="text-[11px] text-slate-400">
                            Ketik emoji dari keyboard atau klik saran di bawah:
                          </span>
                        </div>

                        {/* Quick Emoji Buttons */}
                        <div className="flex flex-wrap gap-1 bg-white p-1.5 rounded-xl border border-slate-200">
                          {QUICK_EMOJIS.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => handleFeatureChange(index, 'icon', emoji)}
                              className={`w-7 h-7 flex items-center justify-center rounded-lg text-sm hover:bg-slate-100 transition-transform active:scale-95 ${
                                card.icon === emoji ? 'bg-emerald-100 ring-1 ring-emerald-400' : ''
                              }`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Title */}
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Judul Kartu:
                        </label>
                        <input
                          type="text"
                          value={card.title || ''}
                          onChange={(e) => handleFeatureChange(index, 'title', e.target.value)}
                          placeholder="Misal: Kirim Pagi 06.00 / Gratis Ongkir"
                          className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none bg-white font-bold text-slate-800"
                        />
                      </div>

                      {/* Description */}
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Keterangan / Penjelasan:
                        </label>
                        <textarea
                          rows="2"
                          value={card.desc || ''}
                          onChange={(e) => handleFeatureChange(index, 'desc', e.target.value)}
                          placeholder="Misal: Tiba tepat waktu sebelum mulai masak sarapan"
                          className="w-full text-xs px-3 py-1.5 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none bg-white leading-relaxed"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2: GENERAL STORE PROFILE & DELIVERY FEES */}
        {activeSection === 'general' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 text-xs shadow-2xs">
            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5 pb-2 border-b border-slate-100">
              <Store className="w-4 h-4 text-emerald-700" />
              <span>Profil Kios & Tarif Pengiriman</span>
            </h4>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nama Toko Sayur</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Slogan / Tagline Promosi</label>
              <input
                type="text"
                value={formData.tagline}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Nomor WhatsApp Toko (Menerima Pesanan Masuk Otomatis)
              </label>
              <input
                type="text"
                required
                placeholder="6281234567890"
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none font-mono"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Gunakan kode negara (misal 628...). Pelanggan yang checkout via WhatsApp akan otomatis membuka chat ke nomor ini.
              </span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Alamat Fisik / Kios Pasar</label>
              <textarea
                rows="2"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Jam Operasional / Buka Kios</label>
              <input
                type="text"
                value={formData.openHours}
                onChange={(e) => setFormData({ ...formData, openHours: e.target.value })}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tarif Ongkir Standar (Rp)</label>
                <input
                  type="number"
                  value={formData.deliveryFee}
                  onChange={(e) => setFormData({ ...formData, deliveryFee: e.target.value })}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Minimal Belanja Gratis Ongkir (Rp)</label>
                <input
                  type="number"
                  value={formData.freeDeliveryMin}
                  onChange={(e) => setFormData({ ...formData, freeDeliveryMin: e.target.value })}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none font-bold text-emerald-800"
                />
              </div>
            </div>
          </div>
        )}

        {/* Submit Save Button */}
        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs font-bold px-6 py-3 rounded-2xl shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Menyimpan Pengaturan...' : 'Simpan Seluruh Perubahan'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
