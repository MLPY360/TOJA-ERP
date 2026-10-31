import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe,
  Bell,
  RefreshCw,
  Tag,
  Truck,
  Settings,
  CheckCircle2,
  XCircle,
  MessageCircle,
  Clock,
  Sparkles,
  Search,
  Plus,
  Trash2,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  ShoppingBag,
  User,
  Phone,
  MapPin,
  Calendar,
  Save,
  Check,
  Percent,
  Coins,
  Radio,
  Sliders,
  DollarSign,
  Copy,
  Info,
  Layers,
  ChevronRight,
  Filter,
  Eye,
  Snowflake
} from 'lucide-react';
import {
  collection,
  doc,
  onSnapshot,
  query,
  orderBy,
  updateDoc,
  setDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { useStore, normalizePhone, normalizeSize, getAvailableStock, getProductSizes } from '../store/useStore';
import { translations } from '../translations';

// Format currency
function formatEGP(amount) {
  return (Number(amount) || 0).toLocaleString('en-EG') + ' EGP';
}

// Format WhatsApp link with Egyptian country code
function formatWhatsAppLink(rawPhone, message = '') {
  if (!rawPhone) return '';
  let cleaned = String(rawPhone).replace(/\D/g, '');
  if (cleaned.startsWith('0020')) cleaned = cleaned.slice(4);
  else if (cleaned.startsWith('20')) cleaned = cleaned.slice(2);
  while (cleaned.startsWith('0')) {
    cleaned = cleaned.slice(1);
  }
  const fullPhone = `20${cleaned}`;
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${fullPhone}?text=${encoded}`;
}

export default function StorefrontManager() {
  const { products, currentUser, language, logInventoryMovement } = useStore();
  const isArabic = language === 'ar';
  const t = translations[language];

  // Active Main Sub-Tab: 'waitlist' | 'exchanges' | 'promos' | 'settings'
  const [activeTab, setActiveTab] = useState('waitlist');

  // Firestore Collections States
  const [waitlist, setWaitlist] = useState([]);
  const [exchangeRequests, setExchangeRequests] = useState([]);
  const [promoCodes, setPromoCodes] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL'); // 'ALL' | 'winter_drop' | 'stock'

  // Action Loading & Toast
  const [actionLoading, setActionLoading] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Store Settings (store_config/general)
  const [storeConfig, setStoreConfig] = useState({
    freeShippingThreshold: 1500,
    isAnnouncementActive: true,
    announcementText_en: 'Free Nationwide Shipping On Orders Over 1,500 EGP • Inspect Before You Pay',
    announcementText_ar: 'شحن مجاني لكافة محافظات مصر للطلبات بقيمة 1,500 ج.م فأكثر • معاينة مجانية قبل الدفع للمندوب',
    winterDropCountdown: '',
    shippingRates: {
      cairo_giza: 90,
      new_cities: 95,
      alex_canal: 95,
      delta: 100,
      upper_egypt: 120,
      coastal_border: 180
    }
  });
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Modals States
  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
  const [isWaitlistModalOpen, setIsWaitlistModalOpen] = useState(false);
  const [isManualExchangeModalOpen, setIsManualExchangeModalOpen] = useState(false);
  const [rejectModalData, setRejectModalData] = useState({ open: false, request: null, reason: 'المقاس البديل غير متوفر حالياً بالمخزون' });

  // New Promo Code Form
  const [newPromo, setNewPromo] = useState({
    code: '',
    type: 'percentage', // 'percentage' | 'fixed' | 'free_shipping'
    value: 15,
    minOrder: 0,
    labelEn: '',
    labelAr: '',
    isActive: true
  });
  const [isSavingPromo, setIsSavingPromo] = useState(false);

  // New Waitlist Form
  const [newWaitlist, setNewWaitlist] = useState({
    customerName: '',
    phone: '',
    productId: '',
    productName: '',
    size: 'L',
    isWinterDrop: false,
    notes: ''
  });
  const [isSavingWaitlist, setIsSavingWaitlist] = useState(false);

  // New Manual Exchange Form
  const [newExchange, setNewExchange] = useState({
    order_id: '',
    customerName: '',
    phone: '',
    productId: '',
    productName: '',
    originalSize: 'M',
    requestedSize: 'L',
    reason: 'مقاس غير مناسب',
    notes: ''
  });
  const [isSavingExchange, setIsSavingExchange] = useState(false);

  // Helper Toast Trigger
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  // 1. Subscribe to Remote Firestore Collections
  useEffect(() => {
    setLoadingData(true);

    // 1a. Waitlist
    const unsubWaitlist = onSnapshot(
      collection(db, 'waitlist'),
      (snap) => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => {
          const timeA = a.createdAt?.seconds || (a.createdAt instanceof Date ? a.createdAt.getTime() / 1000 : 0);
          const timeB = b.createdAt?.seconds || (b.createdAt instanceof Date ? b.createdAt.getTime() / 1000 : 0);
          return timeB - timeA;
        });
        setWaitlist(list);
      },
      (err) => console.warn('Waitlist listener note:', err.message)
    );

    // 1b. Exchange Requests
    const unsubExchanges = onSnapshot(
      collection(db, 'exchange_requests'),
      (snap) => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => {
          const timeA = a.createdAt?.seconds || (a.createdAt instanceof Date ? a.createdAt.getTime() / 1000 : 0);
          const timeB = b.createdAt?.seconds || (b.createdAt instanceof Date ? b.createdAt.getTime() / 1000 : 0);
          return timeB - timeA;
        });
        setExchangeRequests(list);
      },
      (err) => console.warn('Exchange requests listener note:', err.message)
    );

    // 1c. Promo Codes
    const unsubPromos = onSnapshot(
      collection(db, 'promo_codes'),
      (snap) => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setPromoCodes(list);
      },
      (err) => console.warn('Promo codes listener note:', err.message)
    );

    // 1d. Store Config (store_config/general)
    const unsubConfig = onSnapshot(
      doc(db, 'store_config', 'general'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setStoreConfig(prev => ({
            ...prev,
            ...data,
            freeShippingThreshold: Number(data.freeShippingThreshold ?? prev.freeShippingThreshold),
            isAnnouncementActive: data.isAnnouncementActive !== undefined ? Boolean(data.isAnnouncementActive) : prev.isAnnouncementActive,
            shippingRates: {
              ...prev.shippingRates,
              ...(data.shippingRates || {})
            }
          }));
        }
        setLoadingData(false);
      },
      (err) => {
        console.warn('Store config listener note:', err.message);
        setLoadingData(false);
      }
    );

    return () => {
      unsubWaitlist();
      unsubExchanges();
      unsubPromos();
      unsubConfig();
    };
  }, []);

  // Filtered Exchange Requests
  const filteredExchanges = useMemo(() => {
    return exchangeRequests.filter(req => {
      const status = (req.status || 'pending').toLowerCase();
      if (statusFilter !== 'ALL' && status !== statusFilter.toLowerCase()) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const orderId = (req.order_id || req.orderId || '').toLowerCase();
      const name = (req.customerName || req.name || '').toLowerCase();
      const phone = (req.phone || req.customerPhone || '').toLowerCase();
      const prodName = (req.originalItem?.name || req.productName || '').toLowerCase();
      return orderId.includes(q) || name.includes(q) || phone.includes(q) || prodName.includes(q);
    });
  }, [exchangeRequests, statusFilter, searchQuery]);

  // Filtered Waitlist Items
  const filteredWaitlist = useMemo(() => {
    return waitlist.filter(item => {
      const status = (item.status || 'waiting').toLowerCase();
      if (statusFilter !== 'ALL' && status !== statusFilter.toLowerCase()) {
        return false;
      }
      if (categoryFilter === 'winter_drop' && !item.isWinterDrop && !item.productName?.toLowerCase().includes('winter')) {
        return false;
      }
      if (categoryFilter === 'in_stock') {
        const prod = products.find(p => p.id === item.productId || p.name === item.productName);
        if (!prod || getAvailableStock(prod, item.size) <= 0) return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const name = (item.customerName || item.name || '').toLowerCase();
      const phone = (item.phone || item.customerPhone || '').toLowerCase();
      const prodName = (item.productName || item.product || '').toLowerCase();
      const size = (item.size || '').toLowerCase();
      return name.includes(q) || phone.includes(q) || prodName.includes(q) || size.includes(q);
    });
  }, [waitlist, statusFilter, categoryFilter, searchQuery, products]);

  // Quick Counts
  const pendingExchangesCount = exchangeRequests.filter(r => (r.status || 'pending') === 'pending').length;
  const waitingCustomersCount = waitlist.filter(w => (w.status || 'waiting') === 'waiting').length;
  const winterDropCount = waitlist.filter(w => w.isWinterDrop || w.productName?.toLowerCase().includes('winter')).length;

  // ── Actions ─────────────────────────────────────────────────────────────

  // 1. Send Back-in-Stock WhatsApp Notification (1-Click)
  const handleNotifyWaitlistCustomer = async (item) => {
    if (!item) return;
    const phone = item.phone || item.customerPhone || '';
    const customerName = item.customerName || item.name || (isArabic ? 'عزيزي العميل' : 'Valued Customer');
    const productName = item.productName || item.product || (isArabic ? 'المنتج' : 'Item');
    const size = item.size || 'M';
    const productUrl = item.productId
      ? `https://toja-1999.web.app/product/${item.productId}`
      : `https://toja-1999.web.app`;

    // Bilingual Pre-filled Message (Arabic & English)
    const bilingualMessage = `أهلاً يا ${customerName} 👋✨
يسعدنا إبلاغك بأن منتج "${productName}" بمقاسك (${size}) أصبح متوفراً الآن في متجر TOJA الرسمي! 🛒

رابط الطلب المباشر:
${productUrl}

معاينة مجانية للمنتج مع المندوب قبل الدفع، وشحن سريع لكافة محافظات مصر 🇪🇬

───
Hello ${customerName} 👋✨
Great news! Your requested item "${productName}" in size (${size}) is now back in stock at TOJA Official Store! 🛒

Direct order link:
${productUrl}

Free inspection before payment & fast nationwide delivery across Egypt 🇪🇬
TOJA Team | فريق توجا 🖤`;

    const waLink = formatWhatsAppLink(phone, bilingualMessage);
    if (!waLink) {
      showToast(isArabic ? 'رقم الهاتف غير صالح للإرسال' : 'Invalid phone number for WhatsApp', 'error');
      return;
    }

    // 1. Open WhatsApp in new tab
    window.open(waLink, '_blank');

    // 2. Mark document as notified in Firestore
    try {
      await updateDoc(doc(db, 'waitlist', item.id), {
        status: 'notified',
        notifiedAt: serverTimestamp(),
        notifiedBy: currentUser?.name || 'Staff'
      });
      showToast(
        isArabic
          ? `تم فتح واتساب وتحديث حالة إشعار (${customerName}) إلى "تم الإشعار" بنجاح!`
          : `WhatsApp opened and ${customerName} marked as notified!`
      );
    } catch (err) {
      console.error('Waitlist update error:', err);
      showToast(err.message, 'error');
    }
  };

  // 2. Approve Exchange Request & Swap Stock Counts in products
  const handleApproveExchange = async (request) => {
    if (!request) return;

    // Resolve original product
    const origItem = request.originalItem || {};
    const product = products.find(
      p => p.id === request.productId ||
           p.id === origItem.id ||
           p.id === origItem.productId ||
           p.name === origItem.name ||
           p.name === request.productName
    );

    if (!product) {
      alert(isArabic ? 'لم يتم العثور على المنتج في كتالوج المخزون لتحديث الأرصدة.' : 'Product not found in inventory catalog.');
      return;
    }

    const reqSize = normalizeSize(request.requestedSize) || request.requestedSize;
    const origSize = normalizeSize(origItem.currentSize || origItem.size || request.originalSize) || 'M';

    // Verify replacement stock
    const availableStock = getAvailableStock(product, reqSize);
    if (availableStock <= 0) {
      const confirmProceed = window.confirm(
        isArabic
          ? `⚠️ تنبيه: مقاس (${reqSize}) غير متوفر حالياً في المخزون (0 قطعة).\nهل ترغب في اعتماد الاستبدال وتحديث الأرصدة يدوياً على أي حال؟`
          : `⚠️ Warning: Requested replacement size (${reqSize}) has 0 stock.\nDo you want to approve and swap inventory anyway?`
      );
      if (!confirmProceed) return;
    }

    setActionLoading(request.id);
    try {
      const productRef = doc(db, 'products', product.id);
      const prodSnap = await getDoc(productRef);

      if (prodSnap.exists()) {
        const pData = prodSnap.data();
        const currentSold = pData.sold || { M: 0, L: 0, XL: 0, XXL: 0 };

        // Swapping logic:
        // Dispatched replacement item: increments sold[reqSize] by 1
        // Restocked original item: decrements sold[origSize] by 1 (returned back to shelf)
        const newSoldReq = (Number(currentSold[reqSize]) || 0) + 1;
        const newSoldOrig = Math.max(0, (Number(currentSold[origSize]) || 0) - 1);

        const updatePayload = {
          [`sold.${reqSize}`]: newSoldReq,
          [`sold.${origSize}`]: newSoldOrig
        };

        // If flat legacy keys exist, sync them as well
        if (pData[`sold${reqSize}`] !== undefined) updatePayload[`sold${reqSize}`] = newSoldReq;
        if (pData[`sold${origSize}`] !== undefined) updatePayload[`sold${origSize}`] = newSoldOrig;

        await updateDoc(productRef, updatePayload);

        // Audit Trail: Log inventory movements
        if (typeof logInventoryMovement === 'function') {
          await logInventoryMovement({
            productId: product.id,
            productName: product.name,
            sku: product.sku || '',
            size: reqSize,
            changeType: 'EXCHANGE_OUT',
            quantityDelta: -1,
            relatedOrderId: request.order_id || request.orderId || 'WEB-EXCHANGE',
            reason: `Size Exchange Approved: Dispatched replacement size ${reqSize} (Order: ${request.order_id || 'N/A'})`
          });

          await logInventoryMovement({
            productId: product.id,
            productName: product.name,
            sku: product.sku || '',
            size: origSize,
            changeType: 'EXCHANGE_IN',
            quantityDelta: 1,
            relatedOrderId: request.order_id || request.orderId || 'WEB-EXCHANGE',
            reason: `Size Exchange Restocked: Returned original size ${origSize} (Order: ${request.order_id || 'N/A'})`
          });
        }
      }

      // Update exchange request document
      const reqRef = doc(db, 'exchange_requests', request.id);
      await updateDoc(reqRef, {
        status: 'approved',
        approvedAt: serverTimestamp(),
        approvedBy: currentUser?.name || 'Staff'
      });

      // Bilingual WhatsApp confirmation message
      const customerName = request.customerName || request.name || (isArabic ? 'عزيزي العميل' : 'Valued Customer');
      const orderId = request.order_id || request.orderId || '';
      const prodTitle = origItem.name || product.name || 'القطعة';

      const waMessage = `أهلاً يا ${customerName} 👋🚚
تمت الموافقة على طلب استبدال المقاس لطلبكم رقم #${orderId}!

تفاصيل الاستبدال:
- الموديل: ${prodTitle}
- المقاس المسترجع: ${origSize}
- المقاس الجديد المعتمد: ${reqSize}

جاري تحضير الشحنة مع المندوب للمعاينة والاستبدال. شكراً لاختيارك TOJA! 🖤

───
Hello ${customerName} 👋🚚
Your size exchange request for Order #${orderId} has been APPROVED!

Exchange Details:
- Item: ${prodTitle}
- Returned Size: ${origSize}
- New Approved Size: ${reqSize}

Our courier will deliver your replacement with free inspection. Thank you for choosing TOJA! 🖤`;

      const waLink = formatWhatsAppLink(request.phone, waMessage);
      if (waLink) {
        window.open(waLink, '_blank');
      }

      showToast(isArabic ? 'تم اعتماد الاستبدال، وتحديث المخزون بنجاح!' : 'Exchange approved and stock counts swapped!');
    } catch (err) {
      console.error('Approve exchange error:', err);
      showToast(err.message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // 3. Reject Exchange Request or Contact via WhatsApp
  const handleRejectExchangeConfirm = async () => {
    const { request, reason } = rejectModalData;
    if (!request) return;

    setActionLoading(request.id);
    try {
      await updateDoc(doc(db, 'exchange_requests', request.id), {
        status: 'rejected',
        rejectionReason: reason || 'المقاس البديل غير متوفر حالياً بالمخزون',
        rejectedAt: serverTimestamp(),
        rejectedBy: currentUser?.name || 'Staff'
      });

      // Bilingual WhatsApp notification of rejection & customer support
      const customerName = request.customerName || request.name || '';
      const orderId = request.order_id || request.orderId || '';

      const waMessage = `أهلاً يا ${customerName} بخصوص طلب استبدال المقاس لطلبكم رقم #${orderId} 👋
نعتذر لحضرتك: ${reason || 'المقاس البديل غير متوفر حالياً بالمخزون'}.

يسعدنا مساعدتك في اختيار مقاس أو موديل بديل متوفر حالياً، أو ترتيب استرجاع الطلب. فريق خدمة عملاء TOJA في خدمتك دائماً! 🖤

───
Hello ${customerName} regarding your exchange request for Order #${orderId} 👋
Update: ${reason || 'Requested size is currently out of stock'}.
Our team is glad to assist you with alternative available items. Thank you for shopping with TOJA! 🖤`;

      const waLink = formatWhatsAppLink(request.phone, waMessage);
      if (waLink) {
        window.open(waLink, '_blank');
      }

      setRejectModalData({ open: false, request: null, reason: '' });
      showToast(isArabic ? 'تم رفض الطلب وفتح رسالة واتساب للعميل.' : 'Request marked rejected and WhatsApp opened.');
    } catch (err) {
      console.error('Reject exchange error:', err);
      showToast(err.message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // 4. Save Store Settings to store_config/general
  const handleSaveStoreConfig = async (e) => {
    if (e) e.preventDefault();
    setIsSavingConfig(true);
    try {
      const payload = {
        freeShippingThreshold: Number(storeConfig.freeShippingThreshold) || 1500,
        isAnnouncementActive: Boolean(storeConfig.isAnnouncementActive),
        announcementText_en: (storeConfig.announcementText_en || '').trim(),
        announcementText_ar: (storeConfig.announcementText_ar || '').trim(),
        winterDropCountdown: storeConfig.winterDropCountdown ? storeConfig.winterDropCountdown.trim() : null,
        shippingRates: {
          cairo_giza: Number(storeConfig.shippingRates?.cairo_giza) || 90,
          new_cities: Number(storeConfig.shippingRates?.new_cities) || 95,
          alex_canal: Number(storeConfig.shippingRates?.alex_canal) || 95,
          delta: Number(storeConfig.shippingRates?.delta) || 100,
          upper_egypt: Number(storeConfig.shippingRates?.upper_egypt) || 120,
          coastal_border: Number(storeConfig.shippingRates?.coastal_border) || 180
        },
        updatedAt: serverTimestamp(),
        updatedBy: currentUser?.name || 'Partner'
      };

      await setDoc(doc(db, 'store_config', 'general'), payload, { merge: true });
      showToast(isArabic ? 'تم حفظ وتحديث إعدادات المتجر والشحن بنجاح!' : 'Store settings & shipping rates updated successfully!');
    } catch (err) {
      console.error('Save store config error:', err);
      showToast(err.message, 'error');
    } finally {
      setIsSavingConfig(false);
    }
  };

  // 5. Create Promo Code
  const handleCreatePromoCode = async (e) => {
    if (e) e.preventDefault();
    const cleanCode = (newPromo.code || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!cleanCode) {
      alert(isArabic ? 'يرجى إدخال كود الخصم.' : 'Please enter promo code.');
      return;
    }

    setIsSavingPromo(true);
    try {
      const payload = {
        code: cleanCode,
        type: newPromo.type,
        value: Number(newPromo.value) || 0,
        minOrder: Number(newPromo.minOrder) || 0,
        labelEn: newPromo.labelEn.trim() || `${newPromo.value}${newPromo.type === 'percentage' ? '%' : ' EGP'} Off`,
        labelAr: newPromo.labelAr.trim() || `خصم ${newPromo.value} ${newPromo.type === 'percentage' ? '%' : 'ج.م'}`,
        isActive: Boolean(newPromo.isActive),
        createdAt: serverTimestamp(),
        createdBy: currentUser?.name || 'Staff'
      };

      await setDoc(doc(db, 'promo_codes', cleanCode), payload);
      setIsPromoModalOpen(false);
      setNewPromo({
        code: '',
        type: 'percentage',
        value: 15,
        minOrder: 0,
        labelEn: '',
        labelAr: '',
        isActive: true
      });
      showToast(isArabic ? `تم إنشاء كود الخصم (${cleanCode}) بنجاح!` : `Promo code (${cleanCode}) created successfully!`);
    } catch (err) {
      console.error('Create promo code error:', err);
      showToast(err.message, 'error');
    } finally {
      setIsSavingPromo(false);
    }
  };

  // 6. Toggle Promo Code Status
  const handleTogglePromoStatus = async (promo) => {
    try {
      const newStatus = !promo.isActive;
      await updateDoc(doc(db, 'promo_codes', promo.id), {
        isActive: newStatus
      });
      showToast(
        isArabic
          ? `تم ${newStatus ? 'تفعيل' : 'تعطيل'} كود الخصم ${promo.code || promo.id}`
          : `Promo code ${promo.code || promo.id} is now ${newStatus ? 'active' : 'inactive'}`
      );
    } catch (err) {
      console.error('Toggle promo error:', err);
    }
  };

  // 7. Delete Promo Code
  const handleDeletePromo = async (promo) => {
    const confirmDelete = window.confirm(
      isArabic
        ? `هل أنت متأكد من حذف كود الخصم (${promo.code || promo.id}) نهائياً؟`
        : `Delete promo code (${promo.code || promo.id}) permanently?`
    );
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, 'promo_codes', promo.id));
      showToast(isArabic ? 'تم حذف كود الخصم بنجاح.' : 'Promo code deleted successfully.');
    } catch (err) {
      console.error('Delete promo error:', err);
    }
  };

  // 8. Add Manual Waitlist Item
  const handleAddWaitlistSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!newWaitlist.customerName.trim() || !newWaitlist.phone.trim()) {
      alert(isArabic ? 'يرجى إدخال اسم العميل ورقم الهاتف.' : 'Please enter customer name and phone.');
      return;
    }

    setIsSavingWaitlist(true);
    try {
      const selectedProd = products.find(p => p.id === newWaitlist.productId);
      const prodName = selectedProd ? selectedProd.name : (newWaitlist.productName || 'Winter Drop Piece');

      await addDoc(collection(db, 'waitlist'), {
        customerName: newWaitlist.customerName.trim(),
        phone: normalizePhone(newWaitlist.phone),
        productId: newWaitlist.productId || null,
        productName: prodName,
        size: newWaitlist.size || 'M',
        isWinterDrop: Boolean(newWaitlist.isWinterDrop),
        notes: (newWaitlist.notes || '').trim(),
        status: 'waiting',
        createdAt: serverTimestamp(),
        createdBy: currentUser?.name || 'Staff'
      });

      setIsWaitlistModalOpen(false);
      setNewWaitlist({
        customerName: '',
        phone: '',
        productId: '',
        productName: '',
        size: 'L',
        isWinterDrop: false,
        notes: ''
      });
      showToast(isArabic ? 'تمت إضافة العميل إلى قائمة الانتظار بنجاح!' : 'Customer added to waitlist successfully!');
    } catch (err) {
      console.error('Add waitlist error:', err);
      showToast(err.message, 'error');
    } finally {
      setIsSavingWaitlist(false);
    }
  };

  // 9. Add Manual Exchange Request
  const handleAddManualExchangeSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!newExchange.order_id.trim() || !newExchange.phone.trim()) {
      alert(isArabic ? 'يرجى إدخال رقم الطلب ورقم هاتف العميل.' : 'Please enter Order ID and phone number.');
      return;
    }

    setIsSavingExchange(true);
    try {
      const selectedProd = products.find(p => p.id === newExchange.productId);
      const prodName = selectedProd ? selectedProd.name : (newExchange.productName || 'TOJA Item');

      await addDoc(collection(db, 'exchange_requests'), {
        order_id: newExchange.order_id.trim().toUpperCase(),
        customerName: newExchange.customerName.trim() || 'Customer',
        phone: normalizePhone(newExchange.phone),
        productId: newExchange.productId || null,
        originalItem: {
          id: newExchange.productId || null,
          name: prodName,
          size: newExchange.originalSize
        },
        requestedSize: newExchange.requestedSize,
        reason: newExchange.reason || 'Size change requested',
        notes: (newExchange.notes || '').trim(),
        status: 'pending',
        createdAt: serverTimestamp(),
        createdBy: currentUser?.name || 'Staff'
      });

      setIsManualExchangeModalOpen(false);
      setNewExchange({
        order_id: '',
        customerName: '',
        phone: '',
        productId: '',
        productName: '',
        originalSize: 'M',
        requestedSize: 'L',
        reason: 'مقاس غير مناسب',
        notes: ''
      });
      showToast(isArabic ? 'تم تسجيل طلب الاستبدال بنجاح!' : 'Exchange request logged successfully!');
    } catch (err) {
      console.error('Add exchange error:', err);
      showToast(err.message, 'error');
    } finally {
      setIsSavingExchange(false);
    }
  };

  // 10. Delete Waitlist Item
  const handleDeleteWaitlist = async (item) => {
    const confirmDelete = window.confirm(
      isArabic
        ? `هل تريد حذف (${item.customerName || item.phone}) من قائمة الانتظار؟`
        : `Delete (${item.customerName || item.phone}) from waitlist?`
    );
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, 'waitlist', item.id));
      showToast(isArabic ? 'تم حذف العميل من قائمة الانتظار.' : 'Customer removed from waitlist.');
    } catch (err) {
      console.error('Delete waitlist error:', err);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast.show && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 start-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-bold text-white border border-white/20 backdrop-blur-md ${
              toast.type === 'error' ? 'bg-rose-600' : 'bg-[#181E1C]'
            }`}
          >
            {toast.type === 'error' ? (
              <AlertTriangle size={18} className="text-rose-200" />
            ) : (
              <CheckCircle2 size={18} className="text-emerald-400" />
            )}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Module Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/70 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-800 rounded-2xl border border-emerald-500/20">
              <Globe size={22} strokeWidth={2.2} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  {isArabic ? 'إدارة الموقع والمخزن الإلكتروني' : 'Storefront Control'}
                </h2>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {isArabic ? 'متصل لحظياً مع الموقع' : 'Live Sync'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {isArabic
                  ? 'التحكم الكامل عن بُعد في قوائم الانتظار، طلبات الاستبدال، أكواد الخصم، ومصاريف الشحن'
                  : 'Remote live control for customer waitlists, size exchanges, promo codes, and shipping rates'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <a
            href="https://toja-1999.web.app"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors shadow-sm"
          >
            <span>{isArabic ? 'فتح المتجر الرسمي' : 'Visit Storefront'}</span>
            <ExternalLink size={14} />
          </a>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {/* Tab 1: Waitlist */}
        <button
          onClick={() => { setActiveTab('waitlist'); setStatusFilter('ALL'); setCategoryFilter('ALL'); }}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black tracking-wide transition-all cursor-pointer whitespace-nowrap shadow-sm ${
            activeTab === 'waitlist'
              ? 'bg-[#181E1C] text-white shadow-md'
              : 'bg-white/80 text-slate-600 hover:bg-white hover:text-slate-900 border border-slate-200/60'
          }`}
        >
          <Bell size={15} />
          <span>{isArabic ? 'قائمة انتظار توفر المنتجات' : 'Back-in-Stock Waitlist'}</span>
          {waitingCustomersCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-500 text-white">
              {waitingCustomersCount}
            </span>
          )}
        </button>

        {/* Tab 2: Size Exchanges */}
        <button
          onClick={() => { setActiveTab('exchanges'); setStatusFilter('ALL'); }}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black tracking-wide transition-all cursor-pointer whitespace-nowrap shadow-sm ${
            activeTab === 'exchanges'
              ? 'bg-[#181E1C] text-white shadow-md'
              : 'bg-white/80 text-slate-600 hover:bg-white hover:text-slate-900 border border-slate-200/60'
          }`}
        >
          <RefreshCw size={15} />
          <span>{isArabic ? 'طلبات استبدال المقاس' : 'Size Exchanges Queue'}</span>
          {pendingExchangesCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white animate-pulse">
              {pendingExchangesCount}
            </span>
          )}
        </button>

        {/* Tab 3: Promo Codes */}
        <button
          onClick={() => { setActiveTab('promos'); setStatusFilter('ALL'); }}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black tracking-wide transition-all cursor-pointer whitespace-nowrap shadow-sm ${
            activeTab === 'promos'
              ? 'bg-[#181E1C] text-white shadow-md'
              : 'bg-white/80 text-slate-600 hover:bg-white hover:text-slate-900 border border-slate-200/60'
          }`}
        >
          <Tag size={15} />
          <span>{isArabic ? 'أكواد الخصم الترويجية' : 'Promo Codes'}</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
            {promoCodes.length}
          </span>
        </button>

        {/* Tab 4: Store Settings & Shipping */}
        <button
          onClick={() => { setActiveTab('settings'); setStatusFilter('ALL'); }}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black tracking-wide transition-all cursor-pointer whitespace-nowrap shadow-sm ${
            activeTab === 'settings'
              ? 'bg-[#181E1C] text-white shadow-md'
              : 'bg-white/80 text-slate-600 hover:bg-white hover:text-slate-900 border border-slate-200/60'
          }`}
        >
          <Sliders size={15} />
          <span>{isArabic ? 'إعدادات الشحن والشريط الإعلاني' : 'Store Settings & Shipping'}</span>
        </button>
      </div>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 1: WAITLIST & BACK-IN-STOCK MANAGER ───────────────────────── */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'waitlist' && (
        <div className="space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white/80 p-4 rounded-2xl border border-slate-200/80 shadow-sm">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                {isArabic ? 'إجمالي المنتظرين' : 'Total Waiting'}
              </span>
              <span className="text-2xl font-black text-slate-900">{waitlist.length}</span>
            </div>

            <div className="bg-blue-50/80 p-4 rounded-2xl border border-blue-200/60 shadow-sm">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 block mb-1">
                {isArabic ? 'في انتظار الإشعار' : 'Awaiting Stock'}
              </span>
              <span className="text-2xl font-black text-blue-900">{waitingCustomersCount}</span>
            </div>

            <div className="bg-emerald-50/80 p-4 rounded-2xl border border-emerald-200/60 shadow-sm">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 block mb-1">
                {isArabic ? 'تم إشعارهم عبر واتساب' : 'Notified via WhatsApp'}
              </span>
              <span className="text-2xl font-black text-emerald-900">
                {waitlist.filter(w => w.status === 'notified').length}
              </span>
            </div>

            <div className="bg-purple-50/80 p-4 rounded-2xl border border-purple-200/60 shadow-sm">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 block mb-1">
                {isArabic ? 'متوفر بالمخزون الآن' : 'Ready In Stock Now'}
              </span>
              <span className="text-2xl font-black text-purple-900">
                {waitlist.filter(w => {
                  const p = products.find(prod => prod.id === w.productId || prod.name === w.productName);
                  return p && getAvailableStock(p, w.size) > 0;
                }).length}
              </span>
            </div>
          </div>

          {/* Controls: Search, Filters & Add Customer */}
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isArabic ? 'بحث بالاسم، رقم الهاتف، المنتج أو المقاس...' : 'Search by Name, Phone, Product, Size...'}
                className="w-full ps-10 pe-4 py-2.5 bg-white/90 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Category Filter Chips */}
              <div className="flex items-center gap-1 p-1 bg-white/80 rounded-xl border border-slate-200/80">
                <button
                  onClick={() => setCategoryFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    categoryFilter === 'ALL'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {isArabic ? 'الكل' : 'All'}
                </button>
                <button
                  onClick={() => setCategoryFilter('winter_drop')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                    categoryFilter === 'winter_drop'
                      ? 'bg-cyan-700 text-white'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Snowflake size={12} />
                  <span>{isArabic ? 'دروب الشتاء' : 'Winter Drop'}</span>
                </button>
                <button
                  onClick={() => setCategoryFilter('in_stock')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                    categoryFilter === 'in_stock'
                      ? 'bg-emerald-700 text-white'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Sparkles size={12} />
                  <span>{isArabic ? 'متوفر الآن بالمخزون' : 'In Stock Now'}</span>
                </button>
              </div>

              {/* Status Filter Chips */}
              <div className="flex items-center gap-1 p-1 bg-white/80 rounded-xl border border-slate-200/80">
                {['ALL', 'waiting', 'notified'].map(st => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      statusFilter === st
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    {st === 'ALL'
                      ? (isArabic ? 'جميع الحالات' : 'All Status')
                      : st === 'waiting'
                      ? (isArabic ? 'في الانتظار' : 'Waiting')
                      : (isArabic ? 'تم الإشعار' : 'Notified')}
                  </button>
                ))}
              </div>

              {/* Add Customer to Waitlist Button */}
              <button
                onClick={() => setIsWaitlistModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Plus size={15} />
                <span>{isArabic ? 'إضافة عميل للانتظار' : 'Add to Waitlist'}</span>
              </button>
            </div>
          </div>

          {/* Waitlist Clean Table */}
          {filteredWaitlist.length === 0 ? (
            <div className="bg-white/70 p-12 text-center rounded-3xl border border-slate-200/80">
              <Bell size={36} className="mx-auto text-slate-300 mb-3" />
              <h3 className="text-sm font-bold text-slate-700">
                {isArabic ? 'لا توجد بيانات مطابقة في قائمة الانتظار' : 'No waitlist records found'}
              </h3>
              <p className="text-xs text-slate-400 mt-1 mb-4">
                {isArabic
                  ? 'عند قيام المتسوقين بطلب إشعار توفر المقاسات أو دروب الشتاء من الموقع ستظهر طلباتهم هنا فوراً'
                  : 'Customer back-in-stock alerts and winter drop registrations will appear here automatically.'}
              </p>
              <button
                onClick={() => setIsWaitlistModalOpen(true)}
                className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                {isArabic ? '+ إضافة عميل يدوياً' : '+ Add Manual Customer'}
              </button>
            </div>
          ) : (
            <div className="bg-white/80 rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-start text-xs">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3.5 px-4 text-start">{isArabic ? 'العميل' : 'Customer Name'}</th>
                      <th className="py-3.5 px-4 text-start">{isArabic ? 'رقم الهاتف' : 'Phone'}</th>
                      <th className="py-3.5 px-4 text-start">{isArabic ? 'المنتج المطلوب' : 'Product'}</th>
                      <th className="py-3.5 px-4 text-center">{isArabic ? 'المقاس' : 'Size'}</th>
                      <th className="py-3.5 px-4 text-center">{isArabic ? 'المخزون الفعلي بالـ ERP' : 'Live ERP Stock'}</th>
                      <th className="py-3.5 px-4 text-center">{isArabic ? 'تاريخ التسجيل' : 'Date'}</th>
                      <th className="py-3.5 px-4 text-center">{isArabic ? 'الحالة' : 'Status'}</th>
                      <th className="py-3.5 px-4 text-end">{isArabic ? 'إرسال إشعار توفر المنتج' : 'WhatsApp Notification'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredWaitlist.map(item => {
                      const product = products.find(p => p.id === item.productId || p.name === item.productName);
                      const currentStock = product ? getAvailableStock(product, item.size) : 0;
                      const isNotified = item.status === 'notified';
                      const isWinter = item.isWinterDrop || item.productName?.toLowerCase().includes('winter');

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                          {/* Name */}
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[11px] shrink-0">
                                {(item.customerName || item.name || 'U').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <span className="block">{item.customerName || item.name || (isArabic ? 'عميل غير مسجل' : 'Store Customer')}</span>
                                {item.notes && <span className="text-[10px] text-slate-400 block font-normal">{item.notes}</span>}
                              </div>
                            </div>
                          </td>

                          {/* Phone */}
                          <td className="py-3.5 px-4 font-mono text-slate-700">
                            <div className="flex items-center gap-1.5">
                              <span>{item.phone || item.customerPhone}</span>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(item.phone || item.customerPhone || '');
                                  showToast(isArabic ? 'تم نسخ رقم الهاتف!' : 'Phone copied!');
                                }}
                                title={isArabic ? 'نسخ الرقم' : 'Copy Phone'}
                                className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                              >
                                <Copy size={12} />
                              </button>
                            </div>
                          </td>

                          {/* Product */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              {isWinter && (
                                <span className="p-1 rounded-md bg-cyan-50 text-cyan-700 border border-cyan-200" title={isArabic ? 'دروب الشتاء' : 'Winter Drop'}>
                                  <Snowflake size={12} />
                                </span>
                              )}
                              <span className="font-bold text-slate-800">
                                {item.productName || item.product || (isArabic ? 'منتج الشتاء' : 'Product')}
                              </span>
                            </div>
                          </td>

                          {/* Size */}
                          <td className="py-3.5 px-4 text-center">
                            <span className="inline-block px-2.5 py-0.5 rounded-md font-black text-[11px] bg-slate-100 text-slate-800">
                              {item.size || 'M'}
                            </span>
                          </td>

                          {/* Live ERP Stock Status */}
                          <td className="py-3.5 px-4 text-center">
                            {currentStock > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <Sparkles size={11} className="text-emerald-600" />
                                {isArabic ? `متوفر الآن (${currentStock} قطع)` : `In Stock Now (${currentStock})`}
                              </span>
                            ) : (
                              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
                                {isArabic ? 'غير متوفر (0)' : 'Out of Stock (0)'}
                              </span>
                            )}
                          </td>

                          {/* Registration Date */}
                          <td className="py-3.5 px-4 text-center text-slate-500 font-mono text-[11px]">
                            {item.createdAt ? (
                              new Date((item.createdAt.seconds || 0) * 1000).toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            ) : '—'}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 text-center">
                            {isNotified ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                                <Check size={11} />
                                {isArabic ? 'تم الإشعار' : 'Notified'}
                              </span>
                            ) : (
                              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800">
                                {isArabic ? 'في الانتظار' : 'Waiting'}
                              </span>
                            )}
                          </td>

                          {/* 1-Click WhatsApp Button */}
                          <td className="py-3.5 px-4 text-end">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleNotifyWaitlistCustomer(item)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-colors shadow-sm cursor-pointer whitespace-nowrap"
                                title={isArabic ? 'إرسال إشعار توفر المنتج عبر واتساب' : 'Send WhatsApp Back-in-Stock Notification'}
                              >
                                <MessageCircle size={14} />
                                <span>{isArabic ? 'إرسال إشعار واتساب بتوفر المنتج' : 'Notify Back in Stock'}</span>
                              </button>

                              <button
                                onClick={() => handleDeleteWaitlist(item)}
                                className="p-1.5 text-slate-300 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                                title={isArabic ? 'حذف من القائمة' : 'Delete'}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 2: SIZE EXCHANGE REQUESTS QUEUE ───────────────────────────── */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'exchanges' && (
        <div className="space-y-6">
          {/* Metrics Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white/80 p-4 rounded-2xl border border-slate-200/80 shadow-sm">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                {isArabic ? 'إجمالي طلبات الاستبدال' : 'Total Requests'}
              </span>
              <span className="text-2xl font-black text-slate-900">{exchangeRequests.length}</span>
            </div>

            <div className="bg-amber-50/80 p-4 rounded-2xl border border-amber-200/60 shadow-sm">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 block mb-1">
                {isArabic ? 'قيد المراجعة والاعتماد' : 'Pending Review'}
              </span>
              <span className="text-2xl font-black text-amber-900">{pendingExchangesCount}</span>
            </div>

            <div className="bg-emerald-50/80 p-4 rounded-2xl border border-emerald-200/60 shadow-sm">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 block mb-1">
                {isArabic ? 'تم اعتماد الاستبدال وتحديث المخزون' : 'Approved & Swapped'}
              </span>
              <span className="text-2xl font-black text-emerald-900">
                {exchangeRequests.filter(r => r.status === 'approved').length}
              </span>
            </div>

            <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 shadow-sm">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                {isArabic ? 'مرفوض / تم التواصل' : 'Rejected / Contacted'}
              </span>
              <span className="text-2xl font-black text-slate-700">
                {exchangeRequests.filter(r => r.status === 'rejected').length}
              </span>
            </div>
          </div>

          {/* Search, Filter & Add Manual Request */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isArabic ? 'بحث برقم الطلب، اسم العميل، الهاتف، أو المنتج...' : 'Search by Order ID, Name, Phone, Product...'}
                className="w-full ps-10 pe-4 py-2.5 bg-white/90 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 p-1 bg-white/80 rounded-xl border border-slate-200/80">
                {['ALL', 'pending', 'approved', 'rejected'].map(st => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      statusFilter === st
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    {st === 'ALL'
                      ? (isArabic ? 'الكل' : 'All')
                      : st === 'pending'
                      ? (isArabic ? 'قيد المراجعة' : 'Pending')
                      : st === 'approved'
                      ? (isArabic ? 'معتمد' : 'Approved')
                      : (isArabic ? 'مرفوض' : 'Rejected')}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setIsManualExchangeModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Plus size={15} />
                <span>{isArabic ? 'تسجيل استبدال يدوي' : 'Log Manual Exchange'}</span>
              </button>
            </div>
          </div>

          {/* Exchange Requests List */}
          {filteredExchanges.length === 0 ? (
            <div className="bg-white/70 p-12 text-center rounded-3xl border border-slate-200/80">
              <RefreshCw size={36} className="mx-auto text-slate-300 mb-3" />
              <h3 className="text-sm font-bold text-slate-700">
                {isArabic ? 'لا توجد طلبات استبدال مطابقة' : 'No exchange requests found'}
              </h3>
              <p className="text-xs text-slate-400 mt-1 mb-4">
                {isArabic
                  ? 'طلبات استبدال المقاس المقدمة من العملاء عبر المتجر الإلكتروني تظهر هنا تلقائياً'
                  : 'Customer exchange requests submitted on the web store will appear here.'}
              </p>
              <button
                onClick={() => setIsManualExchangeModalOpen(true)}
                className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                {isArabic ? '+ تسجيل طلب استبدال' : '+ Log Exchange Request'}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredExchanges.map(request => {
                const origItem = request.originalItem || {};
                const product = products.find(
                  p => p.id === request.productId ||
                       p.id === origItem.id ||
                       p.id === origItem.productId ||
                       p.name === origItem.name ||
                       p.name === request.productName
                );
                const reqSize = normalizeSize(request.requestedSize) || request.requestedSize;
                const origSize = normalizeSize(origItem.currentSize || origItem.size || request.originalSize) || 'M';
                const availableStock = product ? getAvailableStock(product, reqSize) : 0;
                const isPending = (request.status || 'pending') === 'pending';
                const isApproved = request.status === 'approved';
                const isRejected = request.status === 'rejected';

                return (
                  <motion.div
                    key={request.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/80 p-5 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Customer & Order Metadata */}
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
                            #{request.order_id || request.orderId || 'ORD-UNKNOWN'}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            isApproved
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isRejected
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse'
                          }`}>
                            {isApproved
                              ? (isArabic ? 'تم اعتماد الاستبدال' : 'Exchange Approved')
                              : isRejected
                              ? (isArabic ? 'مرفوض' : 'Rejected')
                              : (isArabic ? 'قيد المراجعة' : 'Pending Review')}
                          </span>
                          {request.createdAt && (
                            <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                              <Clock size={12} />
                              {new Date((request.createdAt.seconds || 0) * 1000).toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap">
                          <span className="font-bold text-slate-900 flex items-center gap-1">
                            <User size={13} className="text-slate-400" />
                            {request.customerName || request.name || (isArabic ? 'عميل المتجر' : 'Customer')}
                          </span>
                          <span className="flex items-center gap-1 font-mono">
                            <Phone size={13} className="text-slate-400" />
                            {request.phone || request.customerPhone}
                          </span>
                          {request.governorate && (
                            <span className="flex items-center gap-1 text-slate-500">
                              <MapPin size={13} className="text-slate-400" />
                              {request.governorate}
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-700 pt-1">
                          <span className="font-bold text-slate-900">{origItem.name || product?.name || request.productName || 'القطعة'}</span>
                        </div>

                        {(request.reason || request.notes) && (
                          <p className="text-xs text-slate-500 italic bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 mt-1 inline-block">
                            "{request.reason || 'طلب تبديل المقاس'}" {request.notes ? `— ${request.notes}` : ''}
                          </p>
                        )}

                        {isRejected && request.rejectionReason && (
                          <p className="text-xs text-rose-700 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200 mt-1 inline-block">
                            {isArabic ? `سبب الرفض: ${request.rejectionReason}` : `Rejection reason: ${request.rejectionReason}`}
                          </p>
                        )}
                      </div>

                      {/* Item Swapping Visualization */}
                      <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        {/* Original Size */}
                        <div className="text-center">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                            {isArabic ? 'المقاس الحالي' : 'Original Size'}
                          </span>
                          <span className="inline-block px-3 py-1 rounded-lg text-xs font-black bg-slate-200 text-slate-700">
                            {origSize}
                          </span>
                        </div>

                        {/* Transition Arrow */}
                        <div className="text-slate-400">
                          {isArabic ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
                        </div>

                        {/* Requested Replacement Size */}
                        <div className="text-center">
                          <span className="text-[10px] uppercase font-bold text-emerald-700 block mb-0.5">
                            {isArabic ? 'المقاس الجديد' : 'Requested Size'}
                          </span>
                          <span className="inline-block px-3 py-1 rounded-lg text-xs font-black bg-emerald-600 text-white">
                            {reqSize}
                          </span>
                        </div>

                        {/* Inventory Availability Badge */}
                        <div className="ms-2 ps-3 border-s border-slate-200 text-end">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                            {isArabic ? 'مخزون المقاس البديل' : 'Replacement Stock'}
                          </span>
                          {availableStock > 0 ? (
                            <span className="inline-block text-[11px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              {isArabic ? `متوفر (${availableStock} قطع)` : `In Stock (${availableStock} pcs)`}
                            </span>
                          ) : (
                            <span className="inline-block text-[11px] font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                              {isArabic ? 'غير متوفر (0 قطعة)' : 'Out of Stock (0 pcs)'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {isPending && (
                          <>
                            {/* Action Button 1: اعتماد الاستبدال وتحديث المخزون */}
                            <button
                              onClick={() => handleApproveExchange(request)}
                              disabled={actionLoading === request.id}
                              className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-black hover:bg-emerald-700 transition-colors shadow-sm cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                              title={isArabic ? 'اعتماد الاستبدال وتحديث أرصدة المخزون بالـ ERP تلقائياً' : 'Approve exchange and automatically swap stock in products'}
                            >
                              <CheckCircle2 size={15} />
                              <span>{isArabic ? 'اعتماد الاستبدال وتحديث المخزون' : 'Approve & Swap Stock'}</span>
                            </button>

                            {/* Action Button 2: رفض / تواصل واتساب */}
                            <button
                              onClick={() => setRejectModalData({
                                open: true,
                                request,
                                reason: 'المقاس البديل غير متوفر حالياً بالمخزون'
                              })}
                              disabled={actionLoading === request.id}
                              className="px-3.5 py-2.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                              title={isArabic ? 'رفض وتوجيه رسالة واتساب للعميل' : 'Reject & Contact via WhatsApp'}
                            >
                              <XCircle size={15} />
                              <span>{isArabic ? 'رفض / تواصل واتساب' : 'Reject / WhatsApp'}</span>
                            </button>
                          </>
                        )}

                        {/* Direct WhatsApp Chat Shortcut */}
                        <a
                          href={formatWhatsAppLink(
                            request.phone || request.customerPhone,
                            isArabic
                              ? `أهلاً يا ${request.customerName || 'عزيزي'} بخصوص طلب استبدال المقاس لطلبكم رقم #${request.order_id || request.orderId}...`
                              : `Hello ${request.customerName || 'there'} regarding your exchange request for Order #${request.order_id || request.orderId}...`
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                          title={isArabic ? 'مراسلة العميل مباشرة عبر واتساب' : 'Chat on WhatsApp'}
                        >
                          <MessageCircle size={16} />
                        </a>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 3: PROMO CODES CONTROLLER ─────────────────────────────────── */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'promos' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900">
                {isArabic ? 'أكواد الخصم والبروموكود للمتجر الإلكتروني' : 'Active Store Promo Codes'}
              </h3>
              <p className="text-xs text-slate-400">
                {isArabic
                  ? 'يتم فحص وتطبيق هذه الأكواد تلقائياً وبشكل لحظي داخل صفحة الدفع بالمتجر'
                  : 'Validated and applied dynamically at the website checkout'}
              </p>
            </div>

            <button
              onClick={() => setIsPromoModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus size={15} />
              <span>{isArabic ? 'إضافة كود خصم جديد' : 'New Promo Code'}</span>
            </button>
          </div>

          {promoCodes.length === 0 ? (
            <div className="bg-white/70 p-12 text-center rounded-3xl border border-slate-200/80">
              <Tag size={36} className="mx-auto text-slate-300 mb-3" />
              <h3 className="text-sm font-bold text-slate-700">
                {isArabic ? 'لا توجد أكواد خصم مسجلة حالياً' : 'No promo codes found'}
              </h3>
              <p className="text-xs text-slate-400 mt-1 mb-4">
                {isArabic ? 'أضف كود خصم جديد (مثل WINTER15) لتفعيله فوراً على المتجر' : 'Create a promo code (e.g. WINTER15) to enable discounts for shoppers.'}
              </p>
              <button
                onClick={() => setIsPromoModalOpen(true)}
                className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                {isArabic ? 'إنشاء أول كود خصم' : 'Create First Code'}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {promoCodes.map(promo => {
                const isActive = promo.isActive !== false;
                return (
                  <motion.div
                    key={promo.id}
                    layout
                    className={`p-5 rounded-3xl border transition-all ${
                      isActive
                        ? 'bg-white/90 border-slate-200/90 shadow-sm'
                        : 'bg-slate-50/70 border-slate-200/50 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-black bg-slate-900 text-white px-3 py-1 rounded-xl">
                          {promo.code || promo.id}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-200 text-slate-600'
                        }`}>
                          {isActive ? (isArabic ? 'نشط' : 'Active') : (isArabic ? 'معطل' : 'Disabled')}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        {/* 1-Click Toggle Active Switch */}
                        <button
                          onClick={() => handleTogglePromoStatus(promo)}
                          className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                            isActive
                              ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }`}
                        >
                          {isActive ? (isArabic ? 'تعطيل' : 'Disable') : (isArabic ? 'تفعيل' : 'Enable')}
                        </button>
                        <button
                          onClick={() => handleDeletePromo(promo)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                          title={isArabic ? 'حذف' : 'Delete'}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between items-center text-slate-600">
                        <span>{isArabic ? 'قيمة الخصم:' : 'Discount Value:'}</span>
                        <span className="font-black text-slate-900">
                          {promo.type === 'percentage'
                            ? `${promo.value}%`
                            : promo.type === 'free_shipping'
                            ? (isArabic ? 'شحن مجاني' : 'Free Shipping')
                            : `${promo.value} EGP`}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-slate-600">
                        <span>{isArabic ? 'الحد الأدنى للطلب:' : 'Min Order:'}</span>
                        <span className="font-bold text-slate-800">
                          {promo.minOrder ? `${formatEGP(promo.minOrder)}` : (isArabic ? 'بدون حد أدنى' : 'No Minimum')}
                        </span>
                      </div>

                      {(promo.labelAr || promo.labelEn) && (
                        <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                          {isArabic ? promo.labelAr || promo.labelEn : promo.labelEn || promo.labelAr}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 4: STORE SETTINGS & SHIPPING CONTROLLER ───────────────────── */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveStoreConfig} className="space-y-6">
          {/* Top Live Banner Preview */}
          {storeConfig.isAnnouncementActive && (
            <div className="p-3 bg-[#181E1C] text-white rounded-2xl text-center text-xs font-semibold shadow-sm flex items-center justify-center gap-2">
              <Sparkles size={14} className="text-amber-400" />
              <span>{isArabic ? storeConfig.announcementText_ar : storeConfig.announcementText_en}</span>
              <span className="text-[10px] text-white/50 ps-2 border-s border-white/20">
                {isArabic ? 'معاينة الشريط العلوي الحي' : 'Live Header Preview'}
              </span>
            </div>
          )}

          {/* Free Shipping & Announcement Bar Card */}
          <div className="bg-white/80 p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-5">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
              <Truck size={18} className="text-slate-700" />
              <h3 className="text-sm font-black text-slate-900">
                {isArabic ? 'الحد الأدنى للشحن المجاني وشريط الإعلانات' : 'Free Shipping Threshold & Top Announcement Banner'}
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1.5">
                  {isArabic ? 'الحد الأدنى للشحن المجاني (ج.م):' : 'Free Shipping Threshold (EGP):'}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={storeConfig.freeShippingThreshold}
                    onChange={(e) => setStoreConfig({ ...storeConfig, freeShippingThreshold: e.target.value })}
                    className="w-full ps-3.5 pe-12 py-2.5 rounded-xl border border-slate-200 font-bold focus:ring-2 focus:ring-slate-900/10 focus:outline-none"
                  />
                  <span className="absolute end-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                    EGP
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {isArabic
                    ? 'يتم تحديث شريط تقدم الشحن المجاني في سلة التسوق وصفحة الدفع تلقائياً بهذا الرقم'
                    : 'Cart drawer and checkout progress bar adapt dynamically to this amount in real time'}
                </p>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1.5">
                  {isArabic ? 'تفعيل شريط الإعلان أعلى المتجر:' : 'Top Announcement Banner Active:'}
                </label>
                <div className="flex items-center gap-3 h-10">
                  <button
                    type="button"
                    onClick={() => setStoreConfig({ ...storeConfig, isAnnouncementActive: !storeConfig.isAnnouncementActive })}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-colors cursor-pointer ${
                      storeConfig.isAnnouncementActive
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {storeConfig.isAnnouncementActive
                      ? (isArabic ? '✓ مفعّل ومريء' : '✓ Active & Visible')
                      : (isArabic ? '✕ مخفي' : '✕ Hidden')}
                  </button>
                  <span className="text-[11px] text-slate-400">
                    {storeConfig.isAnnouncementActive
                      ? (isArabic ? 'الشريط يظهر لكافة زوار المتجر' : 'Banner is visible to all store visitors')
                      : (isArabic ? 'تم إخفاء الشريط' : 'Banner hidden')}
                  </span>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="font-bold text-slate-700 block mb-1.5">
                  {isArabic ? 'نص الإعلان بالعربية (الشريط العلوي):' : 'Announcement Text (Arabic):'}
                </label>
                <input
                  type="text"
                  value={storeConfig.announcementText_ar}
                  onChange={(e) => setStoreConfig({ ...storeConfig, announcementText_ar: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium focus:ring-2 focus:ring-slate-900/10 focus:outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="font-bold text-slate-700 block mb-1.5">
                  {isArabic ? 'نص الإعلان بالإنجليزية (الشريط العلوي):' : 'Announcement Text (English):'}
                </label>
                <input
                  type="text"
                  value={storeConfig.announcementText_en}
                  onChange={(e) => setStoreConfig({ ...storeConfig, announcementText_en: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium focus:ring-2 focus:ring-slate-900/10 focus:outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="font-bold text-slate-700 block mb-1.5">
                  {isArabic ? 'إشعار موعد دروب الشتاء (اختياري e.g. 2026-11-15T00:00:00):' : 'Winter Drop Countdown / Schedule (Optional):'}
                </label>
                <input
                  type="text"
                  value={storeConfig.winterDropCountdown || ''}
                  onChange={(e) => setStoreConfig({ ...storeConfig, winterDropCountdown: e.target.value })}
                  placeholder="2026-11-15T00:00:00"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono focus:ring-2 focus:ring-slate-900/10 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Governorate Shipping Rates Card */}
          <div className="bg-white/80 p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-5">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
              <Coins size={18} className="text-slate-700" />
              <h3 className="text-sm font-black text-slate-900">
                {isArabic ? 'تعريفات الشحن بالمحافظات (ج.م)' : 'Governorate Shipping Rates (EGP)'}
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {isArabic ? 'القاهرة والجيزة:' : 'Cairo & Giza:'}
                </label>
                <input
                  type="number"
                  min="0"
                  value={storeConfig.shippingRates?.cairo_giza ?? 90}
                  onChange={(e) =>
                    setStoreConfig({
                      ...storeConfig,
                      shippingRates: { ...storeConfig.shippingRates, cairo_giza: e.target.value }
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {isArabic ? 'المدن الجديدة (زايد / التجمع / الشروق):' : 'New Cities (Zayed / Tagamoa / Shorouk):'}
                </label>
                <input
                  type="number"
                  min="0"
                  value={storeConfig.shippingRates?.new_cities ?? 95}
                  onChange={(e) =>
                    setStoreConfig({
                      ...storeConfig,
                      shippingRates: { ...storeConfig.shippingRates, new_cities: e.target.value }
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {isArabic ? 'الإسكندرية ومدن القناة:' : 'Alexandria & Canal (Port Said / Suez / Ismailia):'}
                </label>
                <input
                  type="number"
                  min="0"
                  value={storeConfig.shippingRates?.alex_canal ?? 95}
                  onChange={(e) =>
                    setStoreConfig({
                      ...storeConfig,
                      shippingRates: { ...storeConfig.shippingRates, alex_canal: e.target.value }
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {isArabic ? 'محافظات الدلتا:' : 'Delta Governorates:'}
                </label>
                <input
                  type="number"
                  min="0"
                  value={storeConfig.shippingRates?.delta ?? 100}
                  onChange={(e) =>
                    setStoreConfig({
                      ...storeConfig,
                      shippingRates: { ...storeConfig.shippingRates, delta: e.target.value }
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {isArabic ? 'الصعيد والوجه القبلي:' : 'Upper Egypt:'}
                </label>
                <input
                  type="number"
                  min="0"
                  value={storeConfig.shippingRates?.upper_egypt ?? 120}
                  onChange={(e) =>
                    setStoreConfig({
                      ...storeConfig,
                      shippingRates: { ...storeConfig.shippingRates, upper_egypt: e.target.value }
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {isArabic ? 'البحر الأحمر والمحافظات الحدودية:' : 'Red Sea & Border Governorates:'}
                </label>
                <input
                  type="number"
                  min="0"
                  value={storeConfig.shippingRates?.coastal_border ?? 180}
                  onChange={(e) =>
                    setStoreConfig({
                      ...storeConfig,
                      shippingRates: { ...storeConfig.shippingRates, coastal_border: e.target.value }
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-bold focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Submit Save Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSavingConfig}
              className="px-6 py-3.5 rounded-2xl bg-slate-900 text-white font-black text-xs uppercase tracking-wider hover:bg-slate-800 transition-colors shadow-lg cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              <Save size={16} />
              <span>
                {isSavingConfig
                  ? (isArabic ? 'جاري حفظ الإعدادات...' : 'Saving Changes...')
                  : (isArabic ? 'حفظ وتحديث المتجر الآن' : 'Save & Publish Live')}
              </span>
            </button>
          </div>
        </form>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* ── MODALS ────────────────────────────────────────────────────────── */}
      {/* ═════════════════════════════════════════════════════════════════════ */}

      {/* 1. Create Promo Code Modal */}
      <AnimatePresence>
        {isPromoModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-black text-slate-900 text-sm">
                  {isArabic ? 'إضافة كود خصم جديد للمتجر' : 'Create New Promo Code'}
                </h3>
                <button
                  onClick={() => setIsPromoModalOpen(false)}
                  className="text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <XCircle size={18} />
                </button>
              </div>

              <form onSubmit={handleCreatePromoCode} className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {isArabic ? 'كود الخصم (أحرف إنجليزية وأرقام e.g. WINTER15):' : 'Promo Code (Uppercase):'}
                  </label>
                  <input
                    type="text"
                    required
                    value={newPromo.code}
                    onChange={(e) => setNewPromo({ ...newPromo, code: e.target.value.toUpperCase() })}
                    placeholder="WINTER15"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono font-bold uppercase focus:ring-2 focus:ring-slate-900/10 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {isArabic ? 'نوع الخصم:' : 'Discount Type:'}
                  </label>
                  <select
                    value={newPromo.type}
                    onChange={(e) => setNewPromo({ ...newPromo, type: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-bold focus:outline-none cursor-pointer"
                  >
                    <option value="percentage">{isArabic ? 'نسبة مئوية (%)' : 'Percentage (%)'}</option>
                    <option value="fixed">{isArabic ? 'مبلغ ثابت (ج.م)' : 'Fixed Amount (EGP)'}</option>
                    <option value="free_shipping">{isArabic ? 'شحن مجاني لكافة المحافظات' : 'Free Shipping'}</option>
                  </select>
                </div>

                {newPromo.type !== 'free_shipping' && (
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      {isArabic ? 'قيمة الخصم:' : 'Discount Value:'}
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={newPromo.value}
                      onChange={(e) => setNewPromo({ ...newPromo, value: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-bold focus:outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {isArabic ? 'الحد الأدنى لقيمة الطلب (ج.م):' : 'Minimum Order Subtotal (EGP):'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newPromo.minOrder}
                    onChange={(e) => setNewPromo({ ...newPromo, minOrder: e.target.value })}
                    placeholder="0"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-bold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {isArabic ? 'الوصف بالعربية:' : 'Description (Arabic):'}
                  </label>
                  <input
                    type="text"
                    value={newPromo.labelAr}
                    onChange={(e) => setNewPromo({ ...newPromo, labelAr: e.target.value })}
                    placeholder="خصم 15% على كولكشن الشتاء"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPromoModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 cursor-pointer"
                  >
                    {isArabic ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingPromo}
                    className="px-5 py-2 rounded-xl bg-slate-900 text-white font-black hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isSavingPromo ? (isArabic ? 'جاري الحفظ...' : 'Saving...') : (isArabic ? 'إنشاء الكود' : 'Create Code')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. Add Waitlist Customer Modal */}
      <AnimatePresence>
        {isWaitlistModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-black text-slate-900 text-sm">
                  {isArabic ? 'إضافة عميل لقائمة الانتظار ودروب الشتاء' : 'Add Customer to Waitlist'}
                </h3>
                <button
                  onClick={() => setIsWaitlistModalOpen(false)}
                  className="text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <XCircle size={18} />
                </button>
              </div>

              <form onSubmit={handleAddWaitlistSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {isArabic ? 'اسم العميل:' : 'Customer Name:'}
                  </label>
                  <input
                    type="text"
                    required
                    value={newWaitlist.customerName}
                    onChange={(e) => setNewWaitlist({ ...newWaitlist, customerName: e.target.value })}
                    placeholder="e.g. عمر فاروق"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {isArabic ? 'رقم الهاتف (واتساب):' : 'Phone (WhatsApp):'}
                  </label>
                  <input
                    type="text"
                    required
                    value={newWaitlist.phone}
                    onChange={(e) => setNewWaitlist({ ...newWaitlist, phone: e.target.value })}
                    placeholder="010XXXXXXXX"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {isArabic ? 'المنتج المطلوب:' : 'Product:'}
                  </label>
                  <select
                    value={newWaitlist.productId}
                    onChange={(e) => {
                      const prod = products.find(p => p.id === e.target.value);
                      setNewWaitlist({
                        ...newWaitlist,
                        productId: e.target.value,
                        productName: prod ? prod.name : ''
                      });
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none cursor-pointer"
                  >
                    <option value="">{isArabic ? '-- اختر منتجاً من الكتالوج (أو اكتبه يدوياً) --' : '-- Select Product from Catalog --'}</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                    ))}
                  </select>
                </div>

                {!newWaitlist.productId && (
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      {isArabic ? 'اسم الموديل المخصص أو دروب الشتاء:' : 'Custom Item / Winter Drop Name:'}
                    </label>
                    <input
                      type="text"
                      value={newWaitlist.productName}
                      onChange={(e) => setNewWaitlist({ ...newWaitlist, productName: e.target.value })}
                      placeholder="e.g. Winter Hoodie Drop V2"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      {isArabic ? 'المقاس المطلوب:' : 'Size:'}
                    </label>
                    <select
                      value={newWaitlist.size}
                      onChange={(e) => setNewWaitlist({ ...newWaitlist, size: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-bold focus:outline-none cursor-pointer"
                    >
                      {['S', 'M', 'L', 'XL', 'XXL', 'XXXL'].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2 pt-5">
                    <input
                      type="checkbox"
                      id="winterDropCheck"
                      checked={newWaitlist.isWinterDrop}
                      onChange={(e) => setNewWaitlist({ ...newWaitlist, isWinterDrop: e.target.checked })}
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                    />
                    <label htmlFor="winterDropCheck" className="font-bold text-slate-700 text-xs cursor-pointer">
                      {isArabic ? 'دروب الشتاء' : 'Winter Drop'}
                    </label>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {isArabic ? 'ملاحظات إضافية:' : 'Notes:'}
                  </label>
                  <input
                    type="text"
                    value={newWaitlist.notes}
                    onChange={(e) => setNewWaitlist({ ...newWaitlist, notes: e.target.value })}
                    placeholder={isArabic ? 'تواصل معنا على انستجرام' : 'Contacted via Instagram DM'}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsWaitlistModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 cursor-pointer"
                  >
                    {isArabic ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingWaitlist}
                    className="px-5 py-2 rounded-xl bg-slate-900 text-white font-black hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isSavingWaitlist ? (isArabic ? 'جاري الحفظ...' : 'Saving...') : (isArabic ? 'إضافة للانتظار' : 'Add Customer')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. Rejection & WhatsApp Contact Modal */}
      <AnimatePresence>
        {rejectModalData.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-black text-rose-700 text-sm flex items-center gap-2">
                  <XCircle size={18} />
                  <span>{isArabic ? 'رفض طلب الاستبدال والتواصل واتساب' : 'Reject Exchange & WhatsApp'}</span>
                </h3>
                <button
                  onClick={() => setRejectModalData({ open: false, request: null, reason: '' })}
                  className="text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <XCircle size={18} />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <p className="text-slate-600">
                  {isArabic
                    ? 'سيتم تحديث حالة الطلب إلى "مرفوض" في قاعدة البيانات، وتجهيز رسالة واتساب مهذبة تشرح للعميل سبب الرفض والبدائل المتاحة:'
                    : 'The request will be marked as rejected and WhatsApp opened with a courteous message explaining the reason:'}
                </p>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {isArabic ? 'سبب الرفض الموجه للعميل:' : 'Reason for rejection:'}
                  </label>
                  <select
                    value={rejectModalData.reason}
                    onChange={(e) => setRejectModalData({ ...rejectModalData, reason: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-bold focus:outline-none mb-2 cursor-pointer"
                  >
                    <option value="المقاس البديل غير متوفر حالياً بالمخزون">{isArabic ? 'المقاس البديل غير متوفر حالياً بالمخزون' : 'Requested size out of stock'}</option>
                    <option value="تجاوزت فترة الاستبدال المسموحة (14 يوماً من الاستلام)">{isArabic ? 'تجاوزت فترة الاستبدال المسموحة (14 يوماً)' : 'Exceeded 14-day exchange window'}</option>
                    <option value="المنتج غير مطابق لحالة الاستلام الأصلية">{isArabic ? 'المنتج غير مطابق لحالة الاستلام الأصلية' : 'Item not in original condition'}</option>
                    <option value="سبب آخر مخصص">{isArabic ? 'سبب آخر مخصص' : 'Custom reason'}</option>
                  </select>

                  <input
                    type="text"
                    value={rejectModalData.reason}
                    onChange={(e) => setRejectModalData({ ...rejectModalData, reason: e.target.value })}
                    placeholder={isArabic ? 'اكتب سبب الرفض هنا...' : 'Enter custom reason...'}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setRejectModalData({ open: false, request: null, reason: '' })}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 cursor-pointer"
                  >
                    {isArabic ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="button"
                    onClick={handleRejectExchangeConfirm}
                    disabled={actionLoading === rejectModalData.request?.id}
                    className="px-5 py-2 rounded-xl bg-rose-600 text-white font-black hover:bg-rose-700 transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <XCircle size={15} />
                    <span>{isArabic ? 'تأكيد الرفض وإرسال واتساب' : 'Confirm Reject & Open WhatsApp'}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. Manual Exchange Request Modal */}
      <AnimatePresence>
        {isManualExchangeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-black text-slate-900 text-sm">
                  {isArabic ? 'تسجيل طلب استبدال يدوي' : 'Log Manual Exchange Request'}
                </h3>
                <button
                  onClick={() => setIsManualExchangeModalOpen(false)}
                  className="text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <XCircle size={18} />
                </button>
              </div>

              <form onSubmit={handleAddManualExchangeSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {isArabic ? 'رقم الطلب الأصلي (Order ID):' : 'Original Order ID:'}
                  </label>
                  <input
                    type="text"
                    required
                    value={newExchange.order_id}
                    onChange={(e) => setNewExchange({ ...newExchange, order_id: e.target.value.toUpperCase() })}
                    placeholder="e.g. TOJA-1045"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono font-bold uppercase focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      {isArabic ? 'اسم العميل:' : 'Customer Name:'}
                    </label>
                    <input
                      type="text"
                      value={newExchange.customerName}
                      onChange={(e) => setNewExchange({ ...newExchange, customerName: e.target.value })}
                      placeholder="اسم العميل"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      {isArabic ? 'رقم الهاتف:' : 'Phone Number:'}
                    </label>
                    <input
                      type="text"
                      required
                      value={newExchange.phone}
                      onChange={(e) => setNewExchange({ ...newExchange, phone: e.target.value })}
                      placeholder="010XXXXXXXX"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {isArabic ? 'المنتج المراد استبداله:' : 'Product to Exchange:'}
                  </label>
                  <select
                    value={newExchange.productId}
                    onChange={(e) => {
                      const prod = products.find(p => p.id === e.target.value);
                      setNewExchange({
                        ...newExchange,
                        productId: e.target.value,
                        productName: prod ? prod.name : ''
                      });
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none cursor-pointer"
                  >
                    <option value="">{isArabic ? '-- اختر منتجاً من المخزون --' : '-- Select Product from Inventory --'}</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      {isArabic ? 'المقاس المسترجع (الحالي):' : 'Returned Size:'}
                    </label>
                    <select
                      value={newExchange.originalSize}
                      onChange={(e) => setNewExchange({ ...newExchange, originalSize: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-bold focus:outline-none cursor-pointer"
                    >
                      {['S', 'M', 'L', 'XL', 'XXL', 'XXXL'].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      {isArabic ? 'المقاس الجديد المطلوب:' : 'Requested Size:'}
                    </label>
                    <select
                      value={newExchange.requestedSize}
                      onChange={(e) => setNewExchange({ ...newExchange, requestedSize: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-bold focus:outline-none cursor-pointer"
                    >
                      {['S', 'M', 'L', 'XL', 'XXL', 'XXXL'].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {isArabic ? 'سبب الاستبدال:' : 'Reason:'}
                  </label>
                  <input
                    type="text"
                    value={newExchange.reason}
                    onChange={(e) => setNewExchange({ ...newExchange, reason: e.target.value })}
                    placeholder="e.g. المقاس ضيق ومحتاج أكبر"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsManualExchangeModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 cursor-pointer"
                  >
                    {isArabic ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingExchange}
                    className="px-5 py-2 rounded-xl bg-slate-900 text-white font-black hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isSavingExchange ? (isArabic ? 'جاري التسجيل...' : 'Saving...') : (isArabic ? 'تسجيل الاستبدال' : 'Submit Exchange')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
