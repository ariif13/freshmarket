import React, { useState } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Check, 
  X, 
  Drumstick,
  Beef,
  Wheat,
  SprayCan,
  Droplets,
  Salad,
  Leaf, 
  Flame, 
  UtensilsCrossed,
  Apple, 
  Carrot, 
  ShoppingBag, 
  Cherry, 
  Sparkles,
  Egg,
  Fish,
  Milk,
  Package,
  Layers,
  Info
} from 'lucide-react';
import { api } from '../../services/api';

const AVAILABLE_ICONS = [
  { id: 'Drumstick', label: 'Lauk Hewani (Ayam/Daging)', icon: Drumstick },
  { id: 'Wheat', label: 'Sembako (Beras/Minyak/Tepung)', icon: Wheat },
  { id: 'SprayCan', label: 'BHP (Sabun/Pembersih)', icon: SprayCan },
  { id: 'Salad', label: 'Sayur Mayur Segar', icon: Salad },
  { id: 'Flame', label: 'Bumbu Dapur & Cabai', icon: Flame },
  { id: 'Beef', label: 'Daging Sapi Segar', icon: Beef },
  { id: 'Fish', label: 'Ikan & Hasil Laut', icon: Fish },
  { id: 'Egg', label: 'Telur Ayam / Bebek', icon: Egg },
  { id: 'Leaf', label: 'Sayuran Hijau / Daun', icon: Leaf },
  { id: 'Carrot', label: 'Wortel / Umbi-umbian', icon: Carrot },
  { id: 'UtensilsCrossed', label: 'Bumbu Racik & Rempah', icon: UtensilsCrossed },
  { id: 'Droplets', label: 'BHP Cair / Minyak', icon: Droplets },
  { id: 'ShoppingBag', label: 'Paket Masak Praktis', icon: ShoppingBag },
  { id: 'Apple', label: 'Sayur Buah', icon: Apple },
  { id: 'Cherry', label: 'Buah-buahan Manis', icon: Cherry },
  { id: 'Milk', label: 'Susu / Olahan', icon: Milk },
  { id: 'Package', label: 'Kemasan / Grosir', icon: Package },
  { id: 'Sparkles', label: 'Semua / Rekomendasi', icon: Sparkles }
];

export default function CategoryManagement({ categories, onCategoriesChange, products }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    icon: 'Leaf'
  });
  const [submitting, setSubmitting] = useState(false);

  const handleOpenAdd = () => {
    setEditingCategory(null);
    setFormData({ name: '', icon: 'Leaf' });
    setModalOpen(true);
  };

  const handleOpenEdit = (cat) => {
    setEditingCategory(cat);
    setFormData({ name: cat.name, icon: cat.icon || 'Leaf' });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Nama kategori wajib diisi');
      return;
    }

    try {
      setSubmitting(true);
      if (editingCategory) {
        await api.updateCategory(editingCategory.id, formData);
      } else {
        await api.createCategory(formData);
      }
      const updatedCats = await api.getCategories();
      onCategoriesChange(updatedCats);
      setModalOpen(false);
    } catch (err) {
      alert('Gagal menyimpan kategori: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (cat) => {
    if (cat.id === 'semua') {
      alert('Kategori "Semua Produk" adalah kategori utama sistem dan tidak bisa dihapus');
      return;
    }

    const count = (products || []).filter(p => p.category === cat.id).length;
    if (count > 0) {
      alert(`Kategori "${cat.name}" masih dipakai oleh ${count} produk. Pindahkan produk tersebut sebelum menghapus kategori.`);
      return;
    }

    let confirmMsg = `Yakin ingin menghapus kategori "${cat.name}"?`;

    if (!confirm(confirmMsg)) return;

    try {
      await api.deleteCategory(cat.id);
      const updatedCats = await api.getCategories();
      onCategoriesChange(updatedCats);
    } catch (err) {
      alert('Gagal menghapus kategori: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-700" />
            <span>Kelola Kategori Produk Sayur</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Tambah kategori baru untuk memudahkan pelanggan memfilter sayur, buah, bumbu, atau lauk
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs flex items-center gap-1.5 self-start sm:self-center transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>+ Tambah Kategori Baru</span>
        </button>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {categories.map((cat) => {
          const iconObj = AVAILABLE_ICONS.find(i => i.id === cat.icon) || AVAILABLE_ICONS[0];
          const IconComp = iconObj.icon;
          const productCount = (products || []).filter(p => cat.id === 'semua' ? true : p.category === cat.id).length;
          const isSystemCategory = cat.id === 'semua';

          return (
            <div
              key={cat.id}
              className="bg-white rounded-2xl border border-slate-200 hover:border-emerald-300 p-4 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                  <IconComp className="w-5 h-5" />
                </div>
                {!isSystemCategory && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(cat)}
                      className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                      title="Edit Nama / Icon"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(cat)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Hapus Kategori"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-bold text-slate-800 text-sm">
                  {cat.name}
                </h4>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                  <span className="font-mono bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                    ID: {cat.id}
                  </span>
                  <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                    {productCount} Produk
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Category Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">
                {editingCategory ? 'Edit Kategori' : 'Tambah Kategori Baru'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Kategori <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Sayur Hidroponik, Telur & Protein, Bumbu Siap Pakai"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none"
                />
              </div>

              {/* Icon Selector Grid */}
              <div>
                <label className="block font-semibold text-slate-700 mb-2">
                  Pilih Ikon Kategori
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {AVAILABLE_ICONS.map((item) => {
                    const IconC = item.icon;
                    const isSelected = formData.icon === item.id;
                    return (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => setFormData({ ...formData, icon: item.id })}
                        className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all ${
                          isSelected
                            ? 'bg-emerald-100 border-emerald-500 text-emerald-800 font-bold shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-white'
                        }`}
                      >
                        <IconC className={`w-5 h-5 mb-1 ${isSelected ? 'text-emerald-700' : 'text-slate-500'}`} />
                        <span className="text-[10px] text-center line-clamp-1">{item.label.split('/')[0]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingCategory ? 'Simpan Perubahan' : 'Tambah Kategori'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
