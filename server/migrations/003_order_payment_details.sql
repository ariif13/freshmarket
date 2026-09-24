-- Simpan instruksi pembayaran saat checkout agar perubahan pengaturan toko
-- tidak mengubah rekening atau QRIS pada pesanan yang sudah dibuat.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_details JSONB;
