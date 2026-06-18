import { useState, useEffect } from 'react'
import { X, ImagePlus, Loader2 } from 'lucide-react'
import { useStore } from '../store/useStore'
import { uploadImageToImgBB } from '../utils/imgbb'
import { translations } from '../translations'

export default function AddProductModal({ isOpen, onClose, editProduct }) {
  const { addProduct, updateProduct, language } = useStore()
  const t = translations[language]
  const isEditing = !!editProduct
  const [isUploading, setIsUploading] = useState(false)

  const [form, setForm] = useState({
    name: '',
    sku: '',
    imageUrl: '',
    initialStockM: '',
    initialStockL: '',
    initialStockXL: '',
    initialStockXXL: '',
    costPrice: '',
    sellingPrice: '',
  })

  useEffect(() => {
    if (editProduct) {
      setForm({
        name: editProduct.name,
        sku: editProduct.sku,
        imageUrl: editProduct.imageUrl || '',
        initialStockM: String(editProduct.initialStock?.M || 0),
        initialStockL: String(editProduct.initialStock?.L || 0),
        initialStockXL: String(editProduct.initialStock?.XL || 0),
        initialStockXXL: String(editProduct.initialStock?.XXL || 0),
        costPrice: String(editProduct.costPrice),
        sellingPrice: String(editProduct.sellingPrice),
      })
    } else {
      setForm({ name: '', sku: '', imageUrl: '', initialStockM: '', initialStockL: '', initialStockXL: '', initialStockXXL: '', costPrice: '', sellingPrice: '' })
    }
  }, [editProduct, isOpen])

  if (!isOpen) return null

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setIsUploading(true)
    try {
      const url = await uploadImageToImgBB(file)
      setForm((prev) => ({ ...prev, imageUrl: url }))
    } catch (err) {
      alert("Failed to upload image.")
    } finally {
      setIsUploading(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.sku.trim()) return

    const data = {
      name: form.name.trim(),
      sku: form.sku.trim(),
      imageUrl: form.imageUrl,
      initialStock: {
        M: parseInt(form.initialStockM, 10) || 0,
        L: parseInt(form.initialStockL, 10) || 0,
        XL: parseInt(form.initialStockXL, 10) || 0,
        XXL: parseInt(form.initialStockXXL, 10) || 0,
      },
      costPrice: parseFloat(form.costPrice) || 0,
      sellingPrice: parseFloat(form.sellingPrice) || 0,
    }
    
    if (isEditing) {
      updateProduct(editProduct.id, data)
    } else {
      addProduct(data)
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
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

            <div className="col-span-2">
              <label className="text-sm font-semibold text-slate-700 mb-2 block">Initial Stock by Size</label>
              <div className="grid grid-cols-4 gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-slate-400 text-center">M</span>
                  <input
                    type="number"
                    min="0"
                    value={form.initialStockM}
                    onChange={handleChange('initialStockM')}
                    placeholder="0"
                    className="h-10 px-2 text-center rounded-lg border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:ring-2 focus:ring-[#597867]/20 focus:border-[#597867] transition-all outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-slate-400 text-center">L</span>
                  <input
                    type="number"
                    min="0"
                    value={form.initialStockL}
                    onChange={handleChange('initialStockL')}
                    placeholder="0"
                    className="h-10 px-2 text-center rounded-lg border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:ring-2 focus:ring-[#597867]/20 focus:border-[#597867] transition-all outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-slate-400 text-center">XL</span>
                  <input
                    type="number"
                    min="0"
                    value={form.initialStockXL}
                    onChange={handleChange('initialStockXL')}
                    placeholder="0"
                    className="h-10 px-2 text-center rounded-lg border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:ring-2 focus:ring-[#597867]/20 focus:border-[#597867] transition-all outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-slate-400 text-center">XXL</span>
                  <input
                    type="number"
                    min="0"
                    value={form.initialStockXXL}
                    onChange={handleChange('initialStockXXL')}
                    placeholder="0"
                    className="h-10 px-2 text-center rounded-lg border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:ring-2 focus:ring-[#597867]/20 focus:border-[#597867] transition-all outline-none"
                  />
                </div>
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
  )
}
