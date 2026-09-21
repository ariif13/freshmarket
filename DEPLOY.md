# Panduan Deploy FreshMarket ke Zeabur

Panduan step-by-step deploy aplikasi FreshMarket ke [Zeabur](https://zeabur.com) menggunakan **PostgreSQL** sebagai database dan **GitHub integration** sebagai deploy method.

## Arsitektur Deploy

```
┌─────────────────────────────────────────────┐
│  Zeabur Project                             │
│  ┌────────────────────┐  ┌────────────────┐ │
│  │  Web Service       │  │  PostgreSQL    │ │
│  │  (Express + React) │◀─│  Database      │ │
│  │  Port: 8080        │  │  Internal only │ │
│  └────────────────────┘  └────────────────┘ │
│           ▲                                 │
└───────────┼─────────────────────────────────┘
            │ HTTPS
            │
      🌍 Internet
```

- **1 service** untuk semua (Express + React static + upload storage di DB)
- **1 PostgreSQL** service (data persisten)
- Total biaya: mulai ~$10/bulan (atau sudah termasuk dalam server yang Anda beli)

---

## Prasyarat

- [x] Punya akun GitHub
- [x] Punya akun Zeabur & server yang sudah dibeli
- [x] Git terinstall di komputer lokal
- [x] Semua perubahan kode sudah selesai (yang tadi sudah kita kerjakan)

---

## Langkah 1: Push Kode ke GitHub

### 1.1 Buat Repo Baru di GitHub

1. Login ke [github.com](https://github.com)
2. Klik tombol **New** (kiri atas)
3. Isi:
   - **Repository name**: `freshmarket` (atau nama lain)
   - **Visibility**: Private (recommended) atau Public
   - **JANGAN** centang "Initialize with README" (repo harus kosong)
4. Klik **Create repository**

### 1.2 Push dari Komputer Lokal

Buka PowerShell / Terminal di folder `D:\antigravity`, jalankan:

```powershell
# Init git
git init
git branch -M main

# Verifikasi .gitignore sudah benar (data.json & node_modules tidak boleh ke-commit)
git status

# Add & commit
git add .
git commit -m "Initial commit: FreshMarket ready for Zeabur"

# Hubungkan ke GitHub (ganti USERNAME & REPO)
git remote add origin https://github.com/USERNAME/freshmarket.git
git push -u origin main
```

**Verifikasi**: Buka repo di GitHub, pastikan struktur foldernya seperti ini dan **tidak ada** `node_modules/`, `data.json`, atau `.env`:

```
freshmarket/
├── .dockerignore
├── .env.example
├── .gitignore
├── DEPLOY.md
├── Dockerfile
├── README.md
├── package.json
├── client/
│   ├── src/
│   ├── package.json
│   └── vite.config.js
└── server/
    ├── index.js
    ├── db.js
    ├── package.json
    ├── middleware/
    ├── migrations/
    │   └── 001_schema.sql
    └── routes/
```

---

## Langkah 2: Deploy ke Zeabur

### 2.1 Buat Project Baru

1. Login ke [zeabur.com/dashboard](https://zeabur.com/projects)
2. Klik **Create Project**
3. Beri nama project: `FreshMarket` (atau nama lain)
4. Pilih **server / region** yang sudah Anda beli

### 2.2 Tambahkan PostgreSQL Database

1. Di halaman project, klik **Add Service** → **Marketplace**
2. Cari **PostgreSQL** → klik **Deploy**
3. Tunggu sampai PostgreSQL running (biasanya ~30 detik)
4. Klik service PostgreSQL → tab **Variables**
5. **Salin nilai `DATABASE_URL`** — ini akan dipakai di service Web

   ```
   postgresql://root:xxxxxxxx@postgresql.zeabur.internal:5432/zeabur
   ```

   > **Catatan**: Ada 2 URL — `DATABASE_URL` (internal, untuk service lain di project sama) dan `DATABASE_PUBLIC_URL` (external, untuk akses dari luar Zeabur). Untuk deploy, **pakai yang internal**.

### 2.3 Deploy Web Service

1. Di halaman project, klik **Add Service** → **Git**
2. Connect GitHub kalau belum → **Authorize Zeabur**
3. Pilih repo `freshmarket` yang tadi Anda push
4. Zeabur otomatis detect **Dockerfile** dan mulai build
5. **Sebelum build selesai**, klik tab **Variables** untuk set environment variables

### 2.4 Set Environment Variables

Di tab **Variables** dari Web Service, tambahkan:

| Key | Value | Keterangan |
|-----|-------|------------|
| `DATABASE_URL` | Klik ***Add Reference*** → pilih PostgreSQL → `DATABASE_URL` | Otomatis link ke internal DB |
| `NODE_ENV` | `production` | Wajib |
| `JWT_SECRET` | Generate dengan command di bawah | Wajib, string acak |
| `JWT_EXPIRES_IN` | `7d` | Opsional |
| `DEFAULT_ADMIN_EMAIL` | `admin@freshmarket.com` | Bisa ganti sesuai keinginan |
| `DEFAULT_ADMIN_PASSWORD` | `PasswordKuatAnda123!` | **WAJIB ganti** dari default |
| `PGSSL` | `false` | Internal Zeabur tidak butuh SSL |

**Generate JWT_SECRET** di terminal lokal:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Copy hasilnya ke value `JWT_SECRET`.

### 2.5 Trigger Rebuild

Setelah semua env sudah di-set:

1. Kembali ke tab **Deployments**
2. Klik **Redeploy** untuk membangun ulang dengan env yang baru
3. Tunggu build selesai (~2-4 menit untuk pertama kali)

### 2.6 Expose Domain Publik

1. Klik tab **Networking** di Web Service
2. Klik **Generate Domain** untuk dapat subdomain gratis Zeabur:
   ```
   https://freshmarket-xxxx.zeabur.app
   ```
3. (Opsional) Klik **Add Custom Domain** kalau punya domain sendiri

### 2.7 Verifikasi Deploy

Buka URL yang tadi digenerate di browser. Anda harus melihat halaman FreshMarket.

**Test API**:
```powershell
curl https://freshmarket-xxxx.zeabur.app/api/health
```

Expected response:
```json
{ "status": "ok", "db": "connected", "env": "production" }
```

**Login sebagai admin**:
- Email: `admin@freshmarket.com` (atau yang Anda set)
- Password: password yang Anda set di `DEFAULT_ADMIN_PASSWORD`

**PENTING**: Setelah berhasil login, **segera ganti password** dari menu Profil.

---

## Langkah 3: Setelah Deploy

### 3.1 Update CORS (Opsional tapi Recommended)

Karena aplikasi Anda sekarang online, tambahkan env `CORS_ORIGIN` untuk keamanan:

1. Ke tab **Variables** Web Service
2. Tambah:
   ```
   CORS_ORIGIN=https://freshmarket-xxxx.zeabur.app
   ```
3. Redeploy

### 3.2 Custom Domain (Opsional)

Kalau Anda punya domain sendiri (misal `freshmarket.co.id`):

1. Di Web Service → **Networking** → **Add Custom Domain**
2. Ikuti instruksi untuk setting DNS record (CNAME atau A record)
3. Tunggu SSL Let's Encrypt aktif (~5 menit)

### 3.3 Auto-Deploy dari GitHub

Zeabur otomatis rebuild setiap kali Anda push commit ke branch `main`. Untuk stop auto-deploy sementara:

- Klik service → **Settings** → **Deployments** → toggle **Auto Deploy**

### 3.4 Backup Database

Data admin, produk, orders, reviews semua tersimpan di PostgreSQL. Backup rutin:

1. Di service PostgreSQL → **Backups**
2. Set schedule backup harian (Zeabur biasanya sudah ada default)
3. Atau backup manual via CLI:
   ```bash
   pg_dump "postgres://root:xxx@public-host:5432/zeabur" > backup.sql
   ```

---

## Troubleshooting

### Build gagal: "npm ci failed"

Pastikan `package-lock.json` sudah ter-commit:
```powershell
git add client/package-lock.json server/package-lock.json
git commit -m "Add lock files"
git push
```

### Runtime error: "DATABASE_URL not set"

- Cek tab Variables, pastikan `DATABASE_URL` sudah pakai *Add Reference* ke PostgreSQL service
- Bukan hardcode string biasa

### Login gagal terus / infinite loading

Cek logs di Zeabur:
1. Web Service → **Logs**
2. Cari error terkait `[DB]` atau `Failed to start server`

Biasanya karena:
- `DATABASE_URL` salah format
- `PGSSL` harusnya `false` (internal Zeabur)

### Gambar upload hilang setelah redeploy?

Tidak akan hilang — sudah tersimpan di PostgreSQL sebagai BYTEA. Kalau masih hilang, cek log apakah insert ke tabel `uploads` sukses.

### "Kategori 'sayuran-daun' tidak ditemukan" untuk seed produk lama

Data seed baru pakai kategori `sayur-mayur`. Kalau Anda restore data lama, jalankan SQL manual:
```sql
UPDATE products SET category = 'sayur-mayur' WHERE category = 'sayuran-daun';
```

---

## Estimasi Biaya

| Komponen | Harga (Zeabur Free Plan) |
|----------|--------------------------|
| Web Service (Node.js) | Gratis untuk trial, ~$5/bulan |
| PostgreSQL | Gratis untuk trial, ~$5/bulan |
| Bandwidth | 100GB/bulan gratis |
| **Total** | **~$10/bulan** (atau sudah termasuk server yang dibeli) |

Detail: https://zeabur.com/docs/zh-CN/pricing

---

## Ringkasan Alur

```
1. Push code ke GitHub
       ↓
2. Buat Project di Zeabur
       ↓
3. Add PostgreSQL service → dapat DATABASE_URL
       ↓
4. Add Web service dari GitHub repo → auto-detect Dockerfile
       ↓
5. Set env vars (DATABASE_URL reference, JWT_SECRET, admin defaults)
       ↓
6. Redeploy → live!
       ↓
7. Generate domain publik
       ↓
8. Login admin → ganti password default
```

Selamat, aplikasi FreshMarket sudah live!
