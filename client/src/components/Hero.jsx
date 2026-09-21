import React from 'react';
import { Sparkles } from 'lucide-react';
import { formatRupiah } from '../services/api';

export default function Hero({ onSelectCategory, storeInfo }) {
  const heroBanner = storeInfo?.heroBanner;
  const badge = heroBanner?.badge || 'Garansi Segar: Layu atau Rusak Kami Ganti 100%!';
  const title = heroBanner?.title || 'Sayur Segar Panen Subuh,';
  const titleHighlight = heroBanner?.titleHighlight || 'Langsung Sampai di Dapur Anda';
  const subtitle = heroBanner?.subtitle || 'Pesan sekarang sebelum jam 21.00 WIB untuk dikirim pagi besok (06.00 - 08.00 WIB). Kualitas terjamin, bersih, dan hemat belanja harian keluarga.';

  const defaultFeatures = [
    { id: '1', icon: '⏰', title: 'Kirim Pagi 06.00', desc: 'Tiba tepat waktu sebelum mulai masak sarapan' },
    { id: '2', icon: '🛵', title: 'Gratis Ongkir', desc: `Otomatis gratis ongkir belanja min. ${formatRupiah(storeInfo?.freeDeliveryMin || 150000)}` },
    { id: '3', icon: '💵', title: 'Bisa Bayar COD', desc: 'Cek sayuran dulu baru bayar tunai di tempat' },
    { id: '4', icon: '📲', title: 'Order via WhatsApp', desc: 'Bisa pesan langsung terhubung ke chat admin' }
  ];

  const features = (heroBanner?.features && heroBanner.features.length > 0) 
    ? heroBanner.features 
    : defaultFeatures;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 text-white shadow-xl shadow-emerald-950/10 mb-8 mt-4 border border-emerald-700/40">
      {/* Decorative background patterns */}
      <div className="absolute -right-16 -bottom-16 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
      <div className="absolute left-10 top-0 w-60 h-60 rounded-full bg-teal-400/10 blur-3xl pointer-events-none" />

      <div className="relative px-6 py-8 sm:px-10 sm:py-12 md:flex items-center justify-between gap-8">
        <div className="max-w-xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-700/60 border border-emerald-500/30 text-emerald-200 text-xs font-medium backdrop-blur-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span>{badge}</span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight text-white">
            {title} <br />
            {titleHighlight && (
              <span className="text-emerald-300 underline decoration-amber-400 decoration-wavy decoration-2">
                {titleHighlight}
              </span>
            )}
          </h2>

          <p className="text-emerald-100/90 text-sm sm:text-base leading-relaxed">
            {subtitle}
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={() => onSelectCategory('paket-masak')}
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs sm:text-sm shadow-md transition-transform active:scale-95 flex items-center gap-2"
            >
              <span>🍲 Lihat Paket Masak Praktis</span>
            </button>
            <button
              onClick={() => onSelectCategory('sayur-mayur')}
              className="bg-emerald-700/70 hover:bg-emerald-700 text-white font-medium px-4 py-2.5 rounded-xl text-xs sm:text-sm border border-emerald-500/40 transition-colors"
            >
              🥬 Sayuran Hijau Segar
            </button>
          </div>
        </div>

        {/* Feature Cards Grid on Right - Dynamic from storeInfo */}
        <div className="mt-8 md:mt-0 grid grid-cols-2 gap-3 sm:gap-4 max-w-sm w-full">
          {features.map((feat, idx) => (
            <div 
              key={feat.id || idx} 
              className="bg-emerald-950/40 backdrop-blur-xs border border-emerald-600/30 p-3.5 rounded-2xl hover:bg-emerald-950/60 transition-colors"
            >
              <div className="text-2xl mb-1.5">{feat.icon}</div>
              <h3 className="font-bold text-xs sm:text-sm text-white">{feat.title}</h3>
              <p className="text-[11px] text-emerald-200/80 mt-0.5 leading-snug">{feat.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
