# FreshMarket

Aplikasi web belanja kebutuhan segar (sayur, buah, bumbu, sembako) dengan fitur lengkap: katalog produk, keranjang belanja, checkout WhatsApp/sistem, dashboard admin, rating & ulasan, dan sistem auth berbasis role.

**Stack**: React 19 + Vite • Express 5 + PostgreSQL • Tailwind CSS 4 • JWT Auth

---

## Fitur

### Untuk Pelanggan
- Katalog produk dengan filter kategori, pencarian, rating bintang
- Detail produk + review pelanggan
- Keranjang belanja dengan progress gratis ongkir
- Slot jadwal pengiriman (pagi 1, pagi 2, siang/sore)
- Metode pembayaran: COD, QRIS, Transfer Bank
- Checkout via sistem web atau WhatsApp otomatis
- Halaman "Pesanan Saya" dengan timeline status
- Halaman "Profil Saya" — edit nama/HP/alamat + ganti password
- Beri ulasan produk setelah pesanan Selesai

### Untuk Admin
- Dashboard dengan KPI (omset, pesanan aktif, stok menipis)
- Kelola produk, kategori, orders, pengaturan toko
- Kelola user: list, promote/demote role, reset password, unlock
- Kelola ulasan (moderasi, hapus)
- Upload gambar produk (disimpan di DB)

### Keamanan
- JWT-based authentication
- Role-based access control (admin vs customer)
- Rate limiting berlapis (IP + account lockout) anti brute-force
- Password hashing dengan bcrypt (10 rounds)

---

## Menjalankan Lokal

### Persyaratan
- Node.js 18+
- PostgreSQL 14+ (lokal atau cloud)
- npm

### Setup

```bash
# 1. Clone repo
git clone https://github.com/USERNAME/freshmarket.git
cd freshmarket

# 2. Install dependencies
npm run install:all

# 3. Buat .env di root
cp .env.example .env
# Edit .env dengan DATABASE_URL yang valid & JWT_SECRET acak
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

Buka http://localhost:5173

Login default admin:
- Email: `admin@freshmarket.com`
- Password: `admin123`

Segera ganti password setelah login pertama!

---

## Deploy ke Zeabur

Lihat panduan lengkap di [DEPLOY.md](./DEPLOY.md).

Ringkasan:
1. Push repo ke GitHub
2. Buat project di Zeabur
3. Add PostgreSQL service
4. Add Web service dari GitHub
5. Set environment variables (DATABASE_URL, JWT_SECRET, dll)
6. Generate domain → live!

---

## Struktur Proyek

```
freshmarket/
├── Dockerfile                  # Multi-stage build untuk deploy
├── .env.example
├── DEPLOY.md                   # Panduan deploy Zeabur
├── package.json                # Script root (build, start)
│
├── client/                     # React frontend
│   ├── src/
│   │   ├── components/         # UI components
│   │   │   ├── admin/          # Dashboard admin
│   │   │   ├── auth/           # Login, Register
│   │   │   ├── customer/       # Pesanan Saya, Profil
│   │   │   └── reviews/        # Rating & ulasan
│   │   ├── contexts/           # AuthContext
│   │   ├── services/           # api.js (client HTTP)
│   │   └── App.jsx
│   └── vite.config.js
│
└── server/                     # Express backend
    ├── index.js                # Entry & main routes
    ├── db.js                   # PostgreSQL connection & seeding
    ├── middleware/
    │   ├── auth.js             # JWT verify, requireAdmin
    │   └── rateLimit.js        # Rate limiting + lockout
    ├── routes/
    │   ├── auth.js             # Login, register, profile
    │   ├── users.js            # Kelola user (admin)
    │   └── reviews.js          # Rating & ulasan
    └── migrations/
        └── 001_schema.sql      # PostgreSQL schema
```

---

## API Endpoints

Semua endpoint di prefix `/api`.

### Public
- `POST /auth/register` — daftar customer baru
- `POST /auth/login` — login (rate-limited)
- `GET /products` — list produk (dengan rating agregat)
- `GET /products/:id` — detail produk
- `GET /categories` — list kategori
- `GET /store-info` — info toko (nama, ongkir, dll)
- `GET /reviews/product/:productId` — ulasan produk
- `GET /uploads/:id` — serve gambar

### Authenticated (user + admin)
- `GET /auth/me` — profil sendiri
- `PUT /auth/me` — update profil
- `POST /orders` — buat order
- `GET /orders` — list order (customer: milik sendiri, admin: semua)
- `GET /reviews/my` — ulasan sendiri
- `GET /reviews/eligible` — produk yang bisa diulas
- `POST /reviews` — buat ulasan
- `PUT /reviews/:id` — edit ulasan sendiri
- `DELETE /reviews/:id` — hapus ulasan sendiri

### Admin only
- `POST/PUT/DELETE /products` — CRUD produk
- `POST/PUT/DELETE /categories` — CRUD kategori
- `PATCH /orders/:id/status` — update status order
- `PUT /store-info` — update info toko
- `POST /upload` — upload gambar
- `GET /stats` — statistik dashboard
- `GET /users` — list user
- `GET /users/stats` — statistik user
- `PATCH /users/:id/role` — promote/demote
- `POST /users/:id/reset-password` — reset password user
- `POST /users/:id/unlock` — unlock akun terkunci
- `DELETE /users/:id` — hapus user
- `GET /reviews` — list semua ulasan (moderasi)
- `GET /reviews/summary/stats` — statistik ulasan

---

## Lisensi

ISC
