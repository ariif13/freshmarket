const { randomBytes } = require('crypto');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

const googleClient = new OAuth2Client();
const NONCE_COOKIE = 'freshmarket_google_nonce';
const NONCE_AUDIENCE = 'freshmarket:google-signin';

function googleError(status, code, message) {
  return Object.assign(new Error(message), { status, code });
}

function cookieOptions() {
  return { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/api/auth/google' };
}

function issueGoogleNonce(res, secret) {
  const nonce = randomBytes(32).toString('hex');
  const signed = jwt.sign({ nonce }, secret, { audience: NONCE_AUDIENCE, expiresIn: '10m', algorithm: 'HS256' });
  res.cookie(NONCE_COOKIE, signed, { ...cookieOptions(), maxAge: 10 * 60 * 1000 });
  return nonce;
}

function consumeGoogleNonce(req, res, secret) {
  res.clearCookie(NONCE_COOKIE, cookieOptions());
  try {
    const cookie = (req.headers.cookie || '').split(';').map((part) => part.trim())
      .find((part) => part.startsWith(`${NONCE_COOKIE}=`));
    const signed = cookie ? decodeURIComponent(cookie.slice(NONCE_COOKIE.length + 1)) : '';
    const claims = jwt.verify(signed, secret, { audience: NONCE_AUDIENCE, algorithms: ['HS256'] });
    if (typeof claims.nonce !== 'string' || !/^[a-f0-9]{64}$/.test(claims.nonce)) throw new Error('Invalid nonce');
    return claims.nonce;
  } catch {
    throw googleError(401, 'GOOGLE_SESSION_EXPIRED', 'Sesi login Google berakhir. Silakan coba tombol Google kembali.');
  }
}

async function verifyGoogleCredential(credential, nonce, clientId, verifier = googleClient) {
  if (typeof credential !== 'string' || !credential || credential.length > 16384) {
    throw googleError(400, 'GOOGLE_INVALID_TOKEN', 'Kredensial Google tidak valid.');
  }

  let payload;
  try {
    const ticket = await verifier.verifyIdToken({ idToken: credential, audience: clientId });
    payload = ticket.getPayload();
  } catch (error) {
    if (['ENOTFOUND', 'ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED'].includes(error.code) || error.response?.status >= 500) {
      throw googleError(503, 'GOOGLE_UNAVAILABLE', 'Google belum dapat dihubungi. Silakan coba lagi.');
    }
    throw googleError(401, 'GOOGLE_INVALID_TOKEN', 'Identitas Google tidak dapat diverifikasi. Silakan masuk kembali.');
  }

  const email = typeof payload?.email === 'string' ? payload.email.trim().toLowerCase() : '';
  if (
    !nonce || payload?.nonce !== nonce || payload.email_verified !== true ||
    typeof payload.sub !== 'string' || !payload.sub || payload.sub.length > 255 ||
    email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw googleError(401, 'GOOGLE_INVALID_TOKEN', 'Email atau sesi Google tidak dapat diverifikasi. Silakan coba kembali.');
  }

  return {
    sub: payload.sub,
    email,
    name: (typeof payload.name === 'string' && payload.name.trim() ? payload.name.trim() : email.split('@')[0]).slice(0, 255),
    // Google tidak menjamin kepemilikan terkini alamat email penyedia lain.
    authoritativeEmail: email.endsWith('@gmail.com') || (typeof payload.hd === 'string' && payload.hd.length > 0)
  };
}

function requireCustomer(user) {
  if (user.role !== 'customer') {
    throw googleError(403, 'GOOGLE_CUSTOMER_ONLY', 'Login Google tersedia untuk pelanggan. Akun admin menggunakan email dan password.');
  }
  return user;
}

async function resolveGoogleCustomer(client, identity, linkUserId = null) {
  // Serialisasikan pendaftaran/penautan bersamaan untuk identitas yang sama.
  await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [`google-sub:${identity.sub}`]);
  await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [`google-email:${identity.email}`]);

  const linked = await client.query('SELECT * FROM users WHERE google_sub = $1 FOR UPDATE', [identity.sub]);
  if (linked.rowCount > 0) {
    if (linkUserId && linked.rows[0].id !== linkUserId) {
      throw googleError(409, 'GOOGLE_ALREADY_LINKED', 'Akun Google ini sudah terhubung ke akun pelanggan lain.');
    }
    return requireCustomer(linked.rows[0]);
  }

  let result = linkUserId
    ? await client.query('SELECT * FROM users WHERE id = $1 FOR UPDATE', [linkUserId])
    : await client.query('SELECT * FROM users WHERE LOWER(email) = $1 FOR UPDATE', [identity.email]);

  if (!linkUserId && result.rowCount === 0) {
    const created = await client.query(
      `INSERT INTO users (id, name, email, password_hash, phone, address, role, google_sub)
       VALUES ($1, $2, $3, NULL, '', '', 'customer', $4)
       ON CONFLICT DO NOTHING RETURNING *`,
      [`user-${Date.now()}-${randomBytes(6).toString('hex')}`, identity.name, identity.email, identity.sub]
    );
    if (created.rowCount > 0) return created.rows[0];
    // Pendaftaran email/password dapat selesai selama INSERT menunggu.
    result = await client.query('SELECT * FROM users WHERE LOWER(email) = $1 FOR UPDATE', [identity.email]);
  }

  if (result.rowCount !== 1) {
    throw googleError(409, 'GOOGLE_ACCOUNT_CONFLICT', 'Akun belum dapat ditautkan. Silakan masuk dengan email dan password.');
  }
  const user = requireCustomer(result.rows[0]);
  if (user.email.toLowerCase() !== identity.email) {
    throw googleError(409, 'GOOGLE_EMAIL_MISMATCH', 'Pilih akun Google dengan email yang sama dengan akun FreshMarket Anda.');
  }
  if (user.google_sub && user.google_sub !== identity.sub) {
    throw googleError(409, 'GOOGLE_ALREADY_LINKED', 'Akun pelanggan ini sudah terhubung ke identitas Google lain.');
  }
  if (!linkUserId && !identity.authoritativeEmail) {
    throw googleError(409, 'GOOGLE_LINK_REQUIRED', 'Email ini sudah terdaftar. Masuk dengan password, lalu hubungkan Google melalui Profil Saya.');
  }
  const updated = await client.query(
    'UPDATE users SET google_sub = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [identity.sub, user.id]
  );
  return updated.rows[0];
}

module.exports = { issueGoogleNonce, consumeGoogleNonce, verifyGoogleCredential, resolveGoogleCustomer, googleError };
