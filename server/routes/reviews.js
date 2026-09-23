const express = require('express');
const { randomBytes } = require('crypto');
const { query, mapReview } = require('../db');
const { verifyToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Helper: compute rating summary untuk 1 produk
async function computeProductRating(productId) {
  const r = await query(
    `SELECT
       COUNT(*)::int AS total,
       COALESCE(ROUND(AVG(rating)::numeric, 2), 0)::float AS average,
       COUNT(*) FILTER (WHERE rating = 1)::int AS r1,
       COUNT(*) FILTER (WHERE rating = 2)::int AS r2,
       COUNT(*) FILTER (WHERE rating = 3)::int AS r3,
       COUNT(*) FILTER (WHERE rating = 4)::int AS r4,
       COUNT(*) FILTER (WHERE rating = 5)::int AS r5
     FROM reviews WHERE product_id = $1`,
    [productId]
  );
  const row = r.rows[0];
  return {
    total: row.total,
    average: row.average,
    breakdown: { 1: row.r1, 2: row.r2, 3: row.r3, 4: row.r4, 5: row.r5 }
  };
}

// -------------------------------------------------------------
// GET /api/reviews/product/:productId (public)
// -------------------------------------------------------------
router.get('/product/:productId', async (req, res) => {
  const r = await query(
    `SELECT * FROM reviews WHERE product_id = $1 ORDER BY created_at DESC`,
    [req.params.productId]
  );
  const summary = await computeProductRating(req.params.productId);
  res.json({
    reviews: r.rows.map(mapReview),
    summary
  });
});

// -------------------------------------------------------------
// GET /api/reviews/eligible
// -------------------------------------------------------------
router.get('/eligible', verifyToken, async (req, res) => {
  // Ambil produk dari order Selesai user, dan yang belum direview
  const r = await query(
    `SELECT DISTINCT o.id AS order_id, o.created_at AS order_date, item.value AS item
     FROM orders o, LATERAL jsonb_array_elements(o.items) item
     WHERE o.user_id = $1 AND o.status = 'Selesai'`,
    [req.user.id]
  );
  const reviewed = await query(
    `SELECT product_id FROM reviews WHERE user_id = $1`,
    [req.user.id]
  );
  const reviewedSet = new Set(reviewed.rows.map(x => x.product_id));

  const productMap = new Map();
  for (const row of r.rows) {
    const item = row.item;
    if (reviewedSet.has(item.id)) continue;
    if (productMap.has(item.id)) continue;
    productMap.set(item.id, {
      productId: item.id,
      productName: item.name,
      unit: item.unit,
      orderId: row.order_id,
      orderDate: row.order_date
    });
  }
  res.json(Array.from(productMap.values()));
});

// -------------------------------------------------------------
// GET /api/reviews/my
// -------------------------------------------------------------
router.get('/my', verifyToken, async (req, res) => {
  const r = await query(
    `SELECT * FROM reviews WHERE user_id = $1 ORDER BY created_at DESC`,
    [req.user.id]
  );
  res.json(r.rows.map(mapReview));
});

// -------------------------------------------------------------
// POST /api/reviews
// -------------------------------------------------------------
router.post('/', verifyToken, async (req, res) => {
  try {
    const { productId, rating, comment, orderId } = req.body;

    if (!productId) return res.status(400).json({ message: 'Produk wajib ditentukan.' });
    const ratingNum = Number(rating);
    if (!ratingNum || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ message: 'Rating harus antara 1 sampai 5.' });
    }

    const prodResult = await query('SELECT * FROM products WHERE id = $1', [productId]);
    if (prodResult.rowCount === 0) {
      return res.status(404).json({ message: 'Produk tidak ditemukan.' });
    }
    const product = prodResult.rows[0];

    // Validasi pernah beli & Selesai
    const purchased = await query(
      `SELECT 1 FROM orders
       WHERE user_id = $1 AND status = 'Selesai'
       AND items @> $2::jsonb LIMIT 1`,
      [req.user.id, JSON.stringify([{ id: productId }])]
    );
    if (purchased.rowCount === 0) {
      return res.status(403).json({
        message: 'Anda hanya dapat memberi ulasan untuk produk yang sudah pernah Anda beli dan pesanannya sudah selesai.'
      });
    }

    // Cegah duplikat
    const dup = await query(
      `SELECT id FROM reviews WHERE product_id = $1 AND user_id = $2`,
      [productId, req.user.id]
    );
    if (dup.rowCount > 0) {
      return res.status(409).json({
        message: 'Anda sudah memberi ulasan untuk produk ini. Hapus atau edit ulasan lama Anda jika ingin mengubah.'
      });
    }

    const id = `rev-${Date.now()}-${randomBytes(4).toString('hex')}`;
    const inserted = await query(
      `INSERT INTO reviews (id, product_id, product_name, user_id, user_name, rating, comment, order_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [id, productId, product.name, req.user.id, req.user.name, ratingNum, (comment || '').trim(), orderId || null]
    );

    res.status(201).json({
      message: 'Terima kasih atas ulasan Anda!',
      review: mapReview(inserted.rows[0])
    });
  } catch (err) {
    console.error('Create review error:', err);
    res.status(500).json({ message: 'Gagal menyimpan ulasan: ' + err.message });
  }
});

// -------------------------------------------------------------
// PUT /api/reviews/:id (owner only)
// -------------------------------------------------------------
router.put('/:id', verifyToken, async (req, res) => {
  const { rating, comment } = req.body;
  const r = await query('SELECT * FROM reviews WHERE id = $1', [req.params.id]);
  if (r.rowCount === 0) return res.status(404).json({ message: 'Ulasan tidak ditemukan.' });
  const review = r.rows[0];

  if (review.user_id !== req.user.id) {
    return res.status(403).json({ message: 'Anda hanya dapat mengubah ulasan sendiri.' });
  }

  const updates = [];
  const params = [];
  let idx = 1;

  if (rating !== undefined) {
    const rn = Number(rating);
    if (!rn || rn < 1 || rn > 5) return res.status(400).json({ message: 'Rating harus antara 1 sampai 5.' });
    updates.push(`rating = $${idx++}`);
    params.push(rn);
  }
  if (comment !== undefined) {
    updates.push(`comment = $${idx++}`);
    params.push(comment.trim());
  }
  updates.push(`updated_at = NOW()`);
  params.push(req.params.id);

  const updated = await query(
    `UPDATE reviews SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
    params
  );
  res.json({ message: 'Ulasan berhasil diperbarui.', review: mapReview(updated.rows[0]) });
});

// -------------------------------------------------------------
// DELETE /api/reviews/:id (owner atau admin)
// -------------------------------------------------------------
router.delete('/:id', verifyToken, async (req, res) => {
  const r = await query('SELECT * FROM reviews WHERE id = $1', [req.params.id]);
  if (r.rowCount === 0) return res.status(404).json({ message: 'Ulasan tidak ditemukan.' });
  const review = r.rows[0];

  if (req.user.role !== 'admin' && review.user_id !== req.user.id) {
    return res.status(403).json({ message: 'Anda hanya dapat menghapus ulasan sendiri.' });
  }
  await query('DELETE FROM reviews WHERE id = $1', [req.params.id]);
  res.json({ message: 'Ulasan berhasil dihapus.', deletedId: req.params.id });
});

// -------------------------------------------------------------
// GET /api/reviews (admin) - list all
// -------------------------------------------------------------
router.get('/', verifyToken, requireAdmin, async (req, res) => {
  const { rating, search, productId } = req.query;
  const conditions = [];
  const params = [];
  let idx = 1;

  if (rating) {
    const rn = Number(rating);
    if (rn >= 1 && rn <= 5) {
      conditions.push(`rating = $${idx++}`);
      params.push(rn);
    }
  }
  if (productId) {
    conditions.push(`product_id = $${idx++}`);
    params.push(productId);
  }
  if (search) {
    const q = '%' + search.toLowerCase().trim() + '%';
    conditions.push(`(LOWER(product_name) LIKE $${idx} OR LOWER(user_name) LIKE $${idx} OR LOWER(comment) LIKE $${idx})`);
    params.push(q);
    idx++;
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const sql = `SELECT * FROM reviews ${where} ORDER BY created_at DESC`;
  const r = await query(sql, params);
  res.json(r.rows.map(mapReview));
});

// -------------------------------------------------------------
// GET /api/reviews/summary/stats (admin)
// -------------------------------------------------------------
router.get('/summary/stats', verifyToken, requireAdmin, async (req, res) => {
  const overall = await query(`
    SELECT
      COUNT(*)::int AS total,
      COALESCE(ROUND(AVG(rating)::numeric, 2), 0)::float AS avg_rating,
      COUNT(*) FILTER (WHERE rating = 1)::int AS r1,
      COUNT(*) FILTER (WHERE rating = 2)::int AS r2,
      COUNT(*) FILTER (WHERE rating = 3)::int AS r3,
      COUNT(*) FILTER (WHERE rating = 4)::int AS r4,
      COUNT(*) FILTER (WHERE rating = 5)::int AS r5
    FROM reviews
  `);
  const row = overall.rows[0];

  const productAvgs = await query(`
    SELECT product_id, product_name,
      ROUND(AVG(rating)::numeric, 2)::float AS avg,
      COUNT(*)::int AS count
    FROM reviews
    GROUP BY product_id, product_name
  `);
  const lowestRated = [...productAvgs.rows].sort((a, b) => a.avg - b.avg).slice(0, 5)
    .map(x => ({ productId: x.product_id, productName: x.product_name, avg: x.avg, count: x.count }));
  const topRated = [...productAvgs.rows].sort((a, b) => b.avg - a.avg).slice(0, 5)
    .map(x => ({ productId: x.product_id, productName: x.product_name, avg: x.avg, count: x.count }));

  res.json({
    total: row.total,
    avgRating: row.avg_rating,
    breakdown: { 1: row.r1, 2: row.r2, 3: row.r3, 4: row.r4, 5: row.r5 },
    lowestRated,
    topRated
  });
});

module.exports = { router, computeProductRating };
