import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, PackageX } from 'lucide-react';
import { useStore } from '../store/useStore';
import { translations } from '../translations';

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
  const { orders, updateOrderStatus, language } = useStore();
  const t = translations[language];
  const [searchQuery, setSearchQuery] = useState('');

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
      </div>

      <div className="overflow-x-auto w-full">
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
                    <p className="text-[11px] text-slate-500 mt-0.5">{order.phone}</p>
                  </td>
                  
                  <td className="p-4 align-middle text-start">
                    <p className="font-semibold text-slate-700">{order.governorate}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[150px]" title={order.address}>{order.address}</p>
                  </td>

                  <td className="p-4 align-middle text-start">
                    <span className="inline-flex items-center justify-center px-2 py-1 rounded bg-slate-100 text-slate-600 text-xs font-bold">
                      {order.items?.reduce((sum, item) => sum + item.qty, 0) || 0} items
                    </span>
                  </td>

                  <td className="p-4 align-middle text-start">
                    <p className="font-black text-[#597867]">{order.total.toLocaleString('en-EG')} EGP</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-medium whitespace-nowrap">{t.incShipping} {order.shippingFee} EGP</p>
                  </td>

                  <td className="p-4 align-middle text-center">
                    <select
                      value={order.status}
                      onChange={(e) => updateOrderStatus(order.id, e.target.value)}
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
                    <span className="text-xs font-semibold text-slate-500">{order.createdBy}</span>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
