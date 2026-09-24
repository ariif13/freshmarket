# Ongkir berdasarkan jarak

1. Buka **Pengaturan Toko & Ongkir → Ongkir & Area Pengiriman**.
2. Tentukan pin lokasi toko (klik peta, GPS perangkat, atau masukkan koordinat).
3. Isi rentang jarak secara berurutan dan tarif rupiah. Batas terakhir menjadi batas maksimal layanan.
4. Isi minimal belanja serta radius gratis ongkir, lalu aktifkan ongkir jarak dan simpan.

Rentang contoh 3 / 5 / 10 km berarti 0–3 km, >3–5 km, dan >5–10 km.
Gratis ongkir memerlukan **kedua syarat**: minimal belanja terpenuhi dan tujuan dalam radius gratis ongkir.
Tujuan di luar batas layanan ditolak meskipun total belanja memenuhi minimum gratis ongkir.
Pengaturan awal belum aktif sampai admin menentukan lokasi toko dan mengaktifkannya.

## Checkout dan pesanan

- Pelanggan mengisi alamat lengkap dan memilih pin tujuan. GPS membantu menentukan pin; pin dapat digeser.
- Jarak adalah **garis lurus (Haversine)**, dibulatkan naik ke meter, bukan panjang perjalanan jalan raya.
- API `POST /api/shipping/quote` menggunakan harga produk/varian dari database.
- Saat checkout server menghitung ulang dan memeriksa tanda tangan estimasi. Perubahan tarif/harga meminta pelanggan memeriksa ringkasan baru; stok baru dikurangi setelah validasi berhasil.
- Titik toko, titik tujuan, jarak, rentang, biaya dasar, dan gratis ongkir disimpan sebagai snapshot `orders.delivery_details`.
- Pesanan lama tetap menampilkan total yang tersimpan. Detail lokasi hanya tersedia untuk pesanan yang memakai ongkir jarak.

## Deployment

- **Wajib setelah `git pull`**: `npm --prefix client install` (pasang leaflet), lalu `npm --prefix client run build`, lalu restart backend untuk migrasi `005_order_delivery_details.sql`. `client/dist` tidak ikut ter-commit — tanpa build ulang, halaman masih versi lama dan menu **Ongkir & Area Pengiriman** tidak muncul.
- Kode peta (Leaflet) ikut di bundle utama, bukan chunk terpisah, sehingga peta tidak gagal dimuat karena file chunk lama/hilang setelah redeploy.
- Jika area peta abu-abu (tile tidak tampil), cek DevTools → Network untuk request `tile.openstreetmap.org`: status `403` berarti penyedia tile menolak akses — ganti penyedia lewat `VITE_MAP_TILE_URL`. Pin tetap bisa dipilih dengan klik peta atau koordinat manual.
- Peta di checkout pelanggan hanya muncul setelah admin menentukan pin toko **dan** mencentang "Aktifkan ongkir berdasarkan jarak" lalu menyimpan.
- Peta menggunakan Leaflet dengan tile OpenStreetMap serta atribusi terlihat. Tile hanya dimuat untuk tampilan aktif dengan caching normal browser, tanpa unduhan offline/prefetch.
- Penyedia peta dapat diubah melalui `VITE_MAP_TILE_URL` dan `VITE_MAP_ATTRIBUTION` sebelum build (contoh di `client/.env.example`). Ikuti ketentuan layanan penyedia tile; layanan publik OSM bersifat best-effort.
- Tombol lokasi perangkat memerlukan HTTPS (atau localhost) dan izin lokasi browser. Pelanggan dapat memilih pin atau memasukkan koordinat jika GPS tidak tersedia.

## Pemeriksaan

`npm --prefix server test` memeriksa batas rentang, radius gratis ongkir, nilai nol, input tidak valid, serta pengikatan estimasi ke keranjang/pelanggan/tujuan.
