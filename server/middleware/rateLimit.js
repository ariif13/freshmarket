const rateLimit = require('express-rate-limit');

/**
 * STRATEGI RATE LIMITING BERLAPIS:
 * ---------------------------------
 * 1. IP-based limiter (express-rate-limit) untuk mencegah spam dari 1 IP
 * 2. Account-based lockout untuk mencegah brute-force pada 1 akun
 *
 * Keduanya berjalan bersamaan supaya:
 * - Attacker tidak bisa spam banyak email dari 1 IP
 * - Attacker tidak bisa distribute serangan dari banyak IP ke 1 akun
 */

// ============================================================
// 1. IP-BASED LIMITERS
// ============================================================

// Login limiter: 5 percobaan per 15 menit per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 5,
  message: {
    message: 'Terlalu banyak percobaan login dari IP ini. Silakan coba lagi dalam 15 menit.',
    retryAfter: 15
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip counter kalau login sukses (agar user valid tidak kena limit)
  skipSuccessfulRequests: true,
  handler: (req, res, next, options) => {
    res.status(429).json({
      message: options.message.message,
      retryAfter: options.message.retryAfter,
      code: 'IP_RATE_LIMIT'
    });
  }
});

// Register limiter: 3 pendaftaran per jam per IP (cegah spam akun)
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 jam
  max: 3,
  message: {
    message: 'Terlalu banyak pendaftaran dari IP ini. Silakan coba lagi dalam 1 jam.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    res.status(429).json({
      message: options.message.message,
      retryAfter: options.message.retryAfter,
      code: 'IP_RATE_LIMIT'
    });
  }
});

// General API limiter: 100 request per 15 menit per IP (untuk endpoint auth lainnya)
const generalAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    message: 'Terlalu banyak request. Silakan coba lagi nanti.',
    retryAfter: 15
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    res.status(429).json({
      message: options.message.message,
      retryAfter: options.message.retryAfter,
      code: 'IP_RATE_LIMIT'
    });
  }
});

// ============================================================
// 2. ACCOUNT-BASED LOCKOUT (in-memory store)
// ============================================================

/**
 * Simpan tracking gagal login per email.
 * Structure: Map<email, { count, firstAttempt, lockedUntil }>
 *
 * PENTING: In-memory store hanya untuk single-instance server.
 * Kalau nanti pakai multi-instance (PM2 cluster, docker swarm, dll)
 * ganti ke Redis.
 */
const failedAttempts = new Map();

const ACCOUNT_CONFIG = {
  maxAttempts: 5,             // 5 gagal berturut-turut
  windowMs: 15 * 60 * 1000,   // dalam 15 menit
  lockoutMs: 30 * 60 * 1000   // lockout 30 menit
};

/**
 * Middleware yang dipanggil SEBELUM login untuk cek apakah account terkunci.
 */
function accountLockoutCheck(req, res, next) {
  const email = (req.body?.email || '').trim().toLowerCase();
  if (!email) return next();

  const record = failedAttempts.get(email);
  if (!record) return next();

  const now = Date.now();

  // Kalau lockedUntil masih di masa depan, tolak
  if (record.lockedUntil && record.lockedUntil > now) {
    const minutesLeft = Math.ceil((record.lockedUntil - now) / 60000);
    return res.status(429).json({
      message: `Akun ini terkunci sementara karena terlalu banyak percobaan login gagal. Coba lagi dalam ${minutesLeft} menit atau hubungi admin.`,
      retryAfter: minutesLeft,
      code: 'ACCOUNT_LOCKED',
      unlockAt: new Date(record.lockedUntil).toISOString()
    });
  }

  // Lockout sudah lewat, reset counter
  if (record.lockedUntil && record.lockedUntil <= now) {
    failedAttempts.delete(email);
  }

  next();
}

/**
 * Dipanggil dari handler login setelah verifikasi password.
 * @param {string} email
 * @param {boolean} success  true = login sukses, false = gagal
 */
function recordLoginAttempt(email, success) {
  const clean = (email || '').trim().toLowerCase();
  if (!clean) return { locked: false };

  // Sukses → hapus counter
  if (success) {
    failedAttempts.delete(clean);
    return { locked: false };
  }

  // Gagal → tambah counter
  const now = Date.now();
  const record = failedAttempts.get(clean) || {
    count: 0,
    firstAttempt: now,
    lockedUntil: null
  };

  // Kalau window sudah lewat, reset
  if (now - record.firstAttempt > ACCOUNT_CONFIG.windowMs) {
    record.count = 0;
    record.firstAttempt = now;
    record.lockedUntil = null;
  }

  record.count += 1;

  // Kalau sudah melewati batas → kunci
  let lockedInfo = { locked: false };
  if (record.count >= ACCOUNT_CONFIG.maxAttempts) {
    record.lockedUntil = now + ACCOUNT_CONFIG.lockoutMs;
    lockedInfo = {
      locked: true,
      lockedUntil: record.lockedUntil,
      minutesLocked: Math.ceil(ACCOUNT_CONFIG.lockoutMs / 60000)
    };
  }

  failedAttempts.set(clean, record);

  return {
    ...lockedInfo,
    attemptsUsed: record.count,
    attemptsLeft: Math.max(0, ACCOUNT_CONFIG.maxAttempts - record.count)
  };
}

/**
 * Reset lockout manual (untuk admin unlock user)
 */
function resetLockout(email) {
  const clean = (email || '').trim().toLowerCase();
  return failedAttempts.delete(clean);
}

/**
 * Cek status lockout suatu email (untuk debug/admin)
 */
function getLockoutStatus(email) {
  const clean = (email || '').trim().toLowerCase();
  const record = failedAttempts.get(clean);
  if (!record) return null;
  return {
    email: clean,
    count: record.count,
    firstAttempt: new Date(record.firstAttempt).toISOString(),
    lockedUntil: record.lockedUntil ? new Date(record.lockedUntil).toISOString() : null,
    isLocked: record.lockedUntil && record.lockedUntil > Date.now()
  };
}

// Cleanup periodic: hapus record yang sudah lama tidak aktif (setiap 1 jam)
setInterval(() => {
  const now = Date.now();
  const cutoff = ACCOUNT_CONFIG.windowMs + ACCOUNT_CONFIG.lockoutMs;
  for (const [email, record] of failedAttempts.entries()) {
    const lastActivity = record.lockedUntil || record.firstAttempt;
    if (now - lastActivity > cutoff) {
      failedAttempts.delete(email);
    }
  }
}, 60 * 60 * 1000);

module.exports = {
  loginLimiter,
  registerLimiter,
  generalAuthLimiter,
  accountLockoutCheck,
  recordLoginAttempt,
  resetLockout,
  getLockoutStatus,
  ACCOUNT_CONFIG
};
