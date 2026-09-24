function paymentError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function defaultPaymentMethods() {
  return [
    {
      id: 'cod', enabled: true, label: 'COD (Bayar di Tempat)',
      description: 'Bayar tunai ke kurir saat pesanan tiba',
      instructions: 'Siapkan pembayaran tunai sesuai total pesanan.'
    },
    {
      id: 'qris', enabled: false, label: 'QRIS / E-Wallet',
      description: 'Bayar melalui aplikasi bank atau e-wallet', instructions: '',
      qrisImageUrl: '', merchantName: '', nmid: ''
    },
    {
      id: 'transfer', enabled: false, label: 'Transfer Bank',
      description: 'Transfer ke rekening toko', instructions: '', accounts: []
    }
  ];
}

function getPaymentMethods(storeInfo = {}) {
  return Array.isArray(storeInfo.paymentMethods)
    ? storeInfo.paymentMethods
    : defaultPaymentMethods();
}

function text(value, name, maxLength, required = false) {
  if (value === undefined && !required) return '';
  if (typeof value !== 'string') throw paymentError(`${name} harus berupa teks.`);
  const result = value.trim();
  if (required && !result) throw paymentError(`${name} wajib diisi.`);
  if (result.length > maxLength) throw paymentError(`${name} maksimal ${maxLength} karakter.`);
  return result;
}

function validImageUrl(value) {
  if (/^\/uploads\/[a-zA-Z0-9-]+$/.test(value)) return true;
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password;
  } catch {
    return false;
  }
}

function normalizePaymentMethods(methods) {
  const defaults = defaultPaymentMethods();
  if (!Array.isArray(methods) || methods.length !== defaults.length) {
    throw paymentError('Pengaturan pembayaran harus memuat COD, QRIS, dan transfer bank.');
  }

  const ids = new Set();
  const labels = new Set();
  const normalized = methods.map((method) => {
    if (!method || !defaults.some((entry) => entry.id === method.id) || ids.has(method.id)) {
      throw paymentError('ID metode pembayaran tidak valid atau duplikat.');
    }
    ids.add(method.id);
    if (typeof method.enabled !== 'boolean') {
      throw paymentError('Status aktif metode pembayaran harus berupa boolean.');
    }
    const label = text(method.label, 'Nama metode pembayaran', 64, true);
    if (labels.has(label.toLowerCase())) throw paymentError('Nama metode pembayaran tidak boleh sama.');
    labels.add(label.toLowerCase());
    const result = {
      id: method.id,
      enabled: method.enabled,
      label,
      description: text(method.description, 'Keterangan pembayaran', 240),
      instructions: text(method.instructions, 'Instruksi pembayaran', 2000)
    };

    if (method.id === 'qris') {
      result.qrisImageUrl = text(method.qrisImageUrl, 'Gambar QRIS', 2048, method.enabled);
      result.merchantName = text(method.merchantName, 'Nama merchant QRIS', 120);
      result.nmid = text(method.nmid, 'NMID QRIS', 64);
      if (result.qrisImageUrl && !validImageUrl(result.qrisImageUrl)) {
        throw paymentError('Gambar QRIS harus berupa URL HTTP/HTTPS atau gambar yang diunggah ke toko.');
      }
    }

    if (method.id === 'transfer') {
      if (!Array.isArray(method.accounts) || method.accounts.length > 5) {
        throw paymentError('Daftar rekening transfer maksimal 5 rekening.');
      }
      result.accounts = method.accounts.map((account) => ({
        bankName: text(account?.bankName, 'Nama bank', 64, true),
        accountNumber: text(account?.accountNumber, 'Nomor rekening', 64, true),
        accountHolder: text(account?.accountHolder, 'Nama pemilik rekening', 120, true)
      }));
      if (method.enabled && result.accounts.length === 0) {
        throw paymentError('Tambahkan minimal satu rekening sebelum mengaktifkan transfer bank.');
      }
    }
    return result;
  });

  return defaults.map((entry) => normalized.find((method) => method.id === entry.id));
}

function selectPaymentMethod(storeInfo, paymentMethodId, paymentMethod) {
  const methods = getPaymentMethods(storeInfo);
  let selected;
  if (paymentMethodId !== undefined) {
    selected = methods.find((method) => method.id === paymentMethodId);
  } else if (paymentMethod) {
    // Kompatibilitas klien lama yang mengirim nama metode, bukan ID.
    const legacy = defaultPaymentMethods().find((method) => method.label === paymentMethod);
    selected = methods.find((method) => method.label === paymentMethod) ||
      methods.find((method) => method.id === legacy?.id);
  } else {
    selected = methods.find((method) => method.id === 'cod');
  }
  if (!selected?.enabled) {
    throw paymentError('Metode pembayaran tidak tersedia. Buka kembali checkout untuk memilih metode yang aktif.', 409);
  }
  return selected;
}

module.exports = { defaultPaymentMethods, getPaymentMethods, normalizePaymentMethods, selectPaymentMethod };
