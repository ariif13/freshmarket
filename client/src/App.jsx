import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import CategoryBar from './components/CategoryBar';
import ProductCard from './components/ProductCard';
import ProductDetailModal from './components/ProductDetailModal';
import CookingPacksBanner from './components/CookingPacksBanner';
import CartDrawer from './components/CartDrawer';
import CheckoutModal from './components/CheckoutModal';
import OrderSuccessModal from './components/OrderSuccessModal';
import AdminDashboard from './components/admin/AdminDashboard';
import LoginPage from './components/auth/LoginPage';
import RegisterPage from './components/auth/RegisterPage';
import MyOrdersPage from './components/customer/MyOrdersPage';
import ProfilePage from './components/customer/ProfilePage';
import { api } from './services/api';
import { useAuth } from './contexts/AuthContext';
import { Phone, MapPin, Clock } from 'lucide-react';

export default function App() {
  const { user, isAdmin, loading: authLoading, logout } = useAuth();

  // Halaman auth: 'login' | 'register' | null (tidak menampilkan auth)
  const [authView, setAuthView] = useState(null);

  // Store view: 'store' (katalog) | 'my-orders' | 'profile'
  const [storeView, setStoreView] = useState('store');

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [storeInfo, setStoreInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState('semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [onlyOrganic, setOnlyOrganic] = useState(false);

  // Cart State (Persisted in localStorage)
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('freshsayur_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Modals
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [detailProduct, setDetailProduct] = useState(null);
  const [successOrder, setSuccessOrder] = useState(null);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // Save cart to local storage
  useEffect(() => {
    try {
      localStorage.setItem('freshsayur_cart', JSON.stringify(cart));
    } catch (e) {
      console.error(e);
    }
  }, [cart]);

  // Initial Data Fetching
  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [prodsData, catsData, infoData] = await Promise.all([
        api.getProducts(),
        api.getCategories(),
        api.getStoreInfo()
      ]);
      setProducts(prodsData);
      setCategories(catsData);
      setStoreInfo(infoData);
    } catch (err) {
      console.error('Initial fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Tutup halaman auth otomatis saat user berhasil login
  useEffect(() => {
    if (user && authView) {
      setAuthView(null);
    }
  }, [user, authView]);

  // Reset storeView saat user logout (agar tidak stuck di my-orders sebagai guest)
  useEffect(() => {
    if (!user) {
      setStoreView('store');
    }
  }, [user]);

  // Cart Actions
  const handleAddToCart = (product, quantity = 1) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: Math.min(product.stock, item.quantity + quantity) }
            : item
        );
      }
      return [...prev, { ...product, quantity }];
    });
  };

  const handleUpdateCartQty = (productId, quantity) => {
    if (quantity <= 0) {
      handleRemoveCartItem(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const handleRemoveCartItem = (productId) => {
    setCart((prev) => prev.filter((item) => item.id !== productId));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  // Wajib login untuk checkout
  const handleOpenCheckout = () => {
    if (!user) {
      setIsCartOpen(false);
      setAuthView('login');
      return;
    }
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  // Submit Order Flow
  const handleSubmitOrder = async (orderPayload) => {
    try {
      setIsSubmittingOrder(true);
      const createdOrder = await api.createOrder(orderPayload);

      // Refresh products to show updated stock
      const updatedProds = await api.getProducts();
      setProducts(updatedProds);

      setSuccessOrder(createdOrder);
      setIsCheckoutOpen(false);
      setIsCartOpen(false);
      handleClearCart();
    } catch (err) {
      alert('Gagal memproses pesanan: ' + err.message);
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Filtered Products for Store Display
  const filteredProducts = products.filter((product) => {
    if (selectedCategory !== 'semua' && product.category !== selectedCategory) {
      return false;
    }
    if (onlyAvailable && (!product.available || product.stock <= 0)) {
      return false;
    }
    if (onlyOrganic && !product.organic) {
      return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = product.name.toLowerCase().includes(q);
      const matchDesc = product.description && product.description.toLowerCase().includes(q);
      const matchBadge = product.badge && product.badge.toLowerCase().includes(q);
      if (!matchName && !matchDesc && !matchBadge) return false;
    }
    return true;
  });

  const cartTotalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  // ============ RENDER ============

  // Loading auth (cek session)
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50">
        <div className="text-center space-y-3">
          <div className="w-14 h-14 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-600">Memuat FreshSayur...</p>
        </div>
      </div>
    );
  }

  // Halaman Login
  if (authView === 'login') {
    return (
      <LoginPage
        onSwitchToRegister={() => setAuthView('register')}
        onBackToStore={() => setAuthView(null)}
      />
    );
  }

  // Halaman Register
  if (authView === 'register') {
    return (
      <RegisterPage
        onSwitchToLogin={() => setAuthView('login')}
        onBackToStore={() => setAuthView(null)}
      />
    );
  }

  // Admin Dashboard (khusus admin - tanpa navbar toko, layout khusus)
  if (isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800">
        <Navbar
          mode="admin"
          user={user}
          onLogout={logout}
          storeInfo={storeInfo}
          searchQuery=""
          setSearchQuery={() => {}}
        />
        <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
          <AdminDashboard
            categories={categories}
            onCategoriesChange={(newCats) => setCategories(newCats)}
            storeInfo={storeInfo}
            onUpdateStoreInfo={(newInfo) => setStoreInfo(newInfo)}
            products={products}
            onProductsChange={(newProducts) => setProducts(newProducts)}
          />
        </main>
      </div>
    );
  }

  // Tampilan Toko (guest & customer)
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <Navbar
        mode="store"
        user={user}
        onLogout={logout}
        onOpenLogin={() => setAuthView('login')}
        onOpenRegister={() => setAuthView('register')}
        onOpenMyOrders={() => setStoreView('my-orders')}
        onOpenProfile={() => setStoreView('profile')}
        onOpenStore={() => setStoreView('store')}
        currentView={storeView}
        cartCount={cartTotalItems}
        onOpenCart={() => setIsCartOpen(true)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        storeInfo={storeInfo}
      />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6">
        {storeView === 'profile' ? (
          <ProfilePage onBackToStore={() => setStoreView('store')} />
        ) : storeView === 'my-orders' ? (
          <MyOrdersPage
            onBackToStore={() => setStoreView('store')}
            storeInfo={storeInfo}
          />
        ) : (
          <>
            <Hero
              onSelectCategory={(catId) => setSelectedCategory(catId)}
              storeInfo={storeInfo}
            />

            <CookingPacksBanner
              products={products}
              onAddToCart={handleAddToCart}
              onOpenDetail={(prod) => setDetailProduct(prod)}
            />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pt-2">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <span>Katalog Sayur & Bahan Segar</span>
                  <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                    {filteredProducts.length} Produk
                  </span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Dipanen subuh, dikemas bersih, dan siap diantar langsung ke dapur Anda
                </p>
              </div>
            </div>

            <CategoryBar
              categories={categories}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              onlyAvailable={onlyAvailable}
              setOnlyAvailable={setOnlyAvailable}
              onlyOrganic={onlyOrganic}
              setOnlyOrganic={setOnlyOrganic}
            />

            {loading ? (
              <div className="py-20 text-center text-slate-400 space-y-3">
                <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm font-medium">Memuat katalog sayuran segar...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="py-16 text-center bg-white rounded-3xl border border-slate-200 p-8 space-y-3 my-6">
                <div className="text-4xl">🥬</div>
                <h3 className="font-bold text-base text-slate-800">
                  Tidak ada sayuran yang cocok dengan pencarian Anda
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Coba ganti kata kunci atau reset filter kategori untuk melihat pilihan sayur lainnya.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('semua');
                    setOnlyAvailable(false);
                    setOnlyOrganic(false);
                  }}
                  className="bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-xl"
                >
                  Reset Semua Filter
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3 sm:gap-5 mb-14">
                {filteredProducts.map((product) => {
                  const cartItem = cart.find((i) => i.id === product.id);
                  return (
                    <ProductCard
                      key={product.id}
                      product={product}
                      cartItem={cartItem}
                      onAddToCart={handleAddToCart}
                      onUpdateCartQty={handleUpdateCartQty}
                      onOpenDetail={(p) => setDetailProduct(p)}
                    />
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      {/* Modals & Drawers */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onUpdateQty={handleUpdateCartQty}
        onRemoveItem={handleRemoveCartItem}
        onProceedCheckout={handleOpenCheckout}
        storeInfo={storeInfo}
      />

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cart={cart}
        storeInfo={storeInfo}
        onSubmitOrder={handleSubmitOrder}
        isSubmitting={isSubmittingOrder}
        currentUser={user}
      />

      <ProductDetailModal
        product={detailProduct}
        onClose={() => setDetailProduct(null)}
        cartItem={cart.find((i) => i.id === detailProduct?.id)}
        onAddToCart={handleAddToCart}
        onUpdateCartQty={handleUpdateCartQty}
      />

      <OrderSuccessModal
        order={successOrder}
        onClose={() => setSuccessOrder(null)}
        onViewMyOrders={user?.role === 'customer' ? () => setStoreView('my-orders') : null}
        storeInfo={storeInfo}
      />

      <footer className="bg-slate-900 text-slate-400 text-xs border-t border-slate-800 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-white text-base font-black">
              <span className="text-xl">🥬</span>
              <span>Fresh<span className="text-emerald-400">Sayur</span></span>
            </div>
            <p className="text-slate-400 leading-relaxed text-xs">
              Platform toko sayur modern yang menghubungkan pasokan petani sayur lokal panen subuh langsung ke meja dapur keluarga Anda dengan kualitas terjamin.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="text-white font-bold text-sm">Informasi Kios & Jam Operasional</h4>
            <div className="space-y-1.5 text-xs text-slate-400">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{storeInfo?.address || 'Pasar Segar Asri, Jakarta'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{storeInfo?.openHours || 'Buka setiap hari: 05.00 - 18.00 WIB'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>WhatsApp: +{storeInfo?.whatsapp || '6281234567890'}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-white font-bold text-sm">Keunggulan Berbelanja</h4>
            <ul className="space-y-1 text-xs text-slate-400">
              <li>✓ Garansi sayur layu/busuk diganti 100%</li>
              <li>✓ Slot pengiriman subuh & pagi tepat waktu</li>
              <li>✓ Bebas pilih bayar COD, QRIS, atau Transfer</li>
              <li>✓ Kemasan higienis, bersih, dan siap olah</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800/80 py-4 text-center text-slate-500 text-[11px]">
          © 2026 FreshSayur • Aplikasi Web Toko Sayur Segar Indonesia
        </div>
      </footer>
    </div>
  );
}
