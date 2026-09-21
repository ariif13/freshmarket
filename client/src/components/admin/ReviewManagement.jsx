import React, { useState, useEffect } from 'react';
import {
  Star,
  Search,
  RefreshCw,
  Trash2,
  MessageCircle,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  User,
  Package,
  Calendar
} from 'lucide-react';
import { api } from '../../services/api';
import StarRating from '../reviews/StarRating';

export default function ReviewManagement() {
  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [search, setSearch] = useState('');

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (ratingFilter !== 'all') params.rating = ratingFilter;
      if (search) params.search = search;

      const [list, sum] = await Promise.all([
        api.getAllReviews(params),
        api.getReviewsSummary()
      ]);
      setReviews(list);
      setSummary(sum);
    } catch (err) {
      setError(err.message || 'Gagal memuat data ulasan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ratingFilter]);

  useEffect(() => {
    const t = setTimeout(fetchAll, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleDelete = async (review) => {
    if (!confirm(`Hapus ulasan dari ${review.userName} untuk "${review.productName}"?\n\nAksi ini tidak dapat dibatalkan.`)) return;
    try {
      await api.deleteReview(review.id);
      await fetchAll();
    } catch (err) {
      alert('Gagal menghapus ulasan: ' + err.message);
    }
  };

  return (
    <div className="space-y-5">
      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total Ulasan" value={summary.total} icon={MessageCircle} />
          <StatCard
            label="Rating Rata-rata"
            value={summary.avgRating > 0 ? summary.avgRating.toFixed(2) : '—'}
            sub="dari 5.0 bintang"
            icon={Star}
            color="text-amber-600"
          />
          <StatCard
            label="Ulasan Positif"
            value={(summary.breakdown[5] || 0) + (summary.breakdown[4] || 0)}
            sub="rating 4-5"
            icon={TrendingUp}
            color="text-emerald-600"
          />
          <StatCard
            label="Ulasan Rendah"
            value={(summary.breakdown[1] || 0) + (summary.breakdown[2] || 0)}
            sub="rating 1-2, perlu perhatian"
            icon={TrendingDown}
            color="text-rose-600"
          />
        </div>
      )}

      {/* Breakdown + Insights */}
      {summary && summary.total > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Distribution */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 md:col-span-1">
            <h4 className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
              Distribusi Rating
            </h4>
            <div className="space-y-1.5">
              {[5, 4, 3, 2, 1].map((n) => {
                const c = summary.breakdown[n] || 0;
                const pct = summary.total > 0 ? (c / summary.total) * 100 : 0;
                return (
                  <div key={n} className="flex items-center gap-2 text-xs">
                    <span className="w-3 font-bold text-slate-600">{n}</span>
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-slate-500 w-6 text-right">{c}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top rated */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200">
            <h4 className="text-xs font-bold text-emerald-700 mb-2 uppercase tracking-wider flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              Produk Rating Tertinggi
            </h4>
            {summary.topRated.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">Belum ada data.</p>
            ) : (
              <div className="space-y-1.5">
                {summary.topRated.slice(0, 3).map((p) => (
                  <div key={p.productId} className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate text-slate-700 font-semibold">{p.productName}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <StarRating value={p.avg} size="sm" />
                      <span className="text-[10px] text-slate-400">({p.count})</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Lowest rated */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200">
            <h4 className="text-xs font-bold text-rose-700 mb-2 uppercase tracking-wider flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5" />
              Perlu Perhatian
            </h4>
            {summary.lowestRated.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">Belum ada data.</p>
            ) : (
              <div className="space-y-1.5">
                {summary.lowestRated.slice(0, 3).map((p) => (
                  <div key={p.productId} className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate text-slate-700 font-semibold">{p.productName}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <StarRating value={p.avg} size="sm" />
                      <span className="text-[10px] text-slate-400">({p.count})</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'Semua' },
            { id: '5', label: '5 ★' },
            { id: '4', label: '4 ★' },
            { id: '3', label: '3 ★' },
            { id: '2', label: '2 ★' },
            { id: '1', label: '1 ★' }
          ].map((r) => (
            <button
              key={r.id}
              onClick={() => setRatingFilter(r.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                ratingFilter === r.id
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
            placeholder="Cari nama produk, user, atau isi komentar..."
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

      {/* List */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 space-y-3">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm">Memuat ulasan...</p>
        </div>
      ) : reviews.length === 0 ? (
        <div className="py-12 text-center bg-white rounded-3xl border border-slate-200 p-8">
          <MessageCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="font-bold text-sm text-slate-800">Belum ada ulasan</h3>
          <p className="text-xs text-slate-500 mt-1">
            {ratingFilter !== 'all' || search
              ? 'Tidak ada ulasan yang cocok dengan filter/pencarian.'
              : 'Ulasan pelanggan akan muncul di sini setelah mereka menyelesaikan pesanan.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((rv) => (
            <div key={rv.id} className="bg-white rounded-2xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-emerald-500 text-white font-black flex items-center justify-center shrink-0">
                    {rv.userName?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-900">{rv.userName}</span>
                      <StarRating value={rv.rating} size="sm" />
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Package className="w-3 h-3" />
                        <b className="text-slate-700">{rv.productName}</b>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(rv.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                        {rv.updatedAt && ' (diedit)'}
                      </span>
                    </div>
                    {rv.comment ? (
                      <p className="text-xs text-slate-700 mt-2 leading-relaxed bg-slate-50 border border-slate-100 rounded-xl p-2.5">
                        "{rv.comment}"
                      </p>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic mt-1">
                        (Tanpa komentar)
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(rv)}
                  className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 shrink-0"
                  title="Hapus ulasan"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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
