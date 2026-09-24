const express = require('express');
const bcrypt = require('bcryptjs');
const { randomBytes } = require('crypto');
const { query, tx, mapUser } = require('../db');
const { signToken, verifyToken, JWT_SECRET } = require('../middleware/auth');
const { issueGoogleNonce, consumeGoogleNonce, verifyGoogleCredential, resolveGoogleCustomer, googleError } = require('../googleAuth');
const {
  loginLimiter,
  registerLimiter,
  generalAuthLimiter,
  accountLockoutCheck,
  recordLoginAttempt
} = require('../middleware/rateLimit');

const router = express.Router();
const GOOGLE_CLIENT_ID = (process.env.GOOGLE_CLIENT_ID || '').trim();

function sanitizeUser(user) {
  if (!user) return null;
  const { passwordHash, ...safe } = user;
  return safe;
}

// Google Identity Services (popup): ID token + nonce terikat browser.
router.get('/google/config', generalAuthLimiter, (req, res) => {
  res.set('Cache-Control', 'no-store');
  if (!GOOGLE_CLIENT_ID) return res.json({ enabled: false });
  res.json({ enabled: true, clientId: GOOGLE_CLIENT_ID, nonce: issueGoogleNonce(res, JWT_SECRET) });
});

function googleHandler(linkAccount = false) {
  return async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
      if (!GOOGLE_CLIENT_ID) throw googleError(503, 'GOOGLE_NOT_CONFIGURED', 'Login Google belum diaktifkan.');
      const nonce = consumeGoogleNonce(req, res, JWT_SECRET);
      const identity = await verifyGoogleCredential(req.body?.credential, nonce, GOOGLE_CLIENT_ID);
      const row = await tx((client) => resolveGoogleCustomer(client, identity, linkAccount ? req.user.id : null));
      const user = mapUser(row);
      if (linkAccount) {
        return res.json({ message: 'Akun Google berhasil dihubungkan.', user: sanitizeUser(user) });
      }
      const token = signToken({ id: user.id, email: user.email, role: user.role, name: user.name });
      res.json({ message: 'Login Google berhasil.', token, user: sanitizeUser(user) });
    } catch (error) {
      if (error.status) return res.status(error.status).json({ message: error.message, code: error.code });
      console.error('Google authentication error:', error.code || error.name);
      res.status(500).json({ message: 'Login Google belum berhasil. Silakan coba lagi.' });
    }
  };
}

router.post('/google', loginLimiter, googleHandler());
router.post('/google/link', verifyToken, loginLimiter, googleHandler(true));

// -------------------------------------------------------------
// POST /api/auth/register
// -------------------------------------------------------------
router.post('/register', registerLimiter, async (req, res) => {
  try {
    const { name, email, password, phone, address } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Nama, email, dan password wajib diisi.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password minimal 6 karakter.' });
    }

    const emailClean = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailClean)) {
      return res.status(400).json({ message: 'Format email tidak valid.' });
    }

    // Cek email exists
    const dup = await query('SELECT 1 FROM users WHERE LOWER(email) = $1', [emailClean]);
    if (dup.rowCount > 0) {
      return res.status(409).json({ message: 'Email sudah terdaftar. Silakan gunakan email lain atau login.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const id = `user-${Date.now()}-${randomBytes(4).toString('hex')}`;

    const result = await query(
      `INSERT INTO users (id, name, email, password_hash, phone, address, role)
       VALUES ($1, $2, $3, $4, $5, $6, 'customer') RETURNING *`,
      [id, name.trim(), emailClean, passwordHash, (phone || '').trim(), (address || '').trim()]
    );
    const newUser = mapUser(result.rows[0]);

    const token = signToken({
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
      name: newUser.name
    });

    res.status(201).json({
      message: 'Pendaftaran berhasil! Selamat datang di FreshMarket.',
      token,
      user: sanitizeUser(newUser)
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Gagal mendaftar: ' + err.message });
  }
});

// -------------------------------------------------------------
// POST /api/auth/login
// -------------------------------------------------------------
router.post('/login', loginLimiter, accountLockoutCheck, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password) {
      return res.status(400).json({ message: 'Email dan password wajib diisi.' });
    }

    const emailClean = email.trim().toLowerCase();
    const result = await query('SELECT * FROM users WHERE LOWER(email) = $1 LIMIT 1', [emailClean]);
    const user = result.rows[0] ? mapUser(result.rows[0]) : null;

    if (!user) {
      const info = recordLoginAttempt(emailClean, false);
      const msg = info.locked
        ? `Akun terkunci karena terlalu banyak percobaan gagal. Coba lagi dalam ${info.minutesLocked} menit.`
        : `Email atau password salah.${info.attemptsLeft > 0 ? ` Sisa percobaan: ${info.attemptsLeft}.` : ''}`;
      return res.status(info.locked ? 429 : 401).json({
        message: msg,
        attemptsLeft: info.attemptsLeft,
        code: info.locked ? 'ACCOUNT_LOCKED' : 'INVALID_CREDENTIALS'
      });
    }

    const isValid = user.hasPassword && await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      const info = recordLoginAttempt(emailClean, false);
      const msg = info.locked
        ? `Akun terkunci karena terlalu banyak percobaan gagal. Coba lagi dalam ${info.minutesLocked} menit.`
        : `Email atau password salah.${info.attemptsLeft > 0 ? ` Sisa percobaan: ${info.attemptsLeft}.` : ''}`;
      return res.status(info.locked ? 429 : 401).json({
        message: msg,
        attemptsLeft: info.attemptsLeft,
        code: info.locked ? 'ACCOUNT_LOCKED' : 'INVALID_CREDENTIALS'
      });
    }

    recordLoginAttempt(emailClean, true);

    const token = signToken({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    });

    res.json({
      message: 'Login berhasil.',
      token,
      user: sanitizeUser(user)
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Gagal login: ' + err.message });
  }
});

// -------------------------------------------------------------
// GET /api/auth/me
// -------------------------------------------------------------
router.get('/me', verifyToken, async (req, res) => {
  const result = await query('SELECT * FROM users WHERE id = $1', [req.user.id]);
  const user = result.rows[0] ? mapUser(result.rows[0]) : null;
  if (!user) return res.status(404).json({ message: 'User tidak ditemukan.' });
  res.json({ user: sanitizeUser(user) });
});

// -------------------------------------------------------------
// PUT /api/auth/me
// -------------------------------------------------------------
router.put('/me', verifyToken, async (req, res) => {
  try {
    const { name, phone, address, currentPassword, newPassword } = req.body;

    const existing = await query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    if (existing.rowCount === 0) {
      return res.status(404).json({ message: 'User tidak ditemukan.' });
    }
    const user = mapUser(existing.rows[0]);

    const updates = [];
    const values = [];
    let idx = 1;

    if (name !== undefined) {
      const trimmed = name.trim();
      if (!trimmed) return res.status(400).json({ message: 'Nama tidak boleh kosong.' });
      updates.push(`name = $${idx++}`);
      values.push(trimmed);
    }
    if (phone !== undefined) {
      updates.push(`phone = $${idx++}`);
      values.push(phone.trim());
    }
    if (address !== undefined) {
      updates.push(`address = $${idx++}`);
      values.push(address.trim());
    }

    // Ganti password
    if (newPassword) {
      if (!user.hasPassword) {
        return res.status(400).json({ message: 'Akun ini masuk melalui Google dan belum memiliki password lokal.' });
      }
      if (!currentPassword) return res.status(400).json({ message: 'Masukkan password lama untuk mengubah password.' });
      const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValid) return res.status(401).json({ message: 'Password lama salah.' });
      if (newPassword.length < 6) return res.status(400).json({ message: 'Password baru minimal 6 karakter.' });
      if (newPassword === currentPassword) return res.status(400).json({ message: 'Password baru tidak boleh sama dengan password lama.' });
      const hash = await bcrypt.hash(newPassword, 10);
      updates.push(`password_hash = $${idx++}`);
      values.push(hash);
    }

    if (updates.length === 0) {
      return res.json({ message: 'Tidak ada perubahan.', user: sanitizeUser(user) });
    }

    updates.push(`updated_at = NOW()`);
    values.push(req.user.id);
    const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`;
    const result = await query(sql, values);
    const updated = mapUser(result.rows[0]);

    res.json({ message: 'Profil berhasil diperbarui.', user: sanitizeUser(updated) });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ message: 'Gagal update profil: ' + err.message });
  }
});

module.exports = router;
