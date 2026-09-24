import React, { useState } from 'react';
import { Banknote, Building2, QrCode, Plus, Trash2, Upload } from 'lucide-react';
import { api } from '../../services/api';

const METHOD_META = {
  cod: { title: 'COD / Bayar di Tempat', icon: Banknote },
  qris: { title: 'QRIS / E-Wallet', icon: QrCode },
  transfer: { title: 'Transfer Bank', icon: Building2 }
};
const INPUT_CLASS = 'w-full mt-1 text-xs px-3 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none bg-white';

export default function PaymentSettings({ methods, onChange, uploading, onUploadingChange }) {
  const [uploadError, setUploadError] = useState('');

  const updateMethod = (id, changes) => {
    onChange((previous) => previous.map((method) => method.id === id
      ? { ...method, ...(typeof changes === 'function' ? changes(method) : changes) }
      : method));
  };

  const uploadQr = async (event) => {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;
    setUploadError('');
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Ukuran gambar QRIS maksimal 5 MB.');
      input.value = '';
      return;
    }
    try {
      onUploadingChange(true);
      const result = await api.uploadImage(file);
      updateMethod('qris', { qrisImageUrl: result.url });
    } catch (error) {
      setUploadError(error.message || 'Gagal mengunggah QRIS.');
    } finally {
      onUploadingChange(false);
      input.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-4 rounded-2xl text-xs space-y-1">
        <p className="font-bold">Metode pembayaran pelanggan</p>
        <p>Atur nama, keterangan, dan instruksi pembayaran. Hanya metode yang aktif akan tampil di checkout.</p>
        <p>Lengkapi gambar QRIS atau rekening tujuan sebelum mengaktifkan metode tersebut.</p>
      </div>

      {methods.map((method) => {
        const meta = METHOD_META[method.id];
        const Icon = meta.icon;
        return (
          <fieldset key={method.id} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 text-xs shadow-2xs">
            <legend className="px-2 font-bold text-sm text-slate-800">{meta.title}</legend>
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-slate-500">
                <Icon className="w-5 h-5 text-emerald-700" />
                {method.enabled ? 'Ditampilkan ke pelanggan' : 'Tidak ditampilkan di checkout'}
              </span>
              <label className="flex items-center gap-2 font-bold text-emerald-800 cursor-pointer">
                <input type="checkbox" checked={method.enabled}
                  onChange={(event) => updateMethod(method.id, { enabled: event.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500" />
                Aktif di checkout
              </label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="font-semibold text-slate-700">
                Nama tampilan
                <input type="text" value={method.label} maxLength={64} required
                  onChange={(event) => updateMethod(method.id, { label: event.target.value })} className={INPUT_CLASS} />
              </label>
              <label className="font-semibold text-slate-700">
                Keterangan singkat
                <input type="text" value={method.description} maxLength={240}
                  onChange={(event) => updateMethod(method.id, { description: event.target.value })} className={INPUT_CLASS} />
              </label>
            </div>

            {method.id === 'transfer' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="font-bold text-slate-800">Rekening tujuan</h4>
                  <button type="button" disabled={method.accounts.length >= 5}
                    onClick={() => updateMethod(method.id, (current) => ({ accounts: [...current.accounts, { bankName: '', accountNumber: '', accountHolder: '' }] }))}
                    className="flex items-center gap-1 font-bold text-emerald-700 hover:text-emerald-800 disabled:opacity-50">
                    <Plus className="w-3.5 h-3.5" /> Tambah Rekening
                  </button>
                </div>
                {method.accounts.length === 0 && <p className="text-slate-500">Belum ada rekening. Tambahkan rekening bank tujuan transfer pelanggan.</p>}
                {method.accounts.map((account, index) => (
                  <div key={index} className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700">Rekening {index + 1}</span>
                      <button type="button" aria-label={`Hapus rekening ${index + 1}`}
                        onClick={() => updateMethod(method.id, (current) => ({ accounts: current.accounts.filter((_, i) => i !== index) }))}
                        className="text-rose-600 hover:text-rose-700 p-1"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        ['bankName', 'Nama bank', 'Contoh: BCA', 64],
                        ['accountNumber', 'Nomor rekening', 'Nomor rekening tujuan', 64],
                        ['accountHolder', 'Atas nama', 'Nama pemilik rekening', 120]
                      ].map(([field, label, placeholder, maxLength]) => (
                        <label key={field} className="font-semibold text-slate-700">
                          {label}
                          <input type="text" value={account[field]} required maxLength={maxLength} placeholder={placeholder}
                            onChange={(event) => updateMethod(method.id, (current) => ({
                              accounts: current.accounts.map((entry, i) => i === index ? { ...entry, [field]: event.target.value } : entry)
                            }))} className={INPUT_CLASS} />
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {method.id === 'qris' && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="font-semibold text-slate-700">
                    Nama merchant QRIS
                    <input type="text" value={method.merchantName} maxLength={120}
                      onChange={(event) => updateMethod(method.id, { merchantName: event.target.value })} className={INPUT_CLASS} />
                  </label>
                  <label className="font-semibold text-slate-700">
                    NMID (opsional)
                    <input type="text" value={method.nmid} maxLength={64}
                      onChange={(event) => updateMethod(method.id, { nmid: event.target.value })} className={INPUT_CLASS} />
                  </label>
                </div>
                <label className="block font-semibold text-slate-700">
                  URL gambar QRIS
                  <input type="text" value={method.qrisImageUrl} maxLength={2048} placeholder="https://... atau unggah gambar di bawah"
                    onChange={(event) => updateMethod(method.id, { qrisImageUrl: event.target.value })} className={INPUT_CLASS} />
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  <label className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold ${uploading ? 'opacity-50' : 'cursor-pointer hover:bg-emerald-100'}`}>
                    <Upload className="w-4 h-4" /> {uploading ? 'Mengunggah QRIS...' : 'Unggah QRIS'}
                    <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" aria-label="Unggah QRIS"
                      disabled={uploading} onChange={uploadQr} className="sr-only" />
                  </label>
                  <span className="text-slate-500">PNG, JPG, WebP, atau GIF. Maksimal 5 MB.</span>
                </div>
                {uploadError && <p role="alert" className="text-rose-700">{uploadError}</p>}
                {method.qrisImageUrl && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                    <p className="font-semibold text-slate-600">Pratinjau QRIS</p>
                    <img src={method.qrisImageUrl} alt="Pratinjau QRIS toko" className="max-w-full w-48 max-h-64 object-contain bg-white rounded-lg" />
                  </div>
                )}
              </div>
            )}

            <label className="block font-semibold text-slate-700">
              Instruksi pembayaran
              <textarea value={method.instructions} rows={3} maxLength={2000}
                placeholder="Petunjuk untuk pelanggan setelah memilih metode ini"
                onChange={(event) => updateMethod(method.id, { instructions: event.target.value })} className={INPUT_CLASS} />
            </label>
          </fieldset>
        );
      })}
    </div>
  );
}
