import React, { useState } from 'react';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Lock,
  Save,
  Eye,
  EyeOff,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  UserCircle2,
  ShieldCheck,
  KeyRound,
  Calendar
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

export default function ProfilePage({ onBackToStore }) {
  const { user, refreshMe } = useAuth();
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'password'

  // Form profil
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    address: user?.address || ''
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState(null); // { type: 'success' | 'error', text }

  // Form password
  const [pwForm, setPwForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  });
  const [showPw, setShowPw] = useState({ current: false, next: false });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState(null);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileMsg(null);

    if (!profileForm.name.trim()) {
      setProfileMsg({ type: 'error', text: 'Nama tidak boleh kosong.' });
      return;
    }

    try {
      setProfileLoading(true);
      await api.updateMe({
        name: profileForm.name,
        phone: profileForm.phone,
        address: profileForm.address
      });
      await refreshMe();
      setProfileMsg({ type: 'success', text: 'Profil berhasil diperbarui.' });
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.message || 'Gagal update profil.' });
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePwSubmit = async (e) => {
    e.preventDefault();
    setPwMsg(null);

    if (!pwForm.currentPassword || !pwForm.newPassword) {
      setPwMsg({ type: 'error', text: 'Semua field password wajib diisi.' });
      return;
    }
    if (pwForm.newPassword.length < 6) {
      setPwMsg({ type: 'error', text: 'Password baru minimal 6 karakter.' });
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmNewPassword) {
      setPwMsg({ type: 'error', text: 'Konfirmasi password baru tidak cocok.' });
      return;
    }
    if (pwForm.newPassword === pwForm.currentPassword) {
      setPwMsg({ type: 'error', text: 'Password baru tidak boleh sama dengan password lama.' });
      return;
    }

    try {
      setPwLoading(true);
      await api.updateMe({
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword
      });
      setPwForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
      setPwMsg({ type: 'success', text: 'Password berhasil diubah. Gunakan password baru saat login berikutnya.' });
    } catch (err) {
      setPwMsg({ type: 'error', text: err.message || 'Gagal ubah password.' });
    } finally {
      setPwLoading(false);
    }
  };

  const isDirty =
    profileForm.name !== (user?.name || '') ||
    profileForm.phone !== (user?.phone || '') ||
    profileForm.address !== (user?.address || '');

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-5">
      {/* Header */}
      <div>
        <button
          onClick={onBackToStore}
          className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-emerald-700 font-medium mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Kembali Belanja
        </button>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <UserCircle2 className="w-7 h-7 text-emerald-600" />
          Profil Saya
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Kelola data pribadi dan atur alamat default untuk mempermudah pemesanan
        </p>
      </div>

      {/* User Info Card */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-600 text-white rounded-3xl p-5 sm:p-6 shadow-lg shadow-emerald-500/20">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl sm:text-3xl font-black border border-white/30 shrink-0">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl font-black truncate">{user?.name}</h2>
            <div className="flex items-center gap-1.5 text-emerald-100 text-xs mt-0.5">
              <Mail className="w-3.5 h-3.5" />
              <span className="truncate">{user?.email}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span className="inline-flex items-center gap-1 bg-white/20 border border-white/30 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                {user?.role === 'admin' ? (
                  <><ShieldCheck className="w-3 h-3" /> Admin</>
                ) : (
                  <><UserCircle2 className="w-3 h-3" /> Pelanggan</>
                )}
              </span>
              {user?.createdAt && (
                <span className="inline-flex items-center gap-1 text-emerald-100 text-[10px]">
                  <Calendar className="w-3 h-3" />
                  Bergabung {new Date(user.createdAt).toLocaleDateString('id-ID', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold transition-all border-b-2 -mb-px ${
            activeTab === 'profile'
              ? 'text-emerald-700 border-emerald-600'
              : 'text-slate-500 border-transparent hover:text-slate-700'
          }`}
        >
          <User className="w-4 h-4" />
          Data Pribadi & Alamat
        </button>
        <button
          onClick={() => setActiveTab('password')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold transition-all border-b-2 -mb-px ${
            activeTab === 'password'
              ? 'text-emerald-700 border-emerald-600'
              : 'text-slate-500 border-transparent hover:text-slate-700'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          Ganti Password
        </button>
      </div>

      {/* Tab: Profile */}
      {activeTab === 'profile' && (
        <form onSubmit={handleProfileSubmit} className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 space-y-5">
          {profileMsg && (
            <div className={`p-3 rounded-xl text-xs flex items-start gap-2 border ${
              profileMsg.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}>
              {profileMsg.type === 'success'
                ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
              <span>{profileMsg.text}</span>
            </div>
          )}

          {/* Email (readonly) */}
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full pl-10 pr-3 py-2.5 text-sm bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Email tidak dapat diubah.</p>
          </div>

          {/* Nama */}
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
              Nama Lengkap <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                placeholder="Nama lengkap Anda"
                className="w-full pl-10 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
                disabled={profileLoading}
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
              Nomor WhatsApp / HP
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                value={profileForm.phone}
                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                placeholder="0812xxxxxxxx"
                className="w-full pl-10 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
                disabled={profileLoading}
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Nomor ini akan digunakan sebagai kontak default saat checkout.
            </p>
          </div>

          {/* Address */}
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
              <span>Alamat Pengiriman Default</span>
              <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full uppercase tracking-wider">
                Otomatis di Checkout
              </span>
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <textarea
                value={profileForm.address}
                onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                rows={3}
                placeholder="Contoh: Jl. Melati No. 5, RT 02/04 (Rumah pagar hitam sebelah warung Bu Siti), Jakarta Selatan"
                className="w-full pl-10 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all resize-none"
                disabled={profileLoading}
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Alamat ini akan otomatis terisi di form checkout. Masih bisa Anda ubah per pesanan jika perlu.
            </p>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100">
            <span className="text-[11px] text-slate-400">
              {isDirty ? 'Ada perubahan yang belum disimpan.' : 'Tidak ada perubahan.'}
            </span>
            <button
              type="submit"
              disabled={profileLoading || !isDirty}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-md shadow-emerald-600/20 active:scale-95 transition-all flex items-center gap-2"
            >
              {profileLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Simpan Perubahan
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Tab: Password */}
      {activeTab === 'password' && (
        <form onSubmit={handlePwSubmit} className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 space-y-5">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Gunakan password yang kuat: minimal 6 karakter, kombinasi huruf besar/kecil dan angka.
              Jangan bagikan password Anda kepada siapapun.
            </span>
          </div>

          {pwMsg && (
            <div className={`p-3 rounded-xl text-xs flex items-start gap-2 border ${
              pwMsg.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}>
              {pwMsg.type === 'success'
                ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
              <span>{pwMsg.text}</span>
            </div>
          )}

          {/* Current Password */}
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
              Password Lama <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showPw.current ? 'text' : 'password'}
                autoComplete="current-password"
                value={pwForm.currentPassword}
                onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                placeholder="Masukkan password saat ini"
                className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
                disabled={pwLoading}
              />
              <button
                type="button"
                onClick={() => setShowPw({ ...showPw, current: !showPw.current })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                tabIndex={-1}
              >
                {showPw.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
              Password Baru <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showPw.next ? 'text' : 'password'}
                autoComplete="new-password"
                value={pwForm.newPassword}
                onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                placeholder="Minimal 6 karakter"
                className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
                disabled={pwLoading}
              />
              <button
                type="button"
                onClick={() => setShowPw({ ...showPw, next: !showPw.next })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                tabIndex={-1}
              >
                {showPw.next ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
              Ulangi Password Baru <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showPw.next ? 'text' : 'password'}
                value={pwForm.confirmNewPassword}
                onChange={(e) => setPwForm({ ...pwForm, confirmNewPassword: e.target.value })}
                placeholder="Ketik ulang password baru"
                className="w-full pl-10 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
                disabled={pwLoading}
              />
            </div>
            {pwForm.newPassword && pwForm.confirmNewPassword && pwForm.newPassword !== pwForm.confirmNewPassword && (
              <p className="text-[11px] text-rose-600 mt-1">Konfirmasi password tidak cocok.</p>
            )}
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <button
              type="submit"
              disabled={pwLoading}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-md shadow-emerald-600/20 active:scale-95 transition-all flex items-center gap-2"
            >
              {pwLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  Ubah Password
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
