import { useState, useEffect } from 'react';
import { X, ImagePlus, Loader2, Plus, Trash2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { uploadImageToImgBB } from '../utils/imgbb';
import { translations } from '../translations';

const DEFAULT_PRESETS = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', 'Oversize', 'Free Size'];

export default function AddProductModal({ isOpen, onClose, editProduct }) {
  const { addProduct, updateProduct, language } = useStore();
  const t = translations[language];
  const isEditing = !!editProduct;
  const [isUploading, setIsUploading] = useState(false);

  const [form, setForm] = useState({
    name: '',
    sku: '',
    imageUrl: '',
    costPrice: '',
    sellingPrice: ''
  });

  const [sizes, setSizes] = useState({ M: 0, L: 0, XL: 0, XXL: 0 });
  const [customSizeInput, setCustomSizeInput] = useState('');

  useEffect(() => {
    if (editProduct) {
      setForm({
        name: editProduct.name || '',
        sku: editProduct.sku || '',
        imageUrl: editProduct.imageUrl || '',
        costPrice: String(editProduct.costPrice || ''),
        sellingPrice: String(editProduct.sellingPrice || '')
      });
      const loadedSizes = editProduct.initialStock || {};
      if (Object.keys(loadedSizes).length > 0) {
        setSizes({ ...loadedSizes });
      } else {
        setSizes({ M: 0, L: 0, XL: 0, XXL: 0 });
      }
    } else {
      setForm({ name: '', sku: '', imageUrl: '', costPrice: '', sellingPrice: '' });
      setSizes({ M: 0, L: 0, XL: 0, XXL: 0 });
    }
  }, [editProduct, isOpen]);

  if (!isOpen) return null;

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleStockChange = (size, val) => {
    const num = Math.max(0, parseInt(val) || 0);
    setSizes(prev => ({ ...prev, [size]: num }));
  };

  const addSize = (sizeName) => {
    const clean = sizeName.trim().toUpperCase();
    if (!clean) return;
    setSizes(prev => ({ ...prev, [clean]: prev[clean] !== undefined ? prev[clean] : 0 }));
    setCustomSizeInput('');
  };

  const removeSize = (sizeName) => {
    setSizes(prev => {
      const copy = { ...prev };
      delete copy[sizeName];
      return copy;
    });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const url = await uploadImageToImgBB(file);
      setForm((prev) => ({ ...prev, imageUrl: url }));
    } catch (err) {
      alert("Failed to upload image.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.sku.trim()) return;

    const initialStock = {};
    Object.entries(sizes).forEach(([sz, qty]) => {
      initialStock[sz] = parseInt(qty, 10) || 0;
    });

    const data = {
      name: form.name.trim(),
      sku: form.sku.trim(),
      imageUrl: form.imageUrl,
      initialStock,
      costPrice: parseFloat(form.costPrice) || 0,
      sellingPrice: parseFloat(form.sellingPrice) || 0
    };
    
    if (isEditing) {
      updateProduct(editProduct.id, data);
    } else {
      addProduct(data);
    }
    onClose();
  };

  const currentSizeKeys = Object.keys(sizes);

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-100 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
          <h2 className="text-xl font-bold text-[#181E1C]">
            {isEditing ? 'Edit Product' : 'Add New Product'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body (Form Layout) */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 grid grid-cols-2 gap-5 overflow-y-auto">
            <div className="col-span-2 flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">Product Name</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={handleChange('name')}
                placeholder="e.g. TOJA Slim Fit Polo"
                className="h-11 px-4 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:ring-2 focus:ring-[#597867]/20 focus:border-[#597867] transition-all outline-none"
              />
            </div>
            
            <div className="col-span-2 flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">SKU Code</label>
              <input
                type="text"
                required
                value={form.sku}
                onChange={handleChange('sku')}
                placeholder="e.g. TOJ-POL-001"
                className="h-11 px-4 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:ring-2 focus:ring-[#597867]/20 focus:border-[#597867] transition-all outline-none"
              />
            </div>

            <div className="col-span-2 flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">{t.productImage}</label>
              <div className="flex items-center gap-4">
                {form.imageUrl && (
                  <img src={form.imageUrl} alt="Preview" className="w-16 h-16 object-cover rounded-xl border border-slate-200 shadow-sm" />
                )}
                <div className="flex-1 relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={isUploading}
                    className="hidden"
                    id="product-image-upload"
                  />
                  <label
                    htmlFor="product-image-upload"
                    className="flex items-center justify-center gap-2 h-11 px-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 text-sm font-semibold text-slate-600 cursor-pointer transition-colors"
                  >
                    {isUploading ? (
                      <><Loader2 size={18} className="animate-spin text-[#597867]" /> {t.uploading}</>
                    ) : (
                      <><ImagePlus size={18} className="text-slate-400" /> {form.imageUrl ? t.changeImage : t.uploadImage}</>
                    )}
                  </label>
                </div>
              </div>
            </div>

            {/* Dynamic Sizes Management Section */}
            <div className="col-span-2 bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  {t.dynamicSizes} ({currentSizeKeys.length})
                </label>
                <span className="text-[10px] text-slate-500 font-semibold">{t.sizePresets}</span>
              </div>

              {/* Quick Presets Pills */}
              <div className="flex flex-wrap gap-1.5">
                {DEFAULT_PRESETS.map((preset) => {
                  const isAdded = sizes[preset] !== undefined;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => addSize(preset)}
                      className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${
                        isAdded
                          ? 'bg-[#181E1C] text-white shadow-sm'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {isAdded ? `✓ ${preset}` : `+ ${preset}`}
                    </button>
                  );
                })}
              </div>

              {/* Custom Size Adder */}
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  placeholder={t.enterSizeName}
                  value={customSizeInput}
                  onChange={(e) => setCustomSizeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addSize(customSizeInput);
                    }
                  }}
                  className="flex-1 h-9 px-3 text-xs rounded-lg border border-slate-200 bg-white outline-none focus:border-[#597867]"
                />
                <button
                  type="button"
                  onClick={() => addSize(customSizeInput)}
                  className="px-3 h-9 bg-[#597867] hover:bg-[#465f52] text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                >
                  <Plus size={14} />
                  <span>{t.addCustomSize}</span>
                </button>
              </div>

              {/* Active Sizes Stock Inputs Grid */}
              <div className="pt-2">
                {currentSizeKeys.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3 text-center">No sizes configured. Click presets above to add sizes.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {currentSizeKeys.map((size) => (
                      <div key={size} className="bg-white p-2.5 rounded-xl border border-slate-200 flex flex-col gap-1 relative group">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-[#181E1C]">{size}</span>
                          <button
                            type="button"
                            onClick={() => removeSize(size)}
                            className="text-slate-400 hover:text-red-500 transition-colors p-0.5"
                            title={t.removeSize}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                        <input
                          type="number"
                          min="0"
                          value={sizes[size]}
                          onChange={(e) => handleStockChange(size, e.target.value)}
                          placeholder="0"
                          className="h-8 px-2 text-center rounded border border-slate-200 bg-slate-50 text-xs font-bold focus:bg-white focus:border-[#597867] outline-none"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">Cost Price (EGP)</label>
              <input
                type="number"
                step="any"
                min="0"
                required
                value={form.costPrice}
                onChange={handleChange('costPrice')}
                placeholder="0.00"
                className="h-11 px-4 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:ring-2 focus:ring-[#597867]/20 focus:border-[#597867] transition-all outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">Selling Price (EGP)</label>
              <input
                type="number"
                step="any"
                min="0"
                required
                value={form.sellingPrice}
                onChange={handleChange('sellingPrice')}
                placeholder="0.00"
                className="h-11 px-4 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:ring-2 focus:ring-[#597867]/20 focus:border-[#597867] transition-all outline-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-[#F8FAFC] shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#597867] hover:bg-[#465f52] shadow-md transition-all"
            >
              {isEditing ? 'Save Changes' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
