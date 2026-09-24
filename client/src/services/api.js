const BASE_URL = '/api';
const TOKEN_KEY = 'freshmarket_token';

// ---------- Token helpers ----------
export const tokenStorage = {
  get() {
    try {
      return localStorage.getItem(TOKEN_KEY) || localStorage.getItem('freshsayur_token');
    } catch {
      return null;
    }
  },
  set(token) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.removeItem('freshsayur_token');
    } catch {}
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('freshsayur_token');
    } catch {}
  }
};

// Helper: bikin header dengan Authorization jika ada token
function authHeaders(extra = {}) {
  const token = tokenStorage.get();
  const headers = { ...extra };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

// Wrapper fetch: auto lampirkan token & parse error
async function request(url, options = {}) {
  const headers = authHeaders(options.headers || {});
  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(url, { ...options, headers });
  const isJson = (res.headers.get('content-type') || '').includes('application/json');
  const data = isJson ? await res.json() : null;

  if (!res.ok) {
    const message = (data && data.message) || `Request gagal (${res.status})`;
    // Auto-logout kalau token tidak valid / expired (tapi jangan pas login endpoint)
    if (res.status === 401 && !url.includes('/auth/login') && !url.includes('/auth/google')) {
      tokenStorage.clear();
      window.dispatchEvent(new CustomEvent('freshmarket:unauthorized'));
    }

    // Enrich error dengan metadata dari server
    const err = new Error(message);
    err.status = res.status;
    err.code = data?.code;
    err.retryAfter = data?.retryAfter;
    err.attemptsLeft = data?.attemptsLeft;
    err.unlockAt = data?.unlockAt;
    err.quote = data?.quote;
    throw err;
  }
  return data;
}

export const api = {
  // ============ AUTH ============
  async register(payload) {
    return request(`${BASE_URL}/auth/register`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async login(payload) {
    return request(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async getGoogleConfig() {
    return request(`${BASE_URL}/auth/google/config`);
  },

  async googleLogin(credential) {
    return request(`${BASE_URL}/auth/google`, {
      method: 'POST',
      body: JSON.stringify({ credential })
    });
  },

  async googleLink(credential) {
    return request(`${BASE_URL}/auth/google/link`, {
      method: 'POST',
      body: JSON.stringify({ credential })
    });
  },

  async getMe() {
    return request(`${BASE_URL}/auth/me`);
  },

  async updateMe(payload) {
    return request(`${BASE_URL}/auth/me`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  // ============ PRODUCTS ============
  async getProducts(params = {}) {
    const query = new URLSearchParams();
    if (params.category && params.category !== 'semua') query.append('category', params.category);
    if (params.search) query.append('search', params.search);
    if (params.availableOnly) query.append('availableOnly', 'true');

    return request(`${BASE_URL}/products?${query.toString()}`);
  },

  async getProduct(id) {
    return request(`${BASE_URL}/products/${id}`);
  },

  async createProduct(data) {
    return request(`${BASE_URL}/products`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateProduct(id, data) {
    return request(`${BASE_URL}/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async deleteProduct(id) {
    return request(`${BASE_URL}/products/${id}`, { method: 'DELETE' });
  },

  // ============ UPLOAD ============
  async uploadImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const data = await request(`${BASE_URL}/upload`, {
            method: 'POST',
            body: JSON.stringify({ image: reader.result, filename: file.name })
          });
          resolve(data);
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  },

  // ============ CATEGORIES ============
  async getCategories() {
    return request(`${BASE_URL}/categories`);
  },

  async createCategory(data) {
    return request(`${BASE_URL}/categories`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateCategory(id, data) {
    return request(`${BASE_URL}/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async deleteCategory(id) {
    return request(`${BASE_URL}/categories/${id}`, { method: 'DELETE' });
  },

  // ============ ORDERS ============
  async getShippingQuote(payload, signal) {
    return request(`${BASE_URL}/shipping/quote`, { method: 'POST', body: JSON.stringify(payload), signal });
  },

  async getOrders(status = '') {
    const query = status && status !== 'Semua' ? `?status=${encodeURIComponent(status)}` : '';
    return request(`${BASE_URL}/orders${query}`);
  },

  async createOrder(orderData) {
    return request(`${BASE_URL}/orders`, {
      method: 'POST',
      body: JSON.stringify(orderData)
    });
  },

  async updateOrderStatus(id, status) {
    return request(`${BASE_URL}/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  },

  // ============ STORE INFO ============
  async getStoreInfo() {
    return request(`${BASE_URL}/store-info`);
  },

  async updateStoreInfo(info) {
    return request(`${BASE_URL}/store-info`, {
      method: 'PUT',
      body: JSON.stringify(info)
    });
  },

  // ============ STATS ============
  async getStats() {
    return request(`${BASE_URL}/stats`);
  },

  // ============ USERS (Admin only) ============
  async getUsers(params = {}) {
    const query = new URLSearchParams();
    if (params.role && params.role !== 'all') query.append('role', params.role);
    if (params.search) query.append('search', params.search);
    return request(`${BASE_URL}/users?${query.toString()}`);
  },

  async getUserStats() {
    return request(`${BASE_URL}/users/stats`);
  },

  async getUser(id) {
    return request(`${BASE_URL}/users/${id}`);
  },

  async updateUserRole(id, role) {
    return request(`${BASE_URL}/users/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role })
    });
  },

  async resetUserPassword(id, newPassword) {
    return request(`${BASE_URL}/users/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify(newPassword ? { newPassword } : {})
    });
  },

  async deleteUser(id) {
    return request(`${BASE_URL}/users/${id}`, { method: 'DELETE' });
  },

  async getUserLockout(id) {
    return request(`${BASE_URL}/users/${id}/lockout`);
  },

  async unlockUser(id) {
    return request(`${BASE_URL}/users/${id}/unlock`, { method: 'POST' });
  },

  // ============ REVIEWS ============
  async getProductReviews(productId) {
    return request(`${BASE_URL}/reviews/product/${productId}`);
  },

  async getEligibleReviews() {
    return request(`${BASE_URL}/reviews/eligible`);
  },

  async getMyReviews() {
    return request(`${BASE_URL}/reviews/my`);
  },

  async createReview(payload) {
    return request(`${BASE_URL}/reviews`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async updateReview(id, payload) {
    return request(`${BASE_URL}/reviews/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  async deleteReview(id) {
    return request(`${BASE_URL}/reviews/${id}`, { method: 'DELETE' });
  },

  // Admin only
  async getAllReviews(params = {}) {
    const query = new URLSearchParams();
    if (params.rating) query.append('rating', params.rating);
    if (params.search) query.append('search', params.search);
    if (params.productId) query.append('productId', params.productId);
    return request(`${BASE_URL}/reviews?${query.toString()}`);
  },

  async getReviewsSummary() {
    return request(`${BASE_URL}/reviews/summary/stats`);
  }
};

export const COMMON_UNITS = [
  { value: 'ikat', label: 'ikat' },
  { value: 'ikat kecil', label: 'ikat kecil' },
  { value: 'ikat besar', label: 'ikat besar' },
  { value: '100 gram', label: '100 gram' },
  { value: '250 gram', label: '250 gram' },
  { value: '500 gram', label: '500 gram' },
  { value: '1 kg', label: '1 kg' },
  { value: '2 kg', label: '2 kg' },
  { value: 'pack', label: 'pack' },
  { value: 'bungkus', label: 'bungkus' },
  { value: 'buah', label: 'buah' },
  { value: 'butir', label: 'butir' },
  { value: 'pcs', label: 'pcs' },
  { value: 'sisir', label: 'sisir' },
  { value: 'bonggol', label: 'bonggol' },
  { value: 'batang', label: 'batang' },
  { value: 'ruas', label: 'ruas' },
  { value: 'paket', label: 'paket' },
  { value: 'custom', label: 'Ketik Satuan Lainnya...' }
];

export const formatRupiah = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount || 0);
};
