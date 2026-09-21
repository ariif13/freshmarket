import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  ShoppingBag, 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  Settings, 
  PackageCheck,
  RefreshCw,
  Store,
  Tag,
  Users,
  Star
} from 'lucide-react';
import OrderManagement from './OrderManagement';
import ProductManagement from './ProductManagement';
import CategoryManagement from './CategoryManagement';
import StoreSettings from './StoreSettings';
import UserManagement from './UserManagement';
import ReviewManagement from './ReviewManagement';
import { api, formatRupiah } from '../../services/api';

export default function AdminDashboard({ 
  categories, 
  onCategoriesChange,
  storeInfo, 
  onUpdateStoreInfo,
  products
}) {
  const [activeTab, setActiveTab] = useState('orders');
  const [stats, setStats] = useState({
    totalProducts: 0,
    activeOrdersCount: 0,
    completedOrdersCount: 0,
    totalOrdersCount: 0,
    totalRevenue: 0,
    lowStockCount: 0
  });
  const [loadingStats, setLoadingStats] = useState(false);

  const fetchStats = async () => {
    try {
      setLoadingStats(true);
      const data = await api.getStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [activeTab]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-900 to-emerald-950 text-white p-6 rounded-3xl shadow-lg">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
              Panel Pengelola
            </span>
            <span className="text-xs text-slate-400">Pembaruan Real-Time</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            Dashboard Pengelolaan Toko Sayur
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Pantau arus orderan masuk, atur stok kulakan subuh, dan perbarui harga jual harian.
          </p>
        </div>

        <button
          onClick={fetchStats}
          disabled={loadingStats}
          className="self-start sm:self-center bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs font-semibold px-4 py-2 rounded-xl border border-white/15 flex items-center gap-1.5 transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingStats ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Omset */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Penjualan</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-slate-900">
            {formatRupiah(stats.totalRevenue)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Dari total {stats.totalOrdersCount} pesanan
          </p>
        </div>

        {/* Pesanan Aktif */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Pesanan Aktif</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-amber-600">
            {stats.activeOrdersCount}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Perlu diproses & dikirim
          </p>
        </div>

        {/* Selesai */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Pesanan Terkirim</span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <PackageCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-emerald-800">
            {stats.completedOrdersCount}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Sukses sampai ke pembeli
          </p>
        </div>

        {/* Stok Menipis */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Stok Menipis</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-rose-600">
            {stats.lowStockCount} Sayur
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Stok &le; 5 ikat/pack, perlu kulakan
          </p>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'orders'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Pesanan Masuk</span>
          {stats.activeOrdersCount > 0 && (
            <span className="bg-amber-400 text-slate-950 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">
              {stats.activeOrdersCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'products'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Kelola Produk & Stok Sayur</span>
        </button>

        <button
          onClick={() => setActiveTab('categories')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'categories'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>Kelola Kategori</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'users'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Kelola User</span>
        </button>

        <button
          onClick={() => setActiveTab('reviews')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'reviews'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Star className="w-4 h-4" />
          <span>Kelola Ulasan</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'settings'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Pengaturan Toko & Ongkir</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === 'orders' && <OrderManagement />}
        {activeTab === 'products' && <ProductManagement categories={categories} />}
        {activeTab === 'categories' && (
          <CategoryManagement 
            categories={categories} 
            onCategoriesChange={onCategoriesChange} 
            products={products}
          />
        )}
        {activeTab === 'users' && <UserManagement />}
        {activeTab === 'reviews' && <ReviewManagement />}
        {activeTab === 'settings' && (
          <StoreSettings 
            storeInfo={storeInfo} 
            onUpdateStoreInfo={onUpdateStoreInfo} 
          />
        )}
      </div>
    </div>
  );
}
