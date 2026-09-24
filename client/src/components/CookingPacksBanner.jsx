import React from 'react';
import { ShoppingBag, ArrowRight, UtensilsCrossed, Check } from 'lucide-react';
import { formatRupiah } from '../services/api';

export default function CookingPacksBanner({ products, onAddToCart, onOpenDetail }) {
  const packs = products.filter(p => p.category === 'paket-masak');
  if (!packs.length) return null;

  return (
    <section className="my-10 bg-gradient-to-r from-amber-50 via-orange-50 to-emerald-50 rounded-3xl p-6 sm:p-8 border border-amber-200/70 shadow-xs">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-2">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold mb-2">
            <UtensilsCrossed className="w-3.5 h-3.5" />
            <span>Pilihan Favorit Ibu-Ibu & Koki Rumahan</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">
            Paket Masak Siap Olah Hemat & Praktis
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Sayuran sudah lengkap ditakar per porsi beserta bumbu racik. Tinggal cemplung, anti ribet!
          </p>
        </div>
      </div>

      {/* Packs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {packs.map((pack) => {
          const hasVariants = pack.hasVariants || pack.variants?.length > 0;
          const price = hasVariants ? pack.priceFrom : pack.price;
          const purchasable = hasVariants ? pack.purchasable : pack.available && pack.stock > 0;
          return (
          <div 
            key={pack.id} 
            className="bg-white rounded-2xl p-4 border border-amber-200/60 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="relative h-40 rounded-xl overflow-hidden mb-3 bg-slate-100">
                <img 
                  src={pack.image} 
                  alt={pack.name} 
                  className="w-full h-full object-cover"
                />
                <span className="absolute top-2 left-2 bg-amber-500 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-md shadow-xs">
                  {pack.badge || 'Paket Praktis'}
                </span>
              </div>
              <h3 className="font-bold text-slate-900 text-base leading-snug">
                {pack.name}
              </h3>
              <p className="text-xs text-slate-500 line-clamp-2 mt-1.5 leading-relaxed">
                {pack.description}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400 block">Harga Paket</span>
                <span className="text-base font-black text-emerald-800">
                  {formatRupiah(price)}
                </span>
              </div>
              <button
                onClick={() => hasVariants ? onOpenDetail(pack) : onAddToCart(pack)}
                disabled={!purchasable}
                className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>{hasVariants ? 'Pilih Varian' : '+ Keranjang'}</span>
              </button>
            </div>
          </div>
          );
        })}
      </div>
    </section>
  );
}
