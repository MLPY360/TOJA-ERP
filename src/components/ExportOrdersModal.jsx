import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Calendar, Tag } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useStore } from '../store/useStore';
import { translations } from '../translations';

export default function ExportOrdersModal({ isOpen, onClose }) {
  const { orders, products, language } = useStore();
  const t = translations[language];

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('all');

  // Extract unique products that exist in the orders
  const uniqueProducts = useMemo(() => {
    const productIds = new Set();
    orders.forEach(o => {
      o.items?.forEach(item => productIds.add(item.productId));
    });
    return Array.from(productIds).map(id => products.find(p => p.id === id)).filter(Boolean);
  }, [orders, products]);

  const handleExport = () => {
    let filteredOrders = orders;

    if (startDate) {
      filteredOrders = filteredOrders.filter(o => new Date(o.createdAt) >= new Date(startDate));
    }
    if (endDate) {
      // Add 1 day to end date to include the whole day
      const end = new Date(endDate);
      end.setDate(end.getDate() + 1);
      filteredOrders = filteredOrders.filter(o => new Date(o.createdAt) < end);
    }
    if (selectedProductId !== 'all') {
      filteredOrders = filteredOrders.filter(o => 
        o.items?.some(item => item.productId === selectedProductId)
      );
    }

    // Flatten and map to rows
    const exportData = [];
    filteredOrders.forEach(order => {
      const orderItems = selectedProductId !== 'all' 
        ? order.items?.filter(item => item.productId === selectedProductId)
        : order.items;

      orderItems?.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        
        exportData.push({
          "Order ID": order.displayId || order.id,
          "Order Date": new Date(order.createdAt).toLocaleDateString(),
          "Customer Name": order.customerName,
          "Customer Phone": order.phone,
          "Address": `${order.governorate} - ${order.address}`,
          "Product Name": product ? product.name : 'Unknown Product',
          "Size": item.size,
          "Quantity": item.qty,
          "Item Total (EGP)": product ? (product.sellingPrice * item.qty) : 0,
          "Order Total (EGP)": order.total,
          "Shipping Fee (EGP)": order.shippingFee || 0,
          "Status": order.status
        });
      });
    });

    if (exportData.length === 0) {
      alert(t.noOrders || 'No orders found for the selected criteria.');
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Orders");
    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `TOJA_Orders_Export_${dateStr}.xlsx`);
    
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div dir={language === 'ar' ? 'rtl' : 'ltr'} className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col overflow-hidden border border-slate-100"
        >
          <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50">
            <h2 className="text-xl font-extrabold text-[#181E1C]">{t.exportOrders || 'Export Orders'}</h2>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="p-6 flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 text-start">{t.startDate || 'Start Date'}</label>
                <div className="relative">
                  <Calendar className="absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full h-11 ps-10 pe-4 rounded-lg border border-slate-200 bg-slate-50 text-sm outline-none focus:border-[#597867] focus:bg-white focus:ring-2 focus:ring-[#597867]/20"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 text-start">{t.endDate || 'End Date'}</label>
                <div className="relative">
                  <Calendar className="absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full h-11 ps-10 pe-4 rounded-lg border border-slate-200 bg-slate-50 text-sm outline-none focus:border-[#597867] focus:bg-white focus:ring-2 focus:ring-[#597867]/20"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 text-start">{t.product || 'Product'}</label>
              <div className="relative">
                <Tag className="absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full h-11 ps-10 pe-4 rounded-lg border border-slate-200 bg-slate-50 text-sm outline-none focus:border-[#597867] focus:bg-white focus:ring-2 focus:ring-[#597867]/20 appearance-none"
                >
                  <option value="all">{t.allProducts || 'All Products'}</option>
                  {uniqueProducts.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
            <button onClick={onClose} className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors text-sm">
              {t.close || 'Close'}
            </button>
            <button onClick={handleExport} className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-white bg-[#181E1C] hover:bg-black shadow-md transition-colors text-sm">
              <Download size={16} strokeWidth={2.5} /> {t.export || 'Export'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
