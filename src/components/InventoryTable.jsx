import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Minus, Search, PackageX, Trash2, Pencil, AlertTriangle, History, SlidersHorizontal, X, Check } from 'lucide-react';
import { useStore, getAvailableStock, getProductSizes } from '../store/useStore';
import { translations } from '../translations';
import ImageLightbox from './ImageLightbox';

function formatEGP(amount) {
  return (amount || 0).toLocaleString('en-EG') + ' EGP';
}

const getSum = (obj) => Object.values(obj || {}).reduce((a, b) => a + b, 0);

// --- Stock Movements History Modal ---
function StockMovementsModal({ isOpen, onClose, movements, language, userRole }) {
  const t = translations[language];
  const [filterType, setFilterType] = useState('ALL');
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const filtered = (movements || []).filter(m => {
    const matchesSearch = !search || 
      (m.productName && m.productName.toLowerCase().includes(search.toLowerCase())) ||
      (m.sku && m.sku.toLowerCase().includes(search.toLowerCase())) ||
      (m.reason && m.reason.toLowerCase().includes(search.toLowerCase()));
    
    const matchesType = filterType === 'ALL' || m.changeType === filterType;
    return matchesSearch && matchesType;
  });

  const getTypeBadge = (type) => {
    switch (type) {
      case 'DEFECT_WRITEOFF':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-700 border border-red-200">{t.defectWriteOff}</span>;
      case 'MANUAL_RESTOCK':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">{t.manualRestock}</span>;
      case 'AUDIT_CORRECTION':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-700 border border-blue-200">{t.auditCorrection}</span>;
      case 'SAMPLE_GIFT':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-700 border border-purple-200">{t.sampleGift}</span>;
      case 'EXCHANGE_IN':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-teal-100 text-teal-700 border border-teal-200">{t.exchangeIn}</span>;
      case 'EXCHANGE_OUT':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-700 border border-amber-200">{t.exchangeOut}</span>;
      case 'ORDER_RETURN':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-cyan-100 text-cyan-700 border border-cyan-200">{t.itemReturned}</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">{type}</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-100"
      >
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#597867]/10 flex items-center justify-center text-[#597867]">
              <History size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-[#181E1C] text-base">{t.stockMovements}</h3>
              <p className="text-xs text-slate-500">{movements.length} {t.allMovements || 'total movements'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200/60 rounded-xl text-slate-400 hover:text-slate-700 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-white">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 outline-none focus:border-[#597867] focus:bg-white"
            />
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {['ALL', 'DEFECT_WRITEOFF', 'MANUAL_RESTOCK', 'AUDIT_CORRECTION', 'EXCHANGE_IN', 'EXCHANGE_OUT'].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap ${
                  filterType === type 
                    ? 'bg-[#181E1C] text-white shadow-sm' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {type === 'ALL' ? (t.all || 'All') : type === 'DEFECT_WRITEOFF' ? t.defectWriteOff : type === 'MANUAL_RESTOCK' ? t.manualRestock : type === 'AUDIT_CORRECTION' ? t.auditCorrection : type}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <History size={40} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm font-semibold">{t.noData || 'No stock movements logged yet'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-start border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="p-3 text-start">{t.date || 'Date & Time'}</th>
                    <th className="p-3 text-start">{t.productSku}</th>
                    <th className="p-3 text-center">{t.size || 'Size'}</th>
                    <th className="p-3 text-start">{t.changeType}</th>
                    <th className="p-3 text-center">{t.quantityDelta}</th>
                    <th className="p-3 text-start">{t.reason || 'Reason / Notes'}</th>
                    {userRole !== 'operations' && <th className="p-3 text-end">{t.costImpact}</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((m) => {
                    const delta = Number(m.quantityDelta) || 0;
                    const isPositive = delta > 0;
                    return (
                      <tr key={m.id || Math.random()} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-3 whitespace-nowrap text-slate-500 font-medium">
                          {m.timestamp ? new Date(m.timestamp).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <p className="font-bold text-[#181E1C]">{m.productName || 'Product'}</p>
                          <p className="text-[10px] text-slate-400 uppercase">{m.sku}</p>
                        </td>
                        <td className="p-3 text-center font-extrabold text-slate-700">{m.size}</td>
                        <td className="p-3 whitespace-nowrap">{getTypeBadge(m.changeType)}</td>
                        <td className="p-3 text-center whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-black ${
                            isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                          }`}>
                            {isPositive ? `+${delta}` : delta}
                          </span>
                        </td>
                        <td className="p-3 max-w-[250px] truncate text-slate-600" title={m.reason}>
                          {m.reason || '—'}
                        </td>
                        {userRole !== 'operations' && (
                          <td className="p-3 text-end font-bold text-slate-700 whitespace-nowrap">
                            {m.costImpactEGP ? `${m.costImpactEGP.toLocaleString()} EGP` : '—'}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-colors"
          >
            {t.close || 'Close'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// --- Adjust Stock Modal ---
function AdjustStockModal({ isOpen, onClose, products, preselectedProduct, preselectedSize, preselectedType, onAdjust, language, userRole }) {
  const t = translations[language];
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedSize, setSelectedSize] = useState('M');
  const [changeType, setChangeType] = useState('MANUAL_RESTOCK');
  const [direction, setDirection] = useState('add');
  const [qty, setQty] = useState(1);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => {
    if (preselectedProduct) {
      setSelectedProductId(preselectedProduct.id);
    } else if (products && products.length > 0 && !selectedProductId) {
      setSelectedProductId(products[0].id);
    }
    if (preselectedSize) setSelectedSize(preselectedSize);
    if (preselectedType) {
      setChangeType(preselectedType);
      if (preselectedType === 'DEFECT_WRITEOFF') setDirection('deduct');
    }
  }, [preselectedProduct, preselectedSize, preselectedType, isOpen, products]);

  if (!isOpen) return null;

  const product = products.find(p => p.id === selectedProductId);
  const currentAvailable = getAvailableStock(product, selectedSize);

  const costPrice = Number(product?.costPrice) || 0;
  const calculatedDelta = direction === 'deduct' ? -Math.abs(Number(qty) || 1) : Math.abs(Number(qty) || 1);
  const costImpact = changeType === 'DEFECT_WRITEOFF' ? costPrice * Math.abs(calculatedDelta) : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!product || !selectedSize || !qty) return;
    setSubmitting(true);
    await onAdjust({
      productId: product.id,
      size: selectedSize,
      delta: calculatedDelta,
      changeType,
      reason: reason || (changeType === 'DEFECT_WRITEOFF' ? 'Defective garment write-off' : 'Manual stock adjustment')
    });
    setSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-100"
      >
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#597867]/10 flex items-center justify-center text-[#597867]">
              <SlidersHorizontal size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-[#181E1C] text-base">{t.adjustStock}</h3>
              <p className="text-xs text-slate-500">{t.changeType}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200/60 rounded-xl text-slate-400 hover:text-slate-700 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">{t.productSku}</label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-[#597867] focus:bg-white"
            >
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{t.size || 'Size'}</label>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {getProductSizes(product).map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSelectedSize(s)}
                    className={`px-3 py-1.5 text-xs font-black rounded-lg border transition-all ${
                      selectedSize === s
                        ? 'bg-[#181E1C] text-white border-[#181E1C]'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-400 mt-1 font-bold">
                {t.totalInStock}: <span className="text-[#181E1C] font-extrabold">{currentAvailable}</span>
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{t.changeType}</label>
              <select
                value={changeType}
                onChange={(e) => {
                  const val = e.target.value;
                  setChangeType(val);
                  if (val === 'DEFECT_WRITEOFF') setDirection('deduct');
                  else if (val === 'MANUAL_RESTOCK') setDirection('add');
                }}
                className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-[#597867] focus:bg-white"
              >
                <option value="MANUAL_RESTOCK">{t.manualRestock}</option>
                <option value="AUDIT_CORRECTION">{t.auditCorrection}</option>
                <option value="DEFECT_WRITEOFF">{t.defectWriteOff}</option>
                <option value="SAMPLE_GIFT">{t.sampleGift}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">{t.quantityDelta}</label>
            <div className="flex gap-2">
              <div className="flex rounded-xl overflow-hidden border border-slate-200 shrink-0">
                <button
                  type="button"
                  onClick={() => setDirection('add')}
                  disabled={changeType === 'DEFECT_WRITEOFF'}
                  className={`px-3 py-2 text-xs font-extrabold transition-colors ${
                    direction === 'add' ? 'bg-emerald-600 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  + Add
                </button>
                <button
                  type="button"
                  onClick={() => setDirection('deduct')}
                  className={`px-3 py-2 text-xs font-extrabold transition-colors ${
                    direction === 'deduct' ? 'bg-red-600 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  - Deduct
                </button>
              </div>
              <input
                type="number"
                min="1"
                max={direction === 'deduct' ? currentAvailable : 9999}
                value={qty}
                onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-[#597867] focus:bg-white"
              />
            </div>
            <p className="text-[11px] font-bold text-slate-500 mt-1">
              {direction === 'add' ? 'New Stock:' : 'Remaining Stock:'}{' '}
              <span className="font-extrabold text-[#181E1C]">{currentAvailable + calculatedDelta}</span>
            </p>
          </div>

          {changeType === 'DEFECT_WRITEOFF' && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200">
              <p className="text-xs font-bold text-red-800 flex items-center gap-1.5">
                <AlertTriangle size={14} /> {t.defectExpenseLogged}
              </p>
              {userRole !== 'operations' && (
                <p className="text-xs font-black text-red-700 mt-1">
                  {t.costImpact}: {costImpact.toLocaleString()} EGP ({qty} × {costPrice} EGP)
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">{t.reason || 'Reason / Note'}</label>
            <input
              type="text"
              placeholder={changeType === 'DEFECT_WRITEOFF' ? 'e.g. Broken zipper, torn fabric...' : 'e.g. Warehouse physical recount...'}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-xl p-2.5 bg-slate-50 outline-none focus:border-[#597867] focus:bg-white"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
            >
              {t.cancel || 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-[#597867] hover:bg-[#465f52] text-white rounded-xl text-xs font-bold shadow-md transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <Check size={14} /> {t.applyAdjustment}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// --- Main InventoryTable Component ---
export default function InventoryTable({ onEdit }) {
  const { products, deleteProduct, adjustStock, inventoryMovements, userRole, language } = useStore();
  const t = translations[language];
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [lightboxImg, setLightboxImg] = useState(null);

  // Modals state
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [adjustModalState, setAdjustModalState] = useState({
    isOpen: false,
    product: null,
    size: 'M',
    type: 'MANUAL_RESTOCK'
  });

  const filtered = products.filter((p) => {
    const q = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
  });

  const lowStockCount = products.filter(p => {
    const pSizes = getProductSizes(p);
    return pSizes.some(size => {
      const init = Number(
        p.initialStock?.[size] ?? p.initialStock?.[size.toUpperCase()] ?? p.initial?.[size] ?? p[`initialStock${size}`] ?? p[`stock${size}`] ?? 0
      );
      const avail = getAvailableStock(p, size);
      return init > 0 && avail <= 2;
    });
  }).length;

  const handleDelete = (id) => {
    if (deleteConfirmId === id) {
      deleteProduct(id);
      setDeleteConfirmId(null);
    } else {
      setDeleteConfirmId(id);
      setTimeout(() => setDeleteConfirmId(null), 3000);
    }
  };

  const openAdjustModal = (product = null, size = 'M', type = 'MANUAL_RESTOCK') => {
    setAdjustModalState({
      isOpen: true,
      product,
      size,
      type
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-slate-100 overflow-hidden mt-8">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 border-b border-slate-100 px-4 sm:px-7 py-4 sm:py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#181E1C]">
              {t.productInventory}
            </h2>
            {lowStockCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                <AlertTriangle size={11} /> {lowStockCount} {t.stockAlert}
              </span>
            )}
          </div>
          <p className="mt-1 text-[12px] font-medium text-slate-400">
            {products.length} products · {filtered.length} shown
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Action Buttons: Movements Ledger & Adjust Stock */}
          <button
            onClick={() => setIsMovementModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-bold shadow-sm transition-all"
            title={t.movementHistory}
          >
            <History size={15} className="text-[#597867]" />
            <span>{t.movementHistory}</span>
            {inventoryMovements && inventoryMovements.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-[10px] text-slate-600">
                {inventoryMovements.length}
              </span>
            )}
          </button>

          <button
            onClick={() => openAdjustModal(null, 'M', 'MANUAL_RESTOCK')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#181E1C] hover:bg-black text-white text-xs font-bold shadow-sm transition-all"
            title={t.adjustStock}
          >
            <SlidersHorizontal size={14} />
            <span>{t.adjustStock}</span>
          </button>

          {/* Search Input */}
          <div className="relative w-full sm:w-56">
            <Search size={15} strokeWidth={2} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-[12px] font-medium text-[#181E1C] placeholder:text-slate-400 outline-none transition-all focus:border-[#597867] focus:bg-white focus:ring-2 focus:ring-[#597867]/10"
            />
          </div>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block w-full overflow-x-auto">
        <table className="w-full text-start border-collapse whitespace-nowrap">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-bold">
              <th className="p-4 px-6 font-semibold whitespace-nowrap text-start">{t.productSku}</th>
              <th className="p-4 font-semibold whitespace-nowrap text-start">{t.sizesInStock}</th>
              <th className="p-4 font-semibold text-center whitespace-nowrap">{t.sold}</th>
              <th className="p-4 font-semibold text-center whitespace-nowrap">{t.totalInStock}</th>
              {userRole !== 'operations' && <th className="p-4 font-semibold whitespace-nowrap text-start">{t.cost}</th>}
              <th className="p-4 font-semibold whitespace-nowrap text-start">{t.price}</th>
              {userRole !== 'operations' && <th className="p-4 font-semibold whitespace-nowrap text-start">{t.totalProfit}</th>}
              <th className="p-4 font-semibold whitespace-nowrap text-end px-6">{t.actions}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={userRole === 'operations' ? 6 : 8} className="p-8 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                      <PackageX size={24} className="text-slate-400" />
                    </div>
                    <p className="text-[13px] font-semibold text-slate-500">{t.noProducts}</p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((product, index) => {
                const sizes = getProductSizes(product);
                const currentStock = sizes.reduce((sum, sz) => sum + getAvailableStock(product, sz), 0);
                const totalSold = sizes.reduce((sum, sz) => {
                  const s = product.sold?.[sz] ?? product.sold?.[sz.toUpperCase()] ?? product[`sold${sz}`] ?? 0;
                  return sum + Math.max(0, Number(s) || 0);
                }, 0);
                const profitPerItem = (product.sellingPrice || 0) - (product.costPrice || 0);
                const totalProfit = totalSold * profitPerItem;

                return (
                  <motion.tr
                    key={product.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group"
                  >
                    <td className="p-4 px-6 align-middle text-start">
                      <div className="flex items-center gap-3">
                        {product.imageUrl ? (
                          <img 
                            src={product.imageUrl} 
                            alt={product.name} 
                            className="w-12 h-12 object-cover rounded-lg border border-slate-200 shrink-0 cursor-pointer hover:opacity-80 transition-opacity" 
                            onClick={() => setLightboxImg(product.imageUrl)}
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                            <PackageX size={20} className="text-slate-400" />
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-[#181E1C] truncate max-w-[150px] lg:max-w-[250px]" title={product.name}>{product.name}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wide truncate max-w-[150px]" title={product.sku}>{product.sku}</p>
                        </div>
                      </div>
                    </td>
                    
                    <td className="p-4 align-middle text-start">
                      <div className="flex flex-wrap gap-1.5 max-w-[170px]">
                        {sizes.map((size) => {
                          const sizeInitial = Number(
                            product.initialStock?.[size] ?? product.initialStock?.[size.toUpperCase()] ?? product.initial?.[size] ?? product[`initialStock${size}`] ?? product[`stock${size}`] ?? 0
                          );
                          const sizeStock = getAvailableStock(product, size);
                          if (sizeInitial === 0 && sizeStock === 0) return null;

                          let badgeClass = "bg-[#F8FAFC] text-slate-600 border-slate-200";
                          let labelExtra = "";
                          if (sizeStock <= 0) {
                            badgeClass = "bg-red-50 text-red-700 border-red-200 font-black";
                            labelExtra = " 🚫";
                          } else if (sizeStock <= 2) {
                            badgeClass = "bg-amber-50 text-amber-800 border-amber-200 font-black";
                            labelExtra = " ⚠️";
                          }

                          return (
                            <span
                              key={size}
                              className={`group/size relative text-[10px] font-bold px-2 py-1 rounded border flex items-center gap-1.5 transition-colors ${badgeClass}`}
                              title={sizeStock <= 0 ? t.outOfStock : sizeStock <= 2 ? `${sizeStock} ${t.leftInStock} (${t.lowStock})` : undefined}
                            >
                              {size}: {sizeStock}{labelExtra}
                              {sizeStock > 0 && (
                                <button
                                  onClick={() => openAdjustModal(product, size, 'DEFECT_WRITEOFF')}
                                  className="opacity-0 group-hover/size:opacity-100 text-red-400 hover:text-red-600 transition-opacity"
                                  title={`${t.defectWriteOff}: ${size}`}
                                >
                                  <Trash2 size={10} />
                                </button>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    
                    <td className="p-4 align-middle">
                      <div className="flex flex-col gap-1 w-max mx-auto">
                        {sizes.map((size) => {
                          const sizeInitial = product.initialStock?.[size] || 0;
                          const sizeSold = product.sold?.[size] || 0;
                          if (sizeInitial === 0) return null;
                          return (
                            <div key={size} className="flex items-center justify-between gap-2">
                              <span className="w-5 text-[10px] font-bold text-slate-400">{size}</span>
                              <div className="flex items-center gap-1 opacity-100 transition-opacity">
                                <span className="inline-block min-w-[16px] text-center tabular-nums text-[11px] font-bold text-[#181E1C]">
                                  {sizeSold}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </td>
                    
                    <td className="p-4 align-middle text-center font-extrabold text-[#181E1C]">
                      {currentStock}
                    </td>
                    
                    {userRole !== 'operations' && (
                      <td className="p-4 align-middle text-sm text-slate-500 font-medium whitespace-nowrap text-start">
                        {formatEGP(product.costPrice)}
                      </td>
                    )}
                    
                    <td className="p-4 align-middle text-sm font-bold text-[#181E1C] whitespace-nowrap text-start">
                      {formatEGP(product.sellingPrice)}
                    </td>
                    
                    {userRole !== 'operations' && (
                      <td className="p-4 align-middle text-sm font-extrabold text-[#597867] whitespace-nowrap text-start">
                        {formatEGP(totalProfit)}
                      </td>
                    )}

                    <td className="p-4 align-middle px-6 text-end">
                      <div className="flex items-center justify-end gap-1 opacity-100 transition-opacity duration-200">
                        <button
                          onClick={() => openAdjustModal(product, 'M', 'MANUAL_RESTOCK')}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-all duration-150 hover:bg-slate-100 hover:text-slate-700"
                          title={t.adjustStock}
                        >
                          <SlidersHorizontal size={14} strokeWidth={2} />
                        </button>
                        {onEdit && (
                          <button
                            onClick={() => onEdit(product)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-all duration-150 hover:bg-[#597867]/10 hover:text-[#597867]"
                            title="Edit product"
                          >
                            <Pencil size={14} strokeWidth={2} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(product.id)}
                          className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-150 ${
                            deleteConfirmId === product.id
                              ? 'bg-red-500 text-white shadow-sm shadow-red-500/25'
                              : 'text-slate-400 hover:bg-red-50 hover:text-red-500'
                          }`}
                          title={deleteConfirmId === product.id ? 'Click again to confirm' : 'Delete product'}
                        >
                          <Trash2 size={14} strokeWidth={2} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List */}
      <div className="md:hidden flex flex-col p-4 gap-4 bg-slate-50 border-t border-slate-100">
        {filtered.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl shadow-sm border border-slate-100">
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                <PackageX size={24} className="text-slate-400" />
              </div>
              <p className="text-[13px] font-semibold text-slate-500">{t.noProducts}</p>
            </div>
          </div>
        ) : (
          filtered.map((product) => {
            const sizes = getProductSizes(product);
            const currentStock = sizes.reduce((sum, sz) => sum + getAvailableStock(product, sz), 0);
            const totalSold = sizes.reduce((sum, sz) => {
              const s = product.sold?.[sz] ?? product.sold?.[sz.toUpperCase()] ?? product[`sold${sz}`] ?? 0;
              return sum + Math.max(0, Number(s) || 0);
            }, 0);
            const profitPerItem = (product.sellingPrice || 0) - (product.costPrice || 0);
            const totalProfit = totalSold * profitPerItem;

            return (
              <div key={product.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col">
                {/* Card Header */}
                <div className="flex justify-between items-start gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {product.imageUrl ? (
                      <img 
                        src={product.imageUrl} 
                        alt={product.name}
                        className="w-12 h-12 rounded-full object-cover border border-slate-200 shrink-0 cursor-pointer hover:opacity-80 transition-opacity" 
                        onClick={() => setLightboxImg(product.imageUrl)} 
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                        <PackageX size={20} className="text-slate-400" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-[#181E1C] text-sm truncate">{product.name}</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5 truncate">{product.sku}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button 
                      onClick={() => openAdjustModal(product, 'M', 'MANUAL_RESTOCK')} 
                      className="p-2 text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors"
                      title={t.adjustStock}
                    >
                      <SlidersHorizontal size={16} />
                    </button>
                    {onEdit && (
                      <button onClick={() => onEdit(product)} className="p-2 text-slate-400 hover:text-[#597867] bg-slate-50 hover:bg-[#597867]/10 rounded-xl transition-colors">
                        <Pencil size={16} />
                      </button>
                    )}
                    <button onClick={() => handleDelete(product.id)} className={`p-2 rounded-xl transition-colors ${deleteConfirmId === product.id ? 'bg-red-500 text-white' : 'text-slate-400 hover:text-red-500 bg-slate-50 hover:bg-red-50'}`}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <hr className="border-slate-100 my-4" />

                {/* Stock Section */}
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-3">Stock per Size</p>
                  <div className="grid grid-cols-4 gap-2">
                    {sizes.map(size => {
                      const sizeInitial = Number(
                        product.initialStock?.[size] ?? product.initialStock?.[size.toUpperCase()] ?? product.initial?.[size] ?? product[`initialStock${size}`] ?? product[`stock${size}`] ?? 0
                      );
                      const sizeStock = getAvailableStock(product, size);
                      if (sizeInitial === 0 && sizeStock === 0) return null;

                      let mobileBadge = "bg-slate-50 border-slate-100 text-[#181E1C]";
                      if (sizeStock <= 0) {
                        mobileBadge = "bg-red-50 border-red-200 text-red-700 font-black";
                      } else if (sizeStock <= 2) {
                        mobileBadge = "bg-amber-50 border-amber-200 text-amber-800 font-black";
                      }

                      return (
                        <div key={size} className={`rounded-lg p-2 flex flex-col items-center justify-center border ${mobileBadge}`}>
                          <span className="text-[10px] font-bold mb-0.5 opacity-80">{size}</span>
                          <span className="text-xs font-black">
                            {sizeStock}
                            {sizeStock <= 0 ? ' 🚫' : sizeStock <= 2 ? ' ⚠️' : ''}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-3 flex justify-between items-center bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                    <span className="text-[11px] font-bold text-slate-500">{t.totalInStock}</span>
                    <span className="text-sm font-black text-[#181E1C]">{currentStock}</span>
                  </div>
                </div>

                <hr className="border-slate-100 my-4" />

                {/* Pricing Section */}
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-3">Prices (EGP)</p>
                  {userRole === 'operations' ? (
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-center">
                      <span className="text-[10px] font-bold text-slate-500 block mb-0.5">{t.price}</span>
                      <span className="text-sm font-black text-[#181E1C]">{formatEGP(product.sellingPrice)}</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 text-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <div className="flex flex-col border-r border-slate-200">
                        <span className="text-[10px] font-bold text-slate-500 mb-0.5">{t.cost}</span>
                        <span className="text-xs font-bold text-[#181E1C]">{product.costPrice}</span>
                      </div>
                      <div className="flex flex-col border-r border-slate-200">
                        <span className="text-[10px] font-bold text-slate-500 mb-0.5">{t.price}</span>
                        <span className="text-xs font-bold text-[#181E1C]">{product.sellingPrice}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-500 mb-0.5">{t.profit}</span>
                        <span className="text-xs font-black text-emerald-500">{totalProfit}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Lightbox */}
      <ImageLightbox isOpen={!!lightboxImg} imageUrl={lightboxImg} onClose={() => setLightboxImg(null)} />

      {/* Stock Movement History Modal */}
      <StockMovementsModal
        isOpen={isMovementModalOpen}
        onClose={() => setIsMovementModalOpen(false)}
        movements={inventoryMovements}
        language={language}
        userRole={userRole}
      />

      {/* Adjust Stock Modal */}
      <AdjustStockModal
        isOpen={adjustModalState.isOpen}
        onClose={() => setAdjustModalState(prev => ({ ...prev, isOpen: false }))}
        products={products}
        preselectedProduct={adjustModalState.product}
        preselectedSize={adjustModalState.size}
        preselectedType={adjustModalState.type}
        onAdjust={adjustStock}
        language={language}
        userRole={userRole}
      />
    </div>
  );
}
