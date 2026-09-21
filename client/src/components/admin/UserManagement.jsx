import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  ShieldCheck,
  UserCircle2,
  KeyRound,
  ArrowUp,
  ArrowDown,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  Mail,
  Phone,
  MapPin,
  Calendar,
  ShoppingBag,
  Eye,
  X,
  MessageSquare,
  UserPlus,
  Activity,
  Lock,
  Unlock
} from 'lucide-react';
import { api, formatRupiah } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const ROLE_CONFIG = {
  admin: {
    label: 'Admin',
    icon: ShieldCheck,
    badge: 'bg-amber-100 text-amber-800 border-amber-300',
    dot: 'bg-amber-500'
  },
  customer: {
    label: 'Pelanggan',
    icon: UserCircle2,
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    dot: 'bg-emerald-500'
  }
};

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Modal state
  const [detailUser, setDetailUser] = useState(null);
  const [resetPwUser, setResetPwUser] = useState(null); // user yang akan direset
  const [resetPwResult, setResetPwResult] = useState(null); // { newPassword, user }
  const [confirmAction, setConfirmAction] = useState(null); // { type: 'role'|'delete', user, newRole? }
  const [actionLoading, setActionLoading] = useState(false);

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError('');
      const [usersData, statsData] = await Promise.all([
        api.getUsers({ role: roleFilter, search }),
        api.getUserStats()
      ]);
      setUsers(usersData);
      setStats(statsData);
    } catch (err) {
      setError(err.message || 'Gagal memuat data user.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleFilter]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAll();
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleRoleChange = async (user, newRole) => {
    try {
      setActionLoading(true);
      await api.updateUserRole(user.id, newRole);
      setConfirmAction(null);
      await fetchAll();
    } catch (err) {
      alert('Gagal mengubah role: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (user) => {
    try {
      setActionLoading(true);
      await api.deleteUser(user.id);
      setConfirmAction(null);
      await fetchAll();
    } catch (err) {
      alert('Gagal menghapus user: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPassword = async (user, customPassword = null) => {
    try {
      setActionLoading(true);
      const result = await api.resetUserPassword(user.id, customPassword);
      setResetPwResult(result);
      setResetPwUser(null);
    } catch (err) {
      alert('Gagal reset password: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnlock = async (user) => {
    if (!confirm(`Buka kunci akun ${user.name}? User akan bisa mencoba login kembali.`)) return;
    try {
      const res = await api.unlockUser(user.id);
      alert(res.message);
      await fetchAll();
    } catch (err) {
      alert('Gagal unlock: ' + err.message);
    }
  };

  return (
    <div className="space-y-5">
      {/* Stats Summary */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="Total User"
            value={stats.totalUsers}
            icon={Users}
            color="text-slate-900"
          />
          <StatCard
            label="Admin"
            value={stats.adminCount}
            icon={ShieldCheck}
            color="text-amber-600"
          />
          <StatCard
            label="Pelanggan Aktif"
            value={stats.activeCustomerCount}
            sub={`dari ${stats.customerCount} pelanggan`}
            icon={Activity}
            color="text-emerald-600"
          />
          <StatCard
            label="User Baru (30 hari)"
            value={stats.newUsersCount}
            icon={UserPlus}
            color="text-blue-600"
          />
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'Semua' },
            { id: 'admin', label: 'Admin' },
            { id: 'customer', label: 'Pelanggan' }
          ].map((r) => (
            <button
              key={r.id}
              onClick={() => setRoleFilter(r.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                roleFilter === r.id
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 min-w-0">
          <input
            type="text"
            placeholder="Cari nama, email, atau nomor HP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs bg-slate-50 pl-8 pr-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-300 outline-none"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
        </div>

        <button
          onClick={fetchAll}
          disabled={loading}
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 flex items-center gap-1.5 transition-all shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-4 py-3 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* User List */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 space-y-3">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm">Memuat daftar user...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="py-12 text-center bg-white rounded-3xl border border-slate-200 p-8">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="font-bold text-sm text-slate-800">Tidak ada user ditemukan</h3>
          <p className="text-xs text-slate-500 mt-1">
            Coba ubah filter atau kata kunci pencarian.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {/* Desktop table view */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 font-bold tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left">User</th>
                  <th className="px-4 py-3 text-left">Kontak</th>
                  <th className="px-4 py-3 text-center">Role</th>
                  <th className="px-4 py-3 text-center">Order</th>
                  <th className="px-4 py-3 text-right">Total Belanja</th>
                  <th className="px-4 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <UserRow
                    key={u.id}
                    user={u}
                    currentUser={currentUser}
                    onView={() => setDetailUser(u)}
                    onResetPassword={() => setResetPwUser(u)}
                    onChangeRole={(newRole) => setConfirmAction({ type: 'role', user: u, newRole })}
                    onDelete={() => setConfirmAction({ type: 'delete', user: u })}
                    onUnlock={() => handleUnlock(u)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card view */}
          <div className="md:hidden divide-y divide-slate-100">
            {users.map((u) => (
              <UserCard
                key={u.id}
                user={u}
                currentUser={currentUser}
                onView={() => setDetailUser(u)}
                onResetPassword={() => setResetPwUser(u)}
                onChangeRole={(newRole) => setConfirmAction({ type: 'role', user: u, newRole })}
                onDelete={() => setConfirmAction({ type: 'delete', user: u })}
                onUnlock={() => handleUnlock(u)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {detailUser && (
        <UserDetailModal user={detailUser} onClose={() => setDetailUser(null)} />
      )}

      {resetPwUser && (
        <ResetPasswordModal
          user={resetPwUser}
          onClose={() => setResetPwUser(null)}
          onConfirm={handleResetPassword}
          loading={actionLoading}
        />
      )}

      {resetPwResult && (
        <ResetPasswordResultModal
          result={resetPwResult}
          onClose={() => setResetPwResult(null)}
        />
      )}

      {confirmAction && (
        <ConfirmActionModal
          action={confirmAction}
          onClose={() => setConfirmAction(null)}
          onConfirm={() => {
            if (confirmAction.type === 'role') {
              handleRoleChange(confirmAction.user, confirmAction.newRole);
            } else if (confirmAction.type === 'delete') {
              handleDelete(confirmAction.user);
            }
          }}
          loading={actionLoading}
        />
      )}
    </div>
  );
}

// ==================== SUB COMPONENTS ====================

function StatCard({ label, value, sub, icon: Icon, color = 'text-slate-900' }) {
  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-200">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {label}
        </span>
        <Icon className="w-4 h-4 text-slate-400" />
      </div>
      <div className={`text-xl font-black ${color}`}>{value}</div>
      {sub && <div className="text-[10px] text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}

function UserRow({ user, currentUser, onView, onResetPassword, onChangeRole, onDelete, onUnlock }) {
  const roleCfg = ROLE_CONFIG[user.role] || ROLE_CONFIG.customer;
  const IconRole = roleCfg.icon;
  const isSelf = user.id === currentUser?.id;

  return (
    <tr className="hover:bg-slate-50 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black text-white shrink-0 ${roleCfg.dot}`}>
            {user.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-slate-900 text-sm truncate flex items-center gap-1">
              {user.name}
              {isSelf && (
                <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-bold">
                  Anda
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-500 truncate">{user.email}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="text-xs text-slate-600 space-y-0.5">
          {user.phone ? (
            <div className="flex items-center gap-1">
              <Phone className="w-3 h-3 text-emerald-600" />
              {user.phone}
            </div>
          ) : (
            <span className="text-slate-400 italic">Tidak ada</span>
          )}
          <div className="text-[10px] text-slate-400 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {new Date(user.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-center">
        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border ${roleCfg.badge}`}>
          <IconRole className="w-3 h-3" />
          {roleCfg.label}
        </span>
      </td>
      <td className="px-4 py-3 text-center">
        <div className="text-sm font-bold text-slate-800">{user.stats?.orderCount || 0}</div>
        <div className="text-[10px] text-slate-500">
          {user.stats?.completedCount || 0} selesai
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="text-sm font-bold text-emerald-700">
          {formatRupiah(user.stats?.totalSpent || 0)}
        </div>
      </td>
      <td className="px-4 py-3">
        <UserActions
          user={user}
          isSelf={isSelf}
          onView={onView}
          onResetPassword={onResetPassword}
          onChangeRole={onChangeRole}
          onDelete={onDelete}
          onUnlock={onUnlock}
        />
      </td>
    </tr>
  );
}

function UserCard({ user, currentUser, onView, onResetPassword, onChangeRole, onDelete, onUnlock }) {
  const roleCfg = ROLE_CONFIG[user.role] || ROLE_CONFIG.customer;
  const IconRole = roleCfg.icon;
  const isSelf = user.id === currentUser?.id;

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className={`w-11 h-11 rounded-full flex items-center justify-center text-lg font-black text-white shrink-0 ${roleCfg.dot}`}>
          {user.name?.charAt(0).toUpperCase() || 'U'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-slate-900 text-sm truncate flex items-center gap-1.5">
            {user.name}
            {isSelf && (
              <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-bold">
                Anda
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-500 truncate">{user.email}</div>
          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border mt-1 ${roleCfg.badge}`}>
            <IconRole className="w-3 h-3" />
            {roleCfg.label}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 rounded-xl p-3">
        <div>
          <div className="text-[10px] text-slate-400 uppercase font-bold">Order</div>
          <div className="font-bold text-slate-800">{user.stats?.orderCount || 0} ({user.stats?.completedCount || 0} selesai)</div>
        </div>
        <div>
          <div className="text-[10px] text-slate-400 uppercase font-bold">Total Belanja</div>
          <div className="font-bold text-emerald-700">{formatRupiah(user.stats?.totalSpent || 0)}</div>
        </div>
      </div>

      <UserActions
        user={user}
        isSelf={isSelf}
        onView={onView}
        onResetPassword={onResetPassword}
        onChangeRole={onChangeRole}
        onDelete={onDelete}
        onUnlock={onUnlock}
      />
    </div>
  );
}

function UserActions({ user, isSelf, onView, onResetPassword, onChangeRole, onDelete, onUnlock }) {
  return (
    <div className="flex items-center justify-end gap-1 flex-wrap">
      <button
        onClick={onView}
        title="Lihat detail"
        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"
      >
        <Eye className="w-3.5 h-3.5" />
      </button>

      {!isSelf && (
        <>
          <button
            onClick={onUnlock}
            title="Buka kunci akun (kalau terkunci karena brute force)"
            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700"
          >
            <Unlock className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onResetPassword}
            title="Reset password"
            className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700"
          >
            <KeyRound className="w-3.5 h-3.5" />
          </button>

          {user.role === 'customer' ? (
            <button
              onClick={() => onChangeRole('admin')}
              title="Jadikan Admin"
              className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={() => onChangeRole('customer')}
              title="Turunkan ke Pelanggan"
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={onDelete}
            title="Hapus user"
            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </>
      )}
    </div>
  );
}

function UserDetailModal({ user, onClose }) {
  const roleCfg = ROLE_CONFIG[user.role] || ROLE_CONFIG.customer;
  const IconRole = roleCfg.icon;

  return (
    <ModalWrapper onClose={onClose}>
      <div className={`bg-gradient-to-br from-emerald-600 to-teal-600 text-white p-5 -m-6 mb-4 rounded-t-3xl`}>
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-xl font-black border border-white/30">
            {user.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-black text-lg truncate">{user.name}</h3>
            <div className="flex items-center gap-1 text-emerald-100 text-xs">
              <Mail className="w-3 h-3" />
              <span className="truncate">{user.email}</span>
            </div>
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 border border-white/30 mt-1`}>
              <IconRole className="w-3 h-3" />
              {roleCfg.label}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-4 text-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InfoItem icon={Phone} label="Nomor HP" value={user.phone || '—'} />
          <InfoItem
            icon={Calendar}
            label="Bergabung"
            value={new Date(user.createdAt).toLocaleDateString('id-ID', {
              day: '2-digit', month: 'long', year: 'numeric'
            })}
          />
        </div>

        {user.address && (
          <InfoItem icon={MapPin} label="Alamat Default" value={user.address} multiline />
        )}

        {/* Stats */}
        <div className="bg-slate-50 rounded-xl p-3 space-y-2">
          <div className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
            Statistik Pemesanan
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-lg font-black text-slate-900">{user.stats?.orderCount || 0}</div>
              <div className="text-[10px] text-slate-500">Total Order</div>
            </div>
            <div>
              <div className="text-lg font-black text-emerald-600">{user.stats?.completedCount || 0}</div>
              <div className="text-[10px] text-slate-500">Selesai</div>
            </div>
            <div>
              <div className="text-sm font-black text-emerald-700">{formatRupiah(user.stats?.totalSpent || 0)}</div>
              <div className="text-[10px] text-slate-500">Total Belanja</div>
            </div>
          </div>
          {user.stats?.lastOrderDate && (
            <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">
              Order terakhir: {new Date(user.stats.lastOrderDate).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
            </div>
          )}
        </div>

        {user.phone && (
          <a
            href={`https://wa.me/${user.phone.replace(/[^0-9]/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 rounded-xl transition-all"
          >
            <MessageSquare className="w-4 h-4" />
            Chat via WhatsApp
          </a>
        )}
      </div>
    </ModalWrapper>
  );
}

function InfoItem({ icon: Icon, label, value, multiline = false }) {
  return (
    <div className="bg-slate-50 rounded-xl p-3">
      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
        <Icon className="w-3 h-3" />
        {label}
      </div>
      <div className={`text-slate-800 font-semibold ${multiline ? 'text-xs leading-relaxed' : 'text-sm'}`}>
        {value}
      </div>
    </div>
  );
}

function ResetPasswordModal({ user, onClose, onConfirm, loading }) {
  const [mode, setMode] = useState('auto'); // 'auto' | 'manual'
  const [customPw, setCustomPw] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    setError('');
    if (mode === 'manual') {
      if (customPw.length < 6) {
        setError('Password minimal 6 karakter.');
        return;
      }
      onConfirm(user, customPw);
    } else {
      onConfirm(user, null);
    }
  };

  return (
    <ModalWrapper onClose={onClose}>
      <div className="text-center mb-4">
        <div className="w-14 h-14 mx-auto rounded-full bg-blue-100 flex items-center justify-center mb-3">
          <KeyRound className="w-7 h-7 text-blue-600" />
        </div>
        <h3 className="font-black text-lg text-slate-900">Reset Password User</h3>
        <p className="text-xs text-slate-500 mt-1">
          Anda akan mereset password untuk <b>{user.name}</b> ({user.email})
        </p>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <label className={`flex flex-col p-3 rounded-xl border cursor-pointer transition-all ${
            mode === 'auto' ? 'bg-emerald-50 border-emerald-500' : 'bg-white border-slate-200'
          }`}>
            <input
              type="radio"
              checked={mode === 'auto'}
              onChange={() => setMode('auto')}
              className="sr-only"
            />
            <span className="text-xs font-bold text-slate-800">Generate Otomatis</span>
            <span className="text-[10px] text-slate-500 mt-0.5">Password acak yang aman</span>
          </label>
          <label className={`flex flex-col p-3 rounded-xl border cursor-pointer transition-all ${
            mode === 'manual' ? 'bg-emerald-50 border-emerald-500' : 'bg-white border-slate-200'
          }`}>
            <input
              type="radio"
              checked={mode === 'manual'}
              onChange={() => setMode('manual')}
              className="sr-only"
            />
            <span className="text-xs font-bold text-slate-800">Set Manual</span>
            <span className="text-[10px] text-slate-500 mt-0.5">Tentukan password sendiri</span>
          </label>
        </div>

        {mode === 'manual' && (
          <div>
            <input
              type="text"
              value={customPw}
              onChange={(e) => setCustomPw(e.target.value)}
              placeholder="Minimal 6 karakter"
              className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
            />
          </div>
        )}

        {error && (
          <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 px-3 py-2 rounded-lg">
            {error}
          </div>
        )}

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Password lama akan segera tidak berlaku. Password baru akan ditampilkan sekali — pastikan Anda menyimpan atau mengirimkannya ke user.
          </span>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 rounded-xl transition-all"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-xs font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5"
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Memproses...
              </>
            ) : (
              <>
                <KeyRound className="w-3.5 h-3.5" />
                Reset Password
              </>
            )}
          </button>
        </div>
      </div>
    </ModalWrapper>
  );
}

function ResetPasswordResultModal({ result, onClose }) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(result.newPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const waLink = result.user?.phone
    ? `https://wa.me/${result.user.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
        `Halo ${result.user.name},\n\nPassword akun FreshSayur Anda telah direset oleh admin.\n\n` +
        `Password baru: ${result.newPassword}\n\n` +
        `Silakan login dan segera ubah password Anda dari menu Profil untuk keamanan. Terima kasih.`
      )}`
    : null;

  return (
    <ModalWrapper onClose={onClose}>
      <div className="text-center mb-4">
        <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-3">
          <Check className="w-7 h-7 text-emerald-600" />
        </div>
        <h3 className="font-black text-lg text-slate-900">Password Berhasil Direset</h3>
        <p className="text-xs text-slate-500 mt-1">
          Berikut password baru untuk <b>{result.user?.name}</b>
        </p>
      </div>

      <div className="space-y-3">
        {/* Password Display */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-4 rounded-2xl text-center">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
            Password Baru
          </div>
          <div className="font-mono font-black text-2xl text-emerald-400 tracking-wider break-all">
            {result.newPassword}
          </div>
        </div>

        <button
          onClick={copyToClipboard}
          className={`w-full flex items-center justify-center gap-2 text-xs font-bold py-2.5 rounded-xl transition-all ${
            copied
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              Password Tersalin
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Salin Password
            </>
          )}
        </button>

        {waLink && (
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 rounded-xl transition-all"
          >
            <MessageSquare className="w-4 h-4" />
            Kirim ke User via WhatsApp
          </a>
        )}

        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            <b>Simpan password ini sekarang!</b> Setelah modal ini ditutup, password tidak akan bisa ditampilkan lagi. User sebaiknya segera mengubah password setelah login.
          </span>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2.5 rounded-xl transition-all"
        >
          Saya Sudah Menyimpan Password
        </button>
      </div>
    </ModalWrapper>
  );
}

function ConfirmActionModal({ action, onClose, onConfirm, loading }) {
  const { type, user, newRole } = action;

  const config = type === 'role'
    ? {
        title: newRole === 'admin' ? 'Jadikan Admin?' : 'Turunkan ke Pelanggan?',
        icon: newRole === 'admin' ? ArrowUp : ArrowDown,
        iconColor: newRole === 'admin' ? 'text-amber-600 bg-amber-100' : 'text-slate-600 bg-slate-100',
        message: newRole === 'admin'
          ? `${user.name} akan memiliki akses penuh untuk mengelola toko, produk, kategori, pesanan, dan user lain.`
          : `${user.name} akan kehilangan akses admin dan hanya bisa berbelanja seperti pelanggan biasa.`,
        confirmLabel: newRole === 'admin' ? 'Jadikan Admin' : 'Turunkan Role',
        confirmClass: newRole === 'admin'
          ? 'bg-amber-500 hover:bg-amber-600'
          : 'bg-slate-700 hover:bg-slate-800'
      }
    : {
        title: 'Hapus User Permanen?',
        icon: Trash2,
        iconColor: 'text-rose-600 bg-rose-100',
        message: `Akun ${user.name} (${user.email}) akan dihapus permanen. Order yang sudah selesai/dibatalkan akan tetap tersimpan tapi tidak lagi terhubung ke user.`,
        confirmLabel: 'Hapus Permanen',
        confirmClass: 'bg-rose-600 hover:bg-rose-700'
      };

  const Icon = config.icon;

  return (
    <ModalWrapper onClose={onClose}>
      <div className="text-center mb-4">
        <div className={`w-14 h-14 mx-auto rounded-full flex items-center justify-center mb-3 ${config.iconColor}`}>
          <Icon className="w-7 h-7" />
        </div>
        <h3 className="font-black text-lg text-slate-900">{config.title}</h3>
        <p className="text-xs text-slate-600 mt-2 leading-relaxed">{config.message}</p>
      </div>

      <div className="flex gap-2 pt-2">
        <button
          onClick={onClose}
          disabled={loading}
          className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 rounded-xl transition-all"
        >
          Batal
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className={`flex-1 text-white text-xs font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 ${config.confirmClass}`}
        >
          {loading ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Memproses...
            </>
          ) : (
            config.confirmLabel
          )}
        </button>
      </div>
    </ModalWrapper>
  );
}

function ModalWrapper({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center z-10"
        >
          <X className="w-4 h-4" />
        </button>
        {children}
      </div>
    </div>
  );
}
