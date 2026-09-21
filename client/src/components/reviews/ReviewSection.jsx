import React, { useState, useEffect } from 'react';
import { MessageCircle, User, Trash2, Edit3, Send, X, AlertCircle, Star, ShoppingBag } from 'lucide-react';
import StarRating from './StarRating';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

export default function ReviewSection({ product, onRatingChange }) {
  const { user, isAdmin } = useAuth();
  const [data, setData] = useState({ reviews: [], summary: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [eligible, setEligible] = useState(false);
  const [myExisting, setMyExisting] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [editingReview, setEditingReview] = useState(null);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.getProductReviews(product.id);
      setData(res);
      onRatingChange && onRatingChange(res.summary);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const checkEligibility = async () => {
    if (!user || user.role !== 'customer') {
      setEligible(false);
      setMyExisting(null);
      return;
    }
    try {
      // Cek eligibility (pernah beli & selesai + belum review)
      const eligibleList = await api.getEligibleReviews();
      const canReview = eligibleList.some(e => e.productId === product.id);
      setEligible(canReview);

      // Cek apakah sudah punya review
      const myReviews = await api.getMyReviews();
      const existing = myReviews.find(r => r.productId === product.id);
      setMyExisting(existing || null);
    } catch {
      setEligible(false);
    }
  };

  useEffect(() => {
    if (product?.id) {
      fetchReviews();
      checkEligibility();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id, user?.id]);

  const handleDelete = async (reviewId) => {
    if (!confirm('Yakin ingin menghapus ulasan ini?')) return;
    try {
      await api.deleteReview(reviewId);
      await fetchReviews();
      await checkEligibility();
    } catch (err) {
      alert('Gagal menghapus ulasan: ' + err.message);
    }
  };

  const canWriteReview = user && user.role === 'customer' && eligible && !myExisting;
  const canEditMine = user && myExisting;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900">
                {data.summary?.average > 0 ? data.summary.average.toFixed(1) : '—'}
              </span>
              <span className="text-xs text-slate-500">/ 5.0</span>
            </div>
            <div className="mt-1">
              <StarRating value={data.summary?.average || 0} size="md" />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {data.summary?.total > 0
                ? `Berdasarkan ${data.summary.total} ulasan pelanggan`
                : 'Belum ada ulasan'}
            </p>
          </div>

          {/* Breakdown */}
          {data.summary?.total > 0 && (
            <div className="flex-1 max-w-xs min-w-[180px] space-y-1">
              {[5, 4, 3, 2, 1].map((n) => {
                const count = data.summary.breakdown[n] || 0;
                const pct = data.summary.total > 0 ? (count / data.summary.total) * 100 : 0;
                return (
                  <div key={n} className="flex items-center gap-2 text-[10px]">
                    <span className="text-slate-600 font-semibold w-4">{n}</span>
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                    <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-slate-500 w-6 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Action Row */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
          <MessageCircle className="w-4 h-4 text-emerald-600" />
          Ulasan Pelanggan
          {data.reviews.length > 0 && (
            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
              {data.reviews.length}
            </span>
          )}
        </h3>

        {canWriteReview && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Tulis Ulasan
          </button>
        )}
      </div>

      {/* Form Area */}
      {showForm && canWriteReview && (
        <ReviewForm
          product={product}
          onCancel={() => setShowForm(false)}
          onSubmitted={() => {
            setShowForm(false);
            fetchReviews();
            checkEligibility();
          }}
        />
      )}

      {editingReview && (
        <ReviewForm
          product={product}
          existing={editingReview}
          onCancel={() => setEditingReview(null)}
          onSubmitted={() => {
            setEditingReview(null);
            fetchReviews();
          }}
        />
      )}

      {/* Message Bar */}
      {!user && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Silakan <b>login</b> untuk memberi ulasan produk ini.</span>
        </div>
      )}

      {user && user.role === 'customer' && !eligible && !myExisting && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2">
          <ShoppingBag className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Anda hanya dapat memberi ulasan setelah membeli produk ini dan pesanannya <b>selesai</b>.</span>
        </div>
      )}

      {myExisting && !editingReview && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900">
          <div className="flex items-start gap-2 mb-2">
            <MessageCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1">
              <b>Ulasan Anda:</b>
              <div className="mt-1"><StarRating value={myExisting.rating} size="sm" /></div>
              {myExisting.comment && <p className="mt-1 italic">"{myExisting.comment}"</p>}
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2 border-t border-emerald-200">
            <button
              onClick={() => setEditingReview(myExisting)}
              className="text-[11px] font-bold text-emerald-800 hover:underline flex items-center gap-1"
            >
              <Edit3 className="w-3 h-3" /> Edit
            </button>
            <button
              onClick={() => handleDelete(myExisting.id)}
              className="text-[11px] font-bold text-rose-700 hover:underline flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" /> Hapus
            </button>
          </div>
        </div>
      )}

      {/* Reviews List */}
      {loading ? (
        <div className="py-6 text-center text-slate-400 text-xs">Memuat ulasan...</div>
      ) : error ? (
        <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-3">
          {error}
        </div>
      ) : data.reviews.length === 0 ? (
        <div className="py-8 text-center bg-white rounded-2xl border border-slate-200">
          <MessageCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-xs text-slate-500">Belum ada ulasan untuk produk ini.</p>
          <p className="text-[11px] text-slate-400 mt-1">Jadilah yang pertama memberi ulasan!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.reviews.map((rv) => (
            <ReviewItem
              key={rv.id}
              review={rv}
              isOwn={user?.id === rv.userId}
              isAdmin={isAdmin}
              onDelete={() => handleDelete(rv.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// -------------- Sub Components --------------

function ReviewItem({ review, isOwn, isAdmin, onDelete }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-emerald-500 text-white font-black flex items-center justify-center shrink-0">
          {review.userName?.charAt(0).toUpperCase() || 'U'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-sm text-slate-800">{review.userName}</span>
                {isOwn && (
                  <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-bold">
                    Anda
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <StarRating value={review.rating} size="sm" />
                <span className="text-[10px] text-slate-400">
                  {new Date(review.createdAt).toLocaleDateString('id-ID', {
                    day: '2-digit', month: 'short', year: 'numeric'
                  })}
                  {review.updatedAt && ' (diedit)'}
                </span>
              </div>
            </div>
            {(isOwn || isAdmin) && (
              <button
                onClick={onDelete}
                className="text-rose-600 hover:text-rose-700 p-1 hover:bg-rose-50 rounded-lg transition-colors"
                title={isAdmin && !isOwn ? 'Hapus (moderasi admin)' : 'Hapus ulasan'}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {review.comment && (
            <p className="text-xs text-slate-700 mt-1.5 leading-relaxed">
              {review.comment}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ReviewForm({ product, existing, onCancel, onSubmitted }) {
  const [rating, setRating] = useState(existing?.rating || 5);
  const [comment, setComment] = useState(existing?.comment || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isEdit = !!existing;

  const handleSubmit = async () => {
    setError('');
    if (rating < 1 || rating > 5) {
      setError('Pilih rating 1-5 bintang terlebih dahulu.');
      return;
    }
    try {
      setSubmitting(true);
      if (isEdit) {
        await api.updateReview(existing.id, { rating, comment });
      } else {
        await api.createReview({
          productId: product.id,
          rating,
          comment
        });
      }
      onSubmitted && onSubmitted();
    } catch (err) {
      setError(err.message || 'Gagal menyimpan ulasan.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-emerald-50/50 border-2 border-emerald-200 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-emerald-900 flex items-center gap-1.5">
          <Edit3 className="w-4 h-4" />
          {isEdit ? 'Edit Ulasan Anda' : 'Beri Ulasan untuk Produk Ini'}
        </h4>
        <button
          onClick={onCancel}
          className="w-7 h-7 rounded-full bg-white hover:bg-slate-100 text-slate-600 flex items-center justify-center"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div>
        <label className="text-xs font-bold text-slate-700 block mb-1.5">
          Berapa bintang untuk <span className="text-emerald-700">{product.name}</span>?
        </label>
        <StarRating value={rating} onChange={setRating} size="xl" interactive />
        <div className="text-[11px] text-slate-500 mt-1">
          {['', 'Sangat buruk', 'Kurang', 'Cukup', 'Bagus', 'Sangat bagus'][rating]}
        </div>
      </div>

      <div>
        <label className="text-xs font-bold text-slate-700 block mb-1.5">
          Cerita pengalaman Anda <span className="text-slate-400 font-normal">(opsional)</span>
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="Contoh: Sayurnya segar, dikemas rapi, sampai dengan cepat..."
          className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none resize-none bg-white"
        />
        <div className="text-[10px] text-slate-400 text-right mt-0.5">
          {comment.length}/500
        </div>
      </div>

      {error && (
        <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 px-3 py-2 rounded-lg">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={onCancel}
          disabled={submitting}
          className="flex-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold py-2.5 rounded-xl transition-all"
        >
          Batal
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-xs font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5"
        >
          {submitting ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Menyimpan...
            </>
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              {isEdit ? 'Simpan Perubahan' : 'Kirim Ulasan'}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
