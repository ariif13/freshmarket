import React from 'react';
import { Plus, Minus, ShoppingCart, Check, Info } from 'lucide-react';
import { formatRupiah } from '../services/api';
import StarRating from './reviews/StarRating';

export default function ProductCard({ 
  product, 
  onAddToCart, 
  onUpdateCartQty, 
  cartItem,
  onOpenDetail 
}) {
  const isOutOfStock = !product.available || product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock <= 5;
  const currentQty = cartItem ? cartItem.quantity : 0;

  return (
    <div className={`group bg-white rounded-2xl border transition-all duration-200 flex flex-col justify-between overflow-hidden relative ${
      isOutOfStock 
        ? 'border-slate-200 opacity-75 grayscale-20' 
        : 'border-slate-200 hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-500/5'
    }`}>
      {/* Product Image & Badges */}
      <div 
        onClick={() => onOpenDetail(product)} 
        className="relative h-44 sm:h-48 overflow-hidden bg-slate-100 cursor-pointer"
      >
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />

        {/* Top Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
          {product.badge && (
            <span className="bg-emerald-600/95 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs">
              {product.badge}
            </span>
          )}
          {product.organic && (
            <span className="bg-teal-600/95 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs">
              🌱 Organik
            </span>
          )}
        </div>

        {/* Stock / Status Badge */}
        {isOutOfStock ? (
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center">
            <span className="bg-rose-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
              Habis Terjual
            </span>
          </div>
        ) : isLowStock ? (
          <span className="absolute bottom-2 right-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs">
            Sisa {product.stock} {product.unit.split(' ')[0]}
          </span>
        ) : null}

        {/* Detail preview hint on hover */}
        <button 
          aria-label="Detail Produk"
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/80 hover:bg-white text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-xs"
        >
          <Info className="w-4 h-4" />
        </button>
      </div>

      {/* Product Info */}
      <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="text-[11px] font-medium text-emerald-700 capitalize tracking-wide mb-1">
            {product.category.replace('-', ' ')}
          </div>
          <h3 
            onClick={() => onOpenDetail(product)}
            className="font-bold text-slate-800 text-sm sm:text-base leading-snug group-hover:text-emerald-700 cursor-pointer transition-colors line-clamp-2"
          >
            {product.name}
          </h3>
          {product.totalReviews > 0 && (
            <div className="mt-1">
              <StarRating
                value={product.avgRating || 0}
                size="sm"
                showValue
                total={product.totalReviews}
              />
            </div>
          )}
          <p className="text-xs text-slate-400 mt-0.5">
            Satuan: <span className="text-slate-600 font-medium">{product.unit}</span>
          </p>
        </div>

        {/* Price & Action Section */}
        <div className="mt-4 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Harga</div>
            <div className="text-sm sm:text-base font-extrabold text-emerald-800">
              {formatRupiah(product.price)}
            </div>
          </div>

          {/* Cart Control Buttons */}
          <div>
            {isOutOfStock ? (
              <button 
                disabled 
                className="bg-slate-100 text-slate-400 text-xs font-semibold px-3 py-2 rounded-xl cursor-not-allowed"
              >
                Habis
              </button>
            ) : currentQty > 0 ? (
              <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-300 rounded-xl p-0.5 shadow-2xs">
                <button
                  onClick={() => onUpdateCartQty(product.id, currentQty - 1)}
                  className="w-7 h-7 flex items-center justify-center bg-white text-emerald-800 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-colors"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-6 text-center text-xs font-bold text-emerald-950">
                  {currentQty}
                </span>
                <button
                  onClick={() => {
                    if (currentQty < product.stock) {
                      onUpdateCartQty(product.id, currentQty + 1);
                    }
                  }}
                  disabled={currentQty >= product.stock}
                  className={`w-7 h-7 flex items-center justify-center bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-xs font-bold transition-colors ${
                    currentQty >= product.stock ? 'opacity-40 cursor-not-allowed' : ''
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => onAddToCart(product)}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-xs shadow-emerald-600/20 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Beli</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
