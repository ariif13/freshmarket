import { lazy, Suspense } from 'react';
import { Plus, Trash2, Truck } from 'lucide-react';
import { formatRupiah } from '../../services/api';

const LocationPicker = lazy(() => import('../LocationPicker'));
const inputClass = 'block w-full mt-1 px-3 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:border-emerald-500';

export default function DeliverySettings({ settings, deliveryFee, freeDeliveryMin, onChange, onFeeChange, onFreeMinChange, disabled = false }) {
  const update = (field, value) => onChange({ ...settings, [field]: value });
  const changeTier = (index, field, value) => update('tiers', settings.tiers.map((tier, i) => i === index ? { ...tier, [field]: value } : tier));
  const maxKm = Number(settings.tiers.at(-1)?.upToKm) || 0;
  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-5 text-xs">
      <h4 className="font-bold text-sm flex items-center gap-2"><Truck className="w-4 h-4 text-emerald-700" />Ongkir & Area Pengiriman</h4>
      <label className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-3 cursor-pointer">
        <input type="checkbox" checked={settings.enabled} onChange={(e) => update('enabled', e.target.checked)} className="accent-emerald-600" />
        <span><b>Aktifkan ongkir berdasarkan jarak</b><span className="block text-slate-500 mt-1">Tarif mengikuti jarak garis lurus antara pin toko dan pin pelanggan.</span></span>
      </label>
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="font-semibold">Tarif Ongkir Standar (Rp)
          <input className={inputClass} type="number" min="0" max="1000000000" step="1" required value={deliveryFee} onChange={(e) => onFeeChange(e.target.value)} />
          <span className="block font-normal text-slate-500 mt-1">Berlaku saat ongkir berdasarkan jarak dinonaktifkan.</span>
        </label>
        <label className="font-semibold">Minimal Belanja Gratis Ongkir (Rp)
          <input className={inputClass} type="number" min="0" max="1000000000" step="1" required value={freeDeliveryMin} onChange={(e) => onFreeMinChange(e.target.value)} />
        </label>
      </div>
      <Suspense fallback={<p className="h-64 flex items-center justify-center text-slate-500">Memuat peta toko…</p>}>
        <LocationPicker label="Lokasi toko" value={settings.storeLocation} onChange={(point) => update('storeLocation', point)} radiusKm={maxKm} freeRadiusKm={Number(settings.freeDeliveryRadiusKm)} disabled={disabled} />
      </Suspense>
      <p className="text-slate-500">Tentukan lokasi toko sebelum mengaktifkan ongkir jarak. Lingkaran peta menunjukkan area layanan dan area gratis ongkir.</p>
      <div className="space-y-3">
        <h5 className="font-bold">Rentang Jarak & Tarif</h5>
        {settings.tiers.map((tier, index) => (
          <fieldset key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end bg-slate-50 p-3 rounded-xl border border-slate-200">
            <legend className="font-semibold text-emerald-800 px-1">Rentang {index + 1}: {index ? `di atas ${settings.tiers[index - 1].upToKm || '…'} km` : 'mulai 0 km'}</legend>
            <label>Sampai (km)
              <input aria-label={`Batas jarak rentang ${index + 1}`} className={inputClass} type="number" min="0.001" max="1000" step="any" required value={tier.upToKm} onChange={(e) => changeTier(index, 'upToKm', e.target.value)} />
            </label>
            <label>Tarif (Rp)
              <input aria-label={`Tarif rentang ${index + 1}`} className={inputClass} type="number" min="0" max="1000000000" step="1" required value={tier.fee} onChange={(e) => changeTier(index, 'fee', e.target.value)} />
            </label>
            <button type="button" aria-label={`Hapus rentang ${index + 1}`} disabled={settings.tiers.length === 1} onClick={() => update('tiers', settings.tiers.filter((_, i) => i !== index))} className="p-2.5 text-rose-600 disabled:opacity-30"><Trash2 className="w-4 h-4" /></button>
          </fieldset>
        ))}
        <button type="button" disabled={settings.tiers.length >= 20} className="flex items-center gap-1 text-emerald-700 font-bold py-2 disabled:opacity-50" onClick={() => update('tiers', [...settings.tiers, { upToKm: maxKm + 5, fee: 0 }])}><Plus className="w-4 h-4" />Tambah Rentang</button>
        <p className="text-slate-600">Jarak maksimal layanan: <b>{maxKm} km</b>. Batas harus berurutan; tujuan di luar rentang terakhir tidak dapat checkout.</p>
      </div>
      <label className="block font-semibold">Radius Maksimal Gratis Ongkir (km)
        <input className={inputClass} type="number" min="0.001" max={maxKm || 1000} step="any" required value={settings.freeDeliveryRadiusKm} onChange={(e) => update('freeDeliveryRadiusKm', e.target.value)} />
      </label>
      <p className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3">{settings.enabled
        ? `Gratis ongkir untuk belanja minimal ${formatRupiah(freeDeliveryMin)} dalam radius ${settings.freeDeliveryRadiusKm || '…'} km. Di luar radius gratis, tarif rentang tetap berlaku.`
        : `Ongkir standar ${formatRupiah(deliveryFee)}; gratis untuk belanja minimal ${formatRupiah(freeDeliveryMin)}.`}</p>
    </section>
  );
}
