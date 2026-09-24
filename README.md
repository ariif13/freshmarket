# FreshMarket

Aplikasi web belanja kebutuhan segar (sayur, buah, bumbu, lauk hewani, sembako, BHP, dan paket masak) dengan katalog produk bervarian, keranjang belanja, checkout lewat sistem atau WhatsApp, dashboard admin, rating & ulasan, serta autentikasi berbasis role (email/password dan Google).

**Stack**: React 19 + Vite • Tailwind CSS 4 • Express 5 • PostgreSQL • JWT • Google Identity Services

---

## Fitur

### Untuk Pelanggan
- Katalog produk dengan filter kategori, pencarian (nama/deskripsi/badge), filter "tersedia" & "organik", dan rating bintang
- Banner Hero dan bagian khusus Paket Masak
- Detail produk: pilih **varian** (mis. 250 g / 500 g / 1 kg), lihat ulasan pelanggan
- Keranjang belanja tersimpan di browser, jumlah dibatasi stok, dengan progress gratis ongkir
- Slot jadwal pengiriman (Pagi 1, Pagi 2, Siang/Sore — bisa diatur admin)
- **Ongkir berdasarkan jarak**: pilih pin tujuan di peta (klik, geser pin, GPS, atau koordinat manual); ongkir dihitung dari jarak garis lurus ke toko
- Metode pembayaran: **COD**, **QRIS** (gambar QR ditampilkan), **Transfer Bank** (hingga 5 rekening)
- Checkout via sistem web, atau via WhatsApp (pesanan tetap tersimpan di sistem, lalu pesan WA terisi otomatis)
- Halaman "Pesanan Saya": timeline status, filter status, tanya status ke admin via WA
- Halaman "Profil Saya": edit nama/HP/alamat, ganti password, tautkan akun Google
- Beri ulasan produk setelah pesanan berstatus **Selesai**
- Login dengan Google (khusus pelanggan)

### Untuk Admin
| Tab | Fungsi |
|---|---|
| **Pesanan** | Filter status, pencarian, ubah status sesuai alur, hubungi pelanggan via WA |
| **Produk** | CRUD produk, upload foto (disimpan di DB), kelola varian (maks. 20/produk), edit cepat stok/harga/satuan/foto dari tabel |
| **Kategori** | CRUD kategori + ikon; kategori yang masih dipakai produk tidak bisa dihapus |
| **Pengguna** | Statistik, daftar & pencarian, riwayat belanja, ubah role, reset password, buka kunci akun, hapus user |
| **Ulasan** | Statistik rating, produk rating tertinggi/terendah, filter, hapus ulasan |
| **Pengaturan** | Info toko, WhatsApp, jam buka, isi banner Hero, metode pembayaran, serta **Ongkir & Area Pengiriman** (pin toko di peta, rentang jarak & tarif, radius gratis ongkir) |

KPI dashboard: total penjualan (tanpa pesanan batal), pesanan aktif, pesanan selesai, total produk, dan produk stok menipis (≤ 5).

### Keamanan
- Autentikasi JWT; setiap request memverifikasi akun masih ada dan role belum berubah
- Role-based access control (admin vs customer)
- Rate limiting berlapis: per IP + lockout per akun (anti brute-force)
- Password hashing dengan bcrypt (10 rounds)
- Login Google dengan nonce (cookie httpOnly) dan verifikasi ID token di server

---

## Menjalankan Lokal

### Persyaratan
- Node.js 22+ (Vite 8 dan google-auth-library membutuhkannya)
- PostgreSQL 14+ (lokal atau cloud)
- npm

### Setup

```bash
# 1. Clone repo
git clone https://github.com/USERNAME/freshmarket.git
cd freshmarket

# 2. Install dependencies (root, client, server)
npm run install:all

# 3. Buat .env di root
cp .env.example .env
# Edit .env: minimal isi DATABASE_URL yang valid & JWT_SECRET acak
```

Contoh isi `.env` untuk lokal:
```env
DATABASE_URL=postgres://postgres:password@localhost:5432/freshmarket
JWT_SECRET=random-string-minimal-32-karakter-panjang-acak
NODE_ENV=development
PORT=5000
DEFAULT_ADMIN_EMAIL=admin@freshmarket.com
DEFAULT_ADMIN_PASSWORD=admin123
```

### Jalankan

**Terminal 1 - Backend:**
```bash
cd server
npm start
```

**Terminal 2 - Frontend:**
```bash
cd client
npm run dev
```

Buka http://localhost:5173 — Vite meneruskan `/api` dan `/uploads` ke backend di port 5000.

Saat server pertama kali jalan, semua file di `server/migrations/` dijalankan berurutan, lalu database yang masih kosong diisi data awal: 1 admin, kategori, produk contoh, dan pengaturan toko.

Login default admin:
- Email: `admin@freshmarket.com`
- Password: `admin123`

Segera ganti password setelah login pertama!

---

## Environment Variables

| Variable | Wajib | Default | Keterangan |
|---|---|---|---|
| `DATABASE_URL` | Ya | — | Connection string PostgreSQL |
| `JWT_SECRET` | Ya (production) | secret dev | String acak panjang. Generate: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `JWT_EXPIRES_IN` | Tidak | `7d` | Masa berlaku token login |
| `PORT` | Tidak | `5000` | Port server |
| `NODE_ENV` | Tidak | `development` | `production` = server juga menyajikan build React dari `client/dist` |
| `PGSSL` | Tidak | `false` | `true` untuk DB eksternal yang butuh SSL (Neon, Supabase, dll.) |
| `GOOGLE_CLIENT_ID` | Tidak | — | OAuth Client ID tipe Web application. Kosong = tombol Google disembunyikan |
| `CORS_ORIGIN` | Tidak | semua origin | Daftar domain dipisah koma untuk production |
| `DEFAULT_ADMIN_EMAIL` | Tidak | `admin@freshmarket.com` | Hanya dipakai saat tabel users kosong |
| `DEFAULT_ADMIN_PASSWORD` | Tidak | `admin123` | Hanya dipakai saat tabel users kosong |
| `DB_LOG` | Tidak | `false` | `true` untuk mencatat setiap query ke console |
| `VITE_MAP_TILE_URL` | Tidak | tile OpenStreetMap | Penyedia tile peta (dibaca saat **build** frontend, contoh di `client/.env.example`) |
| `VITE_MAP_ATTRIBUTION` | Tidak | atribusi OSM | Teks atribusi penyedia tile |

### Mengaktifkan Login Google (opsional)
1. Buat **OAuth Client ID** tipe *Web application* di Google Cloud Console (Google Auth Platform → Clients).
2. Tambahkan origin frontend ke *Authorized JavaScript origins* (mis. `http://localhost:5173` dan domain production).
3. Isi `GOOGLE_CLIENT_ID` di `.env`, lalu restart server. Client Secret tidak diperlukan.

Aturan login Google:
- Hanya untuk role **customer**. Admin tetap masuk dengan email & password.
- Email Google yang belum terdaftar → akun pelanggan baru dibuat otomatis (tanpa password lokal).
- Email yang sudah terdaftar → otomatis ditautkan hanya jika akun Google-nya `@gmail.com` atau Google Workspace. Selain itu, pelanggan harus login dengan password lalu menautkan Google dari "Profil Saya".

---

## Deploy ke Zeabur

Lihat panduan lengkap di [DEPLOY.md](./DEPLOY.md).

Ringkasan:
1. Push repo ke GitHub
2. Buat project di Zeabur
3. Add PostgreSQL service
4. Add Web service dari GitHub (memakai `Dockerfile` multi-stage)
5. Set environment variables (`DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=production`, `CORS_ORIGIN`, dll.)
6. Generate domain → live!

Health check tersedia di `GET /api/health`.

Setiap kali `git pull`, jalankan ulang `npm run install:all` dan `npm --prefix client run build`, lalu restart server agar migrasi baru ikut berjalan. Folder `client/dist` tidak di-commit.

---

## Struktur Proyek

```
freshmarket/
├── Dockerfile                  # Multi-stage build untuk deploy
├── .env.example
├── DEPLOY.md                   # Panduan deploy Zeabur
├── package.json                # Script root (install:all, build, start)
│
├── client/                     # React frontend
│   ├── src/
│   │   ├── components/         # Navbar, Hero, ProductCard, CartDrawer,
│   │   │   │                   # CheckoutModal, OrderSuccessModal, dll.
│   │   │   ├── admin/          # Dashboard, produk, kategori, pesanan,
│   │   │   │                   # pengguna, ulasan, pengaturan & pembayaran
│   │   │   ├── auth/           # Login, Register, tombol Google
│   │   │   ├── customer/       # Pesanan Saya, Profil
│   │   │   └── reviews/        # Rating & ulasan
│   │   ├── contexts/           # AuthContext
│   │   ├── services/           # api.js (client HTTP + formatRupiah)
│   │   └── App.jsx
│   └── vite.config.js
│
└── server/                     # Express backend
    ├── index.js                # Entry: produk, kategori, pesanan, upload,
    │                           # pengaturan toko, statistik
    ├── db.js                   # Koneksi PostgreSQL, migrasi & seeding
    ├── payments.js             # Validasi metode pembayaran (COD/QRIS/Transfer)
    ├── googleAuth.js           # Verifikasi & penautan akun Google
    ├── shipping.js             # Ongkir berdasarkan jarak (Haversine) & estimasi bertanda tangan
    ├── tests/                  # node --test (npm --prefix server test)
    ├── middleware/
    │   ├── auth.js             # JWT verify, requireAdmin
    │   └── rateLimit.js        # Rate limiting + lockout akun
    ├── routes/
    │   ├── auth.js             # Login, register, Google, profil
    │   ├── users.js            # Kelola user (admin)
    │   └── reviews.js          # Rating & ulasan
    └── migrations/
        ├── 001_schema.sql                 # Tabel inti
        ├── 002_product_variants.sql       # Varian produk
        ├── 003_order_payment_details.sql  # Snapshot detail pembayaran di pesanan
        ├── 004_google_sign_in.sql         # Kolom google_sub, password opsional
        └── 005_order_delivery_details.sql # Snapshot lokasi & ongkir di pesanan
```

---

## API Endpoints

Semua endpoint di prefix `/api`, kecuali `/uploads/:id`.

### Public
- `GET /health` — cek server & koneksi database
- `POST /auth/register` — daftar customer baru (maks. 3/jam per IP)
- `POST /auth/login` — login (rate-limited + lockout akun)
- `GET /auth/google/config` — konfigurasi & nonce tombol Google
- `POST /auth/google` — login/daftar dengan Google
- `GET /products` — list produk + varian + rating agregat (query: `category`, `search`, `availableOnly`)
- `GET /products/:id` — detail produk + sebaran rating
- `GET /categories` — list kategori
- `GET /store-info` — info toko (nama, ongkir, metode pembayaran, banner, dll.)
- `GET /reviews/product/:productId` — ulasan produk + ringkasan rating
- `GET /uploads/:id` — serve gambar (tanpa prefix `/api`)

### Authenticated (user + admin)
- `GET /auth/me` — profil sendiri
- `PUT /auth/me` — update profil / ganti password
- `POST /auth/google/link` — tautkan akun Google (customer)
- `POST /shipping/quote` — hitung ongkir & total dari item keranjang + titik tujuan
- `POST /orders` — buat order
- `GET /orders` — list order (customer: milik sendiri, admin: semua; query: `status`)
- `GET /reviews/my` — ulasan sendiri
- `GET /reviews/eligible` — produk yang bisa diulas
- `POST /reviews` — buat ulasan
- `PUT /reviews/:id` — edit ulasan sendiri
- `DELETE /reviews/:id` — hapus ulasan sendiri (admin: ulasan siapa pun)

### Admin only
- `POST /products`, `PUT /products/:id`, `DELETE /products/:id` — CRUD produk & varian
- `POST /categories`, `PUT /categories/:id`, `DELETE /categories/:id` — CRUD kategori
- `PATCH /orders/:id/status` — update status order
- `PUT /store-info` — update pengaturan toko & metode pembayaran
- `POST /upload` — upload gambar (base64; jpg/png/webp/gif; maks. 5 MB)
- `GET /stats` — statistik dashboard
- `GET /users` — list user (query: `role`, `search`)
- `GET /users/stats` — statistik user
- `GET /users/:id` — detail user + statistik belanja
- `PATCH /users/:id/role` — promote/demote
- `POST /users/:id/reset-password` — reset password user
- `GET /users/:id/lockout` — status lockout akun
- `POST /users/:id/unlock` — unlock akun terkunci
- `DELETE /users/:id` — hapus user
- `GET /reviews` — list semua ulasan (query: `rating`, `search`, `productId`)
- `GET /reviews/summary/stats` — statistik ulasan

---

## Aturan Bisnis

### Status pesanan
```
Menunggu Konfirmasi → Sedang Dikemas → Sedang Dikirim → Selesai
        │                   │                 │
        └───────────────────┴─────────────────┴──→ Dibatalkan
```
- Status hanya bisa maju satu langkah atau dibatalkan; `Selesai` dan `Dibatalkan` bersifat final.
- Pesanan yang dibatalkan **mengembalikan stok** produk/varian secara otomatis.

### Checkout
- Diproses dalam satu transaksi database; baris produk & varian dikunci (`FOR UPDATE`) agar stok tidak terjual melebihi persediaan.
- Harga dan ongkir selalu dihitung ulang di server, bukan diambil dari browser.
- Produk otomatis ditandai tidak tersedia saat stoknya habis.
- Detail metode pembayaran (rekening/QRIS) disalin ke pesanan, sehingga perubahan pengaturan toko tidak mengubah pesanan lama.

### Varian produk
- Maks. 20 varian per produk; nama varian unik per produk.
- Harga produk ditampilkan "mulai dari" varian termurah yang tersedia; stok produk = total stok varian.
- Varian yang sudah pernah dipesan tidak bisa dihapus — nonaktifkan saja.

### Ongkir berdasarkan jarak
Detail lengkap di [docs/ongkir.md](./docs/ongkir.md). Ringkasnya:
- Nonaktif secara default; admin harus menentukan pin toko lalu mencentang "Aktifkan ongkir berdasarkan jarak". Selama nonaktif, berlaku ongkir standar (flat).
- Rentang contoh 3 / 5 / 10 km berarti 0–3 km, >3–5 km, >5–10 km. Tujuan di luar rentang terakhir ditolak.
- Gratis ongkir butuh dua syarat: minimal belanja terpenuhi **dan** tujuan dalam radius gratis ongkir.
- Jarak adalah garis lurus (Haversine), bukan rute jalan. Titik toko, titik tujuan, jarak, dan tarif disimpan di pesanan.

### Ulasan
- Hanya untuk produk dari pesanan berstatus **Selesai**.
- Satu ulasan per produk per pelanggan, rating 1–5.

### Rate limiting
- Login: 5 percobaan gagal per 15 menit per IP.
- Register: 3 pendaftaran per jam per IP.
- Akun: 5 kali salah password dalam 15 menit → terkunci 30 menit (admin bisa membuka kunci).

---

## Keterbatasan yang Diketahui

- Data lockout akun disimpan di memori server: hilang saat restart dan tidak berbagi antar-instance. Gunakan Redis bila menjalankan lebih dari satu instance.
- Gambar disimpan di PostgreSQL (`BYTEA`); untuk katalog besar pertimbangkan object storage (S3/R2).
- Jarak ongkir dihitung garis lurus, bukan panjang rute jalan.
- Tile peta memakai server publik OpenStreetMap (best-effort). Untuk trafik besar, gunakan penyedia tile sendiri lewat `VITE_MAP_TILE_URL`.
- Pelanggan yang lupa password belum bisa reset sendiri; reset dilakukan oleh admin.
- Automated test baru mencakup perhitungan ongkir (`npm --prefix server test`); frontend belum punya test.

---

## Lisensi

ISC
