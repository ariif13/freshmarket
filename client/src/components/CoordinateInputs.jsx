import { useId, useState } from 'react';

export default function CoordinateInputs({ value, onApply, disabled }) {
  const id = useId();
  const [lat, setLat] = useState(value?.lat?.toString() || '');
  const [lng, setLng] = useState(value?.lng?.toString() || '');
  const [error, setError] = useState('');
  return (
    <details className="text-xs text-slate-600" open>
      <summary className="cursor-pointer py-1">Masukkan koordinat lokasi</summary>
      <div className="grid grid-cols-2 gap-2 mt-2">
        <label htmlFor={`${id}-lat`}>Latitude
          <input id={`${id}-lat`} type="number" step="any" min="-90" max="90" value={lat} onChange={(e) => setLat(e.target.value)} disabled={disabled} className="block w-full rounded-lg border border-slate-300 px-2 py-2 mt-1" />
        </label>
        <label htmlFor={`${id}-lng`}>Longitude
          <input id={`${id}-lng`} type="number" step="any" min="-180" max="180" value={lng} onChange={(e) => setLng(e.target.value)} disabled={disabled} className="block w-full rounded-lg border border-slate-300 px-2 py-2 mt-1" />
        </label>
      </div>
      <button type="button" disabled={disabled} className="mt-2 px-3 py-2 rounded-lg bg-slate-100 font-semibold" onClick={() => {
        if (!lat.trim() || !lng.trim() || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng)) || Math.abs(Number(lat)) > 90 || Math.abs(Number(lng)) > 180) {
          setError('Isi latitude (-90 sampai 90) dan longitude (-180 sampai 180) yang valid.');
          return;
        }
        setError('');
        onApply({ lat: Number(lat), lng: Number(lng) });
      }}>Terapkan Koordinat</button>
      {error && <p role="alert" className="text-rose-600 mt-1">{error}</p>}
    </details>
  );
}
