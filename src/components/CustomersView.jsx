import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Search, Crown, ShieldAlert, CheckCircle, AlertTriangle,
  MessageCircle, Eye, ArrowUpRight, Phone, MapPin, Calendar,
  ShoppingBag, Star, Clock, X, FileText, ChevronRight, UserX, UserCheck
} from 'lucide-react';
import { useStore, normalizePhone } from '../store/useStore';
import { translations } from '../translations';
import ThermalShippingLabelModal from './ThermalShippingLabelModal';
import OrderInvoiceModal from './OrderInvoiceModal';

function formatEGP(amount) {
  return (Number(amount) || 0).toLocaleString('en-EG') + ' EGP';
}

export default function CustomersView() {
  const {
    orders,
    deletedOrders,
    blacklist,
    toggleBlacklistCustomer,
    language
  } = useStore();
  const t = translations[language];

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL'); // 'ALL' | 'VIP' | 'RELIABLE' | 'AT_RISK' | 'BLACKLISTED'
  const [sortBy, setSortBy] = useState('LTV_DESC'); // 'LTV_DESC' | 'ORDERS_DESC' | 'SUCCESS_RATE_DESC' | 'RECENCY_DESC'
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [activeTabDetail, setActiveTabDetail] = useState('orders'); // 'orders' | 'notes'
  const [newNoteText, setNewNoteText] = useState('');
  const [customerNotes, setCustomerNotes] = useState({}); // phone -> array of notes

  // Invoice & Thermal label modals from customer order history
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState(null);
  const [selectedThermalOrder, setSelectedThermalOrder] = useState(null);

  // Aggregate customers from active orders
  const customersList = useMemo(() => {
    const map = new Map();

    const allOrders = [...(orders || [])];

    allOrders.forEach(order => {
      const rawPhone = order.phone || order.customerDetails?.phone || '';
      const cleanPhone = normalizePhone(rawPhone);
      if (!cleanPhone) return;

      if (!map.has(cleanPhone)) {
        map.set(cleanPhone, {
          id: cleanPhone,
          phone: rawPhone,
          cleanPhone,
          fullName: order.customerName || (order.customerDetails ? `${order.customerDetails.firstName || ''} ${order.customerDetails.lastName || ''}`.trim() : 'Customer'),
          governorate: order.governorate || order.customerDetails?.governorate || 'N/A',
          defaultAddress: order.address || order.customerDetails?.address || '',
          orders: [],
          totalOrdersCount: 0,
          deliveredOrdersCount: 0,
          returnedOrdersCount: 0,
          cancelledOrdersCount: 0,
          totalSpendLTV: 0,
          firstOrderDate: order.createdAt || null,
          latestOrderDate: order.createdAt || null,
          sizesCount: {}
        });
      }

      const c = map.get(cleanPhone);
      c.orders.push(order);
      c.totalOrdersCount += 1;

      // Check dates
      const orderDate = new Date(order.createdAt || 0).getTime();
      if (!c.firstOrderDate || orderDate < new Date(c.firstOrderDate).getTime()) {
        c.firstOrderDate = order.createdAt;
      }
      if (!c.latestOrderDate || orderDate > new Date(c.latestOrderDate).getTime()) {
        c.latestOrderDate = order.createdAt;
        // Keep most recent customer name and address updated
        if (order.customerName) c.fullName = order.customerName;
        if (order.governorate) c.governorate = order.governorate;
        if (order.address) c.defaultAddress = order.address;
      }

      const isDelivered = order.status === 'Delivered - Collected' || order.status === 'Delivered' || order.status === 'Delivered - Pending Cash';
      if (isDelivered) {
        c.deliveredOrdersCount += 1;
        c.totalSpendLTV += Number(order.total ?? order.totals?.grandTotal ?? 0);
      } else if (order.status === 'Returned') {
        c.returnedOrdersCount += 1;
      } else if (order.status === 'Cancelled') {
        c.cancelledOrdersCount += 1;
      }

      // Sizes counter
      (order.items || []).forEach(item => {
        if (item.size) {
          const qty = Number(item.qty || item.quantity) || 1;
          c.sizesCount[item.size] = (c.sizesCount[item.size] || 0) + qty;
        }
      });
    });

    // Convert map to array and compute badges & preferred sizes
    return Array.from(map.values()).map(c => {
      // Sort orders descending
      c.orders.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

      c.deliverySuccessRate = c.totalOrdersCount > 0
        ? Math.round((c.deliveredOrdersCount / c.totalOrdersCount) * 100)
        : 0;

      c.averageOrderValue = c.deliveredOrdersCount > 0
        ? Math.round(c.totalSpendLTV / c.deliveredOrdersCount)
        : 0;

      // Sorted preferred sizes
      c.preferredSizes = Object.entries(c.sizesCount)
        .sort((a, b) => b[1] - a[1])
        .map(([size, count]) => ({ size, count }));

      // Check blacklist
      c.isBlacklisted = (blacklist || []).some(b => normalizePhone(b.phone) === c.cleanPhone);

      // Determine customer badge
      if (c.isBlacklisted) {
        c.badge = 'BLACKLISTED';
      } else if (c.deliveredOrdersCount >= 3 || c.totalSpendLTV >= 2500) {
        c.badge = 'VIP';
      } else if (c.totalOrdersCount >= 2 && c.deliverySuccessRate >= 75) {
        c.badge = 'RELIABLE';
      } else if (c.returnedOrdersCount >= 2 || (c.totalOrdersCount >= 2 && c.deliverySuccessRate < 50)) {
        c.badge = 'AT_RISK';
      } else {
        c.badge = 'NEW';
      }

      return c;
    });
  }, [orders, blacklist]);

  // Filter & Sort
  const filteredCustomers = useMemo(() => {
    return customersList.filter(c => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q ||
        c.fullName.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.cleanPhone.includes(q) ||
        c.governorate.toLowerCase().includes(q);

      const matchesFilter = filterType === 'ALL' || c.badge === filterType;
      return matchesSearch && matchesFilter;
    }).sort((a, b) => {
      if (sortBy === 'LTV_DESC') return b.totalSpendLTV - a.totalSpendLTV;
      if (sortBy === 'ORDERS_DESC') return b.totalOrdersCount - a.totalOrdersCount;
      if (sortBy === 'SUCCESS_RATE_DESC') return b.deliverySuccessRate - a.deliverySuccessRate;
      if (sortBy === 'RECENCY_DESC') return new Date(b.latestOrderDate || 0) - new Date(a.latestOrderDate || 0);
      return 0;
    });
  }, [customersList, searchQuery, filterType, sortBy]);

  // Overall CRM KPIs
  const totalCustomersCount = customersList.length;
  const vipCount = customersList.filter(c => c.badge === 'VIP').length;
  const totalCRM_LTV = customersList.reduce((sum, c) => sum + c.totalSpendLTV, 0);
  const avgCRM_LTV = totalCustomersCount > 0 ? Math.round(totalCRM_LTV / totalCustomersCount) : 0;
  const avgSuccessRate = totalCustomersCount > 0
    ? Math.round(customersList.reduce((sum, c) => sum + c.deliverySuccessRate, 0) / totalCustomersCount)
    : 0;

  const handleAddNote = (phone) => {
    if (!newNoteText.trim()) return;
    const note = {
      text: newNoteText.trim(),
      date: new Date().toISOString()
    };
    setCustomerNotes(prev => ({
      ...prev,
      [phone]: [...(prev[phone] || []), note]
    }));
    setNewNoteText('');
  };

  const getBadgeElement = (badge) => {
    switch (badge) {
      case 'VIP':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
            <Crown size={12} className="text-purple-600" /> VIP
          </span>
        );
      case 'RELIABLE':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle size={12} className="text-emerald-600" /> {t.reliable}
          </span>
        );
      case 'AT_RISK':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
            <AlertTriangle size={12} className="text-amber-600" /> {t.atRisk}
          </span>
        );
      case 'BLACKLISTED':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-200">
            <ShieldAlert size={12} className="text-red-600" /> {t.blacklisted}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            {t.newCustomer}
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.totalCustomers}</p>
            <p className="text-2xl font-black text-[#181E1C] mt-1">{totalCustomersCount.toLocaleString()}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Users size={24} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.vipCustomers}</p>
            <p className="text-2xl font-black text-purple-600 mt-1">{vipCount.toLocaleString()}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Crown size={24} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.avgLTV}</p>
            <p className="text-2xl font-black text-[#597867] mt-1">{formatEGP(avgCRM_LTV)}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ShoppingBag size={24} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.successRate}</p>
            <p className="text-2xl font-black text-slate-800 mt-1">{avgSuccessRate}%</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center">
            <CheckCircle size={24} />
          </div>
        </div>
      </div>

      {/* Main Customers Directory Table Container */}
      <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-slate-100 overflow-hidden">
        {/* Search & Filter Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={t.searchPlaceholder || 'Search customer name, phone, governorate...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-[#597867] focus:bg-white transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
              {[
                { id: 'ALL', label: t.allCustomers },
                { id: 'VIP', label: t.vipCustomers },
                { id: 'RELIABLE', label: t.reliable },
                { id: 'AT_RISK', label: t.atRisk },
                { id: 'BLACKLISTED', label: t.blacklisted }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilterType(f.id)}
                  className={`px-3 py-2 rounded-xl font-bold whitespace-nowrap transition-all ${
                    filterType === f.id
                      ? 'bg-[#181E1C] text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-[#597867]"
            >
              <option value="LTV_DESC">Top LTV (EGP)</option>
              <option value="ORDERS_DESC">Most Orders</option>
              <option value="SUCCESS_RATE_DESC">Highest Success Rate %</option>
              <option value="RECENCY_DESC">Most Recent Order</option>
            </select>
          </div>
        </div>

        {/* Desktop Customers Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-start border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 uppercase tracking-wider text-slate-500 font-bold">
                <th className="p-4 px-6 text-start">{t.customer}</th>
                <th className="p-4 text-start">{t.location}</th>
                <th className="p-4 text-center">{t.ordersCount}</th>
                <th className="p-4 text-center">{t.successRate}</th>
                <th className="p-4 text-start">LTV / AOV</th>
                <th className="p-4 text-center">Status Badge</th>
                <th className="p-4 px-6 text-end">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-12 text-center text-slate-400">
                    <Users size={36} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-semibold">{t.noData || 'No customers found'}</p>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => {
                  const whatsAppPhone = '20' + customer.cleanPhone;
                  return (
                    <tr key={customer.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 px-6 whitespace-nowrap text-start">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-extrabold text-[#181E1C]">
                            {customer.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-extrabold text-sm text-[#181E1C]">{customer.fullName}</p>
                            <p className="text-xs text-slate-500 font-mono mt-0.5">{customer.phone}</p>
                          </div>
                        </div>
                      </td>

                      <td className="p-4 whitespace-nowrap text-start">
                        <span className="font-bold text-slate-800 block">{customer.governorate}</span>
                        <span className="text-[11px] text-slate-400 truncate max-w-[180px] block" title={customer.defaultAddress}>
                          {customer.defaultAddress || '—'}
                        </span>
                      </td>

                      <td className="p-4 text-center whitespace-nowrap">
                        <span className="font-extrabold text-slate-900 text-sm">{customer.totalOrdersCount}</span>
                        <span className="text-[11px] text-slate-400 block font-medium">
                          ({customer.deliveredOrdersCount} {t.deliveredOrdersCount} · {customer.returnedOrdersCount} {t.returnedOrdersCount})
                        </span>
                      </td>

                      <td className="p-4 text-center whitespace-nowrap">
                        <div className="inline-flex flex-col items-center">
                          <span className={`text-xs font-black ${
                            customer.deliverySuccessRate >= 75 ? 'text-emerald-600' :
                            customer.deliverySuccessRate >= 50 ? 'text-amber-600' : 'text-red-600'
                          }`}>
                            {customer.deliverySuccessRate}%
                          </span>
                          <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                            <div
                              className={`h-full rounded-full ${
                                customer.deliverySuccessRate >= 75 ? 'bg-emerald-500' :
                                customer.deliverySuccessRate >= 50 ? 'bg-amber-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${customer.deliverySuccessRate}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="p-4 whitespace-nowrap text-start">
                        <p className="font-black text-sm text-[#597867]">{formatEGP(customer.totalSpendLTV)}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                          AOV: {formatEGP(customer.averageOrderValue)}
                        </p>
                      </td>

                      <td className="p-4 text-center whitespace-nowrap">
                        {getBadgeElement(customer.badge)}
                      </td>

                      <td className="p-4 px-6 text-end whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* WhatsApp Action */}
                          <a
                            href={`https://wa.me/${whatsAppPhone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
                            title="Direct WhatsApp"
                          >
                            <MessageCircle size={16} />
                          </a>

                          {/* Customer 360 Detail Trigger */}
                          <button
                            onClick={() => setSelectedCustomer(customer)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-[#181E1C] hover:bg-black text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                            title={t.customerDetails}
                          >
                            <Eye size={13} />
                            <span>{t.customerDetails}</span>
                          </button>

                          {/* Blacklist Toggle */}
                          <button
                            onClick={() => toggleBlacklistCustomer({
                              phone: customer.cleanPhone,
                              customerName: customer.fullName,
                              reason: customer.isBlacklisted ? '' : 'Manually flagged from CRM'
                            })}
                            className={`p-2 rounded-xl transition-colors ${
                              customer.isBlacklisted
                                ? 'text-red-600 hover:bg-red-50'
                                : 'text-slate-400 hover:text-red-500 hover:bg-slate-100'
                            }`}
                            title={customer.isBlacklisted ? t.removeFromBlacklist : t.blacklistCustomer}
                          >
                            {customer.isBlacklisted ? <UserCheck size={16} /> : <UserX size={16} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Customer Cards List */}
        <div className="md:hidden flex flex-col divide-y divide-slate-100">
          {filteredCustomers.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Users size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm font-semibold">{t.noData || 'No customers found'}</p>
            </div>
          ) : (
            filteredCustomers.map(customer => {
              const whatsAppPhone = '20' + customer.cleanPhone;
              return (
                <div key={customer.id} className="p-4 flex flex-col gap-3 bg-white">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-extrabold text-[#181E1C]">
                        {customer.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-black text-sm text-[#181E1C]">{customer.fullName}</h4>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">{customer.phone}</p>
                      </div>
                    </div>
                    {getBadgeElement(customer.badge)}
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl text-center">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400">LTV Spent</p>
                      <p className="text-xs font-black text-[#597867]">{formatEGP(customer.totalSpendLTV)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400">Success Rate</p>
                      <p className="text-xs font-black text-slate-800">{customer.deliverySuccessRate}% ({customer.deliveredOrdersCount}/{customer.totalOrdersCount})</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-bold text-slate-500">📍 {customer.governorate}</span>
                    <div className="flex items-center gap-2">
                      <a
                        href={`https://wa.me/${whatsAppPhone}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-emerald-600 bg-emerald-50 rounded-xl"
                      >
                        <MessageCircle size={16} />
                      </a>
                      <button
                        onClick={() => setSelectedCustomer(customer)}
                        className="px-3 py-1.5 bg-[#181E1C] text-white text-xs font-bold rounded-xl"
                      >
                        {t.customerDetails}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Customer 360 Detail Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden max-h-[90vh] my-auto"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-100 bg-slate-50/70 flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#181E1C] to-[#3a4743] text-white flex items-center justify-center font-black text-xl shadow-md">
                  {selectedCustomer.fullName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-[#181E1C]">{selectedCustomer.fullName}</h3>
                    {getBadgeElement(selectedCustomer.badge)}
                  </div>
                  <p className="text-xs text-slate-500 font-mono mt-1">
                    📞 {selectedCustomer.phone} · 📍 {selectedCustomer.governorate}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {selectedCustomer.defaultAddress}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`https://wa.me/20${selectedCustomer.cleanPhone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs transition-colors"
                >
                  <MessageCircle size={15} />
                  <span>WhatsApp</span>
                </a>
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* 4 Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">LTV Spent</span>
                  <span className="text-base font-black text-[#597867] mt-1 block">
                    {formatEGP(selectedCustomer.totalSpendLTV)}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Avg Order (AOV)</span>
                  <span className="text-base font-black text-slate-800 mt-1 block">
                    {formatEGP(selectedCustomer.averageOrderValue)}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Orders Placed</span>
                  <span className="text-base font-black text-slate-800 mt-1 block">
                    {selectedCustomer.totalOrdersCount}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Delivery Rate</span>
                  <span className={`text-base font-black mt-1 block ${
                    selectedCustomer.deliverySuccessRate >= 75 ? 'text-emerald-600' : 'text-amber-600'
                  }`}>
                    {selectedCustomer.deliverySuccessRate}%
                  </span>
                </div>
              </div>

              {/* Preferred Sizes Badges */}
              {selectedCustomer.preferredSizes && selectedCustomer.preferredSizes.length > 0 && (
                <div>
                  <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider mb-2">
                    {t.preferredSizes}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedCustomer.preferredSizes.map(ps => (
                      <span key={ps.size} className="px-3 py-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-black text-slate-800 flex items-center gap-1.5">
                        <span>{ps.size}</span>
                        <span className="text-[10px] bg-white px-1.5 py-0.2 rounded-full text-slate-500 font-bold">
                          {ps.count}x
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Tabs for Order Timeline vs Notes */}
              <div className="border-t border-slate-100 pt-4">
                <div className="flex items-center gap-3 border-b border-slate-200 pb-2 mb-4">
                  <button
                    onClick={() => setActiveTabDetail('orders')}
                    className={`text-xs font-black pb-1 border-b-2 transition-colors ${
                      activeTabDetail === 'orders' ? 'border-[#181E1C] text-[#181E1C]' : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {t.orderHistory} ({selectedCustomer.orders.length})
                  </button>
                  <button
                    onClick={() => setActiveTabDetail('notes')}
                    className={`text-xs font-black pb-1 border-b-2 transition-colors ${
                      activeTabDetail === 'notes' ? 'border-[#181E1C] text-[#181E1C]' : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {t.customerNotes} ({customerNotes[selectedCustomer.cleanPhone]?.length || 0})
                  </button>
                </div>

                {activeTabDetail === 'orders' ? (
                  <div className="space-y-3">
                    {selectedCustomer.orders.map((order, idx) => {
                      const displayId = order.displayId || order.orderId || order.id?.slice(0, 8) || 'ORD';
                      const isDelivered = order.status === 'Delivered - Collected' || order.status === 'Delivered';
                      return (
                        <div key={order.id || idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-xs text-[#181E1C]">#{displayId}</span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                                isDelivered ? 'bg-emerald-100 text-emerald-800' :
                                order.status === 'Returned' ? 'bg-slate-200 text-slate-700' :
                                order.status === 'Cancelled' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {order.status}
                              </span>
                              {order.orderType === 'exchange' && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700">
                                  🔁 Exchange
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500">
                              {new Date(order.createdAt || 0).toLocaleDateString()} · {(order.items || []).map(i => `${i.productName || 'Item'} (${i.size} x${i.qty || 1})`).join(', ')}
                            </p>
                          </div>

                          <div className="flex items-center gap-3 self-end sm:self-center">
                            <span className="font-mono font-black text-sm text-[#181E1C]">
                              {formatEGP(order.total ?? order.totals?.grandTotal ?? 0)}
                            </span>
                            <button
                              onClick={() => setSelectedThermalOrder(order)}
                              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-white rounded-xl border border-slate-200 transition-colors"
                              title={t.printShippingLabel}
                            >
                              <FileText size={15} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Add Note Form */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Add internal note about this customer..."
                        value={newNoteText}
                        onChange={(e) => setNewNoteText(e.target.value)}
                        className="flex-1 text-xs border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-[#597867]"
                      />
                      <button
                        onClick={() => handleAddNote(selectedCustomer.cleanPhone)}
                        className="px-4 py-2 bg-[#597867] text-white text-xs font-bold rounded-xl hover:bg-[#465f52] transition-colors"
                      >
                        {t.addCustomerNote}
                      </button>
                    </div>

                    {/* Notes List */}
                    <div className="space-y-2 mt-3">
                      {(customerNotes[selectedCustomer.cleanPhone] || []).length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-4">No internal notes for this customer yet.</p>
                      ) : (
                        customerNotes[selectedCustomer.cleanPhone].map((n, i) => (
                          <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center text-xs">
                            <span className="font-semibold text-slate-700">{n.text}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(n.date).toLocaleDateString()}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
              <button
                onClick={() => toggleBlacklistCustomer({
                  phone: selectedCustomer.cleanPhone,
                  customerName: selectedCustomer.fullName,
                  reason: selectedCustomer.isBlacklisted ? '' : 'Flagged from CRM'
                })}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors ${
                  selectedCustomer.isBlacklisted
                    ? 'bg-red-50 text-red-600 hover:bg-red-100'
                    : 'bg-slate-200 text-slate-700 hover:bg-red-50 hover:text-red-600'
                }`}
              >
                {selectedCustomer.isBlacklisted ? t.removeFromBlacklist : t.blacklistCustomer}
              </button>

              <button
                onClick={() => setSelectedCustomer(null)}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-colors"
              >
                {t.close || 'Close'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Sub-modals for invoice and thermal sticker */}
      <ThermalShippingLabelModal
        isOpen={!!selectedThermalOrder}
        onClose={() => setSelectedThermalOrder(null)}
        order={selectedThermalOrder}
      />
      <OrderInvoiceModal
        isOpen={!!selectedInvoiceOrder}
        onClose={() => setSelectedInvoiceOrder(null)}
        order={selectedInvoiceOrder}
      />
    </div>
  );
}
