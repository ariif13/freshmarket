// ============================================================
// FreshMarket - Express Server (PostgreSQL + Static React)
// ============================================================
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { randomBytes } = require('crypto');
const express = require('express');
const cors = require('cors');
const {
  query, tx, init,
  mapProduct, mapVariant, mapCategory, mapOrder
} = require('./db');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const { router: reviewRoutes, computeProductRating } = require('./routes/reviews');
const { verifyToken, requireAdmin } = require('./middleware/auth');
const { getPaymentMethods, normalizePaymentMethods, selectPaymentMethod } = require('./payments');

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
      mime = matches[1].toLowerCase();
      const mimeToExtension = {
        'image/jpeg': 'jpg',
        'image/jpg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
        'image/gif': 'gif'
      };
      ext = mimeToExtension[mime];
      if (!ext) return res.status(400).json({ message: 'Format gambar tidak didukung.' });
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      buffer = Buffer.from(image, 'base64');
      if (filename && filename.includes('.')) ext = path.extname(filename).slice(1).toLowerCase();
    }

    // Validasi tipe
    if (!['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext.toLowerCase())) {
      return res.status(400).json({ message: 'Format gambar tidak didukung.' });
    }

    // Batas 5MB
    if (buffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({ message: 'Ukuran gambar maksimal 5MB.' });
    }

    const id = 'upload-' + Date.now() + '-' + randomBytes(4).toString('hex');
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
    if (!id || id === 'semua') id = `cat-${Date.now()}-${randomBytes(4).toString('hex')}`;

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
  const usage = await query('SELECT COUNT(*)::int AS count FROM products WHERE category = $1', [req.params.id]);
  if (usage.rows[0].count > 0) {
    return res.status(409).json({
      message: `Kategori masih digunakan oleh ${usage.rows[0].count} produk. Pindahkan produk tersebut sebelum menghapus kategori.`
    });
  }

  const r = await query('DELETE FROM categories WHERE id = $1 RETURNING id', [req.params.id]);
  if (r.rowCount === 0) return res.status(404).json({ message: 'Kategori tidak ditemukan' });
  res.json({ message: 'Kategori berhasil dihapus' });
});

// -------------------------------------------------------------
// PRODUCTS
// -------------------------------------------------------------
function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function normalizeVariants(rawVariants) {
  if (rawVariants === undefined) return undefined;
  if (!Array.isArray(rawVariants)) {
    throw httpError(400, 'Varian produk harus berupa daftar.');
  }
  if (rawVariants.length > 20) {
    throw httpError(400, 'Maksimal 20 varian untuk satu produk.');
  }

  const names = new Set();
  const ids = new Set();
  return rawVariants.map((variant, index) => {
    const name = typeof variant?.name === 'string' ? variant.name.trim() : '';
    const unit = typeof variant?.unit === 'string' ? variant.unit.trim() : '';
    const price = Number(variant?.price);
    const stock = Number(variant?.stock);
    const incomingId = typeof variant?.id === 'string' ? variant.id.trim() : '';

    if (!name || name.length > 100) {
      throw httpError(400, 'Nama setiap varian wajib diisi dan maksimal 100 karakter.');
    }
    if (!unit || unit.length > 64) {
      throw httpError(400, 'Satuan setiap varian wajib diisi dan maksimal 64 karakter.');
    }
    if (!Number.isFinite(price) || price < 0) {
      throw httpError(400, 'Harga setiap varian harus berupa angka nol atau lebih.');
    }
    if (!Number.isSafeInteger(stock) || stock < 0) {
      throw httpError(400, 'Stok setiap varian harus berupa bilangan bulat nol atau lebih.');
    }

    const nameKey = name.toLowerCase();
    if (names.has(nameKey)) {
      throw httpError(400, 'Nama varian tidak boleh duplikat dalam satu produk.');
    }
    if (incomingId && ids.has(incomingId)) {
      throw httpError(400, 'ID varian tidak boleh duplikat dalam satu produk.');
    }
    names.add(nameKey);
    if (incomingId) ids.add(incomingId);

    return {
      incomingId,
      name,
      price,
      unit,
      stock,
      available: variant?.available === false || variant?.available === 'false' ? false : true,
      sortOrder: index
    };
  });
}

function getVariantSummary(variants) {
  const sellableVariants = variants.filter((variant) => variant.available && variant.stock > 0);
  const priceVariants = sellableVariants.length > 0 ? sellableVariants : variants;
  return {
    price: Math.min(...priceVariants.map((variant) => Number(variant.price))),
    unit: priceVariants[0]?.unit || 'pcs',
    stock: variants.reduce((total, variant) => total + Number(variant.stock), 0)
  };
}

function enrichProduct(product, variants) {
  const hasVariants = variants.length > 0;
  const sellableVariants = variants.filter((variant) => variant.available && variant.stock > 0);
  const summary = hasVariants ? getVariantSummary(variants) : null;

  return {
    ...product,
    variants,
    hasVariants,
    priceFrom: summary ? summary.price : product.price,
    stockTotal: summary ? summary.stock : product.stock,
    variantAvailableCount: sellableVariants.length,
    purchasable: product.available && (hasVariants ? sellableVariants.length > 0 : product.stock > 0)
  };
}

async function enrichProducts(rows) {
  if (rows.length === 0) return [];

  const productIds = rows.map((row) => row.id);
  const variantsResult = await query(
    `SELECT * FROM product_variants
     WHERE product_id = ANY($1::varchar[])
     ORDER BY product_id, sort_order, created_at`,
    [productIds]
  );
  const variantsByProduct = new Map(productIds.map((id) => [id, []]));
  for (const row of variantsResult.rows) {
    variantsByProduct.get(row.product_id)?.push(mapVariant(row));
  }

  return rows.map((row) => enrichProduct(mapProduct(row), variantsByProduct.get(row.id) || []));
}

async function lockProducts(client, productIds) {
  // Semua transaksi stok mengunci produk berurutan sebelum mengunci variannya.
  const result = await client.query(
    `SELECT * FROM products
     WHERE id = ANY($1::varchar[])
     ORDER BY id
     FOR UPDATE`,
    [[...new Set(productIds)]]
  );
  return new Map(result.rows.map((row) => [row.id, row]));
}

async function syncProductVariantSummary(client, productId) {
  const summary = await client.query(
    `SELECT
       COALESCE(SUM(stock), 0)::int AS stock,
       COALESCE(MIN(price) FILTER (WHERE available AND stock > 0), MIN(price), 0) AS price,
       (ARRAY_AGG(unit ORDER BY sort_order, created_at))[1] AS unit
     FROM product_variants
     WHERE product_id = $1`,
    [productId]
  );
  const row = summary.rows[0];
  await client.query(
    `UPDATE products SET price = $1, unit = $2, stock = $3 WHERE id = $4`,
    [Number(row.price), row.unit || 'pcs', row.stock, productId]
  );
}

async function saveVariants(client, productId, variants) {
  const existingResult = await client.query(
    'SELECT * FROM product_variants WHERE product_id = $1 FOR UPDATE',
    [productId]
  );
  const existingById = new Map(existingResult.rows.map((row) => [row.id, row]));
  const retainedIds = new Set();

  for (const variant of variants) {
    if (variant.incomingId && existingById.has(variant.incomingId)) {
      retainedIds.add(variant.incomingId);
    }
  }

  for (const existing of existingResult.rows) {
    if (retainedIds.has(existing.id)) continue;
    const usage = await client.query(
      `SELECT 1 FROM orders WHERE items @> $1::jsonb LIMIT 1`,
      [JSON.stringify([{ variantId: existing.id }])]
    );
    if (usage.rowCount > 0) {
      throw httpError(409, `Varian "${existing.name}" sudah dipakai pada pesanan dan tidak dapat dihapus. Nonaktifkan varian tersebut sebagai gantinya.`);
    }
  }

  const removedIds = existingResult.rows
    .filter((existing) => !retainedIds.has(existing.id))
    .map((existing) => existing.id);
  if (removedIds.length > 0) {
    await client.query(
      'DELETE FROM product_variants WHERE product_id = $1 AND id = ANY($2::varchar[])',
      [productId, removedIds]
    );
  }

  for (const variant of variants) {
    if (variant.incomingId && existingById.has(variant.incomingId)) {
      await client.query(
        `UPDATE product_variants
         SET name = $1, price = $2, unit = $3, stock = $4, available = $5, sort_order = $6, updated_at = NOW()
         WHERE id = $7 AND product_id = $8`,
        [variant.name, variant.price, variant.unit, variant.stock, variant.available, variant.sortOrder, variant.incomingId, productId]
      );
    } else {
      const id = `variant-${Date.now()}-${randomBytes(4).toString('hex')}`;
      await client.query(
        `INSERT INTO product_variants (id, product_id, name, price, unit, stock, available, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [id, productId, variant.name, variant.price, variant.unit, variant.stock, variant.available, variant.sortOrder]
      );
    }
  }

  const saved = await client.query(
    'SELECT * FROM product_variants WHERE product_id = $1 ORDER BY sort_order, created_at',
    [productId]
  );
  return saved.rows.map(mapVariant);
}

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
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const r = await query(`SELECT * FROM products ${where} ORDER BY created_at DESC`, params);

    const productsWithVariants = await enrichProducts(r.rows);
    const products = await Promise.all(productsWithVariants.map(async (p) => {
      const rating = await computeProductRating(p.id);
      return { ...p, avgRating: rating.average, totalReviews: rating.total };
    }));

    res.json(availableOnly === 'true' ? products.filter((product) => product.purchasable) : products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/products/:id', async (req, res) => {
  const r = await query('SELECT * FROM products WHERE id = $1', [req.params.id]);
  if (r.rowCount === 0) return res.status(404).json({ message: 'Produk tidak ditemukan' });
  const [p] = await enrichProducts(r.rows);
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
    const variants = normalizeVariants(req.body.variants);
    const hasVariants = variants && variants.length > 0;

    if (typeof name !== 'string' || !name.trim() || (!hasVariants && price === undefined)) {
      return res.status(400).json({ message: 'Nama dan harga wajib diisi' });
    }

    let priceValue;
    let stockValue;
    let unitValue;
    if (hasVariants) {
      const summary = getVariantSummary(variants);
      priceValue = summary.price;
      stockValue = summary.stock;
      unitValue = summary.unit;
    } else {
      priceValue = Number(price);
      stockValue = stock === undefined ? 0 : Number(stock);
      unitValue = unit || 'ikat';
      if (!Number.isFinite(priceValue) || priceValue < 0) {
        return res.status(400).json({ message: 'Harga harus berupa angka nol atau lebih.' });
      }
      if (!Number.isSafeInteger(stockValue) || stockValue < 0) {
        return res.status(400).json({ message: 'Stok harus berupa bilangan bulat nol atau lebih.' });
      }
    }

    const categoryId = category || 'sayur-mayur';
    const categoryResult = await query('SELECT 1 FROM categories WHERE id = $1', [categoryId]);
    if (categoryResult.rowCount === 0) {
      return res.status(400).json({ message: 'Kategori produk tidak ditemukan.' });
    }

    const id = `prod-${Date.now()}-${randomBytes(4).toString('hex')}`;
    await tx(async (client) => {
      await client.query(
        `INSERT INTO products (id, name, category, price, unit, stock, description, image, badge, organic, available)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          id,
          name.trim(),
          categoryId,
          priceValue,
          unitValue,
          stockValue,
          description || '',
          image || 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
          badge || '',
          Boolean(organic),
          available === false || available === 'false' ? false : true
        ]
      );
      if (hasVariants) await saveVariants(client, id, variants);
    });

    const saved = await query('SELECT * FROM products WHERE id = $1', [id]);
    const [product] = await enrichProducts(saved.rows);
    res.status(201).json(product);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

app.put('/api/products/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const b = req.body;
    const variants = normalizeVariants(b.variants);

    if (b.name !== undefined && (typeof b.name !== 'string' || !b.name.trim())) {
      return res.status(400).json({ message: 'Nama produk tidak boleh kosong.' });
    }
    if (b.price !== undefined && (!Number.isFinite(Number(b.price)) || Number(b.price) < 0)) {
      return res.status(400).json({ message: 'Harga harus berupa angka nol atau lebih.' });
    }
    if (b.stock !== undefined && (!Number.isSafeInteger(Number(b.stock)) || Number(b.stock) < 0)) {
      return res.status(400).json({ message: 'Stok harus berupa bilangan bulat nol atau lebih.' });
    }
    if (b.category !== undefined) {
      const categoryResult = await query('SELECT 1 FROM categories WHERE id = $1', [b.category]);
      if (categoryResult.rowCount === 0) {
        return res.status(400).json({ message: 'Kategori produk tidak ditemukan.' });
      }
    }

    const updated = await tx(async (client) => {
      const lockedProducts = await lockProducts(client, [req.params.id]);
      const cur = mapProduct(lockedProducts.get(req.params.id));
      if (!cur) throw httpError(404, 'Produk tidak ditemukan');

      const currentVariants = await client.query(
        'SELECT id FROM product_variants WHERE product_id = $1 FOR UPDATE',
        [req.params.id]
      );
      const hasExistingVariants = currentVariants.rowCount > 0;
      if (
        hasExistingVariants && variants === undefined &&
        (b.price !== undefined || b.unit !== undefined || b.stock !== undefined)
      ) {
        throw httpError(400, 'Harga, satuan, dan stok produk bervarian harus diatur melalui daftar variannya.');
      }

      let priceValue = b.price !== undefined ? Number(b.price) : cur.price;
      let unitValue = b.unit !== undefined ? b.unit : cur.unit;
      let stockValue = b.stock !== undefined ? Number(b.stock) : cur.stock;

      if (variants !== undefined) {
        const savedVariants = await saveVariants(client, req.params.id, variants);
        if (savedVariants.length > 0) {
          const summary = getVariantSummary(savedVariants);
          priceValue = summary.price;
          unitValue = summary.unit;
          stockValue = summary.stock;
        }
      }

      const result = await client.query(
        `UPDATE products SET
           name = $1, category = $2, price = $3, unit = $4, stock = $5,
           description = $6, image = $7, badge = $8, organic = $9, available = $10
         WHERE id = $11 RETURNING *`,
        [
          b.name !== undefined ? b.name.trim() : cur.name,
          b.category !== undefined ? b.category : cur.category,
          priceValue,
          unitValue,
          stockValue,
          b.description !== undefined ? b.description : cur.description,
          b.image !== undefined ? b.image : cur.image,
          b.badge !== undefined ? b.badge : cur.badge,
          b.organic !== undefined ? Boolean(b.organic) : cur.organic,
          b.available === false || b.available === 'false' ? false : (b.available !== undefined ? true : cur.available),
          req.params.id
        ]
      );
      return result.rows[0];
    });

    const [product] = await enrichProducts([updated]);
    res.json(product);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
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
    const { customerName, customerPhone, address, deliverySlot, paymentMethodId, paymentMethod, notes, items } = req.body;
    if (
      typeof customerName !== 'string' || !customerName.trim() ||
      typeof customerPhone !== 'string' || !customerPhone.trim() ||
      typeof address !== 'string' || !address.trim() ||
      !Array.isArray(items) || items.length === 0 || items.length > 50
    ) {
      return res.status(400).json({ message: 'Mohon lengkapi data pemesan dan item keranjang belanja' });
    }

    const requestedItems = [];
    const seenIds = new Set();
    for (const item of items) {
      const productId = typeof item?.id === 'string' ? item.id.trim() : '';
      const variantId = typeof item?.variantId === 'string' ? item.variantId.trim() : '';
      const quantity = Number(item?.quantity);
      if (!productId || productId.length > 64) {
        return res.status(400).json({ message: 'Item keranjang memiliki ID produk yang tidak valid.' });
      }
      if (variantId.length > 64) {
        return res.status(400).json({ message: 'ID varian produk tidak valid.' });
      }
      const itemKey = `${productId}:${variantId || 'produk'}`;
      if (seenIds.has(itemKey)) {
        return res.status(400).json({ message: 'Produk atau varian yang sama tidak boleh muncul lebih dari sekali di keranjang.' });
      }
      if (!Number.isSafeInteger(quantity) || quantity <= 0) {
        return res.status(400).json({ message: 'Jumlah setiap produk harus berupa bilangan bulat lebih dari nol.' });
      }
      seenIds.add(itemKey);
      requestedItems.push({ productId, variantId, quantity });
    }

    const result = await tx(async (client) => {
      const si = await client.query('SELECT data FROM store_info WHERE id = 1 FOR SHARE');
      const storeInfo = si.rows[0]?.data || {};
      const selectedPayment = selectPaymentMethod(storeInfo, paymentMethodId, paymentMethod);
      const lockedProducts = await lockProducts(client, requestedItems.map((item) => item.productId));
      let itemsTotal = 0;
      const processedItems = [];
      const variantProductIds = new Set();

      for (const item of requestedItems) {
        const product = lockedProducts.get(item.productId);
        if (!product) {
          const error = new Error('Salah satu produk di keranjang sudah tidak tersedia. Muat ulang katalog.');
          error.status = 409;
          throw error;
        }
        if (!product.available) {
          const error = new Error(`${product.name} sedang tidak tersedia.`);
          error.status = 409;
          throw error;
        }

        let price;
        let unit;
        let variantName;

        if (item.variantId) {
          const variantResult = await client.query(
            'SELECT * FROM product_variants WHERE id = $1 AND product_id = $2 FOR UPDATE',
            [item.variantId, product.id]
          );
          const variant = variantResult.rows[0];
          if (!variant) {
            const error = new Error(`Varian ${product.name} sudah tidak tersedia. Muat ulang katalog.`);
            error.status = 409;
            throw error;
          }
          if (!variant.available || variant.stock < item.quantity) {
            const error = new Error(`Stok varian ${variant.name} untuk ${product.name} tidak mencukupi. Stok tersedia: ${variant.stock}.`);
            error.status = 409;
            throw error;
          }

          price = Number(variant.price);
          unit = variant.unit;
          variantName = variant.name;
          const newStock = variant.stock - item.quantity;
          await client.query(
            `UPDATE product_variants SET stock = $1, available = $2, updated_at = NOW() WHERE id = $3`,
            [newStock, newStock > 0 && variant.available, variant.id]
          );
          variantProductIds.add(product.id);
        } else {
          const variantCount = await client.query(
            'SELECT COUNT(*)::int AS count FROM product_variants WHERE product_id = $1',
            [product.id]
          );
          if (variantCount.rows[0].count > 0) {
            const error = new Error(`Pilih varian untuk ${product.name} sebelum checkout.`);
            error.status = 409;
            throw error;
          }
          if (product.stock < item.quantity) {
            const error = new Error(`Stok ${product.name} tidak mencukupi. Stok tersedia: ${product.stock}.`);
            error.status = 409;
            throw error;
          }

          price = Number(product.price);
          unit = product.unit;
          const newStock = product.stock - item.quantity;
          await client.query(
            `UPDATE products SET stock = $1, available = $2 WHERE id = $3`,
            [newStock, newStock > 0 && product.available, product.id]
          );
        }

        itemsTotal += price * item.quantity;
        processedItems.push({
          id: product.id,
          name: product.name,
          price,
          unit,
          quantity: item.quantity,
          ...(item.variantId ? { variantId: item.variantId, variantName } : {})
        });
      }

      for (const productId of variantProductIds) {
        await syncProductVariantSummary(client, productId);
      }

      const freeMin = storeInfo.freeDeliveryMin || 150000;
      const deliveryFee = itemsTotal >= freeMin ? 0 : (storeInfo.deliveryFee || 8000);
      const grandTotal = itemsTotal + deliveryFee;

      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const orderId = `ORD-${dateStr}-${randomBytes(6).toString('hex').toUpperCase()}`;

      const insertRes = await client.query(
        `INSERT INTO orders (
           id, user_id, user_email, customer_name, customer_phone, address,
           delivery_slot, payment_method, notes, items, items_total, delivery_fee, grand_total, payment_details, status
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12, $13, $14::jsonb, 'Menunggu Konfirmasi')
         RETURNING *`,
        [
          orderId, req.user.id, req.user.email,
          customerName.trim(), customerPhone.trim(), address.trim(),
          deliverySlot || 'Pengiriman Pagi 1 (06.00 - 08.00 WIB)',
          selectedPayment.label,
          notes || '',
          JSON.stringify(processedItems),
          itemsTotal, deliveryFee, grandTotal, JSON.stringify(selectedPayment)
        ]
      );

      return mapOrder(insertRes.rows[0]);
    });

    res.status(201).json(result);
  } catch (err) {
    if (err.status === 409) {
      return res.status(409).json({ message: err.message });
    }
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

  try {
    const updatedOrder = await tx(async (client) => {
      const current = await client.query('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [req.params.id]);
      if (current.rowCount === 0) {
        const error = new Error('Pesanan tidak ditemukan');
        error.status = 404;
        throw error;
      }

      const order = current.rows[0];
      if (order.status === status) return mapOrder(order);

      const nextStatus = {
        'Menunggu Konfirmasi': ['Sedang Dikemas', 'Dibatalkan'],
        'Sedang Dikemas': ['Sedang Dikirim', 'Dibatalkan'],
        'Sedang Dikirim': ['Selesai', 'Dibatalkan'],
        'Selesai': [],
        'Dibatalkan': []
      };
      if (!nextStatus[order.status]?.includes(status)) {
        const error = new Error(`Perubahan status dari "${order.status}" ke "${status}" tidak diizinkan.`);
        error.status = 409;
        throw error;
      }

      if (status === 'Dibatalkan') {
        const restorableItems = (order.items || []).filter((item) => (
          item.id && Number.isSafeInteger(Number(item.quantity)) && Number(item.quantity) > 0
        ));
        await lockProducts(client, restorableItems.map((item) => item.id));
        const variantProductIds = new Set();
        for (const item of restorableItems) {
          const quantity = Number(item.quantity);
          if (item.variantId) {
            const restored = await client.query(
              `UPDATE product_variants
               SET stock = stock + $1,
                   available = CASE WHEN stock = 0 THEN true ELSE available END,
                   updated_at = NOW()
               WHERE id = $2 AND product_id = $3`,
              [quantity, item.variantId, item.id]
            );
            if (restored.rowCount === 0) {
              throw httpError(409, `Varian pada pesanan ${order.id} tidak lagi tersedia untuk dipulihkan.`);
            }
            variantProductIds.add(item.id);
          } else {
            await client.query(
              `UPDATE products
               SET stock = stock + $1,
                   available = CASE WHEN stock = 0 THEN true ELSE available END
               WHERE id = $2`,
              [quantity, item.id]
            );
          }
        }
        for (const productId of variantProductIds) {
          await syncProductVariantSummary(client, productId);
        }
      }

      const updated = await client.query(
        `UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
        [status, req.params.id]
      );
      return mapOrder(updated.rows[0]);
    });

    res.json(updatedOrder);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    console.error('Order status update error:', err);
    res.status(500).json({ message: 'Gagal memperbarui status pesanan.' });
  }
});

// -------------------------------------------------------------
// STORE INFO
// -------------------------------------------------------------
app.get('/api/store-info', async (req, res) => {
  const r = await query('SELECT data FROM store_info WHERE id = 1');
  const info = r.rows[0]?.data || {};
  res.json({ ...info, paymentMethods: getPaymentMethods(info) });
});

app.put('/api/store-info', verifyToken, requireAdmin, async (req, res) => {
  try {
    const paymentMethods = req.body.paymentMethods === undefined
      ? undefined
      : normalizePaymentMethods(req.body.paymentMethods);
    const updated = await tx(async (client) => {
      const cur = await client.query('SELECT data FROM store_info WHERE id = 1 FOR UPDATE');
      const curData = cur.rows[0]?.data || {};
      const merged = {
        ...curData,
        ...req.body,
        paymentMethods: paymentMethods || getPaymentMethods(curData)
      };
      await client.query(
        `INSERT INTO store_info (id, data, updated_at) VALUES (1, $1, NOW())
         ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
        [JSON.stringify(merged)]
      );
      return merged;
    });
    res.json(updated);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    console.error('Store settings update error:', err);
    res.status(500).json({ message: 'Gagal menyimpan pengaturan toko.' });
  }
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
