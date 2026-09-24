import React from 'react';

export default function PaymentInstructions({ payment, showQrCode = true }) {
  if (!payment) return null;

  return (
    <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3 space-y-2 text-xs text-emerald-950 text-left break-words">
      <h4 className="font-bold">Instruksi Pembayaran</h4>
      {payment.id === 'transfer' && payment.accounts?.map((account, index) => (
        <div key={index} className="bg-white border border-emerald-100 rounded-lg p-2.5 space-y-0.5">
          <div className="font-bold">{account.bankName}</div>
          <div className="font-mono font-bold text-sm break-all">{account.accountNumber}</div>
          <div>Atas nama: {account.accountHolder}</div>
        </div>
      ))}
      {payment.id === 'qris' && (
        <div className="space-y-2">
          {showQrCode && payment.qrisImageUrl ? (
            <div className="bg-white border border-emerald-100 rounded-xl p-3 w-fit max-w-full mx-auto">
              <img src={payment.qrisImageUrl} alt="QRIS pembayaran" className="w-52 max-w-full max-h-80 object-contain" />
            </div>
          ) : <p>Gambar QRIS akan ditampilkan setelah pesanan berhasil dibuat.</p>}
          {payment.merchantName && <p className="font-semibold">Merchant: {payment.merchantName}</p>}
          {payment.nmid && <p className="font-mono break-all">NMID: {payment.nmid}</p>}
        </div>
      )}
      {payment.instructions && <p className="whitespace-pre-line">{payment.instructions}</p>}
    </div>
  );
}
