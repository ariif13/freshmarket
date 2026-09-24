import React, { useState, useEffect } from 'react';
import {
  Package,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  ChevronDown,
  ChevronUp,
  MapPin,
  Phone,
  MessageSquare,
  ShoppingBag,
  Receipt,
  RefreshCw,
  ArrowLeft,
  Calendar,
  CreditCard,
  AlertCircle,
  Star,
  Edit3
} from 'lucide-react';
import { api, formatRupiah } from '../../services/api';
import StarRating from '../reviews/StarRating';
import PaymentInstructions from '../PaymentInstructions';

const STATUS_CONFIG = {
  'Menunggu Konfirmasi': {
    color: 'bg-amber-100 text-amber-800 border-amber-300',
    bar: 'bg-amber-500',
    icon: Clock,
    desc: 'Pesanan Anda sedang menunggu konfirmasi dari admin toko.'
  },
  'Sedang Dikemas': {
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    bar: 'bg-blue-500',
    icon: Package,
    desc: 'Sayur segar sedang dipilih dan dikemas dengan rapi untuk Anda.'
  },
  'Sedang Dikirim': {
    color: 'bg-purple-100 text-purple-800 border-purple-300',
    bar: 'bg-purple-500',
    icon: Truck,
    desc: 'Kurir sedang dalam perjalanan mengantar pesanan ke alamat Anda.'
  },
  'Selesai': {
    color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    bar: 'bg-emerald-500',
    icon: CheckCircle2,
    desc: 'Pesanan telah sampai. Terima kasih sudah belanja di FreshMarket!'
  },
  'Dibatalkan': {
    color: 'bg-rose-100 text-rose-800 border-rose-300',
    bar: 'bg-rose-500',
    icon: XCircle,
    desc: 'Pesanan ini telah dibatalkan.'
  }
};

const STATUS_ORDER = ['Menunggu Konfirmasi', 'Sedang Dikemas', 'Sedang Dikirim', 'Selesai'];

// Timeline progress berdasarkan status
function OrderProgress({ status }) {
  if (status === 'Dibatalkan') {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center gap-2 text-xs text-rose-800">
        <XCircle className="w-4 h-4 shrink-0" />
        <span className="font-semibold">Pesanan telah dibatalkan.</span>
      </div>
    );
  }

  const currentIdx = STATUS_ORDER.indexOf(status);

  return (
    <div className="pt-1">
      <div className="flex items-center justify-between mb-2">
        {STATUS_ORDER.map((s, i) => {
          const isActive = i <= currentIdx;
          const IconComp = STATUS_CONFIG[s].icon;
          return (
            <div key={s} className="flex flex-col items-center flex-1 relative">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                isActive
                  ? 'bg-emerald-600 border-emerald-600 text-white'
                  : 'bg-white border-slate-300 text-slate-400'
              }`}>
                <IconComp className="w-4 h-4" />
              </div>
              <span className={`text-[9px] font-bold mt-1 text-center leading-tight ${
                isActive ? 'text-emerald-700' : 'text-slate-400'
              }`}>
                {s.replace('Sedang ', '')}
              </span>
              {i < STATUS_ORDER.length - 1 && (
                <div
                  className={`absolute top-4 left-1/2 w-full h-0.5 -z-0 ${
                    i < currentIdx ? 'bg-emerald-500' : 'bg-slate-200'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function MyOrdersPage({ onBackToStore, storeInfo }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua');
  const [expandedId, setExpandedId] = useState(null);

  // Review state
  const [myReviews, setMyReviews] = useState([]);
  const [reviewingItem, setReviewingItem] = useState(null); // { productId, productName, orderId }

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError('');
      const [data, reviews] = await Promise.all([
        api.getOrders(statusFilter),
        api.getMyReviews().catch(() => [])
      ]);
      setOrders(data);
      setMyReviews(reviews);
    } catch (err) {
      setError(err.message || 'Gagal memuat pesanan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  // Set produk mana yang sudah direview
  const reviewedIds = new Set(myReviews.map((r) => r.productId));

  const statusCounts = orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});

  const totalSpent = orders
    .filter((o) => o.status !== 'Dibatalkan')
    .reduce((sum, o) => sum + (o.grandTotal || 0), 0);

  const buildWhatsAppLink = (order) => {
    const rawPhone = (storeInfo?.whatsapp || '6281234567890').replace(/[^0-9]/g, '');
    const message =
      `Halo Admin *${storeInfo?.name || 'FreshMarket'}*,\n\n` +
      `Saya ingin menanyakan status pesanan saya:\n` +
      `• ID Pesanan: *${order.id}*\n` +
      `• Nama: ${order.customerName}\n` +
      `• Status Saat Ini: ${order.status}\n\n` +
      `Mohon informasinya, terima kasih.`;
    return `https://wa.me/${rawPhone}?text=${encodeURIComponent(message)}`;
  };

  return (
    <div className="max-w-5xl mx-auto py-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <button
            onClick={onBackToStore}
            className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-emerald-700 font-medium mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Kembali Belanja
          </button>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Receipt className="w-7 h-7 text-emerald-600" />
            Pesanan Saya
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Riwayat semua transaksi dan pesanan Anda di FreshMarket
          </p>
        </div>

        <button
          onClick={fetchOrders}
          disabled={loading}
          className="self-start bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold px-4 py-2 rounded-xl border border-slate-200 flex items-center gap-1.5 transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Total Pesanan
          </div>
          <div className="text-xl font-black text-slate-900 flex items-center gap-1.5">
            <ShoppingBag className="w-4 h-4 text-emerald-600" />
            {orders.length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Sedang Proses
          </div>
          <div className="text-xl font-black text-amber-600 flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            {(statusCounts['Menunggu Konfirmasi'] || 0) +
              (statusCounts['Sedang Dikemas'] || 0) +
              (statusCounts['Sedang Dikirim'] || 0)}
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Selesai
          </div>
          <div className="text-xl font-black text-emerald-600 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            {statusCounts['Selesai'] || 0}
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Total Belanja
          </div>
          <div className="text-sm sm:text-base font-black text-slate-900">
            {formatRupiah(totalSpent)}
          </div>
        </div>
      </div>

      {/* Filter Status */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-max">
          {['Semua', 'Menunggu Konfirmasi', 'Sedang Dikemas', 'Sedang Dikirim', 'Selesai', 'Dibatalkan'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === st
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st}
              {st !== 'Semua' && statusCounts[st] > 0 && (
                <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${
                  statusFilter === st ? 'bg-white/20' : 'bg-slate-300 text-slate-700'
                }`}>
                  {statusCounts[st]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-4 py-3 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-slate-400 space-y-3">
          <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium">Memuat riwayat pesanan Anda...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-slate-200 p-8 space-y-3">
          <div className="text-5xl">🛒</div>
          <h3 className="font-bold text-base text-slate-800">Belum Ada Pesanan</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {statusFilter === 'Semua'
              ? 'Anda belum pernah melakukan pemesanan. Yuk mulai belanja sayur segar hari ini!'
              : `Tidak ada pesanan dengan status "${statusFilter}".`}
          </p>
          {statusFilter === 'Semua' && (
            <button
              onClick={onBackToStore}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl inline-flex items-center gap-1.5"
            >
              <ShoppingBag className="w-4 h-4" />
              Mulai Belanja
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const config = STATUS_CONFIG[order.status] || STATUS_CONFIG['Menunggu Konfirmasi'];
            const IconComp = config.icon;
            const isExpanded = expandedId === order.id;

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-slate-200 hover:border-emerald-300 transition-all overflow-hidden shadow-2xs"
              >
                {/* Card Header (Clickable) */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : order.id)}
                  className="w-full p-4 sm:p-5 text-left"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
                          {order.id}
                        </span>
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${config.color}`}>
                          <IconComp className="w-3 h-3" />
                          {order.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(order.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                        </span>
                        <span className="hidden sm:inline">•</span>
                        <span>{order.items.length} item</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      <div className="text-right">
                        <div className="text-[10px] text-slate-400 uppercase font-bold">Total</div>
                        <div className="text-base font-black text-emerald-700">
                          {formatRupiah(order.grandTotal)}
                        </div>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>
                </button>

                {/* Expanded Detail */}
                {isExpanded && (
                  <div className="px-4 sm:px-5 pb-5 space-y-4 border-t border-slate-100 pt-4">
                    {/* Status Description */}
                    <div className={`p-3 rounded-xl border text-xs ${config.color}`}>
                      <div className="flex items-start gap-2">
                        <IconComp className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                          <b>{order.status}</b>
                          <p className="mt-0.5 opacity-90">{config.desc}</p>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <OrderProgress status={order.status} />

                    {/* Detail Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="bg-slate-50 rounded-xl p-3 space-y-2 text-xs">
                        <div className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                          Alamat Pengiriman
                        </div>
                        <div className="flex items-start gap-1.5 text-slate-700">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{order.address}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{order.customerPhone}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <Truck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{order.deliverySlot}</span>
                        </div>
                      </div>

                      <div className="bg-slate-50 rounded-xl p-3 space-y-2 text-xs">
                        <div className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                          Pembayaran
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <CreditCard className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="font-semibold">{order.paymentMethod}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Subtotal:</span>
                          <span>{formatRupiah(order.itemsTotal)}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Ongkir:</span>
                          <span>
                            {order.deliveryFee === 0 ? (
                              <b className="text-emerald-600">GRATIS</b>
                            ) : (
                              formatRupiah(order.deliveryFee)
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between font-black text-slate-900 pt-1 border-t border-slate-200">
                          <span>Total:</span>
                          <span className="text-emerald-700">{formatRupiah(order.grandTotal)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Items List */}
                    <PaymentInstructions payment={order.paymentDetails} />
                    <div className="bg-white border border-slate-200 rounded-xl p-3">
                      <div className="text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-2">
                        Daftar Belanja ({order.items.length} item)
                      </div>
                      <div className="space-y-1.5 max-h-64 overflow-y-auto">
                        {order.items.map((item, idx) => {
                          const alreadyReviewed = reviewedIds.has(item.id);
                          const canReview = order.status === 'Selesai' && !alreadyReviewed;
                          return (
                            <div key={idx} className="py-1.5 border-b border-slate-100 last:border-0">
                              <div className="flex justify-between text-xs items-center gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold text-slate-800 truncate">
                                    {item.name}{item.variantName ? ` - ${item.variantName}` : ''}
                                  </div>
                                  <div className="text-[10px] text-slate-500">
                                    {item.quantity} x {item.unit} @ {formatRupiah(item.price)}
                                  </div>
                                </div>
                                <div className="font-bold text-slate-900 shrink-0">
                                  {formatRupiah(item.price * item.quantity)}
                                </div>
                              </div>
                              {order.status === 'Selesai' && (
                                <div className="mt-1.5">
                                  {canReview ? (
                                    <button
                                      onClick={() =>
                                        setReviewingItem({
                                          productId: item.id,
                                          productName: item.name,
                                          orderId: order.id
                                        })
                                      }
                                      className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-1 rounded-lg transition-colors"
                                    >
                                      <Star className="w-3 h-3" />
                                      Beri Ulasan
                                    </button>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg">
                                      <CheckCircle2 className="w-3 h-3" />
                                      Sudah Diulas
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Notes */}
                    {order.notes && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900">
                        <b>Catatan Anda:</b> "{order.notes}"
                      </div>
                    )}

                    {/* Action WhatsApp */}
                    {order.status !== 'Selesai' && order.status !== 'Dibatalkan' && (
                      <a
                        href={buildWhatsAppLink(order)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all"
                      >
                        <MessageSquare className="w-4 h-4" />
                        Hubungi Admin via WhatsApp
                      </a>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Beri Ulasan */}
      {reviewingItem && (
        <ReviewSubmitModal
          item={reviewingItem}
          onClose={() => setReviewingItem(null)}
          onSubmitted={async () => {
            setReviewingItem(null);
            await fetchOrders();
          }}
        />
      )}
    </div>
  );
}

// ---------- Sub-komponen: Modal review dari halaman Pesanan ----------
function ReviewSubmitModal({ item, onClose, onSubmitted }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    if (rating < 1 || rating > 5) {
      setError('Pilih rating 1-5 bintang terlebih dahulu.');
      return;
    }
    try {
      setSubmitting(true);
      await api.createReview({
        productId: item.productId,
        rating,
        comment,
        orderId: item.orderId
      });
      onSubmitted && onSubmitted();
    } catch (err) {
      setError(err.message || 'Gagal menyimpan ulasan.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
        <div className="text-center mb-4">
          <div className="w-14 h-14 mx-auto rounded-full bg-amber-100 flex items-center justify-center mb-3">
            <Star className="w-7 h-7 text-amber-600 fill-amber-500" />
          </div>
          <h3 className="text-lg font-black text-slate-900">Beri Ulasan Produk</h3>
          <p className="text-xs text-slate-500 mt-1">
            Bagaimana pengalaman Anda dengan
            <br />
            <b className="text-slate-800">{item.productName}</b>?
          </p>
        </div>

        <div className="space-y-4">
          <div className="text-center bg-slate-50 rounded-2xl p-4">
            <StarRating value={rating} onChange={setRating} size="xl" interactive />
            <div className="text-xs text-slate-600 mt-2 font-semibold">
              {['', 'Sangat buruk', 'Kurang', 'Cukup', 'Bagus', 'Sangat bagus'][rating]}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              Cerita pengalaman Anda <span className="text-slate-400 font-normal">(opsional)</span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={500}
              rows={4}
              placeholder="Contoh: Sayurnya segar, dikemas rapi, sampai dengan cepat..."
              className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none resize-none"
            />
            <div className="text-[10px] text-slate-400 text-right mt-0.5">
              {comment.length}/500
            </div>
          </div>

          {error && (
            <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              disabled={submitting}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 rounded-xl transition-all"
            >
              Batal
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-xs font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5"
            >
              {submitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Star className="w-3.5 h-3.5 fill-current" />
                  Kirim Ulasan
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
