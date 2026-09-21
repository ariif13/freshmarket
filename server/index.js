// ============================================================
// FreshMarket - Express Server (PostgreSQL + Static React)
// ============================================================
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const {
  query, tx, init,
  mapProduct, mapCategory, mapOrder
} = require('./db');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const { router: reviewRoutes, computeProductRating } = require('./routes/reviews');
const { verifyToken, requireAdmin } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Trust proxy (Zeabur / Cloudflare / Nginx)
app.set('trust proxy', 1);

// CORS: production restrict, dev bebas
const CORS_ORIGIN = process.env.CORS_ORIGIN;
if (CORS_ORIGIN) {
  const allowed = CORS_ORIGIN.split(',').map(s => s.trim()).filter(Boolean);
  app.use(cors({ origin: allowed, credentials: true }));
  console.log('[CORS] Allowed origins:', allowed.join(', '));
} else {
  app.use(cors());
}

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// -------------------------------------------------------------
// Health check (untuk Zeabur health probe)
// -------------------------------------------------------------
app.get('/api/health', async (req, res) => {
  try {
    await query('SELECT 1');
    res.json({ status: 'ok', db: 'connected', env: NODE_ENV });
  } catch (err) {
    res.status(500).json({ status: 'error', db: 'disconnected', error: err.message });
  }
});

// -------------------------------------------------------------
// Auth Routes (public) & User Management (admin only) & Reviews
// -------------------------------------------------------------
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reviews', reviewRoutes);

// -------------------------------------------------------------
// UPLOAD - simpan gambar ke PostgreSQL BYTEA
// GET /uploads/:id  → serve gambar
// POST /api/upload  → upload gambar (admin only)
// -------------------------------------------------------------
app.get('/uploads/:id', async (req, res) => {
  try {
    const r = await query('SELECT filename, mime_type, data FROM uploads WHERE id = $1', [req.params.id]);
    if (r.rowCount === 0) return res.status(404).send('Not found');
    const row = r.rows[0];
    res.set('Content-Type', row.mime_type);
    res.set('Content-Disposition', `inline; filename="${row.filename}"`);
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(row.data);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

app.post('/api/upload', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { image, filename } = req.body;
    if (!image) return res.status(400).json({ message: 'Data gambar tidak ditemukan' });

    const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let buffer, mime = 'image/jpeg', ext = 'jpg';

    if (matches && matches.length === 3) {
      mime = matches[1];
      if (mime.includes('png')) ext = 'png';
      else if (mime.includes('webp')) ext = 'webp';
      else if (mime.includes('gif')) ext = 'gif';
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      buffer = Buffer.from(image, 'base64');
      if (filename && filename.includes('.')) ext = filename.split('.').pop();
    }

    // Validasi tipe
    if (!['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext.toLowerCase())) {
      return res.status(400).json({ message: 'Format gambar tidak didukung.' });
    }

    // Batas 5MB
    if (buffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({ message: 'Ukuran gambar maksimal 5MB.' });
    }

    const id = 'upload-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
    const safeName = `${id}.${ext}`;
    await query(
      `INSERT INTO uploads (id, filename, mime_type, data, size_bytes) VALUES ($1, $2, $3, $4, $5)`,
      [id, safeName, mime, buffer, buffer.length]
    );

    res.json({
      url: `/uploads/${id}`,
      filename: safeName,
      message: 'Foto produk berhasil diunggah'
    });
  } catch (err) {
    console.error('Error uploading file:', err);
    res.status(500).json({ message: 'Gagal mengunggah foto: ' + err.message });
  }
});

// -------------------------------------------------------------
// CATEGORIES
// -------------------------------------------------------------
app.get('/api/categories', async (req, res) => {
  const r = await query('SELECT * FROM categories ORDER BY sort_order, name');
  res.json(r.rows.map(mapCategory));
});

app.post('/api/categories', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { name, icon } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ message: 'Nama kategori wajib diisi' });

    const cleanName = name.trim();
    let id = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (!id || id === 'semua') id = 'cat-' + Date.now();

    const dup = await query(
      `SELECT 1 FROM categories WHERE id = $1 OR LOWER(name) = LOWER($2)`,
      [id, cleanName]
    );
    if (dup.rowCount > 0) {
      return res.status(400).json({ message: 'Kategori dengan nama tersebut sudah ada' });
    }
    const maxOrder = await query('SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM categories');
    const result = await query(
      `INSERT INTO categories (id, name, icon, sort_order) VALUES ($1, $2, $3, $4) RETURNING *`,
      [id, cleanName, icon || 'Leaf', maxOrder.rows[0].next]
    );
    res.status(201).json(mapCategory(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

app.put('/api/categories/:id', verifyToken, requireAdmin, async (req, res) => {
  if (req.params.id === 'semua') {
    return res.status(400).json({ message: 'Kategori utama tidak dapat diubah' });
  }
  const { name, icon } = req.body;
  const existing = await query('SELECT * FROM categories WHERE id = $1', [req.params.id]);
  if (existing.rowCount === 0) return res.status(404).json({ message: 'Kategori tidak ditemukan' });
  const cur = existing.rows[0];
  const result = await query(
    `UPDATE categories SET name = $1, icon = $2 WHERE id = $3 RETURNING *`,
    [name ? name.trim() : cur.name, icon || cur.icon, req.params.id]
  );
  res.json(mapCategory(result.rows[0]));
});

app.delete('/api/categories/:id', verifyToken, requireAdmin, async (req, res) => {
  if (req.params.id === 'semua') {
    return res.status(400).json({ message: 'Kategori utama tidak dapat dihapus' });
  }
  const r = await query('DELETE FROM categories WHERE id = $1 RETURNING id', [req.params.id]);
  if (r.rowCount === 0) return res.status(404).json({ message: 'Kategori tidak ditemukan' });
  res.json({ message: 'Kategori berhasil dihapus' });
});

// -------------------------------------------------------------
// PRODUCTS
// -------------------------------------------------------------
app.get('/api/products', async (req, res) => {
  try {
    const { category, search, availableOnly } = req.query;
    const conditions = [];
    const params = [];
    let idx = 1;

    if (category && category !== 'semua') {
      conditions.push(`category = $${idx++}`);
      params.push(category);
    }
    if (search) {
      const q = '%' + search.toLowerCase().trim() + '%';
      conditions.push(`(LOWER(name) LIKE $${idx} OR LOWER(description) LIKE $${idx} OR LOWER(badge) LIKE $${idx})`);
      params.push(q);
      idx++;
    }
    if (availableOnly === 'true') {
      conditions.push(`available = true AND stock > 0`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const r = await query(`SELECT * FROM products ${where} ORDER BY created_at DESC`, params);

    // Enrich dengan rating agregat via subquery
    const products = await Promise.all(r.rows.map(async (row) => {
      const p = mapProduct(row);
      const rating = await computeProductRating(p.id);
      return { ...p, avgRating: rating.average, totalReviews: rating.total };
    }));

    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/products/:id', async (req, res) => {
  const r = await query('SELECT * FROM products WHERE id = $1', [req.params.id]);
  if (r.rowCount === 0) return res.status(404).json({ message: 'Produk tidak ditemukan' });
  const p = mapProduct(r.rows[0]);
  const rating = await computeProductRating(p.id);
  res.json({
    ...p,
    avgRating: rating.average,
    totalReviews: rating.total,
    ratingBreakdown: rating.breakdown
  });
});

app.post('/api/products', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { name, category, price, unit, stock, description, image, badge, organic, available } = req.body;
    if (!name || price === undefined) {
      return res.status(400).json({ message: 'Nama dan harga wajib diisi' });
    }
    const id = 'prod-' + Date.now();
    const result = await query(
      `INSERT INTO products (id, name, category, price, unit, stock, description, image, badge, organic, available)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        id,
        name.trim(),
        category || 'sayur-mayur',
        Number(price),
        unit || 'ikat',
        Number(stock) || 0,
        description || '',
        image || 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
        badge || '',
        Boolean(organic),
        available !== undefined ? Boolean(available) : true
      ]
    );
    res.status(201).json(mapProduct(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

app.put('/api/products/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const existing = await query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    if (existing.rowCount === 0) return res.status(404).json({ message: 'Produk tidak ditemukan' });
    const cur = mapProduct(existing.rows[0]);
    const b = req.body;

    const result = await query(
      `UPDATE products SET
         name = $1, category = $2, price = $3, unit = $4, stock = $5,
         description = $6, image = $7, badge = $8, organic = $9, available = $10
       WHERE id = $11 RETURNING *`,
      [
        b.name !== undefined ? b.name : cur.name,
        b.category !== undefined ? b.category : cur.category,
        b.price !== undefined ? Number(b.price) : cur.price,
        b.unit !== undefined ? b.unit : cur.unit,
        b.stock !== undefined ? Number(b.stock) : cur.stock,
        b.description !== undefined ? b.description : cur.description,
        b.image !== undefined ? b.image : cur.image,
        b.badge !== undefined ? b.badge : cur.badge,
        b.organic !== undefined ? Boolean(b.organic) : cur.organic,
        b.available !== undefined ? Boolean(b.available) : cur.available,
        req.params.id
      ]
    );
    res.json(mapProduct(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

app.delete('/api/products/:id', verifyToken, requireAdmin, async (req, res) => {
  const r = await query('DELETE FROM products WHERE id = $1 RETURNING id', [req.params.id]);
  if (r.rowCount === 0) return res.status(404).json({ message: 'Produk tidak ditemukan' });
  res.json({ message: 'Produk berhasil dihapus' });
});

// -------------------------------------------------------------
// ORDERS
// -------------------------------------------------------------
app.get('/api/orders', verifyToken, async (req, res) => {
  const { status } = req.query;
  const conditions = [];
  const params = [];
  let idx = 1;

  if (req.user.role !== 'admin') {
    conditions.push(`user_id = $${idx++}`);
    params.push(req.user.id);
  }
  if (status && status !== 'Semua') {
    conditions.push(`status = $${idx++}`);
    params.push(status);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const r = await query(`SELECT * FROM orders ${where} ORDER BY created_at DESC`, params);
  res.json(r.rows.map(mapOrder));
});

app.post('/api/orders', verifyToken, async (req, res) => {
  try {
    const { customerName, customerPhone, address, deliverySlot, paymentMethod, notes, items } = req.body;
    if (!customerName || !customerPhone || !address || !items || !items.length) {
      return res.status(400).json({ message: 'Mohon lengkapi data pemesan dan item keranjang belanja' });
    }

    const result = await tx(async (client) => {
      let itemsTotal = 0;
      const processedItems = [];

      for (const item of items) {
        const pr = await client.query('SELECT * FROM products WHERE id = $1', [item.id]);
        const product = pr.rows[0];
        const price = product ? Number(product.price) : (item.price || 0);
        const unit = product ? product.unit : (item.unit || '');
        const name = product ? product.name : (item.name || 'Produk');
        const qty = Number(item.quantity) || 1;

        itemsTotal += price * qty;
        processedItems.push({ id: item.id, name, price, unit, quantity: qty });

        if (product) {
          const newStock = Math.max(0, product.stock - qty);
          const newAvailable = newStock === 0 ? false : product.available;
          await client.query(
            `UPDATE products SET stock = $1, available = $2 WHERE id = $3`,
            [newStock, newAvailable, product.id]
          );
        }
      }

      // Ambil storeInfo untuk deliveryFee
      const si = await client.query('SELECT data FROM store_info WHERE id = 1');
      const storeInfo = si.rows[0]?.data || {};
      const freeMin = storeInfo.freeDeliveryMin || 150000;
      const deliveryFee = itemsTotal >= freeMin ? 0 : (storeInfo.deliveryFee || 8000);
      const grandTotal = itemsTotal + deliveryFee;

      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randomSuffix = Math.floor(100 + Math.random() * 900);
      const orderId = `ORD-${dateStr}-${randomSuffix}`;

      const insertRes = await client.query(
        `INSERT INTO orders (
           id, user_id, user_email, customer_name, customer_phone, address,
           delivery_slot, payment_method, notes, items, items_total, delivery_fee, grand_total, status
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12, $13, 'Menunggu Konfirmasi')
         RETURNING *`,
        [
          orderId, req.user.id, req.user.email,
          customerName.trim(), customerPhone.trim(), address.trim(),
          deliverySlot || 'Pengiriman Pagi 1 (06.00 - 08.00 WIB)',
          paymentMethod || 'COD (Bayar di Tempat)',
          notes || '',
          JSON.stringify(processedItems),
          itemsTotal, deliveryFee, grandTotal
        ]
      );

      return mapOrder(insertRes.rows[0]);
    });

    res.status(201).json(result);
  } catch (err) {
    console.error('Order create error:', err);
    res.status(500).json({ message: 'Gagal membuat pesanan: ' + err.message });
  }
});

app.patch('/api/orders/:id/status', verifyToken, requireAdmin, async (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ message: 'Status wajib diisi' });
  const validStatuses = ['Menunggu Konfirmasi', 'Sedang Dikemas', 'Sedang Dikirim', 'Selesai', 'Dibatalkan'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: 'Status tidak valid' });
  }
  const r = await query(
    `UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [status, req.params.id]
  );
  if (r.rowCount === 0) return res.status(404).json({ message: 'Pesanan tidak ditemukan' });
  res.json(mapOrder(r.rows[0]));
});

// -------------------------------------------------------------
// STORE INFO
// -------------------------------------------------------------
app.get('/api/store-info', async (req, res) => {
  const r = await query('SELECT data FROM store_info WHERE id = 1');
  res.json(r.rows[0]?.data || {});
});

app.put('/api/store-info', verifyToken, requireAdmin, async (req, res) => {
  const cur = await query('SELECT data FROM store_info WHERE id = 1');
  const curData = cur.rows[0]?.data || {};
  const merged = { ...curData, ...req.body };
  await query(
    `INSERT INTO store_info (id, data, updated_at) VALUES (1, $1, NOW())
     ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
    [JSON.stringify(merged)]
  );
  res.json(merged);
});

// -------------------------------------------------------------
// STATS (admin dashboard)
// -------------------------------------------------------------
app.get('/api/stats', verifyToken, requireAdmin, async (req, res) => {
  const [productsCount, activeOrders, completedOrders, totalOrders, revenue, lowStock] = await Promise.all([
    query('SELECT COUNT(*)::int AS c FROM products'),
    query(`SELECT COUNT(*)::int AS c FROM orders WHERE status IN ('Menunggu Konfirmasi', 'Sedang Dikemas', 'Sedang Dikirim')`),
    query(`SELECT COUNT(*)::int AS c FROM orders WHERE status = 'Selesai'`),
    query('SELECT COUNT(*)::int AS c FROM orders'),
    query(`SELECT COALESCE(SUM(grand_total), 0)::float AS sum FROM orders WHERE status <> 'Dibatalkan'`),
    query('SELECT COUNT(*)::int AS c FROM products WHERE stock <= 5')
  ]);
  res.json({
    totalProducts: productsCount.rows[0].c,
    activeOrdersCount: activeOrders.rows[0].c,
    completedOrdersCount: completedOrders.rows[0].c,
    totalOrdersCount: totalOrders.rows[0].c,
    totalRevenue: revenue.rows[0].sum,
    lowStockCount: lowStock.rows[0].c
  });
});

// -------------------------------------------------------------
// SERVE REACT STATIC (production only)
// -------------------------------------------------------------
if (NODE_ENV === 'production') {
  const staticDir = path.join(__dirname, '..', 'client', 'dist');
  if (fs.existsSync(staticDir)) {
    console.log('[Server] Serving React static from', staticDir);
    app.use(express.static(staticDir, { maxAge: '1d', index: false }));

    // SPA fallback - semua non-API route ke index.html
    app.get(/^\/(?!api\/|uploads\/).*/, (req, res) => {
      res.sendFile(path.join(staticDir, 'index.html'));
    });
  } else {
    console.warn('[Server] client/dist not found - React static tidak di-serve.');
    console.warn('         Jalankan `npm --prefix client run build` untuk generate.');
  }
}

// -------------------------------------------------------------
// Error handler
// -------------------------------------------------------------
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(err.status || 500).json({
    message: err.message || 'Terjadi kesalahan server.'
  });
});

// -------------------------------------------------------------
// START SERVER
// -------------------------------------------------------------
async function start() {
  try {
    await init();
    app.listen(PORT, () => {
      console.log(`\n╔═══════════════════════════════════════════════════════╗`);
      console.log(`║  FreshMarket Server                                   ║`);
      console.log(`║  Environment: ${NODE_ENV.padEnd(40)}║`);
      console.log(`║  Listening:   http://localhost:${String(PORT).padEnd(23)}║`);
      console.log(`╚═══════════════════════════════════════════════════════╝\n`);
    });
  } catch (err) {
    console.error('[FATAL] Failed to start server:', err);
    process.exit(1);
  }
}

start();
