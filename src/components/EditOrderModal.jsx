import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Tag, Percent } from 'lucide-react';
import { useStore } from '../store/useStore';
import { translations } from '../translations';

export default function EditOrderModal({ isOpen, onClose, orderToEdit }) {
  const { products, updateOrder, language } = useStore();
  const t = translations[language];
  
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [governorate, setGovernorate] = useState('');
  const [address, setAddress] = useState('');
  const [shippingFee, setShippingFee] = useState('');
  
  const [items, setItems] = useState([{ productId: '', size: 'M', qty: 1 }]);

  // Discount state
  const [discountType, setDiscountType] = useState('percentage');
  const [discountValue, setDiscountValue] = useState('');

  useEffect(() => {
    if (orderToEdit) {
      setCustomerName(orderToEdit.customerName || '');
      setPhone(orderToEdit.phone || '');
      setGovernorate(orderToEdit.governorate || '');
      setAddress(orderToEdit.address || '');
      setShippingFee(orderToEdit.shippingFee?.toString() || '0');
      setItems(orderToEdit.items && orderToEdit.items.length > 0 ? [...orderToEdit.items] : [{ productId: '', size: 'M', qty: 1 }]);
      setDiscountType(orderToEdit.discount?.type || 'percentage');
      setDiscountValue(orderToEdit.discount?.value !== undefined && orderToEdit.discount?.value !== null ? orderToEdit.discount.value.toString() : '');
    }
  }, [orderToEdit]);

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => {
      const product = products.find(p => p.id === item.productId);
      if (product) {
        return sum + (product.sellingPrice * item.qty);
      }
      return sum;
    }, 0);
  }, [items, products]);

  const discountAmount = useMemo(() => {
    const rawVal = parseFloat(discountValue) || 0;
    if (rawVal <= 0 || subtotal <= 0) return 0;
    if (discountType === 'percentage') {
      const clampedPct = Math.min(100, Math.max(0, rawVal));
      return Math.round(((subtotal * clampedPct) / 100) * 100) / 100;
    }
    return Math.min(subtotal, Math.max(0, rawVal));
  }, [subtotal, discountType, discountValue]);

  const total = Math.max(0, subtotal - discountAmount + (Number(shippingFee) || 0));

  if (!isOpen) return null;

  const handleDiscountValueChange = (val) => {
    if (val === '') {
      setDiscountValue('');
      return;
    }
    const num = parseFloat(val);
    if (isNaN(num)) return;
    if (num < 0) {
      setDiscountValue('0');
      return;
    }
    if (discountType === 'percentage') {
      if (num > 100) {
        setDiscountValue('100');
        return;
      }
    }
    setDiscountValue(val);
  };

  const handleDiscountTypeChange = (newType) => {
    setDiscountType(newType);
    if (newType === 'percentage' && parseFloat(discountValue) > 100) {
      setDiscountValue('100');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validItems = items.filter(item => item.productId && item.qty > 0);
    if (validItems.length === 0) {
      alert("Please add at least one valid item.");
      return;
    }

    const updatedData = {
      customerName,
      phone,
      governorate,
      address,
      items: validItems,
      shippingFee: Number(shippingFee) || 0,
      subtotal,
      discount: {
        type: discountType,
        value: Number(discountValue) || 0,
        amount: discountAmount
      },
      total
    };

    updateOrder(orderToEdit.id, updatedData);
    onClose();
  };

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    if (field === 'qty') {
      newItems[index][field] = Math.max(1, parseInt(value) || 1);
    } else {
      newItems[index][field] = value;
    }
    setItems(newItems);
  };

  const addItem = () => setItems([...items, { productId: '', size: 'M', qty: 1 }]);
  
  const removeItem = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  return (
    <AnimatePresence>
      <div dir={language === 'ar' ? 'rtl' : 'ltr'} className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden my-auto"
        >
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-100 bg-slate-50 shrink-0">
            <h2 className="text-lg sm:text-xl font-extrabold text-[#181E1C]">{t.editOrder}</h2>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <form id="editOrderForm" onSubmit={handleSubmit} className="flex flex-col gap-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 text-start">{t.customerName}</label>
                  <input required type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full h-11 px-4 rounded-lg border border-slate-200 bg-slate-50 text-sm outline-none focus:border-[#597867] focus:bg-white focus:ring-2 focus:ring-[#597867]/20 text-start" placeholder="e.g., Ahmed Ali" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 text-start">{t.phoneNumber}</label>
                  <input required type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full h-11 px-4 rounded-lg border border-slate-200 bg-slate-50 text-sm outline-none focus:border-[#597867] focus:bg-white focus:ring-2 focus:ring-[#597867]/20 text-start" placeholder="01xxxxxxxxx" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 text-start">{t.governorate}</label>
                  <input required type="text" value={governorate} onChange={e => setGovernorate(e.target.value)} className="w-full h-11 px-4 rounded-lg border border-slate-200 bg-slate-50 text-sm outline-none focus:border-[#597867] focus:bg-white focus:ring-2 focus:ring-[#597867]/20 text-start" placeholder="e.g., Cairo" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 text-start">{t.detailedAddress}</label>
                  <input required type="text" value={address} onChange={e => setAddress(e.target.value)} className="w-full h-11 px-4 rounded-lg border border-slate-200 bg-slate-50 text-sm outline-none focus:border-[#597867] focus:bg-white focus:ring-2 focus:ring-[#597867]/20 text-start" placeholder="Street, Building, Apt..." />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-extrabold text-[#181E1C]">{t.orderItemsTitle}</h3>
                  <button type="button" onClick={addItem} className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-[#597867] bg-[#597867]/10 hover:bg-[#597867]/20 rounded-lg transition-colors min-h-[40px]">
                    <Plus size={14} strokeWidth={2.5} /> {t.addItem}
                  </button>
                </div>

                <div className="flex flex-col gap-3">
                  {items.map((item, index) => (
                    <div key={index} className="flex flex-col sm:flex-row gap-3 sm:items-end p-4 sm:p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="flex-1 w-full">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 text-start">{t.product}</label>
                        <select required value={item.productId} onChange={e => updateItem(index, 'productId', e.target.value)} className="w-full h-11 px-3 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:border-[#597867] text-start">
                          <option value="" disabled>Select Product</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                        </select>
                      </div>
                      <div className="flex items-end gap-3 w-full sm:w-auto">
                        <div className="flex-1 sm:w-24">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 text-start">{t.size}</label>
                          <select value={item.size} onChange={e => updateItem(index, 'size', e.target.value)} className="w-full h-11 px-3 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:border-[#597867] text-start">
                            <option value="M">M</option>
                            <option value="L">L</option>
                            <option value="XL">XL</option>
                            <option value="XXL">XXL</option>
                          </select>
                        </div>
                        <div className="flex-1 sm:w-20">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 text-start">{t.qty}</label>
                          <input type="number" min="1" value={item.qty} onChange={e => updateItem(index, 'qty', e.target.value)} className="w-full h-11 px-3 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:border-[#597867] text-start" />
                        </div>
                        <button type="button" onClick={() => removeItem(index)} disabled={items.length === 1} className="h-11 px-3 text-slate-400 hover:text-red-500 disabled:opacity-30 transition-colors flex items-center justify-center min-w-[40px]">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Discount Section */}
              <div className="border-t border-slate-100 pt-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-[#597867]/10 text-[#597867] rounded-lg">
                      <Tag size={15} />
                    </div>
                    <h3 className="text-sm font-extrabold text-[#181E1C] text-start">{t.discount}</h3>
                  </div>
                  {discountAmount > 0 && (
                    <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                      -{discountAmount.toLocaleString('en-EG')} EGP
                    </span>
                  )}
                </div>

                <div className="p-3 sm:p-4 bg-slate-50/80 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  {/* Type Selector - full width 2-column grid on mobile */}
                  <div className="grid grid-cols-2 sm:flex items-center bg-white p-1 rounded-lg border border-slate-200 shadow-sm shrink-0 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => handleDiscountTypeChange('percentage')}
                      className={`flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-md text-xs font-bold transition-all min-h-[40px] sm:min-h-0 ${
                        discountType === 'percentage'
                          ? 'bg-[#597867] text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <Percent size={13} /> {t.percentage}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDiscountTypeChange('fixed')}
                      className={`flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-md text-xs font-bold transition-all min-h-[40px] sm:min-h-0 ${
                        discountType === 'fixed'
                          ? 'bg-[#597867] text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <span>EGP</span> {t.fixedAmount}
                    </button>
                  </div>

                  {/* Value Input */}
                  <div className="w-full sm:flex-1 relative">
                    <input
                      type="number"
                      min="0"
                      max={discountType === 'percentage' ? "100" : undefined}
                      step="any"
                      value={discountValue}
                      onChange={(e) => handleDiscountValueChange(e.target.value)}
                      placeholder={discountType === 'percentage' ? "0%" : "0 EGP"}
                      className="w-full h-11 sm:h-10 px-3 pe-10 rounded-lg border border-slate-200 bg-white text-base sm:text-sm outline-none focus:border-[#597867] focus:ring-2 focus:ring-[#597867]/10 text-start"
                    />
                    <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                      {discountType === 'percentage' ? '%' : 'EGP'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Financial Breakdown Section */}
              <div className="border-t border-slate-100 pt-6">
                <h3 className="text-sm font-extrabold text-[#181E1C] mb-4 text-start">{t.financials}</h3>
                <div className="flex flex-col gap-3">
                  {/* Subtotal */}
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-semibold text-slate-500">{t.subtotal}</span>
                    <span className="font-bold text-[#181E1C]">{subtotal.toLocaleString('en-EG')} EGP</span>
                  </div>

                  {/* Discount Applied */}
                  {discountAmount > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-amber-700">{t.discountApplied}</span>
                        <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                          {discountType === 'percentage' ? `${discountValue}%` : 'EGP'}
                        </span>
                      </div>
                      <span className="font-bold text-amber-700">-{discountAmount.toLocaleString('en-EG')} EGP</span>
                    </div>
                  )}

                  {/* Shipping Fee */}
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-semibold text-slate-500">{t.shippingCost}</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        value={shippingFee}
                        onChange={e => setShippingFee(e.target.value)}
                        placeholder="0"
                        className="w-24 h-11 px-2 text-start rounded-lg border border-slate-200 bg-slate-50 text-sm outline-none focus:border-[#597867]"
                      />
                      <span className="font-bold text-slate-500">EGP</span>
                    </div>
                  </div>

                  {/* Final Total */}
                  <div className="flex justify-between items-center pt-3 border-t border-slate-100 mt-1">
                    <span className="font-extrabold text-[#181E1C]">{t.finalTotal}</span>
                    <span className="text-lg font-black text-[#597867]">{total.toLocaleString('en-EG')} EGP</span>
                  </div>
                </div>
              </div>

            </form>
          </div>

          <div className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
            <button onClick={onClose} type="button" className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors min-h-[44px]">
              {t.cancel}
            </button>
            <button type="submit" form="editOrderForm" className="px-6 py-2.5 rounded-xl font-bold text-white bg-[#597867] hover:bg-[#465f52] shadow-md transition-colors min-h-[44px]">
              {t.saveChanges}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
