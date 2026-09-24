import React, { useState, useRef, useEffect } from 'react';
import {
  ShoppingBag, Search, Clock, ShieldCheck, LogIn, LogOut,
  UserCircle2, ChevronDown, UserPlus, Receipt, Store, User
} from 'lucide-react';
import { formatRupiah } from '../services/api';

export default function Navbar({
  mode = 'store',       // 'store' | 'admin'
  user = null,
  onLogout,
  onOpenLogin,
  onOpenRegister,
  onOpenMyOrders,
  onOpenProfile,
  onOpenStore,
  currentView = 'store', // 'store' | 'my-orders' | 'profile'
  cartCount = 0,
  onOpenCart,
  searchQuery = '',
  setSearchQuery = () => {},
  storeInfo
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isAdmin = mode === 'admin';

  return (
    <header className={`sticky top-0 z-40 backdrop-blur-md border-b shadow-xs ${
      isAdmin
        ? 'bg-slate-900/95 border-slate-800'
        : 'bg-white/95 border-emerald-100'
    }`}>
      {/* Top Banner Bar (hanya di mode store) */}
      {!isAdmin && (
        <div className="bg-emerald-800 text-white text-xs py-1.5 px-4">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-1 text-center sm:text-left">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
              </span>
              <span className="font-medium">
                🌿 {storeInfo?.tagline || 'Sayur Segar Panen Subuh Langsung ke Dapur Anda'}
              </span>
            </div>
            <div className="flex items-center gap-4 text-emerald-100 text-xs">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-emerald-300" /> Pengiriman Pagi: 06.00 - 08.00 WIB
              </span>
              <span className="hidden md:inline text-emerald-400">•</span>
              <span className="hidden md:inline font-medium text-amber-300">
                Gratis Ongkir min. belanja {formatRupiah(storeInfo?.freeDeliveryMin || 150000)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Admin Top Bar */}
      {isAdmin && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs py-1.5 px-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Mode Admin - Panel Kelola Toko FreshMarket</span>
            </div>
            <span className="hidden sm:inline text-white/80">
              {storeInfo?.name || 'FreshMarket'}
            </span>
          </div>
        </div>
      )}

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3 md:gap-6">
        {/* Brand */}
        <div className="flex items-center gap-2.5 select-none min-w-0 shrink">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md ${
            isAdmin
              ? 'bg-gradient-to-tr from-amber-500 to-orange-500 shadow-amber-500/30'
              : 'bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-emerald-500/20'
          }`}>
            <span className="text-xl">{isAdmin ? '🛠️' : '🛒'}</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className={`text-lg sm:text-xl font-black tracking-tight truncate ${
                isAdmin ? 'text-white' : 'text-slate-900'
              }`}>
                Fresh<span className={isAdmin ? 'text-amber-400' : 'text-emerald-600'}>Market</span>
              </h1>
              <span className={`hidden sm:inline text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                isAdmin
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-emerald-100 text-emerald-800 border-emerald-200'
              }`}>
                {isAdmin ? 'Admin' : 'Pasar Segar'}
              </span>
            </div>
            <p className={`text-[11px] hidden sm:block ${isAdmin ? 'text-slate-400' : 'text-slate-500'}`}>
              {isAdmin ? 'Panel Manajemen Toko' : 'Segar Tiap Pagi • Bersih & Hemat'}
            </p>
          </div>
        </div>

        {/* Search Bar (only store mode, di halaman katalog) */}
        {!isAdmin && currentView === 'store' && (
          <div className="flex-1 max-w-md hidden md:block">
            <div className="relative">
              <input
                type="text"
                placeholder="Cari bayam, wortel, cabai, paket sop..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-100/80 hover:bg-slate-100 focus:bg-white text-sm text-slate-800 placeholder-slate-400 pl-10 pr-4 py-2.5 rounded-xl border border-transparent focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 bg-slate-200 rounded-full w-4 h-4 flex items-center justify-center"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        )}

        {/* Right Controls */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Pesanan Saya quick-access (customer only) */}
          {!isAdmin && user?.role === 'customer' && currentView === 'store' && (
            <button
              onClick={onOpenMyOrders}
              className="hidden sm:flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 transition-all"
              title="Lihat riwayat pesanan Anda"
            >
              <Receipt className="w-4 h-4 text-emerald-600" />
              Pesanan Saya
            </button>
          )}

          {/* Cart Button (only store & non-admin, hanya di halaman katalog) */}
          {!isAdmin && currentView === 'store' && (
            <button
              onClick={onOpenCart}
              className="relative flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold shadow-md shadow-emerald-600/20 hover:shadow-emerald-600/30 active:scale-95 transition-all"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden sm:inline">Keranjang</span>
              {cartCount > 0 && (
                <span className="bg-amber-400 text-slate-950 text-xs font-black px-1.5 py-0.5 rounded-full min-w-[20px] text-center shadow-xs animate-bounce">
                  {cartCount}
                </span>
              )}
            </button>
          )}

          {/* User Menu / Auth Buttons */}
          {user ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className={`flex items-center gap-2 px-2.5 sm:px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  isAdmin
                    ? 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black text-white ${
                  user.role === 'admin' ? 'bg-amber-500' : 'bg-emerald-500'
                }`}>
                  {user.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <span className="hidden sm:inline max-w-[100px] truncate">
                  {user.name?.split(' ')[0] || user.email}
                </span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {menuOpen && (
                <div className={`absolute right-0 mt-2 w-64 rounded-2xl shadow-xl border overflow-hidden z-50 ${
                  isAdmin ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                }`}>
                  <div className={`px-4 py-3 border-b ${
                    isAdmin ? 'border-slate-700 bg-slate-800/50' : 'border-slate-100 bg-slate-50'
                  }`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black text-white ${
                        user.role === 'admin' ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}>
                        {user.name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold truncate ${isAdmin ? 'text-white' : 'text-slate-900'}`}>
                          {user.name}
                        </p>
                        <p className={`text-[11px] truncate ${isAdmin ? 'text-slate-400' : 'text-slate-500'}`}>
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        user.role === 'admin'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}>
                        {user.role === 'admin' ? (
                          <><ShieldCheck className="w-3 h-3" /> ADMIN TOKO</>
                        ) : (
                          <><UserCircle2 className="w-3 h-3" /> PELANGGAN</>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Menu khusus customer di mode store */}
                  {!isAdmin && user.role === 'customer' && (
                    <>
                      {/* Profil Saya */}
                      {currentView !== 'profile' && (
                        <button
                          onClick={() => {
                            setMenuOpen(false);
                            onOpenProfile && onOpenProfile();
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-emerald-50 transition-colors border-b border-slate-100"
                        >
                          <User className="w-4 h-4 text-emerald-600" />
                          Profil Saya
                        </button>
                      )}

                      {/* Pesanan Saya */}
                      {currentView !== 'my-orders' && (
                        <button
                          onClick={() => {
                            setMenuOpen(false);
                            onOpenMyOrders && onOpenMyOrders();
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-emerald-50 transition-colors border-b border-slate-100"
                        >
                          <Receipt className="w-4 h-4 text-emerald-600" />
                          Pesanan Saya
                        </button>
                      )}

                      {/* Kembali Belanja (kalau lagi di halaman lain) */}
                      {currentView !== 'store' && (
                        <button
                          onClick={() => {
                            setMenuOpen(false);
                            onOpenStore && onOpenStore();
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-emerald-50 transition-colors border-b border-slate-100"
                        >
                          <Store className="w-4 h-4 text-emerald-600" />
                          Kembali Belanja
                        </button>
                      )}
                    </>
                  )}

                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onLogout && onLogout();
                    }}
                    className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
                      isAdmin
                        ? 'text-red-400 hover:bg-slate-700'
                        : 'text-red-600 hover:bg-red-50'
                    }`}
                  >
                    <LogOut className="w-4 h-4" />
                    Keluar / Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <button
                onClick={onOpenLogin}
                className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3 py-2 rounded-xl text-xs font-semibold transition-all"
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">Masuk</span>
              </button>
              <button
                onClick={onOpenRegister}
                className="hidden sm:flex items-center gap-1.5 bg-white border border-emerald-600 text-emerald-700 hover:bg-emerald-50 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
              >
                <UserPlus className="w-4 h-4" />
                Daftar
              </button>
            </>
          )}
        </div>
      </div>

      {/* Mobile Search Bar */}
      {!isAdmin && currentView === 'store' && (
        <div className="p-3 border-t border-slate-100 md:hidden bg-slate-50/70">
          <div className="relative">
            <input
              type="text"
              placeholder="Cari sayur, bumbu, buah, paket masak..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white text-sm text-slate-800 placeholder-slate-400 pl-9 pr-4 py-2 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 bg-slate-200 rounded-full w-4 h-4 flex items-center justify-center"
              >
                ×
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
