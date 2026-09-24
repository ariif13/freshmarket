import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  Clock, 
  CheckCircle2, 
  Truck, 
  Package, 
  XCircle, 
  Search, 
  Phone, 
  MapPin, 
  MessageSquare,
  Printer
} from 'lucide-react';
import { api, formatRupiah } from '../../services/api';
import PaymentInstructions from '../PaymentInstructions';

const STATUS_COLORS = {
  'Menunggu Konfirmasi': 'bg-amber-100 text-amber-800 border-amber-300',
  'Sedang Dikemas': 'bg-blue-100 text-blue-800 border-blue-300',
  'Sedang Dikirim': 'bg-purple-100 text-purple-800 border-purple-300',
  'Selesai': 'bg-emerald-100 text-emerald-800 border-emerald-300',
  'Dibatalkan': 'bg-rose-100 text-rose-800 border-rose-300'
};

export default function OrderManagement() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('Semua');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await api.getOrders(statusFilter);
      setOrders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      await api.updateOrderStatus(orderId, newStatus);
      fetchOrders();
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(prev => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      alert('Gagal memperbarui status: ' + err.message);
    }
  };

  const filteredOrders = orders.filter(o => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      o.id.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      o.customerPhone.includes(q) ||
      o.address.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
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
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-[240px]">
          <input
            type="text"
            placeholder="Cari ID / Nama / No HP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs bg-slate-50 pl-8 pr-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-300 outline-none"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-sm">Memuat data pesanan...</div>
      ) : filteredOrders.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-sm">
          Tidak ada pesanan yang sesuai filter.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => (
            <div 
              key={order.id}
              className="bg-white rounded-2xl border border-slate-200 hover:border-emerald-300 transition-all p-4 sm:p-5 shadow-2xs space-y-3"
            >
              {/* Order Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs sm:text-sm text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
                    {order.id}
                  </span>
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${STATUS_COLORS[order.status] || 'bg-slate-100 text-slate-700'}`}>
                    {order.status}
                  </span>
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{new Date(order.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                </div>
              </div>

              {/* Customer & Delivery Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Pemesan</span>
                  <div className="font-bold text-slate-800 text-sm">{order.customerName}</div>
                  <div className="flex items-center gap-1 text-slate-600">
                    <Phone className="w-3 h-3 text-emerald-600" /> {order.customerPhone}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Pengiriman & Jadwal</span>
                  <div className="font-semibold text-emerald-800 flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5 shrink-0" /> {order.deliverySlot}
                  </div>
                  <div className="text-slate-500 line-clamp-2">
                    {order.address}
                  </div>
                </div>

                <div className="space-y-1 md:text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Pembayaran</span>
                  <div className="font-bold text-slate-700">{order.paymentMethod}</div>
                  <div className="text-sm font-black text-emerald-700">
                    {formatRupiah(order.grandTotal)}
                  </div>
                </div>
              </div>

              {/* Order Items preview */}
              {order.paymentDetails && (
                <details className="text-xs">
                  <summary className="cursor-pointer font-semibold text-emerald-800 py-1">Detail pembayaran pesanan</summary>
                  <PaymentInstructions payment={order.paymentDetails} />
                </details>
              )}
              <div className="bg-slate-50/90 rounded-xl p-3 text-xs space-y-1.5 border border-slate-100">
                <span className="font-bold text-slate-700 block text-[11px]">Daftar Belanja:</span>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-slate-600">
                      <span>• <b>{item.quantity}x</b> {item.name}{item.variantName ? ` - ${item.variantName}` : ''} ({item.unit})</span>
                      <span className="font-medium text-slate-800">{formatRupiah(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
                {order.notes && (
                  <div className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded-lg mt-2 border border-amber-200">
                    <b>Catatan Pembeli:</b> "{order.notes}"
                  </div>
                )}
              </div>

              {/* Action Controls & Quick Status Update */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-500">Ubah Status:</span>
                  {order.status === 'Menunggu Konfirmasi' && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'Sedang Dikemas')}
                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                    >
                      <Package className="w-3.5 h-3.5" /> Kemas Sayur
                    </button>
                  )}
                  {order.status === 'Sedang Dikemas' && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'Sedang Dikirim')}
                      className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                    >
                      <Truck className="w-3.5 h-3.5" /> Kirim ke Kurir
                    </button>
                  )}
                  {order.status === 'Sedang Dikirim' && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'Selesai')}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Selesai / Terkirim
                    </button>
                  )}
                  {order.status !== 'Selesai' && order.status !== 'Dibatalkan' && (
                    <button
                      onClick={() => {
                        if (confirm(`Yakin ingin membatalkan pesanan ${order.id}?`)) {
                          handleUpdateStatus(order.id, 'Dibatalkan');
                        }
                      }}
                      className="px-2 py-1 bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700 rounded-lg text-xs font-medium transition-colors"
                    >
                      Batalkan
                    </button>
                  )}
                </div>

                {/* WhatsApp Chat Button */}
                <a
                  href={`https://wa.me/${order.customerPhone.replace(/[^0-9]/g, '')}?text=Halo%20${encodeURIComponent(order.customerName)},%20kami%20dari%20Toko%20Sayur%20terkait%20pesanan%20${order.id}.`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-800 font-semibold bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200 transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5" /> Chat Pembeli
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
