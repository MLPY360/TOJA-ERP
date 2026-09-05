import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Printer, Tag, Phone, MapPin, Calendar, User, Package } from 'lucide-react';
import { useStore } from '../store/useStore';
import { translations } from '../translations';

export default function OrderInvoiceModal({ isOpen, onClose, order }) {
  const { products, language } = useStore();
  const t = translations[language];

  if (!isOpen || !order) return null;

  const displayId = order.orderId || order.orderNumber || order.customId || order.order_id || order.displayId || order.id;
  const cName = order.customerName || (order.customerDetails ? `${order.customerDetails.firstName} ${order.customerDetails.lastName}` : 'Unknown');
  const cPhone = order.phone || order.customerDetails?.phone || '';
  const cCity = order.governorate || order.customerDetails?.city || '';
  const cAddress = order.address || order.customerDetails?.address || '';
  const cShipping = Number(order.shippingFee ?? order.totals?.shipping ?? 0);
  const cSubtotal = Number(order.subtotal ?? order.totals?.subtotal ?? 0);
  const cTotal = Number(order.totalAmount || order.total || order.totals?.total || order.totals?.grandTotal || 0);

  // Discount details
  const discount = order.discount || null;
  const discountAmount = Number(discount?.amount || 0);
  const discountType = discount?.type || 'percentage';
  const discountValue = discount?.value || 0;

  const formatDate = (dateValue) => {
    if (!dateValue) return 'N/A';
    if (dateValue.toDate) return dateValue.toDate().toLocaleDateString();
    return new Date(dateValue).toLocaleDateString();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <AnimatePresence>
      <div
        dir={language === 'ar' ? 'rtl' : 'ltr'}
        className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm print:p-0 print:bg-white print:static"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-100 print:shadow-none print:border-none print:max-h-none print:w-full print:rounded-none"
        >
          {/* Header - Not printed */}
          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-slate-50 shrink-0 print:hidden">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg text-[#181E1C]">TOJA</span>
              <span className="text-slate-300">|</span>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.orderDetails}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 shadow-sm transition-colors min-h-[38px]"
                title={t.printInvoice}
              >
                <Printer size={15} />
                <span>{t.printInvoice}</span>
              </button>
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Printable Invoice Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-6 print:p-8 print:overflow-visible">
            {/* Invoice Top Brand & Meta */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-5 border-b border-slate-100">
              <div>
                <h1 className="text-2xl font-black tracking-wider text-[#181E1C]">TOJA</h1>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">Order Invoice & Receipt</p>
              </div>
              <div className="text-start sm:text-end">
                <p className="text-sm font-black text-[#181E1C]">{displayId}</p>
                <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1 sm:justify-end">
                  <Calendar size={12} /> {formatDate(order.createdAt)}
                </p>
                <div className="mt-1">
                  <span className="inline-block text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    {order.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Customer & Shipping Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/80 p-4 rounded-xl border border-slate-200 text-xs">
              <div className="flex flex-col gap-1.5 text-start">
                <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] flex items-center gap-1">
                  <User size={12} /> {t.customer}
                </span>
                <p className="text-sm font-extrabold text-[#181E1C]">{cName}</p>
                <p className="text-slate-600 font-medium flex items-center gap-1.5">
                  <Phone size={12} className="text-slate-400" /> {cPhone || 'N/A'}
                </p>
              </div>
              <div className="flex flex-col gap-1.5 text-start">
                <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] flex items-center gap-1">
                  <MapPin size={12} /> {t.location}
                </span>
                <p className="font-bold text-[#181E1C]">{cCity || 'N/A'}</p>
                <p className="text-slate-600 font-medium">{cAddress || 'N/A'}</p>
              </div>
            </div>

            {/* Itemized Table */}
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 text-start flex items-center gap-1.5">
                <Package size={14} className="text-slate-400" /> {t.items}
              </h3>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-start text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                      <th className="p-3 text-start">{t.product}</th>
                      <th className="p-3 text-center">{t.size}</th>
                      <th className="p-3 text-center">{t.qty}</th>
                      <th className="p-3 text-end">{t.price}</th>
                      <th className="p-3 text-end">{t.totalValue}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {order.items?.map((item, idx) => {
                      const product = products.find(p => p.id === item.productId) || item;
                      const qty = Number(item.qty || item.quantity || 1);
                      const unitPrice = Number(product.sellingPrice || item.price || 0);
                      const lineTotal = unitPrice * qty;

                      return (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-3 font-bold text-[#181E1C] text-start">
                            {product.name || 'Product'}
                            {product.sku && (
                              <span className="block text-[10px] text-slate-400 font-medium font-mono">{product.sku}</span>
                            )}
                          </td>
                          <td className="p-3 text-center font-bold text-slate-700">{item.size}</td>
                          <td className="p-3 text-center font-extrabold text-[#181E1C]">{qty}</td>
                          <td className="p-3 text-end font-medium text-slate-600">{unitPrice.toLocaleString('en-EG')} EGP</td>
                          <td className="p-3 text-end font-bold text-[#181E1C]">{lineTotal.toLocaleString('en-EG')} EGP</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Financial Breakdown Summary */}
            <div className="bg-slate-50/90 rounded-xl p-4 border border-slate-200 flex flex-col gap-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-500">{t.subtotal}</span>
                <span className="font-bold text-[#181E1C]">{cSubtotal.toLocaleString('en-EG')} EGP</span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-amber-700">{t.discountApplied}</span>
                    <span className="text-[10px] font-extrabold text-amber-700 bg-amber-100/80 px-1.5 py-0.5 rounded border border-amber-300">
                      {discountType === 'percentage' ? `${discountValue}%` : 'EGP'}
                    </span>
                  </div>
                  <span className="font-extrabold text-amber-700">-{discountAmount.toLocaleString('en-EG')} EGP</span>
                </div>
              )}

              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-500">{t.shippingCost}</span>
                <span className="font-bold text-[#181E1C]">{cShipping.toLocaleString('en-EG')} EGP</span>
              </div>

              <div className="flex justify-between items-center pt-2.5 border-t border-slate-200 mt-0.5">
                <span className="font-extrabold text-sm text-[#181E1C]">{t.finalTotal}</span>
                <span className="text-base font-black text-[#597867]">{cTotal.toLocaleString('en-EG')} EGP</span>
              </div>
            </div>
          </div>

          {/* Modal Footer - Not printed */}
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2 shrink-0 print:hidden">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
            >
              {t.close}
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#597867] hover:bg-[#465f52] shadow-sm transition-colors"
            >
              <Printer size={14} />
              <span>{t.printInvoice}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
