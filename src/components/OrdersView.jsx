import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, PackageX, Download, MessageCircle, Pencil, AlertCircle, Check, Trash2, X, Tag, FileText } from 'lucide-react';
import { useStore } from '../store/useStore';
import { translations } from '../translations';
import ExportOrdersModal from './ExportOrdersModal';
import EditOrderModal from './EditOrderModal';
import OrderInvoiceModal from './OrderInvoiceModal';
import ImageLightbox from './ImageLightbox';

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

const formatDate = (dateValue) => {
  if (!dateValue) return 'N/A';
  if (dateValue.toDate) return dateValue.toDate().toLocaleDateString();
  return new Date(dateValue).toLocaleDateString();
};

const ReturnReasonBlock = ({ order }) => {
  const { updateOrderReturnReason, language } = useStore();
  const t = translations[language];
  const [isEditing, setIsEditing] = useState(!order.returnReason);
  const [reason, setReason] = useState(order.returnReason || '');

  const handleSave = () => {
    updateOrderReturnReason(order.id, reason);
    setIsEditing(false);
  };

  if (order.status !== 'Returned') return null;

  return (
    <div className="my-2 bg-red-50/80 border border-red-100 rounded-xl p-3 w-full">
      <div className="flex items-start gap-2">
        <div className="mt-0.5 shrink-0 text-red-500">
          <AlertCircle size={14} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold text-red-800 uppercase tracking-wider mb-1.5 text-start">{t.returnReason}</p>
          {isEditing ? (
            <div className="flex flex-col gap-2">
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t.returnReasonPrompt}
                className="w-full bg-white border border-red-200 rounded-lg px-3 py-2 text-xs text-slate-700 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/20 text-start"
                autoFocus
              />
              <div className="flex justify-end">
                <button
                  onClick={handleSave}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 shadow-sm shadow-red-500/20 text-white text-[11px] font-bold rounded-lg transition-colors"
                >
                  <Check size={12} strokeWidth={3} /> {t.saveReason}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-between items-start gap-3">
              <p className="text-xs font-semibold text-red-700 leading-relaxed break-words text-start">
                {order.returnReason || t.noReasonProvided}
              </p>
              <button
                onClick={() => setIsEditing(true)}
                className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-100/50 rounded-md transition-colors shrink-0 -mt-1"
                title={t.editReason}
              >
                <Pencil size={12} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const OrderNotesBlock = ({ order }) => {
  const { addOrderNote, deleteOrderNote, language } = useStore();
  const t = translations[language];
  const [newNote, setNewNote] = useState('');

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    await addOrderNote(order.id, newNote.trim());
    setNewNote('');
  };

  const formatNoteDate = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isRtl = language === 'ar';

  return (
    <div className={`my-2 bg-slate-50/80 border border-slate-100 rounded-xl p-4 w-full ${isRtl ? 'text-right' : 'text-left'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5 justify-start">
        <MessageCircle size={14} className="text-slate-400" /> {t.internalNotes}
      </h4>
      
      {/* Existing Notes list */}
      <div className="flex flex-col gap-2 max-h-48 overflow-y-auto mb-3 pr-1">
        {!order.notes || order.notes.length === 0 ? (
          <p className="text-xs text-slate-400 italic text-start">{t.noNotes}</p>
        ) : (
          order.notes.map((note, index) => (
            <div key={index} className="bg-white rounded-lg p-2.5 border border-slate-100 shadow-sm text-start relative group">
              <div className="flex justify-between items-center gap-2 mb-1 flex-wrap">
                <span className="text-[11px] font-bold text-[#181E1C]">{note.createdBy}</span>
                <span className="text-[9px] text-slate-400 font-medium">{formatNoteDate(note.createdAt)}</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed break-words font-semibold text-start pr-6">{note.text}</p>
              <button
                type="button"
                onClick={() => deleteOrderNote(order.id, note.createdAt)}
                className="absolute top-2 right-2 text-slate-400 hover:text-red-500 transition-colors p-1 rounded hover:bg-red-50 opacity-60 hover:opacity-100"
                title={t.deleteNote}
              >
                <X size={12} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Add Note Form */}
      <form onSubmit={handleAddNote} className="flex gap-2">
        <input
          type="text"
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder={t.notePlaceholder}
          className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 outline-none focus:border-[#597867] focus:ring-2 focus:ring-[#597867]/10 text-start"
        />
        <button
          type="submit"
          disabled={!newNote.trim()}
          className="px-3.5 py-2 bg-[#597867] hover:bg-[#486253] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shrink-0"
        >
          {t.addNote}
        </button>
      </form>
    </div>
  );
};

export default function OrdersView() {
  const { orders, updateOrderStatus, language, products, deleteOrder } = useStore();
  const t = translations[language];
  const [searchQuery, setSearchQuery] = useState('');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [orderToEdit, setOrderToEdit] = useState(null);
  const [invoiceOrder, setInvoiceOrder] = useState(null);
  const [lightboxImg, setLightboxImg] = useState(null);
  const [activeNotesOrderIds, setActiveNotesOrderIds] = useState({});
  const [orderToDelete, setOrderToDelete] = useState(null);

  const toggleNotes = (orderId) => {
    setActiveNotesOrderIds(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  const formatWhatsAppNumber = (phone) => {
    if (!phone) return '';
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('01')) {
      cleaned = '20' + cleaned.substring(1);
    }
    return cleaned;
  };

  const handleStatusChange = (order, newStatus) => {
    updateOrderStatus(order.id, newStatus);

    if (newStatus === 'Shipped') {
      const cPhone = order.phone || order.customerDetails?.phone || '';
      const formattedPhone = formatWhatsAppNumber(cPhone);
      const displayId = order.orderId || order.orderNumber || order.customId || order.order_id || order.displayId || order.id;
      const shortId = displayId.length > 10 ? displayId.substring(displayId.length - 4) : displayId;
      const cName = order.customerName || order.customerDetails?.firstName || 'العميل';
      const cTotal = order.totalAmount || order.total || order.totals?.total || order.totals?.grandTotal || 0;

      const message = `أهلاً يا ${cName} 👋\nأوردرك من TOJA طلع مع شركة الشحن وهو في الطريق ليك دلوقتي! 🚚\nرقم الأوردر: ${shortId}\nإجمالي الحساب: ${cTotal} جنيه\nلو في أي استفسار إحنا دايماً معاك.`;

      const encodedMessage = encodeURIComponent(message);
      window.open(`https://wa.me/${formattedPhone}?text=${encodedMessage}`, '_blank');
    }
  };

  const filtered = orders.filter((o) => {
    const q = searchQuery.toLowerCase();
    const displayId = o.orderId || o.orderNumber || o.customId || o.order_id || o.displayId || o.id;
    const cName = o.customerName || (o.customerDetails ? `${o.customerDetails.firstName} ${o.customerDetails.lastName}` : '');
    const cPhone = o.phone || o.customerDetails?.phone || '';
    return displayId.toLowerCase().includes(q) ||
      cName.toLowerCase().includes(q) ||
      cPhone.includes(q);
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
      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[1000px] text-start border-collapse whitespace-nowrap">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-bold">
              <th className="p-4 px-6 font-semibold text-start">{t.orderIdDate}</th>
              <th className="p-4 font-semibold text-start">{t.customer}</th>
              <th className="p-4 font-semibold text-start hidden md:table-cell">{t.location}</th>
              <th className="p-4 font-semibold text-start hidden md:table-cell">{t.items}</th>
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
              filtered.map((order, index) => {
                console.log("Raw Admin Order Data:", order);
                const cName = order.customerName || (order.customerDetails ? `${order.customerDetails.firstName} ${order.customerDetails.lastName}` : 'Unknown');
                const cPhone = order.phone || order.customerDetails?.phone || '';
                const cCity = order.governorate || order.customerDetails?.city || 'Unknown';
                const cAddress = order.address || order.customerDetails?.address || '';
                const cTotal = order.totalAmount || order.total || order.totals?.total || order.totals?.grandTotal || 0;
                const displayId = order.orderId || order.orderNumber || order.customId || order.order_id || order.displayId || order.id;
                const cShipping = order.shippingFee ?? order.totals?.shipping ?? 0;

                return (
                  <React.Fragment key={order.id}>
                    <motion.tr
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="p-4 px-6 align-middle text-start">
                        <button
                          type="button"
                          onClick={() => setInvoiceOrder(order)}
                          className="font-extrabold text-[#181E1C] hover:text-[#597867] hover:underline transition-colors text-start cursor-pointer"
                          title={t.orderDetails}
                        >
                          {displayId}
                        </button>
                        <p className="text-[10px] text-slate-400 mt-0.5 font-medium">{formatDate(order.createdAt)}</p>
                      </td>

                      <td className="p-4 align-middle text-start">
                        <p className="font-bold text-[#181E1C]">{cName}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-[11px] text-slate-500">{cPhone}</p>
                          <button
                            onClick={() => {
                              const formattedPhone = formatWhatsAppNumber(cPhone);
                              window.open(`https://wa.me/${formattedPhone}`, '_blank');
                            }}
                            className="text-emerald-500 hover:text-emerald-600 transition-colors"
                            title="Chat on WhatsApp"
                          >
                            <MessageCircle size={14} />
                          </button>
                        </div>
                      </td>

                      <td className="p-4 align-middle text-start hidden md:table-cell">
                        <p className="font-semibold text-slate-700">{cCity}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[150px]" title={cAddress}>{cAddress}</p>
                      </td>

                      <td className="p-4 align-middle text-start hidden md:table-cell">
                        <div className="flex flex-col gap-2">
                          {order.items?.map((item, i) => {
                            const product = products.find(p => p.id === item.productId) || item;
                            return (
                              <div key={i} className="flex items-center gap-2">
                                {product?.imageUrl || product?.image ? (
                                  <img
                                    src={product?.imageUrl || product?.image}
                                    alt={product?.name}
                                    className="w-8 h-8 object-cover rounded-md border border-slate-200 shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={() => setLightboxImg(product?.imageUrl || product?.image)}
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                                    <PackageX size={14} className="text-slate-400" />
                                  </div>
                                )}
                                <div className="flex flex-col">
                                  <span className="text-[11px] font-bold text-slate-700 truncate max-w-[120px]">{product?.name || 'Unknown Product'}</span>
                                  <span className="text-[10px] text-slate-500 font-medium">Size: {item.size} | Qty: {item.qty || item.quantity}</span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </td>

                      <td className="p-4 align-middle text-start">
                        <p className="font-bold text-[#597867]">{cTotal.toLocaleString('en-EG')} EGP</p>
                        <div className="flex flex-col gap-0.5 mt-0.5">
                          <p className="text-[10px] text-slate-500">Shipping: {cShipping} EGP</p>
                          {order.discount?.amount > 0 && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 rounded w-fit">
                              <Tag size={9} /> -{Number(order.discount.amount).toLocaleString('en-EG')} EGP ({order.discount.type === 'percentage' ? `${order.discount.value}%` : 'Fixed'})
                            </span>
                          )}
                        </div>
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
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-xs font-semibold text-slate-500 hidden lg:inline">{order.createdBy || 'Website'}</span>
                          
                          <button
                            onClick={() => setInvoiceOrder(order)}
                            className="text-slate-400 hover:text-[#597867] transition-colors p-2 rounded-lg hover:bg-emerald-50 min-h-[44px] min-w-[44px] flex items-center justify-center"
                            title={t.orderDetails}
                          >
                            <FileText size={16} />
                          </button>

                          <button
                            onClick={() => toggleNotes(order.id)}
                            className={`relative p-2 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ${activeNotesOrderIds[order.id] ? 'bg-slate-100 text-slate-700' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`}
                            title={t.internalNotes}
                          >
                            <MessageCircle size={16} />
                            {order.notes && order.notes.length > 0 && (
                              <span className="absolute top-1.5 right-1.5 bg-[#597867] text-white text-[9px] font-black rounded-full h-4 w-4 flex items-center justify-center border border-white shadow-sm">
                                {order.notes.length}
                              </span>
                            )}
                          </button>

                          <button
                            onClick={() => { setOrderToEdit(order); setIsEditModalOpen(true); }}
                            className="text-slate-400 hover:text-blue-500 transition-colors p-2 rounded-lg hover:bg-blue-50 min-h-[44px] min-w-[44px] flex items-center justify-center"
                            title={t.editOrder}
                          >
                            <Pencil size={16} />
                          </button>

                          <button
                            onClick={() => setOrderToDelete(order)}
                            className="text-slate-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50 min-h-[44px] min-w-[44px] flex items-center justify-center"
                            title={t.deleteOrder}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                    {activeNotesOrderIds[order.id] && (
                      <motion.tr
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="bg-slate-50/10"
                      >
                        <td colSpan="7" className="px-6 py-2 border-b border-slate-50">
                          <OrderNotesBlock order={order} />
                        </td>
                      </motion.tr>
                    )}
                    {order.status === 'Returned' && (
                      <motion.tr
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="bg-slate-50/30"
                      >
                        <td colSpan="7" className="px-6 py-0 border-b border-slate-50">
                          <ReturnReasonBlock order={order} />
                        </td>
                      </motion.tr>
                    )}
                  </React.Fragment>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <ExportOrdersModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} />
      <EditOrderModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} orderToEdit={orderToEdit} />
      <OrderInvoiceModal isOpen={!!invoiceOrder} onClose={() => setInvoiceOrder(null)} order={invoiceOrder} />
      <ImageLightbox isOpen={!!lightboxImg} imageUrl={lightboxImg} onClose={() => setLightboxImg(null)} />

      {orderToDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" dir={language === 'ar' ? 'rtl' : 'ltr'}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white w-full max-w-md rounded-2xl p-6 shadow-xl border border-slate-100 flex flex-col gap-4 text-start"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-50 rounded-xl text-red-500 shrink-0">
                <Trash2 size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-extrabold text-slate-900 leading-6">
                  {t.deleteConfirmTitle}
                </h3>
                <p className="text-sm font-semibold text-slate-500 leading-relaxed mt-1">
                  {t.deleteConfirmPrompt}
                </p>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-2">
              <button
                onClick={() => setOrderToDelete(null)}
                className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-extrabold rounded-xl transition-colors min-h-[40px]"
              >
                {t.cancel}
              </button>
              <button
                onClick={async () => {
                  const id = orderToDelete.id;
                  setOrderToDelete(null);
                  await deleteOrder(id);
                }}
                className="px-4 py-2.5 bg-red-500 hover:bg-red-600 shadow-md shadow-red-500/20 text-white text-xs font-extrabold rounded-xl transition-colors min-h-[40px]"
              >
                {t.delete}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}