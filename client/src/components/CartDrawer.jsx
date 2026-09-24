import React from 'react';
import { X, Trash2, Plus, Minus, ArrowRight, ShoppingBag, Truck } from 'lucide-react';
import { formatRupiah } from '../services/api';

function getCartItemId(item) {
  return item.cartId || item.id;
}

export default function CartDrawer({
  isOpen,
  onClose,
  cart,
  onUpdateQty,
  onRemoveItem,
  onProceedCheckout,
  storeInfo
}) {
  if (!isOpen) return null;

  const itemsTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const freeMin = storeInfo?.freeDeliveryMin || 150000;
  const standardFee = storeInfo?.deliveryFee || 8000;
  const isFreeDelivery = itemsTotal >= freeMin;
  const deliveryFee = itemsTotal === 0 ? 0 : (isFreeDelivery ? 0 : standardFee);
  const grandTotal = itemsTotal + deliveryFee;
  const diffToFree = Math.max(0, freeMin - itemsTotal);
  const progressPercent = Math.min(100, (itemsTotal / freeMin) * 100);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-fade-in"
      />

      {/* Drawer */}
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col justify-between border-l border-slate-200 animate-slide-left">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-emerald-800 text-white">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-emerald-300" />
              <h2 className="font-bold text-base sm:text-lg">Keranjang Belanja</h2>
              <span className="bg-emerald-700 text-emerald-100 text-xs px-2 py-0.5 rounded-full font-semibold">
                {cart.length} Jenis
              </span>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-emerald-700/60 hover:bg-emerald-700 flex items-center justify-center text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Free Shipping Progress Indicator */}
          <div className="bg-emerald-50 px-4 py-3 border-b border-emerald-100">
            <div className="flex items-center justify-between text-xs mb-1.5 font-semibold">
              <span className="flex items-center gap-1.5 text-emerald-900">
                <Truck className="w-4 h-4 text-emerald-600" />
                {isFreeDelivery ? (
                  <span className="text-emerald-700 font-bold">🎉 Hore! Anda Mendapatkan GRATIS ONGKIR!</span>
                ) : (
                  <span>Belanja <b>{formatRupiah(diffToFree)}</b> lagi untuk Gratis Ongkir!</span>
                )}
              </span>
              <span className="text-emerald-700">{Math.round(progressPercent)}%</span>
            </div>
            <div className="w-full bg-emerald-200/70 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Cart Item List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center text-4xl">
                  🥬
                </div>
                <h3 className="font-bold text-slate-800 text-base">Keranjang Anda Masih Kosong</h3>
                <p className="text-xs text-slate-500 max-w-xs">
                  Yuk isi keranjang dengan aneka sayuran segar panen subuh dan paket bumbu dapur!
                </p>
                <button
                  onClick={onClose}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl mt-2 transition-all"
                >
                  Mulai Pilih Sayur
                </button>
              </div>
            ) : (
              cart.map((item) => {
                const cartId = getCartItemId(item);
                return (
                <div 
                  key={cartId}
                  className="flex items-center gap-3 p-3 bg-slate-50/80 hover:bg-slate-50 border border-slate-200/70 rounded-2xl transition-colors"
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-16 h-16 rounded-xl object-cover bg-white shrink-0 border border-slate-100"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-800 text-xs sm:text-sm truncate">
                      {item.name}
                    </h4>
                    <div className="text-[11px] text-slate-500">
                      {item.unit} • {formatRupiah(item.price)}
                    </div>
                    {item.variantName && (
                      <div className="text-[10px] font-semibold text-emerald-700 mt-0.5">
                        Varian: {item.variantName}
                      </div>
                    )}
                    <div className="text-xs font-bold text-emerald-800 mt-1">
                      Total: {formatRupiah(item.price * item.quantity)}
                    </div>
                  </div>

                  {/* Quantity & Delete Controls */}
                  <div className="flex flex-col items-end gap-2">
                    <button
                      onClick={() => onRemoveItem(cartId)}
                      className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                      title="Hapus item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <div className="flex items-center bg-white border border-slate-200 rounded-lg shadow-2xs">
                      <button
                        onClick={() => onUpdateQty(cartId, item.quantity - 1)}
                        className="w-6 h-6 flex items-center justify-center text-slate-600 hover:bg-slate-100 font-bold text-xs rounded-l"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center text-xs font-bold text-slate-800">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => onUpdateQty(cartId, item.quantity + 1)}
                        disabled={Number.isFinite(item.stock) && item.quantity >= item.stock}
                        className="w-6 h-6 flex items-center justify-center text-slate-600 hover:bg-slate-100 font-bold text-xs rounded-r"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
                );
              })
            )}
          </div>

          {/* Footer Summary & Checkout */}
          {cart.length > 0 && (
            <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 space-y-3">
              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Subtotal Belanja:</span>
                  <span className="font-semibold text-slate-800">{formatRupiah(itemsTotal)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Ongkos Kirim:</span>
                  <span className="font-semibold">
                    {deliveryFee === 0 ? (
                      <span className="text-emerald-600 font-bold bg-emerald-100 px-2 py-0.5 rounded">
                        GRATIS
                      </span>
                    ) : (
                      formatRupiah(deliveryFee)
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
                  <span>Total Pembayaran:</span>
                  <span className="text-emerald-700 text-base">{formatRupiah(grandTotal)}</span>
                </div>
              </div>

              <button
                onClick={onProceedCheckout}
                className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold py-3.5 px-4 rounded-2xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 text-sm transition-all"
              >
                <span>Lanjut ke Pengiriman & Bayar</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
