import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckSquare, Plus, Search, Filter, Calendar, Clock, AlertTriangle,
  Flame, CheckCircle2, RotateCcw, Trash2, Edit3, MessageCircle, User,
  Kanban, List, Sparkles, Layers, ChevronRight, ChevronDown, ArrowRight, ArrowLeft,
  Share2, ShieldAlert, TrendingUp, Check, ExternalLink, Loader2, Zap, X,
  Sliders, Send, RefreshCw
} from 'lucide-react';
import { useStore, TOJA_PARTNERS, calculateBatchCapitalMetrics, translations as defaultTranslations } from '../store/useStore';
import { generateDailyPartnerTasks } from '../services/aiService';
import AddPartnerTaskModal from './AddPartnerTaskModal';

const SEASON_PHASES = [
  {
    id: 'winter_prep',
    labelAr: 'التحضير للموسم الشتوي (Winter Collection Launch)',
    labelEn: 'Winter Collection Launch (Winter Prep)',
    icon: '❄️',
    badge: 'bg-blue-500/20 text-blue-300 border-blue-400/30'
  },
  {
    id: 'summer_liquidation',
    labelAr: 'تصفية الموسم الصيفي (Summer Liquidation)',
    labelEn: 'Summer Liquidation (Clearance)',
    icon: '☀️',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-400/30'
  },
  {
    id: 'active_selling',
    labelAr: 'ذروة المبيعات والتشغيل اليومي (In-Season Peak)',
    labelEn: 'In-Season Peak (Active Selling)',
    icon: '🚀',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
  },
  {
    id: 'restock_fulfillment',
    labelAr: 'إعادة إنتاج وتوريد (Restock & Scaling)',
    labelEn: 'Restock & Scaling (Reorders)',
    icon: '📦',
    badge: 'bg-purple-500/20 text-purple-300 border-purple-400/30'
  }
];

const CATEGORY_MAP = {
  production: {
    labelAr: 'الإنتاج والمصانع',
    labelEn: 'Production & Factories',
    icon: '🏭',
    color: 'bg-amber-50 text-amber-800 border-amber-200'
  },
  sales: {
    labelAr: 'المبيعات والتشغيل',
    labelEn: 'Sales & Operations',
    icon: '📈',
    color: 'bg-orange-50 text-orange-800 border-orange-200'
  },
  marketing: {
    labelAr: 'التسويق والإعلانات',
    labelEn: 'Marketing & Ads',
    icon: '📣',
    color: 'bg-purple-50 text-purple-800 border-purple-200'
  },
  creative: {
    labelAr: 'الهوية والمحتوى',
    labelEn: 'Creative & Content',
    icon: '🎨',
    color: 'bg-pink-50 text-pink-800 border-pink-200'
  },
  operations_shipping: {
    labelAr: 'العمليات والشحن',
    labelEn: 'Operations & Shipping',
    icon: '🚚',
    color: 'bg-blue-50 text-blue-800 border-blue-200'
  },
  finance: {
    labelAr: 'المالية والحسابات',
    labelEn: 'Finance & Accounts',
    icon: '💰',
    color: 'bg-emerald-50 text-emerald-800 border-emerald-200'
  }
};

const PRIORITY_MAP = {
  urgent: {
    labelAr: 'عاجل جداً',
    labelEn: 'Urgent',
    icon: '🚨',
    pill: 'bg-rose-100 text-rose-700 border-rose-200 font-black',
    dot: 'bg-rose-500 animate-pulse'
  },
  high: {
    labelAr: 'أولوية مرتفعة',
    labelEn: 'High Priority',
    icon: '⚡',
    pill: 'bg-amber-100 text-amber-800 border-amber-200 font-bold',
    dot: 'bg-amber-500'
  },
  normal: {
    labelAr: 'عادي',
    labelEn: 'Normal',
    icon: '📌',
    pill: 'bg-slate-100 text-slate-700 border-slate-200 font-medium',
    dot: 'bg-slate-400'
  }
};

export default function TasksView() {
  const {
    partnerTasks = [],
    updatePartnerTaskStatus,
    deletePartnerTask,
    addBatchPartnerTasks,
    orders = [],
    products = [],
    expenses = [],
    language = 'en',
    translations: storeTranslations
  } = useStore();

  const translations = storeTranslations || defaultTranslations;
  const t = translations[language] || translations['en'];
  const isRtl = language === 'ar';
  const isAr = language === 'ar';

  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'list'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPartnerFilter, setSelectedPartnerFilter] = useState('ALL');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState('ALL');
  const [selectedDateFilter, setSelectedDateFilter] = useState('ALL'); // 'ALL' | 'OVERDUE' | 'TODAY'

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // ── Seasonal Strategic Awareness & Operational Director State ──
  const [seasonPhase, setSeasonPhase] = useState('winter_prep');
  const [dailyFocusNote, setDailyFocusNote] = useState('');

  // ── AI Task Dispatcher & Review Modal State ──
  const [isGeneratingAiTasks, setIsGeneratingAiTasks] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewTasks, setReviewTasks] = useState([]);
  const [isCommittingBatch, setIsCommittingBatch] = useState(false);
  const [dispatchSuccessToast, setDispatchSuccessToast] = useState(null);
  const [dispatchError, setDispatchError] = useState(null);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Compute Task KPIs
  const kpis = useMemo(() => {
    const total = partnerTasks.length;
    const completed = partnerTasks.filter(task => task.status === 'completed').length;
    const inProgress = partnerTasks.filter(task => task.status === 'in_progress').length;
    const todo = partnerTasks.filter(task => task.status === 'todo').length;
    const active = todo + inProgress;
    const urgent = partnerTasks.filter(task => task.priority === 'urgent' && task.status !== 'completed').length;

    const overdue = partnerTasks.filter(task => {
      if (task.status === 'completed') return false;
      return task.dueDate && task.dueDate < todayStr;
    }).length;

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, inProgress, todo, active, urgent, overdue, completionRate };
  }, [partnerTasks, todayStr]);

  // Compute per-partner performance breakdown
  const partnerStats = useMemo(() => {
    return TOJA_PARTNERS.map(partner => {
      const pTasks = partnerTasks.filter(task => task.assignedTo?.name === partner.name);
      const total = pTasks.length;
      const completed = pTasks.filter(task => task.status === 'completed').length;
      const inProgress = pTasks.filter(task => task.status === 'in_progress').length;
      const todo = pTasks.filter(task => task.status === 'todo').length;
      const overdue = pTasks.filter(task => task.status !== 'completed' && task.dueDate && task.dueDate < todayStr).length;
      const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

      return {
        ...partner,
        total,
        completed,
        inProgress,
        todo,
        overdue,
        rate
      };
    });
  }, [partnerTasks, todayStr]);

  // Filter tasks based on search and filters
  const filteredTasks = useMemo(() => {
    return partnerTasks.filter(task => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = task.title?.toLowerCase().includes(query);
        const matchesDesc = task.description?.toLowerCase().includes(query);
        const matchesPartner = task.assignedTo?.name?.toLowerCase().includes(query) ||
          TOJA_PARTNERS.find(p => p.name === task.assignedTo?.name)?.nameAr?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc && !matchesPartner) return false;
      }

      if (selectedPartnerFilter !== 'ALL' && task.assignedTo?.name !== selectedPartnerFilter) {
        return false;
      }

      if (selectedCategoryFilter !== 'ALL' && task.category !== selectedCategoryFilter) {
        return false;
      }

      if (selectedPriorityFilter !== 'ALL' && task.priority !== selectedPriorityFilter) {
        return false;
      }

      if (selectedDateFilter === 'OVERDUE') {
        if (task.status === 'completed' || !task.dueDate || task.dueDate >= todayStr) return false;
      } else if (selectedDateFilter === 'TODAY') {
        if (task.dueDate !== todayStr) return false;
      }

      return true;
    });
  }, [partnerTasks, searchQuery, selectedPartnerFilter, selectedCategoryFilter, selectedPriorityFilter, selectedDateFilter, todayStr]);

  // Group filtered tasks by status for Kanban
  const kanbanColumns = useMemo(() => {
    return {
      todo: filteredTasks.filter(t => t.status === 'todo'),
      in_progress: filteredTasks.filter(t => t.status === 'in_progress'),
      completed: filteredTasks.filter(t => t.status === 'completed')
    };
  }, [filteredTasks]);

  // ── Automated Daily AI Task Dispatcher with Seasonal Awareness ──
  const handleGenerateDailyAiTasks = async () => {
    if (isGeneratingAiTasks) return;
    setIsGeneratingAiTasks(true);
    setDispatchSuccessToast(null);
    setDispatchError(null);

    try {
      const batchMetrics = calculateBatchCapitalMetrics(products, orders, expenses);

      // Pending / Unfulfilled Orders
      const pendingOrders = orders.filter(o =>
        !o.isDeleted &&
        o.status !== 'Delivered - Collected' &&
        o.status !== 'Delivered' &&
        o.status !== 'Cancelled'
      );

      // Returned / Failed delivery orders
      const returnedOrders = orders.filter(o => !o.isDeleted && (o.status === 'Returned' || o.status === 'Cancelled'));

      // Low stock items (stock <= 5 in any size)
      const lowStockList = [];
      products.forEach(p => {
        Object.entries(p.initialStock || {}).forEach(([size, qty]) => {
          const sold = Number(p.sold?.[size] || 0);
          const remaining = (Number(qty) || 0) - sold;
          if (remaining <= 5) {
            lowStockList.push({ name: p.name, sku: p.sku, size, remaining });
          }
        });
      });

      const liveContext = {
        seasonPhase,
        dailyFocusNote,
        todayStr,
        pendingOrdersCount: pendingOrders.length,
        capitalRecoveryRate: `${batchMetrics.rawRecoveryPct.toFixed(1)}%`,
        collectedRevenue: `${batchMetrics.netCollectedRevenue.toLocaleString('en-EG')} EGP`,
        remainingStockValue: `${batchMetrics.remainingStockCostValue.toLocaleString('en-EG')} EGP`,
        returnsCount: returnedOrders.length,
        lowStockItems: lowStockList.slice(0, 6)
      };

      // Call Groq AI (Llama 3.3 70B) to generate 4 customized operational tasks
      const generatedTasks = await generateDailyPartnerTasks(liveContext);

      if (!Array.isArray(generatedTasks) || generatedTasks.length === 0) {
        throw new Error(isAr ? "لم يتم استلام مهام صالحة من محرك الذكاء الاصطناعي." : "No valid tasks received from AI engine.");
      }

      // Populate review modal instead of auto-saving directly
      const preparedReviewTasks = generatedTasks.map((t, idx) => ({
        id: `ai-task-${Date.now()}-${idx}`,
        partnerName: t.partnerName || TOJA_PARTNERS[idx % TOJA_PARTNERS.length]?.name,
        title: t.title || '',
        description: t.description || '',
        priority: t.priority || 'normal',
        category: t.category || 'sales',
        dueDate: t.dueDate || todayStr
      }));

      setReviewTasks(preparedReviewTasks);
      setIsReviewModalOpen(true);
    } catch (err) {
      console.error("AI Task Dispatch Failed:", err);
      setDispatchError(err.message || (isAr ? "حدث خطأ أثناء توليد وتوزيع المهام بالذكاء الاصطناعي." : "Failed to generate tasks via AI."));
    } finally {
      setIsGeneratingAiTasks(false);
    }
  };

  // ── Inline Edit Handler inside Review Modal ──
  const handleUpdateReviewTask = (index, field, value) => {
    setReviewTasks(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  // ── Commit Reviewed Batch to Firestore ──
  const handleConfirmAndDispatchReviewTasks = async () => {
    if (isCommittingBatch) return;
    setIsCommittingBatch(true);

    try {
      const tasksToCommit = reviewTasks.map(t => {
        const partner = TOJA_PARTNERS.find(p => p.name === t.partnerName);
        return {
          title: t.title.trim(),
          description: t.description.trim(),
          assignedTo: {
            name: partner?.name || t.partnerName,
            email: partner?.email || ''
          },
          priority: t.priority || 'normal',
          category: t.category || partner?.category || 'sales',
          dueDate: t.dueDate || todayStr,
          status: 'todo'
        };
      });

      await addBatchPartnerTasks(tasksToCommit);

      setIsReviewModalOpen(false);
      setReviewTasks([]);
      setDispatchSuccessToast(
        isAr
          ? "تم اعتماد وتوزيع خطة العمل اليومية على الشركاء الأربعة بنجاح 🎉"
          : "Daily operational action plan approved & dispatched to all 4 partners successfully! 🎉"
      );
      setTimeout(() => setDispatchSuccessToast(null), 5000);
    } catch (err) {
      console.error("Failed to commit approved tasks:", err);
      alert(err.message || (isAr ? "حدث خطأ أثناء حفظ المهام" : "Failed to save tasks"));
    } finally {
      setIsCommittingBatch(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingTask(null);
    setIsModalOpen(true);
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleDeleteTask = async (taskId) => {
    const confirmMsg = isAr
      ? "هل أنت متأكد من رغبتك في حذف هذه المهمة نهائياً؟"
      : "Are you sure you want to permanently delete this task?";
    if (window.confirm(confirmMsg)) {
      try {
        await deletePartnerTask(taskId);
      } catch (err) {
        alert(err.message || (isAr ? 'حدث خطأ أثناء الحذف' : 'Error deleting task'));
      }
    }
  };

  const handleShareTaskWhatsApp = (task) => {
    const partner = TOJA_PARTNERS.find(p => p.name === task.assignedTo?.name);
    const partnerName = isAr ? (partner?.nameAr || task.assignedTo?.name) : (task.assignedTo?.name || partner?.name);
    const catObj = CATEGORY_MAP[task.category];
    const catLabel = isAr ? (catObj?.labelAr || task.category) : (catObj?.labelEn || task.category);
    const prioObj = PRIORITY_MAP[task.priority];
    const prioLabel = isAr ? (prioObj?.labelAr || task.priority) : (prioObj?.labelEn || task.priority);
    const statusLabel = isAr
      ? (task.status === 'completed' ? 'تم الإنجاز ✅' : task.status === 'in_progress' ? 'جاري التنفيذ ⏳' : 'قيد الانتظار 📋')
      : (task.status === 'completed' ? 'Completed ✅' : task.status === 'in_progress' ? 'In Progress ⏳' : 'To Do 📋');

    const text = isAr
      ? `*إشعار مهمة TOJA Operations 📌*\n👤 *المسؤول:* ${partnerName}\n📋 *المهمة:* ${task.title}\n🏷️ *القطاع:* ${catLabel}\n⚡ *الأولوية:* ${prioLabel}\n📅 *موعد التسليم:* ${task.dueDate}\n📊 *الحالة الحالية:* ${statusLabel}${task.description ? `\n📝 *ملاحظات:* ${task.description}` : ''}\n\n_تم التوزيع عبر نظام الذكاء الاصطناعي لإدارة عمليات ومهام TOJA_`
      : `*TOJA Operations Task Notification 📌*\n👤 *Assignee:* ${partnerName}\n📋 *Task:* ${task.title}\n🏷️ *Category:* ${catLabel}\n⚡ *Priority:* ${prioLabel}\n📅 *Due Date:* ${task.dueDate}\n📊 *Current Status:* ${statusLabel}${task.description ? `\n📝 *Notes:* ${task.description}` : ''}\n\n_Dispatched via TOJA AI Operations System_`;

    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className={`p-4 md:p-6 space-y-6 ${isRtl ? 'text-right' : 'text-left'}`}>
      {/* ── Top Header Banner with AI Dispatch & Seasonal Control Bar ── */}
      <div className="flex flex-col gap-5 bg-gradient-to-r from-[#181E1C] via-[#212c27] to-[#181E1C] text-white p-6 sm:p-7 rounded-3xl shadow-xl border border-emerald-950/40">
        {/* Header Top Row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-extrabold text-[11px] border border-emerald-400/30 flex items-center gap-1.5 shadow-inner">
                <Zap size={13} className="text-amber-400 fill-amber-400" />
                {isAr ? 'نظام إدارة العمليات والمحاسبة الذكي' : 'Smart Operations & Accountability System'}
              </span>
              <span className="text-slate-400 text-xs font-semibold">
                • {isAr ? 'الشركاء الأربعة لـ TOJA' : 'TOJA 4 Partners'}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {isAr ? 'مهام الشركاء والمحاسبة التشغيلية' : 'Partner Operations & Accountability'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 font-medium max-w-xl mt-1 leading-relaxed">
              {isAr
                ? 'توزيع خطة العمل اليومية تلقائياً بالذكاء الاصطناعي وفق موسم البراند وتوجيهات الإدارة وأرقام الدفعة اللحظية.'
                : 'Daily AI dispatch & real-time partner accountability aligned with seasonal shifts, director directives, and live metrics.'}
            </p>
          </div>

          {/* Secondary manual add task & View Mode Switcher */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleOpenAddModal}
              title={isAr ? 'إضافة مهمة يدوية جديدة' : 'Add manual task'}
              className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white border border-white/10 transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            >
              <Plus size={16} strokeWidth={2.5} />
              <span className="hidden sm:inline">{isAr ? 'مهمة يدوية' : 'Manual Task'}</span>
            </button>

            <div className="bg-white/10 p-1 rounded-2xl flex items-center border border-white/10">
              <button
                type="button"
                onClick={() => setViewMode('kanban')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'kanban' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
                }`}
              >
                <Kanban size={14} />
                <span className="hidden sm:inline">{isAr ? 'لوحة كانبان' : 'Kanban Board'}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'list' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
                }`}
              >
                <List size={14} />
                <span className="hidden sm:inline">{isAr ? 'جدول المهام' : 'List View'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Sleek Brand Seasonal Phase & Daily Focus Inputs Control Bar ── */}
        <div className="bg-black/35 border border-white/10 rounded-2xl p-3.5 sm:p-4 backdrop-blur-md space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap text-xs font-bold text-slate-300">
            <div className="flex items-center gap-2">
              <Sliders size={14} className="text-amber-400" />
              <span>{isAr ? 'توجيهات الإدارة التشغيلية ومرحلة الموسم:' : 'Operational Director & Seasonal Strategy Directive:'}</span>
            </div>
            <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
              <Sparkles size={12} className="text-amber-300" />
              Groq Llama 3.3 70B
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            {/* 1. Brand Seasonal Phase Dropdown */}
            <div className="md:col-span-5 relative">
              <select
                value={seasonPhase}
                onChange={(e) => setSeasonPhase(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs sm:text-sm font-bold outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 cursor-pointer appearance-none pe-8 transition-all"
              >
                {SEASON_PHASES.map(p => (
                  <option key={p.id} value={p.id} className="bg-[#181E1C] text-white">
                    {p.icon} {isAr ? p.labelAr : p.labelEn}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            {/* 2. Daily Strategic Focus Text Input */}
            <div className="md:col-span-7 relative">
              <input
                type="text"
                value={dailyFocusNote}
                onChange={(e) => setDailyFocusNote(e.target.value)}
                placeholder={
                  isAr
                    ? 'توجيه إداري لليوم (مثال: التركيز على عينات السويت شيرت وتجهيز حملة التمهيد)...'
                    : 'Director\'s strategic daily directive (e.g. Focus on sweatshirt samples and teaser launch)...'
                }
                className="w-full px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white placeholder:text-slate-400 text-xs sm:text-sm font-medium outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all"
              />
            </div>
          </div>

          {/* Action Row: Primary AI Task Dispatcher Button */}
          <div className="pt-1 flex items-center justify-between gap-3 flex-wrap">
            <p className="text-[11px] text-slate-400 font-medium">
              {isAr
                ? '💡 سيتم توليد المهام وعرضها في نافذة مراجعة واعتماد قبل التوزيع الرسمي.'
                : '💡 Tasks will be generated and shown in a review modal before official dispatch.'}
            </p>

            <button
              type="button"
              onClick={handleGenerateDailyAiTasks}
              disabled={isGeneratingAiTasks}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-black shadow-lg shadow-emerald-950/50 transition-all hover:scale-[1.02] active:scale-[0.98] border border-emerald-400/30 disabled:opacity-60 cursor-pointer"
            >
              {isGeneratingAiTasks ? (
                <>
                  <Loader2 size={16} className="animate-spin text-emerald-200" />
                  <span>{isAr ? 'جاري تحليل الأرقام وتوليد المهام بالذكاء الاصطناعي...' : 'Analyzing live metrics & generating tasks...'}</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} className="text-amber-300 fill-amber-300 animate-bounce" />
                  <span>{isAr ? '⚡ توليد وتوزيع مهام اليوم للشركاء بالذكاء الاصطناعي' : "⚡ Generate & Dispatch Today's Tasks via AI"}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Success / Error Notification Banners ── */}
      <AnimatePresence>
        {dispatchSuccessToast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm font-bold flex items-center justify-between shadow-xs"
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
              <span>{dispatchSuccessToast}</span>
            </div>
            <button
              onClick={() => setDispatchSuccessToast(null)}
              className="text-xs text-emerald-700 hover:underline font-extrabold cursor-pointer"
            >
              {isAr ? 'إغلاق' : 'Dismiss'}
            </button>
          </motion.div>
        )}

        {dispatchError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs sm:text-sm font-bold flex items-center justify-between shadow-xs"
          >
            <div className="flex items-center gap-2.5">
              <AlertTriangle size={18} className="text-rose-600 shrink-0" />
              <span>{dispatchError}</span>
            </div>
            <button
              onClick={() => setDispatchError(null)}
              className="text-xs text-rose-700 hover:underline font-extrabold cursor-pointer"
            >
              {isAr ? 'إغلاق' : 'Dismiss'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── KPI Metric Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Active Tasks */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 font-bold">
            <Clock size={22} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {isAr ? 'مهام نشطة قيد العمل' : 'ACTIVE TASKS'}
            </p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-black text-slate-900">{kpis.active}</span>
              <span className="text-xs text-slate-400 font-semibold">
                {isAr ? `من إجمالي ${kpis.total}` : `Out of ${kpis.total} total`}
              </span>
            </div>
          </div>
        </div>

        {/* Urgent Tasks */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 font-bold">
            <Flame size={22} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {isAr ? 'مهام عاجلة جداً' : 'URGENT TASKS'}
            </p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-black text-rose-600">{kpis.urgent}</span>
              {kpis.urgent > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold animate-pulse">
                  {isAr ? 'أولوية قصوى' : 'Top Priority'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Overdue Tasks */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex items-center gap-3.5">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 font-bold ${
            kpis.overdue > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
          }`}>
            <AlertTriangle size={22} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {isAr ? 'مهام متأخرة عن الموعد' : 'OVERDUE TASKS'}
            </p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className={`text-2xl font-black ${kpis.overdue > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
                {kpis.overdue}
              </span>
              <span className="text-xs text-slate-400 font-semibold">
                {kpis.overdue > 0
                  ? (isAr ? 'تحتاج تدخل عاجل' : 'Requires immediate action')
                  : (isAr ? 'في الموعد' : 'On Track')}
              </span>
            </div>
          </div>
        </div>

        {/* Completion Rate */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 font-bold">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {isAr ? 'نسبة الإنجاز الكلية' : 'COMPLETION RATE'}
            </p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-black text-emerald-700">{kpis.completionRate}%</span>
              <span className="text-xs text-slate-400 font-semibold">
                {isAr ? `(${kpis.completed} مهمة منجزة)` : `(${kpis.completed} completed)`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Partner Accountability Performance Cards ── */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
            <User size={16} className="text-[#597867]" />
            <span>
              {isAr ? 'محاسبة وتوزيع اختصاصات الشركاء الأربعة (اضغط للتصفية):' : 'Partner Accountability & Operational Focus (Click to filter):'}
            </span>
          </h3>
          {selectedPartnerFilter !== 'ALL' && (
            <button
              onClick={() => setSelectedPartnerFilter('ALL')}
              className="text-xs text-emerald-700 font-bold hover:underline cursor-pointer"
            >
              {isAr ? 'عرض كافة الشركاء' : 'Show All Partners'}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {partnerStats.map(partner => {
            const isSelected = selectedPartnerFilter === partner.name;
            const displayName = isAr ? partner.nameAr : partner.name;
            const displayRole = isAr ? partner.roleTitleAr : partner.roleTitleEn;

            return (
              <div
                key={partner.name}
                onClick={() => setSelectedPartnerFilter(isSelected ? 'ALL' : partner.name)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                  isSelected
                    ? 'bg-gradient-to-br from-[#181E1C] to-[#26332e] text-white border-[#181E1C] shadow-lg ring-2 ring-emerald-500'
                    : 'bg-white hover:bg-slate-50/90 text-slate-800 border-slate-200 shadow-2xs hover:shadow-xs'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                        isSelected ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-800 border border-slate-200'
                      }`}>
                        {partner.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className={`text-xs font-black truncate ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                          {displayName}
                        </h4>
                        <span className={`text-[10px] font-bold ${isSelected ? 'text-emerald-300' : 'text-emerald-700'}`}>
                          {displayRole}
                        </span>
                      </div>
                    </div>

                    {partner.overdue > 0 && (
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 shrink-0">
                        {partner.overdue} {isAr ? 'متأخر' : 'overdue'}
                      </span>
                    )}
                  </div>

                  {/* Clean 2-Line Role Description without truncation clipping */}
                  <div className="min-h-[38px] mb-2 flex items-center">
                    <p className={`text-[11px] font-semibold leading-relaxed line-clamp-2 ${
                      isSelected ? 'text-slate-300' : 'text-slate-600'
                    }`}>
                      {displayRole}
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-2 pt-2 border-t" style={{ borderColor: isSelected ? 'rgba(255,255,255,0.1)' : '#f1f5f9' }}>
                  <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                    <span className={isSelected ? 'text-slate-300' : 'text-slate-500'}>
                      {isAr
                        ? `${partner.completed} من ${partner.total} منجزة`
                        : `${partner.completed} of ${partner.total} completed`}
                    </span>
                    <span className={isSelected ? 'text-emerald-400' : 'text-emerald-700'}>
                      {partner.rate}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-200/50 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isSelected ? 'bg-emerald-400' : 'bg-emerald-600'
                      }`}
                      style={{ width: `${partner.rate}%` }}
                    />
                  </div>

                  {/* Status counts footer */}
                  <div className="flex items-center justify-between text-[10px] font-bold mt-2">
                    <span className={isSelected ? 'text-slate-300' : 'text-slate-600'}>
                      {isAr ? '⏳ جارية:' : '⏳ In Progress:'} <strong>{partner.inProgress}</strong>
                    </span>
                    <span className={isSelected ? 'text-slate-300' : 'text-slate-600'}>
                      {isAr ? '📋 بالانتظار:' : '📋 To Do:'} <strong>{partner.todo}</strong>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Filters & Search Control Bar ── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isAr ? 'بحث في عنوان المهمة أو التفاصيل أو اسم الشريك...' : 'Search task title, details, or partner name...'}
              className="w-full ps-10 pe-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#597867] focus:ring-2 focus:ring-[#597867]/10 transition-all font-medium"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Category Dropdown */}
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 outline-none focus:border-[#597867] cursor-pointer"
            >
              <option value="ALL">{isAr ? 'كافة القطاعات' : 'All Categories'}</option>
              <option value="sales">{isAr ? '📈 المبيعات والتشغيل' : '📈 Sales & Operations'}</option>
              <option value="production">{isAr ? '🏭 الإنتاج والمصانع' : '🏭 Production & Factories'}</option>
              <option value="marketing">{isAr ? '📣 التسويق والإعلانات' : '📣 Marketing & Ads'}</option>
              <option value="creative">{isAr ? '🎨 الهوية والمحتوى' : '🎨 Creative & Content'}</option>
              <option value="operations_shipping">{isAr ? '🚚 العمليات والشحن' : '🚚 Operations & Shipping'}</option>
              <option value="finance">{isAr ? '💰 المالية والحسابات' : '💰 Finance & Accounts'}</option>
            </select>

            {/* Priority Dropdown */}
            <select
              value={selectedPriorityFilter}
              onChange={(e) => setSelectedPriorityFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 outline-none focus:border-[#597867] cursor-pointer"
            >
              <option value="ALL">{isAr ? 'كافة الأولويات' : 'All Priorities'}</option>
              <option value="urgent">{isAr ? '🚨 عاجل جداً' : '🚨 Urgent'}</option>
              <option value="high">{isAr ? '⚡ أولوية مرتفعة' : '⚡ High Priority'}</option>
              <option value="normal">{isAr ? '📌 عادي' : '📌 Normal'}</option>
            </select>

            {/* Date Quick Filter */}
            <button
              type="button"
              onClick={() => setSelectedDateFilter(selectedDateFilter === 'OVERDUE' ? 'ALL' : 'OVERDUE')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                selectedDateFilter === 'OVERDUE'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {isAr ? '⚠️ المتأخرة فقط' : '⚠️ Overdue Only'}
            </button>
            <button
              type="button"
              onClick={() => setSelectedDateFilter(selectedDateFilter === 'TODAY' ? 'ALL' : 'TODAY')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                selectedDateFilter === 'TODAY'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {isAr ? '📅 تسليم اليوم' : '📅 Due Today'}
            </button>

            {(selectedPartnerFilter !== 'ALL' || selectedCategoryFilter !== 'ALL' || selectedPriorityFilter !== 'ALL' || selectedDateFilter !== 'ALL' || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedPartnerFilter('ALL');
                  setSelectedCategoryFilter('ALL');
                  setSelectedPriorityFilter('ALL');
                  setSelectedDateFilter('ALL');
                  setSearchQuery('');
                }}
                className="px-2.5 py-2 text-xs font-bold text-rose-600 hover:underline cursor-pointer"
              >
                {isAr ? 'إعادة ضبط' : 'Reset Filters'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Main View: Kanban Board or Table ── */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Column: To Do */}
          <KanbanColumn
            title={isAr ? 'قيد الانتظار' : 'To Do'}
            icon="📋"
            count={kanbanColumns.todo.length}
            badgeColor="bg-slate-100 text-slate-700 border-slate-300"
            tasks={kanbanColumns.todo}
            columnType="todo"
            todayStr={todayStr}
            isAr={isAr}
            onEdit={handleEditTask}
            onDelete={handleDeleteTask}
            onStatusChange={updatePartnerTaskStatus}
            onShareWhatsApp={handleShareTaskWhatsApp}
          />

          {/* Column: In Progress */}
          <KanbanColumn
            title={isAr ? 'جاري العمل عليها' : 'In Progress'}
            icon="⏳"
            count={kanbanColumns.in_progress.length}
            badgeColor="bg-amber-100 text-amber-800 border-amber-300"
            tasks={kanbanColumns.in_progress}
            columnType="in_progress"
            todayStr={todayStr}
            isAr={isAr}
            onEdit={handleEditTask}
            onDelete={handleDeleteTask}
            onStatusChange={updatePartnerTaskStatus}
            onShareWhatsApp={handleShareTaskWhatsApp}
          />

          {/* Column: Completed */}
          <KanbanColumn
            title={isAr ? 'تم الإنجاز بنجاح' : 'Completed'}
            icon="✅"
            count={kanbanColumns.completed.length}
            badgeColor="bg-emerald-100 text-emerald-800 border-emerald-300"
            tasks={kanbanColumns.completed}
            columnType="completed"
            todayStr={todayStr}
            isAr={isAr}
            onEdit={handleEditTask}
            onDelete={handleDeleteTask}
            onStatusChange={updatePartnerTaskStatus}
            onShareWhatsApp={handleShareTaskWhatsApp}
          />
        </div>
      ) : (
        /* Table / List View */
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs sm:text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 text-start">{isAr ? 'المهمة' : 'Task'}</th>
                  <th className="py-3.5 px-4 text-start">{isAr ? 'الشريك المسؤول' : 'Assigned Partner'}</th>
                  <th className="py-3.5 px-4 text-start">{isAr ? 'القطاع' : 'Category'}</th>
                  <th className="py-3.5 px-4 text-start">{isAr ? 'الأولوية' : 'Priority'}</th>
                  <th className="py-3.5 px-4 text-start">{isAr ? 'موعد التسليم' : 'Due Date'}</th>
                  <th className="py-3.5 px-4 text-start">{isAr ? 'الحالة' : 'Status'}</th>
                  <th className="py-3.5 px-4 text-center">{isAr ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 font-bold">
                      {isAr ? 'لا توجد مهام مطابقة للفلاتر الحالية' : 'No tasks matched current filters'}
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map(task => {
                    const partner = TOJA_PARTNERS.find(p => p.name === task.assignedTo?.name);
                    const isOverdue = task.status !== 'completed' && task.dueDate && task.dueDate < todayStr;
                    const cat = CATEGORY_MAP[task.category] || CATEGORY_MAP.operations_shipping;
                    const prio = PRIORITY_MAP[task.priority] || PRIORITY_MAP.normal;
                    const partnerDisplayName = isAr ? (partner?.nameAr || task.assignedTo?.name) : (task.assignedTo?.name || partner?.name);

                    return (
                      <tr key={task.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-800">
                          <div>{task.title}</div>
                          {task.description && (
                            <div className="text-[11px] text-slate-400 font-medium line-clamp-1 mt-0.5">
                              {task.description}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="font-bold text-slate-900">
                            {partnerDisplayName}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-lg border text-xs font-bold inline-flex items-center gap-1 ${cat.color}`}>
                            <span>{cat.icon}</span>
                            <span>{isAr ? cat.labelAr : cat.labelEn}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-md border text-[11px] font-bold inline-flex items-center gap-1 ${prio.pill}`}>
                            <span>{prio.icon}</span>
                            <span>{isAr ? prio.labelAr : prio.labelEn}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`text-xs font-semibold ${isOverdue ? 'text-rose-600 font-bold' : 'text-slate-600'}`}>
                            {task.dueDate} {isOverdue && (isAr ? '⚠️ متأخر' : '⚠️ Overdue')}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-xl text-xs font-black inline-flex items-center gap-1 ${
                            task.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : task.status === 'in_progress'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                          }`}>
                            {task.status === 'completed'
                              ? (isAr ? '✓ تم الإنجاز' : '✓ Completed')
                              : task.status === 'in_progress'
                                ? (isAr ? '⏳ جارية' : '⏳ In Progress')
                                : (isAr ? '📋 بالانتظار' : '📋 To Do')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            {task.status !== 'completed' ? (
                              <button
                                onClick={() => updatePartnerTaskStatus(task.id, 'completed')}
                                title={isAr ? 'إنجاز المهمة' : 'Complete task'}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                              >
                                <Check size={13} />
                                <span>{isAr ? 'إنجاز' : 'Complete'}</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => updatePartnerTaskStatus(task.id, 'in_progress')}
                                title={isAr ? 'إعادة فتح المهمة' : 'Reopen task'}
                                className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1 cursor-pointer"
                              >
                                <RotateCcw size={12} />
                                <span>{isAr ? 'إعادة فتح' : 'Reopen'}</span>
                              </button>
                            )}
                            <button
                              onClick={() => handleShareTaskWhatsApp(task)}
                              title={isAr ? 'إشعار الشريك عبر واتساب' : 'Notify partner on WhatsApp'}
                              className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 cursor-pointer"
                            >
                              <MessageCircle size={14} />
                            </button>
                            <button
                              onClick={() => handleEditTask(task)}
                              title={isAr ? 'تعديل المهمة' : 'Edit task'}
                              className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteTask(task.id)}
                              title={isAr ? 'حذف المهمة' : 'Delete task'}
                              className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 cursor-pointer"
                            >
                              <Trash2 size={14} />
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
        </div>
      )}

      {/* ── Add / Edit Task Modal (Manual) ── */}
      <AddPartnerTaskModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTask(null);
        }}
        editTask={editingTask}
      />

      {/* ── 3. Review & Approve Modal before Auto-Saving to Firestore ── */}
      <AnimatePresence>
        {isReviewModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-slate-900 border border-slate-700/80 text-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
              dir={isRtl ? 'rtl' : 'ltr'}
            >
              {/* Review Modal Header */}
              <div className="p-4 sm:p-5 bg-gradient-to-r from-[#181E1C] via-[#212c27] to-[#181E1C] border-b border-emerald-950/40 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shadow-inner">
                    <Sparkles size={20} className="text-amber-300 fill-amber-300" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                        {isAr ? 'مراجعة واعتماد خطة العمل اليومية للشركاء' : 'Review & Approve Daily Partner Tasks'}
                      </h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-extrabold border border-emerald-500/30">
                        {SEASON_PHASES.find(p => p.id === seasonPhase)?.icon} {isAr ? SEASON_PHASES.find(p => p.id === seasonPhase)?.labelAr : SEASON_PHASES.find(p => p.id === seasonPhase)?.labelEn}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 font-medium mt-0.5">
                      {isAr
                        ? 'يمكنك تعديل أي مهمة أو الأولوية وموعد التسليم قبل اعتمادها وتوزيعها رسمياً في النظام.'
                        : 'Review, edit titles, priorities, or action steps before officially committing to the board.'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsReviewModalOpen(false)}
                  className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Review Modal Body (Editable 4 Task Cards) */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                {dailyFocusNote && (
                  <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-2">
                    <Zap size={14} className="text-amber-400 shrink-0" />
                    <span>
                      <strong>{isAr ? 'التوجيه الإداري المطبق:' : 'Active Director Directive:'}</strong> {dailyFocusNote}
                    </span>
                  </div>
                )}

                <div className="space-y-4">
                  {reviewTasks.map((task, idx) => {
                    const partner = TOJA_PARTNERS.find(p => p.name === task.partnerName);
                    const partnerName = isAr ? (partner?.nameAr || task.partnerName) : (task.partnerName || partner?.name);
                    const partnerRole = isAr ? partner?.roleTitleAr : partner?.roleTitleEn;

                    return (
                      <div
                        key={task.id || idx}
                        className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 sm:p-5 space-y-3.5 transition-all hover:border-slate-600"
                      >
                        {/* Task Card Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-700/60">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white font-black text-xs flex items-center justify-center">
                              {task.partnerName?.split(' ').map(n => n[0]).join('') || 'P'}
                            </div>
                            <div>
                              <h4 className="text-sm font-black text-white">{partnerName}</h4>
                              <p className="text-[11px] text-emerald-400 font-semibold">{partnerRole}</p>
                            </div>
                          </div>

                          {/* Quick Controls: Priority, Category, Due Date */}
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Priority Select */}
                            <select
                              value={task.priority}
                              onChange={(e) => handleUpdateReviewTask(idx, 'priority', e.target.value)}
                              className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-white outline-none focus:border-emerald-500 cursor-pointer"
                            >
                              <option value="urgent">{isAr ? '🚨 عاجل جداً' : '🚨 Urgent'}</option>
                              <option value="high">{isAr ? '⚡ أولوية مرتفعة' : '⚡ High'}</option>
                              <option value="normal">{isAr ? '📌 عادي' : '📌 Normal'}</option>
                            </select>

                            {/* Category Select */}
                            <select
                              value={task.category}
                              onChange={(e) => handleUpdateReviewTask(idx, 'category', e.target.value)}
                              className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-white outline-none focus:border-emerald-500 cursor-pointer"
                            >
                              <option value="sales">{isAr ? '📈 المبيعات' : '📈 Sales'}</option>
                              <option value="production">{isAr ? '🏭 الإنتاج' : '🏭 Production'}</option>
                              <option value="marketing">{isAr ? '📣 التسويق' : '📣 Marketing'}</option>
                              <option value="creative">{isAr ? '🎨 الهوية والمحتوى' : '🎨 Creative'}</option>
                              <option value="operations_shipping">{isAr ? '🚚 الشحن' : '🚚 Shipping'}</option>
                              <option value="finance">{isAr ? '💰 المالية' : '💰 Finance'}</option>
                            </select>

                            {/* Due Date */}
                            <input
                              type="date"
                              value={task.dueDate || todayStr}
                              onChange={(e) => handleUpdateReviewTask(idx, 'dueDate', e.target.value)}
                              className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-slate-200 outline-none focus:border-emerald-500 cursor-pointer"
                            />
                          </div>
                        </div>

                        {/* Editable Task Title */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            {isAr ? 'عنوان المهمة:' : 'Task Title:'}
                          </label>
                          <input
                            type="text"
                            value={task.title}
                            onChange={(e) => handleUpdateReviewTask(idx, 'title', e.target.value)}
                            className="w-full px-3.5 py-2 rounded-xl bg-slate-900/90 border border-slate-700 text-white font-bold text-xs sm:text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                            placeholder={isAr ? 'عنوان المهمة...' : 'Task title...'}
                          />
                        </div>

                        {/* Editable Task Description */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            {isAr ? 'تفاصيل وإجراءات التنفيذ:' : 'Action Steps & Directive:'}
                          </label>
                          <textarea
                            rows={2}
                            value={task.description}
                            onChange={(e) => handleUpdateReviewTask(idx, 'description', e.target.value)}
                            className="w-full px-3.5 py-2 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-200 font-medium text-xs sm:text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none leading-relaxed"
                            placeholder={isAr ? 'تفاصيل المهمة والتوجيهات التشغيلية...' : 'Task description and action directives...'}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Review Modal Footer */}
              <div className="p-4 sm:p-5 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsReviewModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs sm:text-sm font-bold transition-all cursor-pointer"
                  >
                    {isAr ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerateDailyAiTasks}
                    disabled={isGeneratingAiTasks}
                    className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw size={14} className={isGeneratingAiTasks ? 'animate-spin' : ''} />
                    <span>{isAr ? 'إعادة التوليد' : 'Regenerate'}</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleConfirmAndDispatchReviewTasks}
                  disabled={isCommittingBatch}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm shadow-lg shadow-emerald-950/50 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 cursor-pointer"
                >
                  {isCommittingBatch ? (
                    <>
                      <Loader2 size={16} className="animate-spin text-emerald-200" />
                      <span>{isAr ? 'جاري الاعتماد والتوزيع...' : 'Dispatching to Board...'}</span>
                    </>
                  ) : (
                    <>
                      <Check size={16} strokeWidth={3} />
                      <span>{isAr ? 'اعتماد وتوزيع المهام على الشركاء' : 'Approve & Dispatch Tasks to Partners'}</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Kanban Column Component
 */
function KanbanColumn({
  title, icon, count, badgeColor, tasks, columnType, todayStr,
  isAr, onEdit, onDelete, onStatusChange, onShareWhatsApp
}) {
  return (
    <div className="bg-slate-100/70 rounded-3xl p-3.5 sm:p-4 border border-slate-200/80 flex flex-col min-h-[500px]">
      {/* Column Header */}
      <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-200/90">
        <div className="flex items-center gap-2">
          <span className="text-base">{icon}</span>
          <h4 className="font-black text-slate-800 text-sm">{title}</h4>
        </div>
        <span className={`px-2.5 py-0.5 rounded-full border text-xs font-black ${badgeColor}`}>
          {count}
        </span>
      </div>

      {/* Task Cards Stream */}
      <div className="space-y-3 flex-1 overflow-y-auto">
        {tasks.length === 0 ? (
          <div className="h-40 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 text-xs font-bold">
            {isAr ? 'لا توجد مهام في هذا العمود' : 'No tasks in this column'}
          </div>
        ) : (
          tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              todayStr={todayStr}
              isAr={isAr}
              onEdit={onEdit}
              onDelete={onDelete}
              onStatusChange={onStatusChange}
              onShareWhatsApp={onShareWhatsApp}
            />
          ))
        )}
      </div>
    </div>
  );
}

/**
 * Individual Kanban Task Card
 */
function TaskCard({
  task, todayStr, isAr, onEdit, onDelete, onStatusChange, onShareWhatsApp
}) {
  const partner = TOJA_PARTNERS.find(p => p.name === task.assignedTo?.name);
  const cat = CATEGORY_MAP[task.category] || CATEGORY_MAP.operations_shipping;
  const prio = PRIORITY_MAP[task.priority] || PRIORITY_MAP.normal;

  const isCompleted = task.status === 'completed';
  const isOverdue = !isCompleted && task.dueDate && task.dueDate < todayStr;
  const isToday = !isCompleted && task.dueDate === todayStr;

  const partnerDisplayName = isAr ? (partner?.nameAr || task.assignedTo?.name) : (task.assignedTo?.name || partner?.name);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`p-4 rounded-2xl border bg-white shadow-xs transition-all hover:shadow-md ${
        isOverdue ? 'border-rose-300 ring-1 ring-rose-300/50' : 'border-slate-200/90'
      }`}
    >
      {/* Badges Row */}
      <div className="flex items-center justify-between gap-1.5 mb-2">
        <span className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold inline-flex items-center gap-1 ${cat.color}`}>
          <span>{cat.icon}</span>
          <span>{isAr ? cat.labelAr : cat.labelEn}</span>
        </span>

        <span className={`px-2 py-0.5 rounded-md border text-[10px] inline-flex items-center gap-1 ${prio.pill}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${prio.dot}`} />
          <span>{isAr ? prio.labelAr : prio.labelEn}</span>
        </span>
      </div>

      {/* Title */}
      <h5 className={`font-black text-xs sm:text-sm leading-snug mb-1.5 ${
        isCompleted ? 'line-through text-slate-400' : 'text-slate-900'
      }`}>
        {task.title}
      </h5>

      {/* Description Snippet */}
      {task.description && (
        <p className="text-[11px] text-slate-500 font-medium line-clamp-2 mb-3 leading-relaxed">
          {task.description}
        </p>
      )}

      {/* Assigned Partner & Due Date Footer */}
      <div className="flex items-center justify-between gap-2 pt-2.5 mt-2 border-t border-slate-100 text-[11px]">
        {/* Partner */}
        <div className="flex items-center gap-1.5 font-bold text-slate-700 truncate">
          <div className="w-5 h-5 rounded-md bg-[#181E1C] text-white flex items-center justify-center text-[9px] font-black shrink-0">
            {task.assignedTo?.name ? task.assignedTo.name.split(' ').map(n => n[0]).join('') : 'P'}
          </div>
          <span className="truncate">
            {partnerDisplayName}
          </span>
        </div>

        {/* Due Date Indicator */}
        <div className={`flex items-center gap-1 shrink-0 font-bold text-[10px] px-2 py-0.5 rounded-md ${
          isOverdue
            ? 'bg-rose-50 text-rose-700 border border-rose-200'
            : isToday
              ? 'bg-amber-50 text-amber-700 border border-amber-200'
              : 'text-slate-400'
        }`}>
          <Calendar size={11} />
          <span>{task.dueDate}</span>
        </div>
      </div>

      {/* Card Action Buttons Bar */}
      <div className="flex items-center justify-between gap-1.5 mt-3 pt-2 border-t border-slate-100">
        <div className="flex items-center gap-1">
          {/* Quick status progress buttons: Single-click Complete */}
          {task.status === 'todo' && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onStatusChange(task.id, 'completed')}
                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
              >
                <Check size={11} strokeWidth={3} />
                <span>{isAr ? 'إنجاز المهمة' : 'Complete'}</span>
              </button>
              <button
                type="button"
                onClick={() => onStatusChange(task.id, 'in_progress')}
                className="px-2 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold transition-all cursor-pointer"
              >
                {isAr ? 'بدء العمل' : 'Start Work'}
              </button>
            </div>
          )}

          {task.status === 'in_progress' && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onStatusChange(task.id, 'completed')}
                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
              >
                <Check size={11} strokeWidth={3} />
                <span>{isAr ? 'إنجاز المهمة' : 'Complete'}</span>
              </button>
              <button
                type="button"
                onClick={() => onStatusChange(task.id, 'todo')}
                title={isAr ? 'إرجاع إلى قيد الانتظار' : 'Move back to To Do'}
                className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] cursor-pointer"
              >
                <RotateCcw size={11} />
              </button>
            </div>
          )}

          {task.status === 'completed' && (
            <button
              type="button"
              onClick={() => onStatusChange(task.id, 'in_progress')}
              className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw size={10} />
              <span>{isAr ? 'إعادة فتح' : 'Reopen'}</span>
            </button>
          )}
        </div>

        {/* WhatsApp & Manage icons */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onShareWhatsApp(task)}
            title={isAr ? 'إرسال إشعار للشريك بالواتساب' : 'Share task via WhatsApp'}
            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors cursor-pointer"
          >
            <MessageCircle size={13} />
          </button>
          <button
            type="button"
            onClick={() => onEdit(task)}
            title={isAr ? 'تعديل المهمة' : 'Edit task'}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
          >
            <Edit3 size={13} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(task.id)}
            title={isAr ? 'حذف المهمة' : 'Delete task'}
            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
