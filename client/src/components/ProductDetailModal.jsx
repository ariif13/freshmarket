import React, { useState } from 'react';
import { X, Plus, Minus, ShoppingBag, CheckCircle, ShieldCheck, Sparkles } from 'lucide-react';
import { formatRupiah } from '../services/api';
import StarRating from './reviews/StarRating';
import ReviewSection from './reviews/ReviewSection';

function getCartItemId(item) {
  return item.cartId || item.id;
}

export default function ProductDetailModal({ product, onClose, onAddToCart, cart, onUpdateCartQty }) {
  const initialVariants = product?.variants || [];
  const initialVariant = initialVariants.find((variant) => variant.available && variant.stock > 0) || initialVariants[0];
  const initialCartId = product
    ? (initialVariant ? `${product.id}:${initialVariant.id}` : product.id)
    : '';
  const initialCartItem = (cart || []).find((item) => getCartItemId(item) === initialCartId);
  const [selectedVariantId, setSelectedVariantId] = useState(initialVariant?.id || null);
  const [qty, setQty] = useState(initialCartItem?.quantity || 1);
  const [ratingSummary, setRatingSummary] = useState(null);

  if (!product) return null;

  const variants = product.variants || [];
  const hasVariants = variants.length > 0;
  const selectedVariant = hasVariants
    ? variants.find((variant) => variant.id === selectedVariantId) || variants[0]
    : null;
  const cartId = selectedVariant ? `${product.id}:${selectedVariant.id}` : product.id;
  const cartItem = (cart || []).find((item) => getCartItemId(item) === cartId);
  const price = selectedVariant ? selectedVariant.price : product.price;
  const unit = selectedVariant ? selectedVariant.unit : product.unit;
  const stock = selectedVariant ? selectedVariant.stock : product.stock;
  const isOutOfStock = !product.available || (
    hasVariants
      ? !selectedVariant || !selectedVariant.available || selectedVariant.stock <= 0
      : product.stock <= 0
  );
  const displayAvg = ratingSummary?.average ?? product.avgRating ?? 0;
  const displayTotal = ratingSummary?.total ?? product.totalReviews ?? 0;

  const handleSelectVariant = (variant) => {
    const nextCartId = `${product.id}:${variant.id}`;
    const existing = (cart || []).find((item) => getCartItemId(item) === nextCartId);
    setSelectedVariantId(variant.id);
    setQty(existing?.quantity || 1);
  };

  const handleAdd = () => {
    if (cartItem) {
      onUpdateCartQty(cartId, qty);
    } else {
      onAddToCart(product, qty, selectedVariant);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div
        className="relative bg-white rounded-3xl max-w-lg w-full max-h-[92vh] overflow-hidden shadow-2xl border border-slate-100 animate-scale-up flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-20 w-9 h-9 rounded-full bg-slate-900/40 hover:bg-slate-900/60 text-white flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="overflow-y-auto flex-1">
          <div className="relative h-60 sm:h-64 bg-slate-100 overflow-hidden shrink-0">
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
              {product.badge && (
                <span className="bg-emerald-600 text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow-xs">
                  {product.badge}
                </span>
              )}
              {product.organic && (
                <span className="bg-teal-600 text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow-xs">
                  Organik
                </span>
              )}
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                {product.category?.replace('-', ' ')}
              </span>
              <h2 className="text-xl font-black text-slate-900 mt-1">
                {product.name}
              </h2>
              {displayTotal > 0 && (
                <div className="mt-1.5">
                  <StarRating value={displayAvg} size="md" showValue total={displayTotal} />
                </div>
              )}
              <div className="flex items-center gap-3 mt-2">
                <span className="text-2xl font-black text-emerald-700">
                  {formatRupiah(price)}
                </span>
                <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md font-medium">
                  per {unit}
                </span>
              </div>
            </div>

            <div className="text-sm text-slate-600 leading-relaxed border-y border-slate-100 py-3">
              {product.description || 'Sayuran segar berkualitas tinggi, dipetik langsung dari kebun dan dijaga higienitasnya untuk memenuhi kebutuhan gizi keluarga Anda.'}
            </div>

            {hasVariants && (
              <section className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-emerald-900">Pilih ukuran / paket</h3>
                  <span className="text-[10px] font-semibold text-emerald-700">Harga dan stok per varian</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {variants.map((variant) => {
                    const selected = variant.id === selectedVariant?.id;
                    const unavailable = !product.available || !variant.available || variant.stock <= 0;
                    return (
                      <button
                        key={variant.id}
                        type="button"
                        disabled={unavailable}
                        onClick={() => handleSelectVariant(variant)}
                        className={`text-left rounded-xl border p-3 transition-all ${
                          selected
                            ? 'border-emerald-600 bg-white shadow-xs ring-1 ring-emerald-200'
                            : 'border-emerald-200 bg-white/70 hover:border-emerald-400'
                        } ${unavailable ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-black text-slate-800">{variant.name}</span>
                          <span className="text-[10px] text-slate-500">{variant.unit}</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-emerald-700">{formatRupiah(variant.price)}</span>
                          <span className={`text-[10px] font-semibold ${unavailable ? 'text-rose-600' : 'text-slate-500'}`}>
                            {unavailable ? 'Habis' : `Sisa ${variant.stock}`}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-emerald-50/60 p-3 rounded-2xl border border-emerald-100">
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Panen Segar Subuh</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Bersih Siap Olah</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Kualitas Terjamin</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-emerald-900">
                  Stok Ready: {stock} {unit.split(' ')[0]}
                </span>
              </div>
            </div>

            {!isOutOfStock ? (
              <div className="flex items-center gap-3 pt-2">
                <div className="flex items-center border border-slate-200 rounded-2xl p-1 bg-slate-50">
                  <button
                    onClick={() => setQty(Math.max(1, qty - 1))}
                    className="w-9 h-9 flex items-center justify-center bg-white rounded-xl text-slate-700 hover:bg-emerald-100 font-bold transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-10 text-center font-bold text-slate-800 text-sm">
                    {qty}
                  </span>
                  <button
                    onClick={() => setQty(Math.min(stock, qty + 1))}
                    disabled={qty >= stock}
                    className={`w-9 h-9 flex items-center justify-center bg-white rounded-xl text-slate-700 hover:bg-emerald-100 font-bold transition-colors ${
                      qty >= stock ? 'opacity-40 cursor-not-allowed' : ''
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={handleAdd}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-2xl shadow-md shadow-emerald-600/20 active:scale-98 transition-all flex items-center justify-center gap-2"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>{cartItem ? 'Perbarui Jumlah' : 'Tambahkan ke Keranjang'}</span>
                  <span>{formatRupiah(price * qty)}</span>
                </button>
              </div>
            ) : (
              <div className="bg-rose-50 text-rose-700 text-center p-3 rounded-2xl font-bold text-sm border border-rose-200">
                Maaf, stok produk atau varian ini sedang habis hari ini
              </div>
            )}

            <div className="pt-4 border-t border-slate-100">
              <ReviewSection product={product} onRatingChange={setRatingSummary} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
