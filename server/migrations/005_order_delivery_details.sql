-- Snapshot titik pengiriman dan tarif saat pesanan dibuat.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_details JSONB;
