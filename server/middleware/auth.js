const jwt = require('jsonwebtoken');

// PENTING: Wajib set JWT_SECRET di production melalui env variable.
const JWT_SECRET = process.env.JWT_SECRET || 'freshmarket-dev-secret-change-me-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

if (process.env.NODE_ENV === 'production' && JWT_SECRET === 'freshmarket-dev-secret-change-me-in-production') {
  console.warn('\n[WARN] JWT_SECRET masih default! Set env JWT_SECRET dengan string acak yang aman.\n');
}

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Token tidak ditemukan. Silakan login terlebih dahulu.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, email, role, name }
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token tidak valid atau sudah kadaluarsa. Silakan login ulang.' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Akses ditolak. Hanya admin yang dapat mengakses fitur ini.' });
  }
  next();
}

// Optional auth: lampirkan user jika ada token, tapi tidak wajib
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
  } catch {
    req.user = null;
  }
  next();
}

module.exports = { signToken, verifyToken, requireAdmin, optionalAuth, JWT_SECRET };
