import { MapPin } from 'lucide-react';
import { formatRupiah } from '../services/api';
import { deliveryMapUrl, formatDistance } from '../services/shipping';

export default function DeliveryDetails({ details }) {
  if (!details || details.mode !== 'distance') return null;
  const mapUrl = deliveryMapUrl(details.destination);
  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 space-y-1.5 text-xs text-left text-emerald-900">
      <p className="font-semibold">Jarak pengiriman: {formatDistance(details.distanceMeters)} <span className="font-normal">(garis lurus)</span></p>
      {details.tier && <p>Tarif rentang {details.tier.fromKm === 0 ? '0' : `>${details.tier.fromKm}`}–{details.tier.upToKm} km: {formatRupiah(details.baseFee)}</p>}
      <p>Ongkir pesanan: <b>{details.deliveryFee === 0 ? 'GRATIS' : formatRupiah(details.deliveryFee)}</b></p>
      {details.freeDeliveryApplied && <p>Gratis ongkir: minimal belanja {formatRupiah(details.freeDeliveryMin)}, radius maksimal {details.freeDeliveryRadiusKm} km.</p>}
      {mapUrl && <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-bold underline py-1"><MapPin className="w-3.5 h-3.5" />Buka Lokasi Pengiriman</a>}
    </div>
  );
}
