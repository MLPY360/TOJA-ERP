import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  PackageX,
  Download,
  MessageCircle,
  Pencil,
  AlertCircle,
  Check,
  Trash2,
  X,
  Tag,
  FileText,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  ArrowLeftRight,
  Split,
  RefreshCw,
  Printer
} from 'lucide-react';
import { useStore, normalizePhone } from '../store/useStore';
import { translations } from '../translations';
import ExportOrdersModal from './ExportOrdersModal';
import EditOrderModal from './EditOrderModal';
import OrderInvoiceModal from './OrderInvoiceModal';
import ThermalShippingLabelModal from './ThermalShippingLabelModal';
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

const formatWhatsAppNumber = (phone) => {
  if (!phone) return '';
  const clean = normalizePhone(phone);
  return '20' + clean;
};

const getWhatsAppTemplates = (order, t) => {
  const cName = order.customerName || order.customerDetails?.firstName || 'العميل';
  const displayId = order.orderId || order.orderNumber || order.customId || order.order_id || order.displayId || order.id;
  const shortId = displayId.length > 10 ? displayId.substring(displayId.length - 4) : displayId;
  const cTotal = (order.totalAmount || order.total || order.totals?.total || order.totals?.grandTotal || 0).toLocaleString('en-EG');
  const itemsSummary = (order.items || []).map(i => `${i.size} x${i.qty || i.quantity || 1}`).join(', ');

  return [
    {
      id: 'confirmation',
      title: t.confirmOrderWhatsApp,
      statusMatch: 'Pending',
      text: `أهلاً يا ${cName} 👋\nشكرًا لطلبك من TOJA! 🛍️\nرقم الأوردر: ${shortId}\nالمقاسات: ${itemsSummary || 'طلب ملابس'}\nإجمالي الحساب: ${cTotal} ج.م\nيرجى الرد لتأكيد العنوان وبدء تجهيز الشحنة فوراً!`
    },
    {
      id: 'shipped',
      title: t.dispatchOrderWhatsApp,
      statusMatch: 'Shipped',
      text: `أهلاً يا ${cName} 👋\nأوردرك من TOJA طلع مع شركة الشحن وهو في الطريق ليك دلوقتي! 🚚\nرقم الأوردر: ${shortId}\nإجمالي المطلوب عند الاستلام: ${cTotal} ج.م\nالمندوب هيتواصل معاك هاتفياً لتسليم الشحنة.`
    },
    {
      id: 'followup',
      title: t.followUpWhatsApp,
      statusMatch: 'Delivered',
      text: `أهلاً يا ${cName} 👋\nنتمنى تكون شحنتك من TOJA وصلت بسلام وعجبتك! ❤️\nلو المقاس محتاج استبدال أو عندك أي استفسار، إحنا معاك وتحت أمرك في أي وقت.`
    }
  ];
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

  return (
    <div className="my-2 bg-slate-50 border border-slate-200/80 rounded-xl p-3 w-full flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider text-start">{t.internalNotes}</p>
        <span className="text-[10px] font-medium text-slate-400">{order.notes?.length || 0} notes</span>
      </div>

      <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
        {!order.notes || order.notes.length === 0 ? (
          <p className="text-xs text-slate-400 italic text-start py-1">{t.noNotes}</p>
        ) : (
          order.notes.map((note, idx) => (
            <div key={idx} className="bg-white p-2.5 rounded-lg border border-slate-100 shadow-sm flex flex-col gap-1 relative group text-start">
              <p className="text-xs font-medium text-slate-700 leading-relaxed pr-6">{note.text}</p>
              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                <span className="font-semibold text-slate-500">{note.author}</span>
                <span>•</span>
                <span>{new Date(note.createdAt).toLocaleString()}</span>
              </div>
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

function BlacklistModal({ isOpen, onClose, customer, onToggle, language }) {
  const t = translations[language];
  const [reason, setReason] = useState(customer?.blacklistRecord?.reason || '');

  React.useEffect(() => {
    setReason(customer?.blacklistRecord?.reason || '');
  }, [customer]);

  if (!isOpen || !customer) return null;

  const isBlacklisted = !!customer.blacklistRecord;

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white w-full max-w-md rounded-2xl p-6 shadow-xl border border-slate-100 flex flex-col gap-4 text-start"
      >
        <div className="flex items-start gap-3.5">
          <div className={`p-3 rounded-xl shrink-0 ${isBlacklisted ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
            <ShieldAlert size={24} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-extrabold text-slate-900">
              {isBlacklisted ? t.blacklisted : t.blacklistCustomer}
            </h3>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">
              {customer.name} ({customer.phone})
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
            <X size={18} />
          </button>
        </div>

        {isBlacklisted ? (
          <div className="bg-red-50/70 border border-red-200 rounded-xl p-3.5 text-xs flex flex-col gap-1.5">
            <p className="font-extrabold text-red-900">{t.highRisk}</p>
            <p className="text-red-700">
              {t.blacklistReason}: <span className="font-semibold">{customer.blacklistRecord.reason || 'N/A'}</span>
            </p>
            <p className="text-red-600 text-[11px] leading-relaxed">
              {t.blacklistRecommendation}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-600">{t.blacklistReason}</label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t.blacklistReasonPlaceholder}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700 outline-none focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-400/20 text-start"
            />
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {t.blacklistRecommendation}
            </p>
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            {t.cancel || 'Cancel'}
          </button>

          {isBlacklisted ? (
            <button
              type="button"
              onClick={() => {
                onToggle({ phone: customer.phone, isBlacklisted: false });
                onClose();
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
            >
              <ShieldCheck size={15} />
              {t.removeFromBlacklist}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                onToggle({
                  phone: customer.phone,
                  customerName: customer.name,
                  reason: reason || 'Refused delivery / High risk',
                  isBlacklisted: true
                });
                onClose();
              }}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold rounded-xl shadow-sm shadow-red-600/20 transition-colors flex items-center gap-1.5"
            >
              <ShieldAlert size={15} />
              {t.blacklistCustomer}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function WhatsAppModal({ isOpen, onClose, order, language }) {
  const t = translations[language];
  if (!isOpen || !order) return null;

  const cPhone = order.phone || order.customerDetails?.phone || '';
  const formattedPhone = formatWhatsAppNumber(cPhone);
  const templates = getWhatsAppTemplates(order, t);

  const getIsRecommended = (templateId) => {
    if (templateId === 'confirmation' && order.status === 'Pending') return true;
    if (templateId === 'shipped' && order.status === 'Shipped') return true;
    if (templateId === 'followup' && (order.status === 'Delivered' || order.status === 'Delivered - Collected' || order.status === 'Delivered - Pending Cash')) return true;
    return false;
  };

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white w-full max-w-lg rounded-2xl p-5 sm:p-6 shadow-xl border border-slate-100 flex flex-col gap-4 text-start max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <MessageCircle size={22} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">{t.sendWhatsApp}</h3>
              <p className="text-xs text-slate-500 font-semibold">{order.customerName || 'Customer'} · {cPhone}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.selectTemplate}</p>

        <div className="flex flex-col gap-3">
          {templates.map((tpl) => {
            const isRec = getIsRecommended(tpl.id);
            return (
              <div
                key={tpl.id}
                className={`p-3.5 rounded-xl border transition-all flex flex-col gap-2 ${
                  isRec
                    ? 'border-emerald-500/60 bg-emerald-50/40 ring-2 ring-emerald-500/10'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-800">{tpl.title}</span>
                  {isRec && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      <Sparkles size={11} /> {t.recommended}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed bg-white/80 p-2.5 rounded-lg border border-slate-100 font-medium">
                  {tpl.text}
                </p>
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const encoded = encodeURIComponent(tpl.text);
                      window.open(`https://wa.me/${formattedPhone}?text=${encoded}`, '_blank');
                      onClose();
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-colors shadow-sm ${
                      isRec
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    <MessageCircle size={14} />
                    <span>{t.sendWhatsApp}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}

function CreateExchangeModal({ isOpen, onClose, parentOrder, products, language, onCreateExchange }) {
  const t = translations[language];
  if (!isOpen || !parentOrder) return null;

  const parentItems = parentOrder.items || [];
  const [incomingIndex, setIncomingIndex] = useState(0);
  const [incomingQty, setIncomingQty] = useState(1);

  const [outgoingProductId, setOutgoingProductId] = useState(products[0]?.id || '');
  const [outgoingSize, setOutgoingSize] = useState('M');
  const [outgoingQty, setOutgoingQty] = useState(1);
  const [exchangeShippingFee, setExchangeShippingFee] = useState('35');
  const [exchangeReason, setExchangeReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedIncoming = parentItems[incomingIndex] || parentItems[0] || {};
  const outgoingProduct = products.find(p => p.id === outgoingProductId) || products[0];

  const getStockForSize = (product, size) => {
    if (!product) return 0;
    const initial = (product.initialStock && product.initialStock[size]) || 0;
    const sold = (product.sold && product.sold[size]) || 0;
    return Math.max(0, initial - sold);
  };

  const availableStock = outgoingProduct ? getStockForSize(outgoingProduct, outgoingSize) : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!outgoingProductId) {
      alert("Please select a replacement product.");
      return;
    }
    if (availableStock <= 0) {
      alert(`Replacement size (${outgoingSize}) is out of stock!`);
      return;
    }
    if (outgoingQty > availableStock) {
      alert(`Replacement quantity exceeds available stock (${availableStock})`);
      return;
    }

    setIsSubmitting(true);
    const res = await onCreateExchange({
      parentOrder,
      incomingItem: {
        productId: selectedIncoming.productId || selectedIncoming.id || '',
        productName: selectedIncoming.productName || 'Returned Item',
        size: selectedIncoming.size || 'M',
        qty: Number(incomingQty) || 1
      },
      outgoingItem: {
        productId: outgoingProductId,
        size: outgoingSize,
        qty: Number(outgoingQty) || 1,
        sellingPrice: Number(outgoingProduct?.sellingPrice) || 0
      },
      exchangeShippingFee: Number(exchangeShippingFee) || 0,
      notes: exchangeReason
    });

    setIsSubmitting(false);
    if (res?.success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white w-full max-w-xl rounded-2xl p-5 sm:p-6 shadow-xl border border-slate-100 flex flex-col gap-4 text-start max-h-[92vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
              <ArrowLeftRight size={22} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">{t.createExchange}</h3>
              <p className="text-xs text-slate-500 font-semibold">
                {t.parentOrder}: {parentOrder.displayId || parentOrder.id} · {parentOrder.customerName}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Incoming Item (To Return) */}
          <div className="bg-red-50/50 p-3.5 rounded-xl border border-red-200/80 flex flex-col gap-2.5">
            <span className="text-xs font-bold text-red-800 uppercase tracking-wider">
              {t.incomingItemToReturn}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">{t.product}</label>
                <select
                  value={incomingIndex}
                  onChange={(e) => setIncomingIndex(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs outline-none focus:border-red-400"
                >
                  {parentItems.map((item, idx) => (
                    <option key={idx} value={idx}>
                      {item.productName || `Item #${idx + 1}`} - Size: {item.size} (Qty: {item.qty || 1})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">{t.qty}</label>
                <input
                  type="number"
                  min="1"
                  max={selectedIncoming?.qty || 1}
                  value={incomingQty}
                  onChange={(e) => setIncomingQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs outline-none focus:border-red-400"
                />
              </div>
            </div>
            <p className="text-[11px] text-red-600 font-medium">
              ✓ {t.partialDeliveryNotice}
            </p>
          </div>

          {/* Outgoing Replacement Item */}
          <div className="bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-200/80 flex flex-col gap-2.5">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
              {t.outgoingReplacementItem}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">{t.product}</label>
                <select
                  value={outgoingProductId}
                  onChange={(e) => setOutgoingProductId(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs outline-none focus:border-emerald-500"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                  ))}
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">{t.size}</label>
                  <span className={`text-[9px] font-extrabold px-1 rounded ${availableStock <= 0 ? 'bg-red-100 text-red-700' : 'text-emerald-700'}`}>
                    {availableStock <= 0 ? t.outOfStock : `${availableStock} ${t.leftInStock}`}
                  </span>
                </div>
                <select
                  value={outgoingSize}
                  onChange={(e) => setOutgoingSize(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs outline-none focus:border-emerald-500"
                >
                  {['M', 'L', 'XL', 'XXL'].map(sz => {
                    const st = outgoingProduct ? getStockForSize(outgoingProduct, sz) : 0;
                    return (
                      <option key={sz} value={sz} disabled={st <= 0}>
                        {sz} ({st > 0 ? st : t.outOfStock})
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          </div>

          {/* Shipping Fee & Reason */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">{t.exchangeShippingFee} (EGP)</label>
              <input
                type="number"
                min="0"
                value={exchangeShippingFee}
                onChange={(e) => setExchangeShippingFee(e.target.value)}
                placeholder="e.g. 35"
                className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-50 text-xs outline-none focus:border-[#597867] focus:bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">{t.exchangeReason}</label>
              <input
                type="text"
                value={exchangeReason}
                onChange={(e) => setExchangeReason(e.target.value)}
                placeholder={t.exchangeReasonPlaceholder}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-50 text-xs outline-none focus:border-[#597867] focus:bg-white"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || availableStock <= 0}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-extrabold rounded-xl shadow-sm shadow-purple-600/20 transition-colors flex items-center gap-1.5"
            >
              <ArrowLeftRight size={15} />
              {isSubmitting ? t.uploading || 'Creating...' : t.confirmExchange}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function PartialDeliveryModal({ isOpen, onClose, order, language, onUpdatePartialDelivery }) {
  const t = translations[language];
  if (!isOpen || !order) return null;

  const [itemsStatus, setItemsStatus] = useState(
    (order.items || []).map(item => ({
      ...item,
      itemStatus: item.itemStatus || 'accepted'
    }))
  );
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleItemStatus = (index, status) => {
    const updated = [...itemsStatus];
    updated[index].itemStatus = status;
    setItemsStatus(updated);
  };

  const acceptedSubtotal = itemsStatus.reduce((sum, item) => {
    if (item.itemStatus === 'accepted' || !item.itemStatus) {
      const price = Number(item.unitPrice || item.sellingPrice || 0);
      const qty = Number(item.qty || item.quantity || 1);
      return sum + (price * qty);
    }
    return sum;
  }, 0);

  const shipping = Number(order.shippingFee ?? order.totals?.shipping ?? 0);
  const calculatedTotal = acceptedSubtotal + shipping;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    await onUpdatePartialDelivery(order.id, itemsStatus, notes);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white w-full max-w-lg rounded-2xl p-5 sm:p-6 shadow-xl border border-slate-100 flex flex-col gap-4 text-start max-h-[92vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-orange-50 text-orange-600 rounded-xl">
              <Split size={22} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">{t.partialDelivery}</h3>
              <p className="text-xs text-slate-500 font-semibold">
                {order.displayId || order.id} · {order.customerName}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <p className="text-xs text-slate-500 font-medium">
          {t.partialDeliveryNotice}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2.5 max-h-60 overflow-y-auto">
            {itemsStatus.map((item, idx) => {
              const isAccepted = item.itemStatus === 'accepted';
              return (
                <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-slate-800">{item.productName || `Item #${idx + 1}`}</p>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Size: {item.size} · Qty: {item.qty || 1}
                    </p>
                  </div>

                  <div className="flex items-center bg-white p-1 rounded-lg border border-slate-200 shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleItemStatus(idx, 'accepted')}
                      className={`px-2.5 py-1 rounded text-xs font-bold transition-colors ${isAccepted ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      {t.accepted}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleItemStatus(idx, 'returned')}
                      className={`px-2.5 py-1 rounded text-xs font-bold transition-colors ${!isAccepted ? 'bg-red-600 text-white' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      {t.itemReturned}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Recalculated Summary */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs flex flex-col gap-1.5">
            <div className="flex justify-between text-slate-600">
              <span>{t.subtotal}:</span>
              <span className="font-bold">{acceptedSubtotal.toLocaleString('en-EG')} EGP</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>{t.shippingCost}:</span>
              <span className="font-bold">{shipping} EGP</span>
            </div>
            <div className="flex justify-between text-base font-black text-[#597867] pt-1.5 border-t border-slate-200">
              <span>{t.finalTotal}:</span>
              <span>{calculatedTotal.toLocaleString('en-EG')} EGP</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">{t.internalNotes}</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Customer rejected size XL at door, kept size L"
              className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-50 text-xs outline-none focus:border-[#597867] focus:bg-white"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-xs font-extrabold rounded-xl shadow-sm shadow-orange-600/20 transition-colors flex items-center gap-1.5"
            >
              <Split size={15} />
              {isSubmitting ? t.uploading || 'Processing...' : t.confirmPartialDelivery}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default function OrdersView() {
  const {
    orders,
    deletedOrders,
    updateOrderStatus,
    language,
    products,
    deleteOrder,
    restoreOrder,
    blacklist,
    toggleBlacklistCustomer,
    createExchangeOrder,
    updatePartialDelivery
  } = useStore();

  const t = translations[language];
  const [viewMode, setViewMode] = useState('active'); // 'active' | 'trash'
  const [searchQuery, setSearchQuery] = useState('');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [orderToEdit, setOrderToEdit] = useState(null);
  const [invoiceOrder, setInvoiceOrder] = useState(null);
  const [lightboxImg, setLightboxImg] = useState(null);
  const [activeNotesOrderIds, setActiveNotesOrderIds] = useState({});
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [orderToRestore, setOrderToRestore] = useState(null);
  const [whatsAppOrder, setWhatsAppOrder] = useState(null);
  const [blacklistCustomerModal, setBlacklistCustomerModal] = useState(null);
  const [exchangeOrder, setExchangeOrder] = useState(null);
  const [partialDeliveryOrder, setPartialDeliveryOrder] = useState(null);
  const [thermalLabelOrder, setThermalLabelOrder] = useState(null);

  const toggleNotes = (orderId) => {
    setActiveNotesOrderIds(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  const checkBlacklist = (phone) => {
    if (!phone || !blacklist) return null;
    const clean = normalizePhone(phone);
    if (!clean) return null;
    return blacklist.find(b => b.phone === clean);
  };

  const openBlacklistModal = (order) => {
    const phone = order.phone || order.customerDetails?.phone || '';
    const name = order.customerName || (order.customerDetails ? `${order.customerDetails.firstName} ${order.customerDetails.lastName}` : 'Customer');
    const record = checkBlacklist(phone);
    setBlacklistCustomerModal({ phone, name, blacklistRecord: record });
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

  const currentList = viewMode === 'active' ? orders : (deletedOrders || []);

  const filtered = currentList.filter((o) => {
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
      {/* Header Bar */}
      <div className="flex flex-col gap-4 border-b border-slate-100 px-4 sm:px-7 py-4 sm:py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#181E1C]">
              {t.orderManagement}
            </h2>
            {/* Active / Trash Segmented Switcher */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode('active')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'active'
                    ? 'bg-white text-[#597867] shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>{t.activeOrders}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${viewMode === 'active' ? 'bg-[#597867]/10 text-[#597867]' : 'bg-slate-200 text-slate-600'}`}>
                  {orders.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('trash')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'trash'
                    ? 'bg-white text-red-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Trash2 size={12} />
                <span>{t.trash}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${viewMode === 'trash' ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-600'}`}>
                  {(deletedOrders || []).length}
                </span>
              </button>
            </div>
          </div>
          <p className="mt-1 text-[12px] font-medium text-slate-400">
            {currentList.length} total orders · {filtered.length} shown
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search size={15} strokeWidth={2} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={t.searchOrdersPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-[13px] font-medium text-[#181E1C] placeholder:text-slate-400 outline-none transition-all focus:border-[#597867] focus:bg-white focus:ring-2 focus:ring-[#597867]/10 text-start"
            />
          </div>
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center justify-center gap-2 rounded-xl bg-white border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 whitespace-nowrap min-h-[44px]"
          >
            <Download size={16} strokeWidth={2.5} /> <span className="hidden sm:inline">{t.exportData || 'Export Data'}</span>
          </button>
        </div>
      </div>

      {/* Trash Mode Banner */}
      {viewMode === 'trash' && (
        <div className="bg-red-50/80 border-b border-red-200 px-4 sm:px-7 py-3 flex items-center justify-between gap-3 text-start">
          <div className="flex items-center gap-2.5 text-red-800 text-xs font-semibold">
            <Trash2 size={16} className="text-red-500 shrink-0" />
            <span>{t.softDeletedNotice}</span>
          </div>
          <span className="text-[11px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full shrink-0">
            {filtered.length} {t.trash}
          </span>
        </div>
      )}

      {/* Mobile Orders View (Portrait / Small Screens < md) */}
      <div className="block md:hidden divide-y divide-slate-100">
        {filtered.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
              <PackageX size={24} className="text-slate-400" />
            </div>
            <p className="text-[13px] font-semibold text-slate-500">{t.noOrders}</p>
          </div>
        ) : (
          filtered.map((order, index) => {
            const cName = order.customerName || (order.customerDetails ? `${order.customerDetails.firstName} ${order.customerDetails.lastName}` : 'Unknown');
            const cPhone = order.phone || order.customerDetails?.phone || '';
            const cCity = order.governorate || order.customerDetails?.city || '';
            const cAddress = order.address || order.customerDetails?.address || '';
            const cTotal = order.totalAmount || order.total || order.totals?.total || order.totals?.grandTotal || 0;
            const displayId = order.orderId || order.orderNumber || order.customId || order.order_id || order.displayId || order.id;
            const cShipping = order.shippingFee ?? order.totals?.shipping ?? 0;
            const blacklistedRecord = checkBlacklist(cPhone);

            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="p-4 flex flex-col gap-3 bg-white"
              >
                {/* Card Header: Order ID, Badges & Status */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="text-start flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setInvoiceOrder(order)}
                      className="font-black text-sm text-[#181E1C] hover:text-[#597867] hover:underline transition-colors text-start block"
                      title={t.orderDetails}
                    >
                      {displayId}
                    </button>
                    {order.orderType === 'exchange' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-700 border border-purple-200">
                        <ArrowLeftRight size={10} /> {t.exchangeOrderBadge}
                      </span>
                    )}
                    {order.orderType === 'partial_delivery' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-orange-100 text-orange-700 border border-orange-200">
                        <Split size={10} /> {t.partialDelivery}
                      </span>
                    )}
                    <p className="text-[10px] text-slate-400 font-medium w-full">{formatDate(order.createdAt)}</p>
                  </div>

                  {viewMode === 'trash' ? (
                    <span className="text-[11px] font-extrabold px-3 py-1 rounded-full border bg-red-100 text-red-700 border-red-200">
                      {t.trash}
                    </span>
                  ) : (
                    <select
                      value={order.status}
                      onChange={(e) => handleStatusChange(order, e.target.value)}
                      className={`text-[11px] font-extrabold px-3 py-1.5 rounded-full border outline-none cursor-pointer appearance-none text-center shadow-sm ${getStatusBadge(order.status)}`}
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
                  )}
                </div>

                {/* Customer Details, Location & Blacklist Risk Engine */}
                <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100 flex flex-col gap-1.5 text-xs text-start">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-extrabold text-[#181E1C] text-sm">{cName}</span>
                      {blacklistedRecord && (
                        <button
                          type="button"
                          onClick={() => openBlacklistModal(order)}
                          className="inline-flex items-center gap-1 text-[10px] font-black bg-red-100 text-red-700 px-2 py-0.5 rounded-full border border-red-200 hover:bg-red-200 transition-colors"
                          title={blacklistedRecord.reason || t.highRisk}
                        >
                          <ShieldAlert size={11} />
                          <span>{t.highRisk}</span>
                        </button>
                      )}
                    </div>

                    {cPhone && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[11px] font-bold text-slate-600">{cPhone}</span>
                        <button
                          type="button"
                          onClick={() => setWhatsAppOrder(order)}
                          className="text-emerald-500 hover:text-emerald-600 p-1 rounded-md hover:bg-emerald-50 transition-colors"
                          title={t.sendWhatsApp}
                        >
                          <MessageCircle size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => openBlacklistModal(order)}
                          className={`p-1 rounded-md transition-colors ${blacklistedRecord ? 'text-red-500 hover:bg-red-50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200'}`}
                          title={blacklistedRecord ? t.removeFromBlacklist : t.blacklistCustomer}
                        >
                          <ShieldAlert size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                  {(cCity || cAddress) && (
                    <p className="text-[11px] text-slate-500 font-medium">
                      {cCity}{cCity && cAddress ? ' - ' : ''}{cAddress}
                    </p>
                  )}
                  {order.parentOrderDisplayId && (
                    <p className="text-[10px] text-purple-700 font-bold mt-0.5">
                      {t.linkedToOrder}: #{order.parentOrderDisplayId}
                    </p>
                  )}
                </div>

                {/* Ordered Products (Items) List on Mobile */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-start">
                    {t.items} ({order.items?.length || 0})
                  </span>
                  <div className="flex flex-col gap-1.5">
                    {order.items?.map((item, i) => {
                      const product = products.find(p => p.id === item.productId) || item;
                      const img = product?.imageUrl || product?.image;
                      return (
                        <div key={i} className="flex items-center gap-2.5 p-2 bg-slate-50/60 rounded-lg border border-slate-100">
                          {img ? (
                            <img
                              src={img}
                              alt={product?.name}
                              className="w-10 h-10 object-cover rounded-md border border-slate-200 shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => setLightboxImg(img)}
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                              <PackageX size={16} className="text-slate-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0 text-start">
                            <p className="text-xs font-bold text-slate-800 truncate">{product?.name || 'Product'}</p>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                                {item.size}
                              </span>
                              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-[#597867]/10 text-[#597867]">
                                x{item.qty || item.quantity || 1}
                              </span>
                              {item.itemStatus === 'returned' && (
                                <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-red-100 text-red-700">
                                  {t.itemReturned}
                                </span>
                              )}
                              {product?.sellingPrice && (
                                <span className="text-[10px] font-semibold text-slate-400">
                                  {product.sellingPrice} EGP
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Pricing & Financial Breakdown */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-start">
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block uppercase tracking-wider">{t.totalValue}</span>
                    <span className="text-base font-black text-[#597867]">{cTotal.toLocaleString('en-EG')} EGP</span>
                  </div>

                  <div className="flex flex-col items-end gap-0.5 text-end">
                    <span className="text-[10px] text-slate-400 font-medium">Shipping: {cShipping} EGP</span>
                    {order.discount?.amount > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                        <Tag size={9} /> -{Number(order.discount.amount).toLocaleString('en-EG')} EGP ({order.discount.type === 'percentage' ? `${order.discount.value}%` : 'Fixed'})
                      </span>
                    )}
                  </div>
                </div>

                {/* Mobile Actions Toolbar */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 flex-wrap gap-2">
                  <div className="text-[10px] text-slate-400 font-medium text-start">
                    {viewMode === 'trash' ? (
                      <span>{t.deletedBy}: {order.deletedBy || 'Admin'}</span>
                    ) : (
                      <span>{order.createdBy ? `By: ${order.createdBy}` : 'Website'}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {viewMode === 'trash' ? (
                      <button
                        type="button"
                        onClick={() => setOrderToRestore(order)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-[#597867] hover:bg-[#486253] text-white text-xs font-bold rounded-lg transition-colors shadow-sm min-h-[38px]"
                        title={t.restoreOrder}
                      >
                        <RotateCcw size={14} />
                        <span>{t.restore}</span>
                      </button>
                    ) : (
                      <>
                        {/* Exchange Action Button */}
                        <button
                          type="button"
                          onClick={() => setExchangeOrder(order)}
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg min-h-[40px] min-w-[40px] flex items-center justify-center transition-colors"
                          title={t.createExchange}
                        >
                          <ArrowLeftRight size={16} />
                        </button>

                        {/* Partial Delivery Action Button */}
                        <button
                          type="button"
                          onClick={() => setPartialDeliveryOrder(order)}
                          className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg min-h-[40px] min-w-[40px] flex items-center justify-center transition-colors"
                          title={t.partialDelivery}
                        >
                          <Split size={16} />
                        </button>

                        {/* Thermal Shipping Label */}
                        <button
                          onClick={() => setThermalLabelOrder(order)}
                          className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
                          title={t.printShippingLabel}
                        >
                          <Printer size={16} />
                        </button>

                        {/* View Invoice */}
                        <button
                          onClick={() => setInvoiceOrder(order)}
                          className="p-2 text-slate-500 hover:text-[#597867] rounded-lg hover:bg-slate-100 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
                          title={t.orderDetails}
                        >
                          <FileText size={16} />
                        </button>

                        {/* Internal Notes */}
                        <button
                          onClick={() => toggleNotes(order.id)}
                          className={`relative p-2 rounded-lg transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center ${activeNotesOrderIds[order.id] ? 'bg-slate-100 text-slate-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
                          title={t.internalNotes}
                        >
                          <MessageCircle size={16} />
                          {order.notes && order.notes.length > 0 && (
                            <span className="absolute top-1.5 right-1.5 bg-[#597867] text-white text-[9px] font-black rounded-full h-3.5 w-3.5 flex items-center justify-center">
                              {order.notes.length}
                            </span>
                          )}
                        </button>

                        {/* Edit Order */}
                        <button
                          onClick={() => { setOrderToEdit(order); setIsEditModalOpen(true); }}
                          className="text-slate-500 hover:text-blue-500 transition-colors p-2 rounded-lg hover:bg-blue-50 min-h-[40px] min-w-[40px] flex items-center justify-center"
                          title={t.editOrder}
                        >
                          <Pencil size={16} />
                        </button>

                        {/* Soft Delete Order */}
                        <button
                          onClick={() => setOrderToDelete(order)}
                          className="text-slate-500 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50 min-h-[40px] min-w-[40px] flex items-center justify-center"
                          title={t.deleteOrder}
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Expanded Notes Block */}
                {activeNotesOrderIds[order.id] && (
                  <div className="pt-2">
                    <OrderNotesBlock order={order} />
                  </div>
                )}

                {/* Return Reason Block */}
                {order.status === 'Returned' && (
                  <div className="pt-2">
                    <ReturnReasonBlock order={order} />
                  </div>
                )}
              </motion.div>
            );
          })
        )}
      </div>

      {/* Desktop Table (Visible on md and larger screens) */}
      <div className="w-full overflow-x-auto hidden md:block">
        <table className="w-full min-w-[1000px] text-start border-collapse whitespace-nowrap">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-bold">
              <th className="p-4 px-6 font-semibold text-start">{t.orderIdDate}</th>
              <th className="p-4 font-semibold text-start">{t.customer}</th>
              <th className="p-4 font-semibold text-start hidden md:table-cell">{t.location}</th>
              <th className="p-4 font-semibold text-start hidden md:table-cell">{t.items}</th>
              <th className="p-4 font-semibold text-start">{t.totalValue}</th>
              <th className="p-4 font-semibold text-center">{t.status}</th>
              <th className="p-4 font-semibold px-6 text-end">
                {viewMode === 'trash' ? t.actions : t.createdBy}
              </th>
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
                const cName = order.customerName || (order.customerDetails ? `${order.customerDetails.firstName} ${order.customerDetails.lastName}` : 'Unknown');
                const cPhone = order.phone || order.customerDetails?.phone || '';
                const cCity = order.governorate || order.customerDetails?.city || 'Unknown';
                const cAddress = order.address || order.customerDetails?.address || '';
                const cTotal = order.totalAmount || order.total || order.totals?.total || order.totals?.grandTotal || 0;
                const displayId = order.orderId || order.orderNumber || order.customId || order.order_id || order.displayId || order.id;
                const cShipping = order.shippingFee ?? order.totals?.shipping ?? 0;
                const blacklistedRecord = checkBlacklist(cPhone);

                return (
                  <React.Fragment key={order.id}>
                    <motion.tr
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.04 }}
                      className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors ${viewMode === 'trash' ? 'bg-red-50/20' : ''}`}
                    >
                      <td className="p-4 px-6 align-middle text-start">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setInvoiceOrder(order)}
                            className="font-extrabold text-[#181E1C] hover:text-[#597867] hover:underline transition-colors text-start cursor-pointer"
                            title={t.orderDetails}
                          >
                            {displayId}
                          </button>
                          {order.orderType === 'exchange' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-700 border border-purple-200" title={`Parent: ${order.parentOrderDisplayId || order.parentOrderId}`}>
                              <ArrowLeftRight size={10} /> {t.exchangeOrderBadge}
                            </span>
                          )}
                          {order.orderType === 'partial_delivery' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-orange-100 text-orange-700 border border-orange-200">
                              <Split size={10} /> {t.partialDelivery}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5 font-medium">{formatDate(order.createdAt)}</p>
                      </td>

                      <td className="p-4 align-middle text-start">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-[#181E1C]">{cName}</p>
                          {blacklistedRecord && (
                            <button
                              type="button"
                              onClick={() => openBlacklistModal(order)}
                              className="inline-flex items-center gap-1 text-[10px] font-black bg-red-100 text-red-700 px-2 py-0.5 rounded-full border border-red-200 hover:bg-red-200 transition-colors"
                              title={blacklistedRecord.reason || t.highRisk}
                            >
                              <ShieldAlert size={10} />
                              <span>{t.highRisk}</span>
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-[11px] text-slate-500">{cPhone}</p>
                          <button
                            type="button"
                            onClick={() => setWhatsAppOrder(order)}
                            className="text-emerald-500 hover:text-emerald-600 transition-colors"
                            title={t.sendWhatsApp}
                          >
                            <MessageCircle size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => openBlacklistModal(order)}
                            className={`transition-colors ${blacklistedRecord ? 'text-red-500 hover:text-red-700' : 'text-slate-400 hover:text-slate-600'}`}
                            title={blacklistedRecord ? t.removeFromBlacklist : t.blacklistCustomer}
                          >
                            <ShieldAlert size={13} />
                          </button>
                        </div>
                      </td>

                      <td className="p-4 align-middle text-start hidden md:table-cell">
                        <p className="font-semibold text-slate-700">{cCity}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[150px]" title={cAddress}>{cAddress}</p>
                        {order.parentOrderDisplayId && (
                          <span className="text-[10px] text-purple-700 font-bold block mt-0.5">
                            {t.linkedToOrder}: #{order.parentOrderDisplayId}
                          </span>
                        )}
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
                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-slate-500 font-medium">Size: {item.size} | Qty: {item.qty || item.quantity}</span>
                                    {item.itemStatus === 'returned' && (
                                      <span className="text-[9px] font-black px-1 rounded bg-red-100 text-red-700">
                                        {t.itemReturned}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
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
                        {viewMode === 'trash' ? (
                          <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-red-100 text-red-700 border border-red-200">
                            {t.trash}
                          </span>
                        ) : (
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
                        )}
                      </td>

                      <td className="p-4 align-middle px-6 text-end">
                        {viewMode === 'trash' ? (
                          <div className="flex items-center justify-end gap-3">
                            <div className="text-[11px] text-slate-400 font-medium text-end">
                              <p>{t.deletedOn}: {formatDate(order.deletedAt)}</p>
                              <p>{t.deletedBy}: {order.deletedBy || 'Admin'}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setOrderToRestore(order)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#597867] hover:bg-[#486253] text-white text-xs font-bold rounded-lg transition-colors shadow-sm min-h-[36px]"
                              title={t.restoreOrder}
                            >
                              <RotateCcw size={14} />
                              <span>{t.restore}</span>
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="text-xs font-semibold text-slate-500 hidden lg:inline mr-1">{order.createdBy || 'Website'}</span>

                            {/* Create Exchange Button */}
                            <button
                              type="button"
                              onClick={() => setExchangeOrder(order)}
                              className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 transition-colors p-2 rounded-lg min-h-[40px] min-w-[40px] flex items-center justify-center"
                              title={t.createExchange}
                            >
                              <ArrowLeftRight size={16} />
                            </button>

                            {/* Partial Delivery Button */}
                            <button
                              type="button"
                              onClick={() => setPartialDeliveryOrder(order)}
                              className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 transition-colors p-2 rounded-lg min-h-[40px] min-w-[40px] flex items-center justify-center"
                              title={t.partialDelivery}
                            >
                              <Split size={16} />
                            </button>
                            
                            {/* Thermal Shipping Label */}
                            <button
                              onClick={() => setThermalLabelOrder(order)}
                              className="text-slate-400 hover:text-slate-800 transition-colors p-2 rounded-lg hover:bg-slate-100 min-h-[40px] min-w-[40px] flex items-center justify-center"
                              title={t.printShippingLabel}
                            >
                              <Printer size={16} />
                            </button>

                            <button
                              onClick={() => setInvoiceOrder(order)}
                              className="text-slate-400 hover:text-[#597867] transition-colors p-2 rounded-lg hover:bg-emerald-50 min-h-[40px] min-w-[40px] flex items-center justify-center"
                              title={t.orderDetails}
                            >
                              <FileText size={16} />
                            </button>

                            <button
                              onClick={() => toggleNotes(order.id)}
                              className={`relative p-2 rounded-lg transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center ${activeNotesOrderIds[order.id] ? 'bg-slate-100 text-slate-700' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`}
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
                              className="text-slate-400 hover:text-blue-500 transition-colors p-2 rounded-lg hover:bg-blue-50 min-h-[40px] min-w-[40px] flex items-center justify-center"
                              title={t.editOrder}
                            >
                              <Pencil size={16} />
                            </button>

                            <button
                              onClick={() => setOrderToDelete(order)}
                              className="text-slate-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50 min-h-[40px] min-w-[40px] flex items-center justify-center"
                              title={t.deleteOrder}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
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
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <ExportOrdersModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} />
      <EditOrderModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} orderToEdit={orderToEdit} />
      <OrderInvoiceModal isOpen={!!invoiceOrder} onClose={() => setInvoiceOrder(null)} order={invoiceOrder} />
      <ThermalShippingLabelModal isOpen={!!thermalLabelOrder} onClose={() => setThermalLabelOrder(null)} order={thermalLabelOrder} />
      <ImageLightbox isOpen={!!lightboxImg} imageUrl={lightboxImg} onClose={() => setLightboxImg(null)} />

      {/* Customer Blacklist Modal */}
      <BlacklistModal
        isOpen={!!blacklistCustomerModal}
        onClose={() => setBlacklistCustomerModal(null)}
        customer={blacklistCustomerModal}
        onToggle={toggleBlacklistCustomer}
        language={language}
      />

      {/* WhatsApp Multi-Template Pipeline Modal */}
      <WhatsAppModal
        isOpen={!!whatsAppOrder}
        onClose={() => setWhatsAppOrder(null)}
        order={whatsAppOrder}
        language={language}
      />

      {/* Create Exchange Modal */}
      <CreateExchangeModal
        isOpen={!!exchangeOrder}
        onClose={() => setExchangeOrder(null)}
        parentOrder={exchangeOrder}
        products={products}
        language={language}
        onCreateExchange={createExchangeOrder}
      />

      {/* Partial Delivery Modal */}
      <PartialDeliveryModal
        isOpen={!!partialDeliveryOrder}
        onClose={() => setPartialDeliveryOrder(null)}
        order={partialDeliveryOrder}
        language={language}
        onUpdatePartialDelivery={updatePartialDelivery}
      />

      {/* Restore Order Modal */}
      {orderToRestore && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" dir={language === 'ar' ? 'rtl' : 'ltr'}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white w-full max-w-md rounded-2xl p-6 shadow-xl border border-slate-100 flex flex-col gap-4 text-start"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-emerald-50 rounded-xl text-[#597867] shrink-0">
                <RotateCcw size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-extrabold text-slate-900 leading-6">
                  {t.restoreOrder}
                </h3>
                <p className="text-sm font-semibold text-slate-500 leading-relaxed mt-1">
                  {t.restoreConfirmPrompt}
                </p>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-2">
              <button
                type="button"
                onClick={() => setOrderToRestore(null)}
                className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-extrabold rounded-xl transition-colors min-h-[40px]"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={async () => {
                  const id = orderToRestore.id;
                  setOrderToRestore(null);
                  await restoreOrder(id);
                }}
                className="px-4 py-2.5 bg-[#597867] hover:bg-[#486253] shadow-md shadow-[#597867]/20 text-white text-xs font-extrabold rounded-xl transition-colors min-h-[40px] flex items-center gap-1.5"
              >
                <RotateCcw size={14} />
                <span>{t.restore}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete (Soft-Delete) Confirmation Modal */}
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
                type="button"
                onClick={() => setOrderToDelete(null)}
                className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-extrabold rounded-xl transition-colors min-h-[40px]"
              >
                {t.cancel}
              </button>
              <button
                type="button"
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