const jwt = require('jsonwebtoken');
const { query } = require('../db');

// PENTING: Wajib set JWT_SECRET di production melalui env variable.
const JWT_SECRET = process.env.JWT_SECRET || 'freshmarket-dev-secret-change-me-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

if (process.env.NODE_ENV === 'production' && JWT_SECRET === 'freshmarket-dev-secret-change-me-in-production') {
  console.warn('\n[WARN] JWT_SECRET masih default! Set env JWT_SECRET dengan string acak yang aman.\n');
}

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Token tidak ditemukan. Silakan login terlebih dahulu.' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ message: 'Token tidak valid atau sudah kadaluarsa. Silakan login ulang.' });
  }

  try {
    const result = await query(
      'SELECT id, email, role, name FROM users WHERE id = $1',
      [decoded.id]
    );
    if (result.rowCount === 0) {
      return res.status(401).json({ message: 'Akun tidak ditemukan atau sudah dihapus. Silakan login kembali.' });
    }

    if (decoded.role !== result.rows[0].role) {
      return res.status(401).json({ message: 'Role akun berubah. Silakan login kembali untuk memperbarui sesi.' });
    }

    // Role dan identitas selalu mengikuti keadaan terbaru di database, bukan klaim token lama.
    req.user = { ...decoded, ...result.rows[0] };
    next();
  } catch (err) {
    console.error('[Auth] Gagal memeriksa sesi:', err.message);
    return res.status(503).json({ message: 'Sesi tidak dapat diverifikasi saat ini. Coba lagi.' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Akses ditolak. Hanya admin yang dapat mengakses fitur ini.' });
  }
  next();
}

// Optional auth: lampirkan user jika ada token, tapi tidak wajib
async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    req.user = null;
    return next();
  }

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch {
    req.user = null;
    return next();
  }

  try {
    const result = await query(
      'SELECT id, email, role, name FROM users WHERE id = $1',
      [decoded.id]
    );
    req.user = result.rows[0] ? { ...decoded, ...result.rows[0] } : null;
  } catch {
    req.user = null;
  }

  next();
}

module.exports = { signToken, verifyToken, requireAdmin, optionalAuth, JWT_SECRET };
