import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import CoordinateInputs from './CoordinateInputs';

const loadingText = (label) => (label === 'Lokasi toko' ? 'Memuat peta toko…' : 'Memuat peta pengiriman…');

export default function LazyMap({ label, value, onChange, origin = null, radiusKm = null, freeRadiusKm = null, disabled = false }) {
  const [Picker, setPicker] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    import('./LocationPicker')
      .then((mod) => {
        if (!cancelled) setPicker(() => mod.default);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Modul peta gagal dimuat.');
      });
    return () => { cancelled = true; };
  }, []);

  if (Picker) {
    const PickerComponent = Picker;
    return (
      <PickerComponent
        label={label}
        value={value}
        onChange={onChange}
        origin={origin}
        radiusKm={radiusKm}
        freeRadiusKm={freeRadiusKm}
        disabled={disabled}
      />
    );
  }

  if (error) {
    return (
      <div role="group" aria-label={label} className="space-y-2">
        <p role="alert" className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
          Peta interaktif gagal dimuat ({error}). Isi koordinat manual di bawah. Jika build di server sudah diperbaiki, muat ulang halaman untuk memuat peta lagi.
        </p>
        <CoordinateInputs key={`fallback-${value ? `${value.lat},${value.lng}` : 'empty'}`} value={value} onApply={onChange} disabled={disabled} />
        <button type="button" onClick={() => window.location.reload()} disabled={disabled} className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 disabled:opacity-50">
          <RefreshCw className="w-3.5 h-3.5" /> Muat ulang halaman
        </button>
      </div>
    );
  }

  return <p className="h-64 flex items-center justify-center text-xs text-slate-500">{loadingText(label)}</p>;
}
