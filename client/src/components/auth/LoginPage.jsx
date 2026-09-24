import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, LogIn, ArrowLeft, Sparkles } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import GoogleLoginButton from './GoogleLoginButton';

export default function LoginPage({ onSwitchToRegister, onBackToStore }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorMeta, setErrorMeta] = useState(null); // { code, attemptsLeft, unlockAt, retryAfter }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setErrorMeta(null);

    if (!email.trim() || !password) {
      setError('Email dan password wajib diisi.');
      return;
    }

    try {
      setLoading(true);
      await login({ email: email.trim(), password });
      // AuthContext akan otomatis update state → App.jsx re-render ke view sesuai role
    } catch (err) {
      setError(err.message || 'Gagal login. Coba lagi.');
      setErrorMeta({
        code: err.code,
        attemptsLeft: err.attemptsLeft,
        unlockAt: err.unlockAt,
        retryAfter: err.retryAfter,
        status: err.status
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        {/* Back to store */}
        {onBackToStore && (
          <button
            onClick={onBackToStore}
            className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-emerald-700 font-medium mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Toko
          </button>
        )}

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 mx-auto mb-3">
            <span className="text-3xl">🛒</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Fresh<span className="text-emerald-600">Market</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">Masuk untuk mulai berbelanja atau kelola toko</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-emerald-100/40 border border-slate-100 p-6 sm:p-7">
          <div className="flex items-center gap-2 mb-5">
            <LogIn className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-slate-900">Login ke Akun Anda</h2>
          </div>

          {error && (
            <div className={`mb-4 border rounded-lg px-3 py-2.5 text-xs ${
              errorMeta?.code === 'ACCOUNT_LOCKED' || errorMeta?.code === 'IP_RATE_LIMIT'
                ? 'bg-amber-50 border-amber-300 text-amber-900'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              <div className="font-semibold flex items-start gap-1.5">
                {errorMeta?.code === 'ACCOUNT_LOCKED' && (
                  <span className="text-base leading-none">🔒</span>
                )}
                {errorMeta?.code === 'IP_RATE_LIMIT' && (
                  <span className="text-base leading-none">⏱️</span>
                )}
                <span>{error}</span>
              </div>
              {errorMeta?.attemptsLeft > 0 && errorMeta?.code !== 'ACCOUNT_LOCKED' && (
                <div className="mt-1 text-[11px] opacity-80">
                  Sisa percobaan: <b>{errorMeta.attemptsLeft}</b> sebelum akun terkunci sementara.
                </div>
              )}
              {errorMeta?.unlockAt && (
                <div className="mt-1 text-[11px] opacity-80">
                  Bisa mencoba lagi mulai: <b>{new Date(errorMeta.unlockAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</b>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="w-full pl-10 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-sm font-bold py-3 rounded-xl shadow-md shadow-emerald-600/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Masuk Sekarang
                </>
              )}
            </button>
          </form>

          {/* Google login */}
          <div className="mt-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 border-t border-slate-200" />
              <span className="text-[11px] text-slate-400 font-medium">atau</span>
              <div className="flex-1 border-t border-slate-200" />
            </div>
            <GoogleLoginButton mode="login" disabled={loading} />
          </div>

          {/* Register link */}
          <p className="text-center text-xs text-slate-600 mt-5">
            Belum punya akun?{' '}
            <button
              onClick={onSwitchToRegister}
              className="text-emerald-700 hover:text-emerald-800 font-bold hover:underline"
            >
              Daftar sebagai Pelanggan
            </button>
          </p>
        </div>

        {/* Footer hint */}
        <p className="text-center text-[11px] text-slate-400 mt-4 flex items-center justify-center gap-1">
          <Sparkles className="w-3 h-3" />
          Segar Tiap Pagi • Bersih & Hemat
        </p>
      </div>
    </div>
  );
}
