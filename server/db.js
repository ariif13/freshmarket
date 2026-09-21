// ============================================================
// PostgreSQL Database Layer for FreshMarket
// ============================================================
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('\n[FATAL] DATABASE_URL environment variable is not set.');
  console.error('   Set it in your .env file or environment.\n');
  process.exit(1);
}

// Zeabur PostgreSQL biasanya internal, tidak butuh SSL.
// Set env PGSSL=true untuk memaksa SSL (misal koneksi eksternal ke DB terkelola).
const useSSL = process.env.PGSSL === 'true';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: useSSL ? { rejectUnauthorized: false } : false,
  max: 10
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected error on idle client:', err);
});

// ------------------------------------------------------------
// Helper
// ------------------------------------------------------------
async function query(text, params = []) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    if (process.env.DB_LOG === 'true') {
      console.log(`[DB] ${Date.now() - start}ms  ${text.substring(0, 80)}...`);
    }
    return result;
  } catch (err) {
    console.error('[DB] Query error:', err.message);
    console.error('     SQL:', text.substring(0, 200));
    throw err;
  }
}

async function tx(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ------------------------------------------------------------
// Initial seed data
// ------------------------------------------------------------
const INITIAL_CATEGORIES = [
  { id: 'semua', name: 'Semua Produk', icon: 'Sparkles', sort_order: 0 },
  { id: 'sayur-mayur', name: 'Sayur Mayur', icon: 'Salad', sort_order: 1 },
  { id: 'lauk-hewani', name: 'Lauk Hewani', icon: 'Drumstick', sort_order: 2 },
  { id: 'bumbu-dapur', name: 'Bumbu Dapur', icon: 'Flame', sort_order: 3 },
  { id: 'sembako', name: 'Sembako', icon: 'Wheat', sort_order: 4 },
  { id: 'bhp', name: 'BHP', icon: 'SprayCan', sort_order: 5 },
  { id: 'paket-masak', name: 'Paket Masak', icon: 'ShoppingBag', sort_order: 6 },
  { id: 'buah-segar', name: 'Buah Segar', icon: 'Cherry', sort_order: 7 }
];

const INITIAL_PRODUCTS = [
  { id: 'prod-1', name: 'Bayam Hijau Segar', category: 'sayur-mayur', price: 3500, unit: 'ikat (~250g)', stock: 45, description: 'Bayam hijau segar dipetik subuh langsung dari petani lokal. Daun hijau renyah dan kaya zat besi.', image: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=600&q=80', badge: 'Panen Subuh', organic: false, available: true },
  { id: 'prod-2', name: 'Kangkung Hidroponik', category: 'sayur-mayur', price: 4500, unit: 'ikat (~300g)', stock: 35, description: 'Kangkung hidroponik bersih tanpa lumpur, batang renyah gurih cocok ditumis terasi.', image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80', badge: 'Hidroponik', organic: true, available: true },
  { id: 'prod-3', name: 'Sawi Hijau (Caisim)', category: 'sayur-mayur', price: 4000, unit: 'pack (250g)', stock: 30, description: 'Caisim hijau segar pilihan untuk pelengkap mie, bakso, atau tumisan sayur harian.', image: 'https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?auto=format&fit=crop&w=600&q=80', badge: 'Segar', organic: false, available: true },
  { id: 'prod-4', name: 'Wortel Brastagi Manis', category: 'sayur-mayur', price: 12000, unit: '500 gram', stock: 50, description: 'Wortel Brastagi kualitas super, renyah, manis alami, cocok untuk jus maupun sop.', image: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?auto=format&fit=crop&w=600&q=80', badge: 'Super Grade', organic: false, available: true },
  { id: 'prod-5', name: 'Tomat Merah Segar', category: 'sayur-mayur', price: 8500, unit: '500 gram', stock: 40, description: 'Tomat merah ranum padat berdaging, kaya vitamin C dan likopen untuk masakan atau jus.', image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=600&q=80', badge: 'Segar', organic: false, available: true },
  { id: 'prod-7', name: 'Bawang Merah Brebes Super', category: 'bumbu-dapur', price: 18000, unit: '500 gram', stock: 60, description: 'Bawang merah Brebes wangi tajam, kering dan tahan simpan lama.', image: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&w=600&q=80', badge: 'Best Seller', organic: false, available: true },
  { id: 'prod-8', name: 'Bawang Putih Kating', category: 'bumbu-dapur', price: 20000, unit: '500 gram', stock: 55, description: 'Bawang putih kating siung padat berserat dengan aroma gurih khas.', image: 'https://images.unsplash.com/photo-1588615419957-c6194b633045?auto=format&fit=crop&w=600&q=80', badge: 'Pilihan Chef', organic: false, available: true },
  { id: 'prod-10', name: 'Cabai Rawit Merah (Setan)', category: 'bumbu-dapur', price: 15000, unit: '250 gram', stock: 30, description: 'Cabai rawit merah super pedas beraroma khas.', image: 'https://images.unsplash.com/photo-1588252303782-cb80119abd6d?auto=format&fit=crop&w=600&q=80', badge: 'Pedas Nampol', organic: false, available: true },
  { id: 'prod-13', name: 'Paket Sayur Sop Komplit + Bumbu', category: 'paket-masak', price: 12500, unit: '1 paket (3-4 porsi)', stock: 25, description: 'Isi lengkap: Wortel, Kentang, Kol, Daun Bawang, Seledri, Buncis + racik bumbu sop.', image: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=600&q=80', badge: 'Praktis Hemat', organic: false, available: true },
  { id: 'prod-14', name: 'Paket Sayur Asem Komplit Segar', category: 'paket-masak', price: 12000, unit: '1 paket (3-4 porsi)', stock: 20, description: 'Isi lengkap: Jagung, Labu siam, Kacang panjang, Daun melinjo, Asam jawa.', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80', badge: 'Praktis Hemat', organic: false, available: true },
  { id: 'prod-15', name: 'Paket Capcay Spesial', category: 'paket-masak', price: 15000, unit: '1 paket (2-3 porsi)', stock: 18, description: 'Isi lengkap: Kembang kol, Brokoli, Wortel, Sawi putih, Daun bawang, Jamur kuping.', image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80', badge: 'Sehat & Praktis', organic: false, available: true },
  { id: 'prod-16', name: 'Pisang Cavendish Manis', category: 'buah-segar', price: 22000, unit: 'sisir (~1 kg)', stock: 20, description: 'Pisang Cavendish matang alami, kulit kuning mulus, rasa manis legit.', image: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=600&q=80', badge: 'Manis Legit', organic: true, available: true },
  { id: 'prod-17', name: 'Pepaya California Matang Pohon', category: 'buah-segar', price: 14000, unit: 'buah (~1.2 kg)', stock: 15, description: 'Pepaya California daging tebal berwarna merah jingga, manis segar.', image: 'https://images.unsplash.com/photo-1517282009859-f000ec3b26fe?auto=format&fit=crop&w=600&q=80', badge: 'Manis Alami', organic: false, available: true }
];

const INITIAL_STORE_INFO = {
  name: 'FreshMarket',
  tagline: 'Belanja Kebutuhan Segar Setiap Hari',
  whatsapp: '6281234567890',
  address: 'Jl. Melati Raya No. 12, Pasar Segar Asri, Jakarta',
  openHours: 'Buka setiap hari: 05.00 - 18.00 WIB',
  deliverySlots: [
    { id: 'subuh', label: 'Pengiriman Pagi 1 (06.00 - 08.00 WIB)', desc: 'Paling disarankan untuk masak sarapan & sayur ter-segar' },
    { id: 'pagi', label: 'Pengiriman Pagi 2 (08.30 - 11.00 WIB)', desc: 'Cocok untuk persiapan makan siang' },
    { id: 'siang', label: 'Pengiriman Siang/Sore (13.00 - 16.00 WIB)', desc: 'Pengantaran kloter siang' }
  ],
  deliveryFee: 8000,
  freeDeliveryMin: 150000,
  heroBanner: {
    badge: 'Garansi Segar: Layu atau Rusak Kami Ganti 100%!',
    title: 'Belanja Segar Setiap Pagi,',
    titleHighlight: 'Langsung Sampai di Dapur Anda',
    subtitle: 'Pesan sekarang sebelum jam 21.00 WIB untuk dikirim pagi besok. Kualitas terjamin, bersih, dan hemat.',
    features: [
      { id: 'feat-1', icon: '⏰', title: 'Kirim Pagi 06.00', desc: 'Tiba tepat waktu sebelum mulai masak sarapan' },
      { id: 'feat-2', icon: '🛵', title: 'Gratis Ongkir', desc: 'Otomatis gratis ongkir belanja min. Rp 150.000' },
      { id: 'feat-3', icon: '💵', title: 'Bisa Bayar COD', desc: 'Cek dulu baru bayar tunai di tempat' },
      { id: 'feat-4', icon: '📲', title: 'Order via WhatsApp', desc: 'Bisa pesan langsung terhubung ke chat admin' }
    ]
  }
};

// ------------------------------------------------------------
// Migration & seed
// ------------------------------------------------------------
async function runMigrations() {
  const schemaFile = path.join(__dirname, 'migrations', '001_schema.sql');
  const schemaSql = fs.readFileSync(schemaFile, 'utf-8');
  await pool.query(schemaSql);
  console.log('[DB] Schema migrated successfully.');
}

async function seedIfEmpty() {
  // Cek jumlah user
  const userCount = await pool.query('SELECT COUNT(*)::int AS c FROM users');
  if (userCount.rows[0].c === 0) {
    const defaultPw = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';
    const defaultEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@freshmarket.com';
    const hash = await bcrypt.hash(defaultPw, 10);
    await pool.query(
      `INSERT INTO users (id, name, email, password_hash, phone, role)
       VALUES ($1, $2, $3, $4, $5, 'admin')`,
      ['user-admin-001', 'Administrator Toko', defaultEmail, hash, '6281234567890']
    );
    console.log(`[DB] Seeded default admin: ${defaultEmail} / ${defaultPw}`);
    console.log('     PENTING: Segera ganti password admin setelah login pertama!');
  }

  // Seed categories
  const catCount = await pool.query('SELECT COUNT(*)::int AS c FROM categories');
  if (catCount.rows[0].c === 0) {
    for (const c of INITIAL_CATEGORIES) {
      await pool.query(
        `INSERT INTO categories (id, name, icon, sort_order) VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO NOTHING`,
        [c.id, c.name, c.icon, c.sort_order]
      );
    }
    console.log(`[DB] Seeded ${INITIAL_CATEGORIES.length} categories.`);
  }

  // Seed products
  const prodCount = await pool.query('SELECT COUNT(*)::int AS c FROM products');
  if (prodCount.rows[0].c === 0) {
    for (const p of INITIAL_PRODUCTS) {
      await pool.query(
        `INSERT INTO products (id, name, category, price, unit, stock, description, image, badge, organic, available)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO NOTHING`,
        [p.id, p.name, p.category, p.price, p.unit, p.stock, p.description, p.image, p.badge, p.organic, p.available]
      );
    }
    console.log(`[DB] Seeded ${INITIAL_PRODUCTS.length} products.`);
  }

  // Seed store info
  const infoCount = await pool.query('SELECT COUNT(*)::int AS c FROM store_info');
  if (infoCount.rows[0].c === 0) {
    await pool.query(
      `INSERT INTO store_info (id, data) VALUES (1, $1)`,
      [JSON.stringify(INITIAL_STORE_INFO)]
    );
    console.log('[DB] Seeded store info.');
  }
}

async function init() {
  await runMigrations();
  await seedIfEmpty();
}

// ------------------------------------------------------------
// Row mapper (snake_case → camelCase) untuk kompatibilitas API existing
// ------------------------------------------------------------
function mapUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    phone: row.phone || '',
    address: row.address || '',
    role: row.role,
    passwordResetAt: row.password_reset_at,
    passwordResetBy: row.password_reset_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapProduct(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    price: Number(row.price),
    unit: row.unit,
    stock: row.stock,
    description: row.description || '',
    image: row.image || '',
    badge: row.badge || '',
    organic: row.organic,
    available: row.available
  };
}

function mapCategory(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    sort_order: row.sort_order
  };
}

function mapOrder(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    userEmail: row.user_email,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    address: row.address,
    deliverySlot: row.delivery_slot,
    paymentMethod: row.payment_method,
    notes: row.notes || '',
    items: typeof row.items === 'string' ? JSON.parse(row.items) : row.items,
    itemsTotal: Number(row.items_total),
    deliveryFee: Number(row.delivery_fee),
    grandTotal: Number(row.grand_total),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapReview(row) {
  if (!row) return null;
  return {
    id: row.id,
    productId: row.product_id,
    productName: row.product_name,
    userId: row.user_id,
    userName: row.user_name,
    rating: row.rating,
    comment: row.comment || '',
    orderId: row.order_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

module.exports = {
  pool,
  query,
  tx,
  init,
  mapUser,
  mapProduct,
  mapCategory,
  mapOrder,
  mapReview
};
