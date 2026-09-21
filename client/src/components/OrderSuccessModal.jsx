import React from 'react';
import { CheckCircle2, MessageSquare, QrCode, Clock, MapPin, ArrowRight, Receipt } from 'lucide-react';
import { formatRupiah } from '../services/api';

export default function OrderSuccessModal({ order, onClose, onViewMyOrders, storeInfo }) {
  if (!order) return null;

  const rawPhone = (storeInfo?.whatsapp || '6281234567890').replace(/[^0-9]/g, '');
  const waUrl = `https://wa.me/${rawPhone}?text=Halo%20FreshSayur,%20saya%20sudah%20membuat%20pesanan%20dengan%20ID%20*${order.id}*%20atas%20nama%20*${encodeURIComponent(order.customerName)}*.%20Mohon%20dikonfirmasi%20ya!%20Terima%20kasih.`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 text-center animate-scale-up">
        {/* Success Icon */}
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <h2 className="text-xl sm:text-2xl font-black text-slate-900">
          Pesanan Berhasil Dibuat!
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Sayuran segar Anda sedang disiapkan oleh tim Toko Sayur.
        </p>

        {/* Order Info Card */}
        <div className="my-5 bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-left space-y-2.5 text-xs">
          <div className="flex justify-between items-center pb-2 border-b border-slate-200">
            <span className="text-slate-500 font-semibold">Nomor Pesanan:</span>
            <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              {order.id}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-slate-500">Penerima:</span>
            <span className="font-bold text-slate-800">{order.customerName} ({order.customerPhone})</span>
          </div>

          <div className="flex justify-between">
            <span className="text-slate-500">Jadwal Kirim:</span>
            <span className="font-bold text-emerald-800">{order.deliverySlot}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-slate-500">Metode Bayar:</span>
            <span className="font-bold text-slate-800">{order.paymentMethod}</span>
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-sm">
            <span className="font-bold text-slate-700">Total Pembayaran:</span>
            <span className="font-black text-emerald-700">{formatRupiah(order.grandTotal)}</span>
          </div>
        </div>

        {/* QRIS Display if QRIS method was selected */}
        {order.paymentMethod?.includes('QRIS') && (
          <div className="mb-5 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2">
            <span className="text-xs font-bold text-emerald-900 block">
              Silakan Scan QRIS Berikut untuk Pembayaran:
            </span>
            <div className="inline-block p-3 bg-white rounded-xl shadow-xs border border-emerald-300">
              <img
                src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=00020101021126580016ID.CO.FRESHSAYUR.WWW01189360099900000000005204541153033605802ID5916FRESHSAYUR%20STORE6007JAKARTA62070703A016304A12B"
                alt="QRIS Code"
                className="w-36 h-36 mx-auto"
              />
              <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                NMID: ID102003920192 • Toko Sayur Segar
              </span>
            </div>
            <p className="text-[11px] text-emerald-800">
              Dapat discan melalui BCA, Mandiri, BRI, Gopay, OVO, ShopeePay, Dana.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2.5">
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-2xl flex items-center justify-center gap-2 text-xs sm:text-sm transition-all shadow-md shadow-emerald-600/20"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Konfirmasi / Tanya Admin via WhatsApp</span>
          </a>

          {onViewMyOrders && (
            <button
              onClick={() => {
                onViewMyOrders();
                onClose();
              }}
              className="w-full bg-white hover:bg-emerald-50 border border-emerald-300 text-emerald-700 font-bold py-2.5 px-4 rounded-2xl flex items-center justify-center gap-2 text-xs transition-colors"
            >
              <Receipt className="w-4 h-4" />
              Lihat Pesanan Saya
            </button>
          )}

          <button
            onClick={onClose}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 px-4 rounded-2xl text-xs transition-colors"
          >
            Kembali ke Toko (Belanja Lagi)
          </button>
        </div>
      </div>
    </div>
  );
}
