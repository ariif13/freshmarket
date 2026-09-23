import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Check, 
  X, 
  AlertTriangle, 
  Sparkles,
  RefreshCw,
  Package,
  Upload,
  Camera,
  Image as ImageIcon,
  Link as LinkIcon,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { api, formatRupiah, COMMON_UNITS } from '../../services/api';

export default function ProductManagement({ categories }) {
  const defaultCategory = categories.find((category) => category.id !== 'semua')?.id || 'sayur-mayur';
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('semua');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Upload state
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [imageInputMode, setImageInputMode] = useState('file'); // 'file' | 'url'
  const fileInputRef = useRef(null);

  // Quick table upload state
  const [quickUploadProductId, setQuickUploadProductId] = useState(null);
  const quickFileInputRef = useRef(null);

  // Form State for Add/Edit
  const [formData, setFormData] = useState({
    name: '',
    category: defaultCategory,
    price: '',
    unit: 'ikat (~250g)',
    customUnit: '',
    stock: '',
    description: '',
    image: '',
    badge: '',
    organic: false,
    available: true
  });

  const [isCustomUnit, setIsCustomUnit] = useState(false);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await api.getProducts({ category: selectedCat, search });
      setProducts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [selectedCat]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchProducts();
  };

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setIsCustomUnit(false);
    setUploadSuccess(false);
    setImageInputMode('file');
    setFormData({
      name: '',
      category: defaultCategory,
      price: '',
      unit: 'ikat',
      customUnit: '',
      stock: '25',
      description: '',
      image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
      badge: 'Panen Subuh',
      organic: false,
      available: true
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (p) => {
    setEditingProduct(p);
    setUploadSuccess(false);
    setImageInputMode(p.image?.startsWith('/uploads') ? 'file' : 'url');
    
    // Check if unit is in COMMON_UNITS presets
    const isPreset = COMMON_UNITS.some(u => u.value === p.unit);
    if (isPreset) {
      setIsCustomUnit(false);
      setFormData({
        name: p.name,
        category: p.category,
        price: p.price,
        unit: p.unit,
        customUnit: '',
        stock: p.stock,
        description: p.description || '',
        image: p.image || '',
        badge: p.badge || '',
        organic: Boolean(p.organic),
        available: p.available !== false
      });
    } else {
      setIsCustomUnit(true);
      setFormData({
        name: p.name,
        category: p.category,
        price: p.price,
        unit: 'custom',
        customUnit: p.unit,
        stock: p.stock,
        description: p.description || '',
        image: p.image || '',
        badge: p.badge || '',
        organic: Boolean(p.organic),
        available: p.available !== false
      });
    }

    setModalOpen(true);
  };

  // Handle File Upload from device
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Batas harus sama dengan batas validasi server.
    if (file.size > 5 * 1024 * 1024) {
      alert('Ukuran file maksimal 5MB');
      e.target.value = '';
      return;
    }

    try {
      setUploadingImage(true);
      setUploadSuccess(false);
      const res = await api.uploadImage(file);
      setFormData(prev => ({ ...prev, image: res.url }));
      setUploadSuccess(true);
    } catch (err) {
      alert('Gagal mengunggah foto: ' + err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  // Quick Table Row Image Change
  const handleQuickImageClick = (product) => {
    setQuickUploadProductId(product.id);
    if (quickFileInputRef.current) {
      quickFileInputRef.current.value = '';
      quickFileInputRef.current.click();
    }
  };

  const handleQuickFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !quickUploadProductId) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Ukuran file maksimal 5MB');
      e.target.value = '';
      setQuickUploadProductId(null);
      return;
    }

    try {
      const res = await api.uploadImage(file);
      await api.updateProduct(quickUploadProductId, { image: res.url });
      setProducts(prev => prev.map(p => p.id === quickUploadProductId ? { ...p, image: res.url } : p));
      setQuickUploadProductId(null);
    } catch (err) {
      alert('Gagal mengganti foto produk: ' + err.message);
    }
  };

  const handleUnitSelectChange = (e) => {
    const val = e.target.value;
    if (val === 'custom') {
      setIsCustomUnit(true);
      setFormData(prev => ({ ...prev, unit: 'custom' }));
    } else {
      setIsCustomUnit(false);
      setFormData(prev => ({ ...prev, unit: val }));
    }
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.price) {
      alert('Nama produk dan harga wajib diisi');
      return;
    }

    const finalUnit = isCustomUnit 
      ? (formData.customUnit.trim() || 'ikat') 
      : formData.unit;

    const payload = {
      ...formData,
      unit: finalUnit
    };

    try {
      if (editingProduct) {
        await api.updateProduct(editingProduct.id, payload);
      } else {
        await api.createProduct(payload);
      }
      setModalOpen(false);
      fetchProducts();
    } catch (err) {
      alert('Gagal menyimpan: ' + err.message);
    }
  };

  const handleDelete = async (p) => {
    if (!confirm(`Yakin ingin menghapus produk "${p.name}"?`)) return;
    try {
      await api.deleteProduct(p.id);
      fetchProducts();
    } catch (err) {
      alert('Gagal menghapus: ' + err.message);
    }
  };

  const handleQuickStockUpdate = async (product, newStock) => {
    const stockVal = Math.max(0, parseInt(newStock) || 0);
    try {
      await api.updateProduct(product.id, {
        stock: stockVal,
        available: stockVal > 0
      });
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, stock: stockVal, available: stockVal > 0 } : p));
    } catch (err) {
      console.error(err);
    }
  };

  const handleQuickPriceUpdate = async (product, newPrice) => {
    const priceVal = Math.max(0, parseInt(newPrice) || 0);
    try {
      await api.updateProduct(product.id, { price: priceVal });
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, price: priceVal } : p));
    } catch (err) {
      console.error(err);
    }
  };

  const handleQuickUnitChange = async (product, newUnit) => {
    try {
      await api.updateProduct(product.id, { unit: newUnit });
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, unit: newUnit } : p));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hidden file input for table quick photo change */}
      <input
        type="file"
        ref={quickFileInputRef}
        onChange={handleQuickFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* Top Header & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCat(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCat === cat.id
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              placeholder="Cari nama sayur..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-xs bg-slate-50 pl-8 pr-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none w-44 sm:w-56"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          </form>

          <button
            onClick={handleOpenAdd}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-xs flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>+ Tambah Sayur</span>
          </button>
        </div>
      </div>

      {/* Helper Tip for Quick Subuh Stock Updates & Photo Upload */}
      <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-emerald-900">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            <b>Fitur Cepat:</b> Klik <b>Foto Kamera</b> di tabel untuk langsung ganti foto dari HP/PC, dan edit <b>Harga, Satuan, Stok</b> langsung di baris tabel!
          </span>
        </div>
      </div>

      {/* Table of Products */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3">Foto & Nama Produk</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3">Satuan Timbangan</th>
                <th className="px-4 py-3">Harga (Rp)</th>
                <th className="px-4 py-3">Stok Harian</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-slate-400">
                    Memuat daftar produk...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-slate-400">
                    Belum ada produk yang cocok.
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {/* Thumbnail with quick camera upload overlay */}
                        <div 
                          onClick={() => handleQuickImageClick(p)}
                          className="relative group/thumb cursor-pointer shrink-0"
                          title="Klik untuk ganti foto dari HP/Komputer"
                        >
                          <img
                            src={p.image}
                            alt={p.name}
                            className="w-12 h-12 rounded-xl object-cover bg-slate-100 border border-slate-200 group-hover/thumb:opacity-75 transition-opacity"
                          />
                          <div className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center text-white">
                            <Camera className="w-4 h-4" />
                          </div>
                        </div>

                        <div>
                          <div className="font-bold text-slate-900 text-xs sm:text-sm">{p.name}</div>
                          <div className="flex flex-wrap items-center gap-1 mt-0.5">
                            {p.badge && (
                              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                {p.badge}
                              </span>
                            )}
                            {p.organic && (
                              <span className="text-[10px] text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200">
                                🌱 Organik
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 capitalize">
                      {p.category?.replace('-', ' ') || 'Tanpa kategori'}
                    </td>

                    {/* Quick Unit Selector */}
                    <td className="px-4 py-3">
                      <select
                        value={p.unit}
                        onChange={(e) => handleQuickUnitChange(p, e.target.value)}
                        className="text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg px-2 py-1 outline-none text-slate-700 font-medium max-w-[160px] truncate"
                        title="Ubah satuan langsung"
                      >
                        {COMMON_UNITS.filter(u => u.value !== 'custom').map((unit) => (
                          <option key={unit.value} value={unit.value}>
                            {unit.value}
                          </option>
                        ))}
                        {!COMMON_UNITS.some(u => u.value === p.unit) && (
                          <option value={p.unit}>{p.unit}</option>
                        )}
                      </select>
                    </td>

                    <td className="px-4 py-3">
                      <input
                        type="number"
                        defaultValue={p.price}
                        onBlur={(e) => handleQuickPriceUpdate(p, e.target.value)}
                        className="w-24 text-xs font-bold text-emerald-800 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-lg px-2 py-1 outline-none transition-all"
                        title="Klik lalu ketik untuk ubah harga instan"
                      />
                    </td>

                    <td className="px-4 py-3">
                      <input
                        type="number"
                        defaultValue={p.stock}
                        onBlur={(e) => handleQuickStockUpdate(p, e.target.value)}
                        className={`w-20 text-xs font-bold bg-slate-50 hover:bg-white focus:bg-white border rounded-lg px-2 py-1 outline-none transition-all ${
                          p.stock <= 5 
                            ? 'border-amber-300 text-amber-700 bg-amber-50/50' 
                            : 'border-slate-200 text-slate-800'
                        }`}
                        title="Klik lalu ketik untuk update stok harian"
                      />
                    </td>

                    <td className="px-4 py-3">
                      {p.stock > 0 && p.available ? (
                        <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full text-[10px]">
                          Tersedia
                        </span>
                      ) : (
                        <span className="bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-full text-[10px]">
                          Habis
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-right space-x-1">
                      <button
                        onClick={() => handleOpenEdit(p)}
                        className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Edit Lengkap & Ganti Foto"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(p)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Hapus"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] overflow-y-auto p-6 shadow-2xl border border-slate-100 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">
                {editingProduct ? 'Edit Produk Sayur' : 'Tambah Produk Sayur Baru'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4 mt-4 text-xs">
              {/* Product Photo Upload / Change Section */}
              <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-emerald-700" /> Foto Produk
                  </label>
                  <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setImageInputMode('file')}
                      className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                        imageInputMode === 'file' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Unggah File
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageInputMode('url')}
                      className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                        imageInputMode === 'url' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Link URL
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  {/* Image Preview */}
                  <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-slate-200 border border-slate-300 shrink-0">
                    {formData.image ? (
                      <img
                        src={formData.image}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                    )}
                    {uploadingImage && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white">
                        <Loader2 className="w-5 h-5 animate-spin" />
                      </div>
                    )}
                  </div>

                  {/* Input Controls */}
                  <div className="flex-1 min-w-0 space-y-2">
                    {imageInputMode === 'file' ? (
                      <div>
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          accept="image/*"
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingImage}
                          className="w-full bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-semibold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                        >
                          <Upload className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{formData.image ? 'Ganti Foto dari Perangkat' : 'Pilih Foto dari Galeri / Kamera'}</span>
                        </button>
                        <span className="text-[10px] text-slate-500 mt-1 block">
                          Format: JPG, PNG, WebP (Maksimal 5 MB)
                        </span>
                      </div>
                    ) : (
                      <div>
                        <input
                          type="url"
                          placeholder="https://images.unsplash.com/..."
                          value={formData.image}
                          onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                          className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none bg-white"
                        />
                        <span className="text-[10px] text-slate-500 mt-1 block">
                          Tempelkan tautan gambar web langsung
                        </span>
                      </div>
                    )}

                    {uploadSuccess && (
                      <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Foto berhasil diunggah & tersimpan
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Produk / Sayur</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Kangkung Segar Panen Subuh"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kategori</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none bg-white font-medium"
                  >
                    {categories.filter(c => c.id !== 'semua').map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Comprehensive Units Selector */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Satuan Timbangan Sayur
                  </label>
                  <select
                    value={isCustomUnit ? 'custom' : formData.unit}
                    onChange={handleUnitSelectChange}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none bg-white font-medium"
                  >
                    {COMMON_UNITS.map((unit) => (
                      <option key={unit.value} value={unit.value}>
                        {unit.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Custom Unit Input if selected */}
              {isCustomUnit && (
                <div className="bg-amber-50 p-3 rounded-xl border border-amber-200">
                  <label className="block font-bold text-amber-900 mb-1">
                    Tulis Satuan Manual:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Misal: ikat jumbo 400g, besek mini, pack 3 ikat"
                    value={formData.customUnit}
                    onChange={(e) => setFormData({ ...formData, customUnit: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-amber-300 focus:border-amber-500 outline-none bg-white font-medium"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Harga Jual (Rp)</label>
                  <input
                    type="number"
                    required
                    placeholder="3500"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none font-bold text-emerald-800"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Stok Harian</label>
                  <input
                    type="number"
                    required
                    placeholder="30"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Badge (Label Promosi)</label>
                  <input
                    type="text"
                    placeholder="Panen Subuh / Best Seller"
                    value={formData.badge}
                    onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none"
                  />
                </div>

                <div className="flex items-center gap-4 pt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.organic}
                      onChange={(e) => setFormData({ ...formData, organic: e.target.checked })}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="font-semibold text-slate-700">🌱 Organik</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.available}
                      onChange={(e) => setFormData({ ...formData, available: e.target.checked })}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="font-semibold text-slate-700">Tersedia</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Deskripsi Sayur</label>
                <textarea
                  rows="2"
                  placeholder="Deskripsi kesegaran atau tips olahan sayur..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none"
                />
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
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingProduct ? 'Simpan Perubahan' : 'Tambah Sayur'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
