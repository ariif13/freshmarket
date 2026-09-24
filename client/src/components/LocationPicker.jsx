import { useEffect, useRef, useState } from 'react';
import { LocateFixed, MapPin } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import CoordinateInputs from './CoordinateInputs';

const TILE_URL = import.meta.env.VITE_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = import.meta.env.VITE_MAP_ATTRIBUTION || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const pinIcon = (color) => L.divIcon({
  className: '',
  html: `<span style="display:block;width:22px;height:22px;background:${color};border:3px solid white;border-radius:50%;box-shadow:0 1px 5px #333"></span>`,
  iconSize: [22, 22], iconAnchor: [11, 11]
});

export default function LocationPicker({ value, onChange, origin = null, radiusKm = null, freeRadiusKm = null, label = 'Lokasi pengiriman', disabled = false }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layersRef = useRef(null);
  const handlersRef = useRef({ onChange, disabled });
  const mountedRef = useRef(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { handlersRef.current = { onChange, disabled }; }, [onChange, disabled]);
  useEffect(() => {
    mountedRef.current = true;
    const map = L.map(containerRef.current, { scrollWheelZoom: false }).setView([-2.5, 118], 4);
    mapRef.current = map;
    layersRef.current = L.layerGroup().addTo(map);
    const tiles = L.tileLayer(TILE_URL, { maxZoom: 19, attribution: ATTRIBUTION }).addTo(map);
    tiles.on('tileerror', () => setError('Gambar peta belum dapat dimuat. Coba lagi atau masukkan koordinat lokasi.'));
    map.on('click', (event) => {
      if (handlersRef.current.disabled) return;
      const point = event.latlng.wrap();
      handlersRef.current.onChange({ lat: point.lat, lng: point.lng });
    });
    const resize = new ResizeObserver(() => map.invalidateSize());
    resize.observe(containerRef.current);
    return () => {
      mountedRef.current = false;
      resize.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layers = layersRef.current;
    if (!map || !layers) return;
    layers.clearLayers();
    const center = origin || value;
    if (center) {
      if (radiusKm > 0) L.circle([center.lat, center.lng], { radius: radiusKm * 1000, color: '#059669', fillOpacity: 0.04, weight: 1 }).addTo(layers);
      if (freeRadiusKm > 0) L.circle([center.lat, center.lng], { radius: freeRadiusKm * 1000, color: '#10b981', fillOpacity: 0.1, weight: 1 }).addTo(layers);
    }
    if (origin) L.marker([origin.lat, origin.lng], { icon: pinIcon('#475569') }).bindTooltip('Lokasi toko').addTo(layers);
    if (value) {
      const marker = L.marker([value.lat, value.lng], { icon: pinIcon('#059669'), draggable: !disabled }).addTo(layers);
      marker.on('dragend', () => {
        if (handlersRef.current.disabled) return;
        const point = marker.getLatLng().wrap();
        handlersRef.current.onChange({ lat: point.lat, lng: point.lng });
      });
    }
    const focus = value || origin;
    if (focus) map.setView([focus.lat, focus.lng], Math.max(13, map.getZoom()));
  }, [value, origin, radiusKm, freeRadiusKm, disabled]);

  const locate = () => {
    setError('');
    if (!navigator.geolocation) { setError('Lokasi perangkat tidak tersedia. Pilih pin pada peta.'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition((position) => {
      if (!mountedRef.current) return;
      setLocating(false);
      if (!handlersRef.current.disabled) handlersRef.current.onChange({ lat: position.coords.latitude, lng: position.coords.longitude });
    }, () => {
      if (!mountedRef.current) return;
      setLocating(false);
      setError('Lokasi HP tidak dapat diakses. Izinkan lokasi, atau pilih pin pada peta secara manual.');
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
  };

  return (
    <div role="group" aria-label={label} className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-slate-700 flex items-center gap-1"><MapPin className="w-4 h-4" />{label}</span>
        <button type="button" onClick={locate} disabled={disabled || locating} className="flex items-center gap-1 rounded-lg px-3 py-2 bg-emerald-50 text-emerald-800 font-semibold disabled:opacity-50">
          <LocateFixed className="w-4 h-4" />{locating ? 'Mencari lokasi…' : 'Gunakan Lokasi Saya'}
        </button>
      </div>
      <div ref={containerRef} inert={disabled || undefined} aria-label={`Peta ${label.toLowerCase()}`} className="h-64 sm:h-72 rounded-xl border border-slate-200 relative z-0" />
      <p className="text-[11px] text-slate-500">Klik peta atau geser pin hijau. Jarak dihitung sebagai garis lurus dari toko.</p>
      {value && <p className="text-[11px] text-emerald-800">Pin terpilih: {value.lat.toFixed(6)}, {value.lng.toFixed(6)}</p>}
      {error && <p role="alert" className="text-xs text-amber-800">{error}</p>}
      <CoordinateInputs key={value ? `${value.lat},${value.lng}` : 'empty'} value={value} onApply={onChange} disabled={disabled} />
    </div>
  );
}
