import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Minus, Search, PackageX, Trash2, Pencil } from 'lucide-react';
import { useStore } from '../store/useStore';
import { translations } from '../translations';

function formatEGP(amount) {
  return amount.toLocaleString('en-EG') + ' EGP';
}

const getSum = (obj) => Object.values(obj || {}).reduce((a, b) => a + b, 0);

export default function InventoryTable({ onEdit }) {
  const { products, deleteProduct, reportDefectiveItem, language } = useStore();
  const t = translations[language];
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const filtered = products.filter((p) => {
    const q = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
  });

  const handleDelete = (id) => {
    if (deleteConfirmId === id) {
      deleteProduct(id);
      setDeleteConfirmId(null);
    } else {
      setDeleteConfirmId(id);
      setTimeout(() => setDeleteConfirmId(null), 3000);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-slate-100 overflow-hidden mt-8">
      <div className="flex flex-col gap-4 border-b border-slate-100 px-7 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#181E1C]">
            {t.productInventory}
          </h2>
          <p className="mt-1 text-[12px] font-medium text-slate-400">
            {products.length} products · {filtered.length} shown
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search size={15} strokeWidth={2} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-[13px] font-medium text-[#181E1C] placeholder:text-slate-400 outline-none transition-all focus:border-[#597867] focus:bg-white focus:ring-2 focus:ring-[#597867]/10"
          />
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto w-full">
        <table className="w-full text-start border-collapse whitespace-nowrap">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-bold">
              <th className="p-4 px-6 font-semibold whitespace-nowrap text-start">{t.productSku}</th>
              <th className="p-4 font-semibold whitespace-nowrap text-start">{t.sizesInStock}</th>
              <th className="p-4 font-semibold text-center whitespace-nowrap">{t.sold}</th>
              <th className="p-4 font-semibold text-center whitespace-nowrap">{t.totalInStock}</th>
              <th className="p-4 font-semibold whitespace-nowrap text-start">{t.cost}</th>
              <th className="p-4 font-semibold whitespace-nowrap text-start">{t.price}</th>
              <th className="p-4 font-semibold whitespace-nowrap text-start">{t.totalProfit}</th>
              <th className="p-4 font-semibold whitespace-nowrap text-end px-6">{t.actions}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="8" className="p-8 text-center">
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
                const totalInitial = getSum(product.initialStock);
                const totalSold = getSum(product.sold);
                const currentStock = totalInitial - totalSold;
                const profitPerItem = product.sellingPrice - product.costPrice;
                const totalProfit = totalSold * profitPerItem;
                const sizes = ['M', 'L', 'XL', 'XXL'];

                return (
                  <motion.tr
                    key={product.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group"
                  >
                    <td className="p-4 px-6 align-middle text-start">
                      <p className="font-bold text-[#181E1C] whitespace-nowrap">{product.name}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wide">{product.sku}</p>
                    </td>
                    
                    <td className="p-4 align-middle text-start">
                      <div className="flex flex-wrap gap-1.5 max-w-[140px]">
                        {sizes.map((size) => {
                          const sizeStock = (product.initialStock?.[size] || 0) - (product.sold?.[size] || 0);
                          if ((product.initialStock?.[size] || 0) === 0) return null;
                          return (
                            <span key={size} className="group/size relative text-[10px] font-bold bg-[#F8FAFC] text-slate-600 px-2 py-1 rounded border border-slate-200 flex items-center gap-1.5">
                              {size}: {sizeStock}
                              {sizeStock > 0 && (
                                <button
                                  onClick={() => reportDefectiveItem(product.id, size)}
                                  className="opacity-0 group-hover/size:opacity-100 text-red-400 hover:text-red-600 transition-opacity"
                                  title="Report defect"
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
                    
                    <td className="p-4 align-middle text-sm text-slate-500 font-medium whitespace-nowrap text-start">
                      {formatEGP(product.costPrice)}
                    </td>
                    
                    <td className="p-4 align-middle text-sm font-bold text-[#181E1C] whitespace-nowrap text-start">
                      {formatEGP(product.sellingPrice)}
                    </td>
                    
                    <td className="p-4 align-middle text-sm font-extrabold text-[#597867] whitespace-nowrap text-start">
                      {formatEGP(totalProfit)}
                    </td>

                    <td className="p-4 align-middle px-6 text-end">
                      <div className="flex items-center justify-end gap-1 opacity-100 transition-opacity duration-200">
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

      {/* Mobile Cards */}
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
            const totalInitial = getSum(product.initialStock);
            const totalSold = getSum(product.sold);
            const currentStock = totalInitial - totalSold;
            return (
              <div key={product.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-[#181E1C]">{product.name}</h3>
                    <p className="text-xs text-slate-400 font-medium uppercase mt-0.5">{product.sku}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {onEdit && (
                      <button onClick={() => onEdit(product)} className="p-2.5 text-slate-400 hover:text-[#597867] bg-slate-50 rounded-xl transition-colors">
                        <Pencil size={16} />
                      </button>
                    )}
                    <button onClick={() => handleDelete(product.id)} className={`p-2.5 rounded-xl transition-colors ${deleteConfirmId === product.id ? 'bg-red-500 text-white' : 'text-slate-400 hover:text-red-500 bg-slate-50'}`}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <p className="text-[10px] uppercase font-bold text-slate-500 mb-1 tracking-wider">{t.totalInStock}</p>
                    <p className="font-black text-[#181E1C] text-lg">{currentStock}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <p className="text-[10px] uppercase font-bold text-slate-500 mb-1 tracking-wider">{t.price}</p>
                    <p className="font-bold text-[#597867] text-sm mt-1">{formatEGP(product.sellingPrice)}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
