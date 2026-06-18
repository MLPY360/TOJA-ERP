import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, PackageX, Download, MessageCircle, Pencil } from 'lucide-react';
import { useStore } from '../store/useStore';
import { translations } from '../translations';
import ExportOrdersModal from './ExportOrdersModal';
import EditOrderModal from './EditOrderModal';

const getStatusBadge = (status) => {
  switch (status) {
    case 'Pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    case 'Shipped': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'Delivered - Pending Cash': return 'bg-orange-100 text-orange-700 border-orange-200';
    case 'Delivered - Collected': return 'bg-green-100 text-green-700 border-green-200';
    case 'Delivered': return 'bg-green-100 text-green-700 border-green-200';
    case 'Returned': return 'bg-slate-200 text-slate-700 border-slate-300';
    case 'Cancelled': return 'bg-red-100 text-red-700 border-red-200';
    default: return 'bg-slate-100 text-slate-700 border-slate-200';
  }
};

export default function OrdersView() {
  const { orders, updateOrderStatus, language, products } = useStore();
  const t = translations[language];
  const [searchQuery, setSearchQuery] = useState('');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [orderToEdit, setOrderToEdit] = useState(null);

  const formatWhatsAppNumber = (phone) => {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('01')) {
      cleaned = '20' + cleaned.substring(1);
    }
    return cleaned;
  };

  const handleStatusChange = (order, newStatus) => {
    updateOrderStatus(order.id, newStatus);
    
    if (newStatus === 'Shipped') {
      const formattedPhone = formatWhatsAppNumber(order.phone);
      const displayId = order.displayId || order.id;
      const shortId = displayId.length > 10 ? displayId.substring(displayId.length - 4) : displayId;
      
      const message = `أهلاً يا ${order.customerName} 👋
أوردرك من TOJA طلع مع شركة الشحن وهو في الطريق ليك دلوقتي! 🚚
رقم الأوردر: ${shortId}
إجمالي الحساب: ${order.total} جنيه
لو في أي استفسار إحنا دايماً معاك.`;

      const encodedMessage = encodeURIComponent(message);
      window.open(`https://wa.me/${formattedPhone}?text=${encodedMessage}`, '_blank');
    }
  };

  const filtered = orders.filter((o) => {
    const q = searchQuery.toLowerCase();
    const displayId = o.displayId || o.id;
    return displayId.toLowerCase().includes(q) || 
           o.customerName.toLowerCase().includes(q) || 
           o.phone.includes(q);
  });

  return (
    <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-slate-100 overflow-hidden mt-8">
      <div className="flex flex-col gap-4 border-b border-slate-100 px-7 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#181E1C]">
            {t.orderManagement}
          </h2>
          <p className="mt-1 text-[12px] font-medium text-slate-400">
            {orders.length} total orders · {filtered.length} shown
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search size={15} strokeWidth={2} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={t.searchOrdersPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-[13px] font-medium text-[#181E1C] placeholder:text-slate-400 outline-none transition-all focus:border-[#597867] focus:bg-white focus:ring-2 focus:ring-[#597867]/10"
            />
          </div>
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center justify-center gap-2 rounded-xl bg-white border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 whitespace-nowrap"
          >
            <Download size={16} strokeWidth={2.5} /> <span className="hidden sm:inline">{t.exportData || 'Export Data'}</span>
          </button>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto w-full">
        <table className="w-full text-start border-collapse whitespace-nowrap">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-bold">
              <th className="p-4 px-6 font-semibold text-start">{t.orderIdDate}</th>
              <th className="p-4 font-semibold text-start">{t.customer}</th>
              <th className="p-4 font-semibold text-start">{t.location}</th>
              <th className="p-4 font-semibold text-start">{t.items}</th>
              <th className="p-4 font-semibold text-start">{t.totalValue}</th>
              <th className="p-4 font-semibold text-center">{t.status}</th>
              <th className="p-4 font-semibold px-6 text-end">{t.createdBy}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="7" className="p-8 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                      <PackageX size={24} className="text-slate-400" />
                    </div>
                    <p className="text-[13px] font-semibold text-slate-500">{t.noOrders}</p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((order, index) => (
                <motion.tr
                  key={order.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                >
                  <td className="p-4 px-6 align-middle text-start">
                    <p className="font-extrabold text-[#181E1C]">{order.displayId || order.id}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-medium">{new Date(order.createdAt).toLocaleDateString()}</p>
                  </td>
                  
                  <td className="p-4 align-middle text-start">
                    <p className="font-bold text-[#181E1C]">{order.customerName}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-[11px] text-slate-500">{order.phone}</p>
                      <button
                        onClick={() => {
                          const formattedPhone = formatWhatsAppNumber(order.phone);
                          window.open(`https://wa.me/${formattedPhone}`, '_blank');
                        }}
                        className="text-emerald-500 hover:text-emerald-600 transition-colors"
                        title="Chat on WhatsApp"
                      >
                        <MessageCircle size={14} />
                      </button>
                    </div>
                  </td>
                  
                  <td className="p-4 align-middle text-start">
                    <p className="font-semibold text-slate-700">{order.governorate}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[150px]" title={order.address}>{order.address}</p>
                  </td>

                  <td className="p-4 align-middle text-start">
                    <div className="flex flex-col gap-2">
                      {order.items?.map((item, i) => {
                        const product = products.find(p => p.id === item.productId);
                        return (
                          <div key={i} className="flex items-center gap-2">
                            {product?.imageUrl ? (
                              <img src={product.imageUrl} alt={product?.name} className="w-8 h-8 object-cover rounded-md border border-slate-200 shrink-0" />
                            ) : (
                              <div className="w-8 h-8 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                                <PackageX size={14} className="text-slate-400" />
                              </div>
                            )}
                            <div className="flex flex-col">
                              <span className="text-[11px] font-bold text-slate-700 truncate max-w-[120px]">{product?.name || 'Unknown Product'}</span>
                              <span className="text-[10px] text-slate-500 font-medium">Size: {item.size} | Qty: {item.qty}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </td>

                  <td className="p-4 align-middle text-start">
                    <p className="font-black text-[#597867]">{order.total.toLocaleString('en-EG')} EGP</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-medium whitespace-nowrap">{t.incShipping} {order.shippingFee} EGP</p>
                  </td>

                  <td className="p-4 align-middle text-center">
                    <select
                      value={order.status}
                      onChange={(e) => handleStatusChange(order, e.target.value)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-full border outline-none cursor-pointer appearance-none text-center ${getStatusBadge(order.status)}`}
                      style={{ textAlignLast: 'center' }}
                    >
                      <option value="Pending" className="text-slate-700 bg-white">{t.pending}</option>
                      <option value="Shipped" className="text-slate-700 bg-white">{t.shipped}</option>
                      {order.status === 'Delivered' && (
                        <option value="Delivered" className="text-slate-700 bg-white">{t.delivered}</option>
                      )}
                      <option value="Delivered - Pending Cash" className="text-slate-700 bg-white">{t.deliveredPendingCash}</option>
                      <option value="Delivered - Collected" className="text-slate-700 bg-white">{t.deliveredCollected}</option>
                      <option value="Returned" className="text-slate-700 bg-white">{t.returned}</option>
                      <option value="Cancelled" className="text-slate-700 bg-white">{t.cancelled}</option>
                    </select>
                  </td>

                  <td className="p-4 align-middle px-6 text-end">
                    <div className="flex items-center justify-end gap-3">
                      <span className="text-xs font-semibold text-slate-500 hidden lg:inline">{order.createdBy}</span>
                      <button
                        onClick={() => { setOrderToEdit(order); setIsEditModalOpen(true); }}
                        className="text-slate-400 hover:text-blue-500 transition-colors p-2 rounded-lg hover:bg-blue-50 min-h-[44px] min-w-[44px] flex items-center justify-center"
                        title={t.editOrder}
                      >
                        <Pencil size={16} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))
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
              <p className="text-[13px] font-semibold text-slate-500">{t.noOrders}</p>
            </div>
          </div>
        ) : (
          filtered.map((order) => {
            const displayId = order.displayId || order.id;
            const itemsCount = order.items?.reduce((sum, item) => sum + item.qty, 0) || 0;
            return (
              <div key={order.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col gap-4">
                <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                  <div className="flex items-start gap-2">
                    <div>
                      <h3 className="font-extrabold text-[#181E1C]">{displayId}</h3>
                      <p className="text-[11px] text-slate-400 font-medium mt-0.5">{new Date(order.createdAt).toLocaleDateString()} · {itemsCount} items</p>
                    </div>
                    <button
                      onClick={() => { setOrderToEdit(order); setIsEditModalOpen(true); }}
                      className="text-slate-400 hover:text-blue-500 transition-colors p-2 rounded-lg hover:bg-blue-50 min-h-[44px] min-w-[44px] flex items-center justify-center -mt-2"
                      title={t.editOrder}
                    >
                      <Pencil size={16} />
                    </button>
                  </div>
                  <div className="text-end">
                    <p className="font-black text-[#597867]">{order.total.toLocaleString('en-EG')} EGP</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-medium">{t.incShipping} {order.shippingFee} EGP</p>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <p className="font-bold text-[#181E1C]">{order.customerName}</p>
                    <button
                      onClick={() => {
                        const formattedPhone = formatWhatsAppNumber(order.phone);
                        window.open(`https://wa.me/${formattedPhone}`, '_blank');
                      }}
                      className="text-emerald-600 hover:text-emerald-700 flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1.5 rounded-lg transition-colors"
                    >
                      <MessageCircle size={14} /> <span className="text-[11px] font-bold">{order.phone}</span>
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">{order.governorate} - {order.address}</p>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex flex-col gap-2">
                  {order.items?.map((item, i) => {
                    const product = products.find(p => p.id === item.productId);
                    return (
                      <div key={i} className="flex items-center gap-3 bg-white p-2 rounded-lg border border-slate-100">
                        {product?.imageUrl ? (
                          <img src={product.imageUrl} alt={product?.name} className="w-10 h-10 object-cover rounded-md border border-slate-200 shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                            <PackageX size={16} className="text-slate-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-700 truncate">{product?.name || 'Unknown Product'}</p>
                          <p className="text-[10px] text-slate-500 font-medium mt-0.5">{product?.sku || '---'}</p>
                        </div>
                        <div className="text-end shrink-0">
                          <p className="text-[11px] font-bold text-[#597867]">{item.size}</p>
                          <p className="text-[10px] font-medium text-slate-500">Qty: {item.qty}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="pt-1">
                  <select
                    value={order.status}
                    onChange={(e) => handleStatusChange(order, e.target.value)}
                    className={`w-full h-11 text-sm font-bold px-4 rounded-xl border outline-none appearance-none text-center ${getStatusBadge(order.status)}`}
                    style={{ textAlignLast: 'center' }}
                  >
                    <option value="Pending" className="text-slate-700 bg-white">{t.pending}</option>
                    <option value="Shipped" className="text-slate-700 bg-white">{t.shipped}</option>
                    {order.status === 'Delivered' && (
                      <option value="Delivered" className="text-slate-700 bg-white">{t.delivered}</option>
                    )}
                    <option value="Delivered - Pending Cash" className="text-slate-700 bg-white">{t.deliveredPendingCash}</option>
                    <option value="Delivered - Collected" className="text-slate-700 bg-white">{t.deliveredCollected}</option>
                    <option value="Returned" className="text-slate-700 bg-white">{t.returned}</option>
                    <option value="Cancelled" className="text-slate-700 bg-white">{t.cancelled}</option>
                  </select>
                </div>
              </div>
            );
          })
        )}
      </div>
      <ExportOrdersModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} />
      <EditOrderModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} orderToEdit={orderToEdit} />
    </div>
  );
}
