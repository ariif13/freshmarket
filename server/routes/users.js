const express = require('express');
const bcrypt = require('bcryptjs');
const { query, mapUser } = require('../db');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { resetLockout, getLockoutStatus } = require('../middleware/rateLimit');

const router = express.Router();

router.use(verifyToken, requireAdmin);

function sanitizeUser(user) {
  if (!user) return null;
  const { passwordHash, ...safe } = user;
  return safe;
}

function generateRandomPassword(length = 10) {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Aggregasi statistik order per user
async function getUserOrderStats(userId) {
  const r = await query(
    `SELECT
       COUNT(*)::int AS order_count,
       COUNT(*) FILTER (WHERE status = 'Selesai')::int AS completed_count,
       COALESCE(SUM(grand_total) FILTER (WHERE status <> 'Dibatalkan'), 0)::float AS total_spent,
       MAX(created_at) AS last_order_date
     FROM orders WHERE user_id = $1`,
    [userId]
  );
  const row = r.rows[0];
  return {
    orderCount: row.order_count,
    completedCount: row.completed_count,
    totalSpent: row.total_spent,
    lastOrderDate: row.last_order_date
  };
}

// -------------------------------------------------------------
// GET /api/users - list dengan filter role & search
// -------------------------------------------------------------
router.get('/', async (req, res) => {
  try {
    const { role, search } = req.query;
    const conditions = [];
    const params = [];
    let idx = 1;

    if (role && role !== 'all') {
      conditions.push(`role = $${idx++}`);
      params.push(role);
    }
    if (search) {
      const q = '%' + search.toLowerCase().trim() + '%';
      conditions.push(`(LOWER(name) LIKE $${idx} OR LOWER(email) LIKE $${idx} OR phone LIKE $${idx})`);
      params.push(q);
      idx++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `
      SELECT * FROM users ${where}
      ORDER BY CASE role WHEN 'admin' THEN 0 ELSE 1 END, created_at DESC
    `;
    const result = await query(sql, params);

    // enrich stats
    const users = await Promise.all(result.rows.map(async (r) => {
      const u = mapUser(r);
      const stats = await getUserOrderStats(u.id);
      return { ...sanitizeUser(u), stats };
    }));

    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal ambil daftar user: ' + err.message });
  }
});

// -------------------------------------------------------------
// GET /api/users/stats
// -------------------------------------------------------------
router.get('/stats', async (req, res) => {
  try {
    const total = await query('SELECT COUNT(*)::int AS c FROM users');
    const admin = await query(`SELECT COUNT(*)::int AS c FROM users WHERE role = 'admin'`);
    const customer = await query(`SELECT COUNT(*)::int AS c FROM users WHERE role = 'customer'`);
    const active = await query(`
      SELECT COUNT(DISTINCT u.id)::int AS c
      FROM users u JOIN orders o ON o.user_id = u.id
      WHERE u.role = 'customer'
    `);
    const newUsers = await query(`
      SELECT COUNT(*)::int AS c FROM users WHERE created_at >= NOW() - INTERVAL '30 days'
    `);
    res.json({
      totalUsers: total.rows[0].c,
      adminCount: admin.rows[0].c,
      customerCount: customer.rows[0].c,
      activeCustomerCount: active.rows[0].c,
      newUsersCount: newUsers.rows[0].c
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// -------------------------------------------------------------
// GET /api/users/:id
// -------------------------------------------------------------
router.get('/:id', async (req, res) => {
  const r = await query('SELECT * FROM users WHERE id = $1', [req.params.id]);
  if (r.rowCount === 0) return res.status(404).json({ message: 'User tidak ditemukan.' });
  const user = mapUser(r.rows[0]);
  const stats = await getUserOrderStats(user.id);
  res.json({ ...sanitizeUser(user), stats });
});

// -------------------------------------------------------------
// PATCH /api/users/:id/role
// -------------------------------------------------------------
router.patch('/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    if (!role || !['admin', 'customer'].includes(role)) {
      return res.status(400).json({ message: 'Role tidak valid.' });
    }
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: 'Anda tidak dapat mengubah role akun Anda sendiri.' });
    }

    const r = await query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ message: 'User tidak ditemukan.' });
    const user = mapUser(r.rows[0]);

    if (user.role === 'admin' && role === 'customer') {
      const admins = await query(`SELECT COUNT(*)::int AS c FROM users WHERE role = 'admin'`);
      if (admins.rows[0].c <= 1) {
        return res.status(400).json({ message: 'Tidak dapat menurunkan role admin terakhir. Minimal harus ada 1 admin.' });
      }
    }

    const updated = await query(
      `UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [role, req.params.id]
    );
    res.json({
      message: `Role berhasil diubah menjadi ${role === 'admin' ? 'Admin' : 'Pelanggan'}.`,
      user: sanitizeUser(mapUser(updated.rows[0]))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// -------------------------------------------------------------
// POST /api/users/:id/reset-password
// -------------------------------------------------------------
router.post('/:id/reset-password', async (req, res) => {
  try {
    const { newPassword } = req.body;
    const r = await query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ message: 'User tidak ditemukan.' });
    const user = mapUser(r.rows[0]);

    const passwordToSet = newPassword && newPassword.length >= 6 ? newPassword : generateRandomPassword(10);
    if (passwordToSet.length < 6) {
      return res.status(400).json({ message: 'Password minimal 6 karakter.' });
    }

    const hash = await bcrypt.hash(passwordToSet, 10);
    const updated = await query(
      `UPDATE users SET password_hash = $1, password_reset_at = NOW(), password_reset_by = $2, updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [hash, req.user.id, req.params.id]
    );
    resetLockout(user.email);

    res.json({
      message: `Password untuk ${user.name} berhasil direset.`,
      newPassword: passwordToSet,
      user: sanitizeUser(mapUser(updated.rows[0]))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// -------------------------------------------------------------
// GET/POST lockout
// -------------------------------------------------------------
router.get('/:id/lockout', async (req, res) => {
  const r = await query('SELECT email, name, id FROM users WHERE id = $1', [req.params.id]);
  if (r.rowCount === 0) return res.status(404).json({ message: 'User tidak ditemukan.' });
  const user = r.rows[0];
  const status = getLockoutStatus(user.email);
  res.json({
    userId: user.id,
    email: user.email,
    lockout: status || { isLocked: false, count: 0 }
  });
});

router.post('/:id/unlock', async (req, res) => {
  const r = await query('SELECT email, name FROM users WHERE id = $1', [req.params.id]);
  if (r.rowCount === 0) return res.status(404).json({ message: 'User tidak ditemukan.' });
  const user = r.rows[0];
  const wasLocked = resetLockout(user.email);
  res.json({
    message: wasLocked
      ? `Lockout untuk ${user.name} berhasil dibuka. User dapat login kembali.`
      : `User ${user.name} tidak sedang terkunci.`,
    unlocked: wasLocked
  });
});

// -------------------------------------------------------------
// DELETE /api/users/:id
// -------------------------------------------------------------
router.delete('/:id', async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: 'Anda tidak dapat menghapus akun Anda sendiri.' });
    }
    const r = await query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ message: 'User tidak ditemukan.' });
    const user = mapUser(r.rows[0]);

    if (user.role === 'admin') {
      const c = await query(`SELECT COUNT(*)::int AS c FROM users WHERE role = 'admin'`);
      if (c.rows[0].c <= 1) {
        return res.status(400).json({ message: 'Tidak dapat menghapus admin terakhir.' });
      }
    }

    const active = await query(
      `SELECT COUNT(*)::int AS c FROM orders WHERE user_id = $1 AND status NOT IN ('Selesai', 'Dibatalkan')`,
      [user.id]
    );
    if (active.rows[0].c > 0) {
      return res.status(400).json({
        message: `User memiliki ${active.rows[0].c} pesanan aktif. Selesaikan atau batalkan pesanan terlebih dahulu.`
      });
    }

    await query('DELETE FROM users WHERE id = $1', [user.id]);
    res.json({ message: `User ${user.name} berhasil dihapus.`, deletedUserId: user.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
