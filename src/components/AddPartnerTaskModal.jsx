import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, CheckSquare, Calendar, AlertCircle, User, Tag,
  Clock, Flame, ShieldAlert, Sparkles, Loader2, ArrowRight
} from 'lucide-react';
import { useStore, TOJA_PARTNERS } from '../store/useStore';
import { translations } from '../translations';

const CATEGORIES = [
  { id: 'sales', labelEn: 'Sales & Production', labelAr: 'المبيعات والتشغيل', icon: '📈', color: 'from-orange-500/20 to-amber-500/20 text-orange-700 border-orange-300' },
  { id: 'production', labelEn: 'Production & Factory', labelAr: 'الإنتاج والمصانع', icon: '🏭', color: 'from-amber-500/20 to-orange-500/20 text-amber-700 border-amber-300' },
  { id: 'marketing', labelEn: 'Marketing & Growth', labelAr: 'التسويق والإعلانات', icon: '📣', color: 'from-purple-500/20 to-pink-500/20 text-purple-700 border-purple-300' },
  { id: 'creative', labelEn: 'Creative & Content', labelAr: 'الهوية والمحتوى', icon: '🎨', color: 'from-pink-500/20 to-rose-500/20 text-pink-700 border-pink-300' },
  { id: 'operations_shipping', labelEn: 'Operations & Shipping', labelAr: 'العمليات والشحن', icon: '🚚', color: 'from-blue-500/20 to-cyan-500/20 text-blue-700 border-blue-300' },
  { id: 'finance', labelEn: 'Finance & Accounts', labelAr: 'المالية والحسابات', icon: '💰', color: 'from-emerald-500/20 to-teal-500/20 text-emerald-700 border-emerald-300' }
];

const PRIORITIES = [
  { id: 'urgent', labelEn: 'Urgent', labelAr: 'عاجل جداً', icon: '🚨', badge: 'bg-rose-500 text-white shadow-rose-500/30 ring-rose-400' },
  { id: 'high', labelEn: 'High', labelAr: 'أولوية مرتفعة', icon: '⚡', badge: 'bg-amber-500 text-white shadow-amber-500/30 ring-amber-400' },
  { id: 'normal', labelEn: 'Normal', labelAr: 'عادي', icon: '📌', badge: 'bg-slate-600 text-white shadow-slate-500/30 ring-slate-400' }
];

export default function AddPartnerTaskModal({ isOpen, onClose, editTask = null }) {
  const { language, addPartnerTask, updatePartnerTask } = useStore();
  const t = translations[language];

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPartnerName, setSelectedPartnerName] = useState('Ahmed Arnos');
  const [priority, setPriority] = useState('normal');
  const [category, setCategory] = useState('production');
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState('todo');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (editTask) {
      setTitle(editTask.title || '');
      setDescription(editTask.description || '');
      setSelectedPartnerName(editTask.assignedTo?.name || 'Ahmed Arnos');
      setPriority(editTask.priority || 'normal');
      setCategory(editTask.category || 'production');
      setDueDate(editTask.dueDate || new Date().toISOString().split('T')[0]);
      setStatus(editTask.status || 'todo');
    } else {
      setTitle('');
      setDescription('');
      setSelectedPartnerName('Ahmed Arnos');
      setPriority('normal');
      setCategory('production');
      setDueDate(new Date().toISOString().split('T')[0]);
      setStatus('todo');
    }
    setErrorMessage('');
  }, [editTask, isOpen]);

  // When partner is clicked, auto-suggest their primary category if task has default
  const handlePartnerSelect = (partner) => {
    setSelectedPartnerName(partner.name);
    if (!editTask && partner.category) {
      setCategory(partner.category);
    }
  };

  const handleQuickDueDate = (daysOffset) => {
    const target = new Date();
    target.setDate(target.getDate() + daysOffset);
    setDueDate(target.toISOString().split('T')[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage(language === 'ar' ? 'يرجى كتابة عنوان المهمة' : 'Please enter a task title');
      return;
    }

    const partnerObj = TOJA_PARTNERS.find(p => p.name === selectedPartnerName) || {
      name: selectedPartnerName,
      email: ''
    };

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const taskData = {
        title: title.trim(),
        description: description.trim(),
        assignedTo: {
          name: partnerObj.name,
          email: partnerObj.email || ''
        },
        priority,
        category,
        dueDate,
        status
      };

      if (editTask?.id) {
        await updatePartnerTask(editTask.id, taskData);
      } else {
        await addPartnerTask(taskData);
      }

      onClose();
    } catch (err) {
      console.error('Failed to save partner task:', err);
      setErrorMessage(err.message || (language === 'ar' ? 'حدث خطأ أثناء حفظ المهمة' : 'Failed to save task'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
          dir={language === 'ar' ? 'rtl' : 'ltr'}
        >
          {/* Header */}
          <div className="p-4 sm:p-5 bg-gradient-to-r from-[#181E1C] via-[#242f2b] to-[#181E1C] text-white flex items-center justify-between shrink-0 border-b border-emerald-950/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shadow-inner">
                <CheckSquare size={20} />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                  <span>{editTask ? (t.editTask || 'تعديل المهمة') : (t.addTask || 'إضافة مهمة جديدة للشركاء')}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                    TOJA Operations
                  </span>
                </h3>
                <p className="text-xs text-slate-300 font-medium">
                  {language === 'ar' ? 'نظام المحاسبة وتوزيع العمل اليومي بين الشركاء الأربعة' : 'Daily accountability & assignments across partners'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-sm">
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                <AlertCircle size={16} className="text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Task Title */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                {t.taskTitle || 'عنوان المهمة'} <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={language === 'ar' ? 'مثال: مراجعة إنتاج دفعة الهودي الشتوي مع مصنع المحلة' : 'e.g. Review winter hoodie production batch'}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#597867] focus:ring-2 focus:ring-[#597867]/10 outline-none font-semibold text-slate-800 transition-all text-xs sm:text-sm"
                required
              />
            </div>

            {/* Assigned Partner (4 TOJA Partners) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                {t.assignedPartner || 'الشريك المسؤول'} <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {TOJA_PARTNERS.map(partner => {
                  const isSelected = selectedPartnerName === partner.name;
                  return (
                    <button
                      key={partner.name}
                      type="button"
                      onClick={() => handlePartnerSelect(partner)}
                      className={`p-2.5 sm:p-3 rounded-2xl border text-start flex items-center gap-2.5 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#181E1C] border-[#181E1C] text-white shadow-md'
                          : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/80 text-slate-700'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                        isSelected ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {partner.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                          {language === 'ar' ? partner.nameAr : partner.name}
                        </p>
                        <p className={`text-[10px] line-clamp-2 leading-tight mt-0.5 ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                          {language === 'ar' ? partner.roleTitleAr : partner.roleTitleEn}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Category and Priority Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  {t.taskCategory || 'القطاع / المجال'}
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {CATEGORIES.map(cat => {
                    const isSelected = category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategory(cat.id)}
                        className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <span className="text-sm">{cat.icon}</span>
                        <span className="truncate">{language === 'ar' ? cat.labelAr : cat.labelEn}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  {t.taskPriority || 'الأولوية'}
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {PRIORITIES.map(p => {
                    const isSelected = priority === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPriority(p.id)}
                        className={`p-2 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                          isSelected
                            ? `${p.badge} shadow-xs ring-2`
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <span>{p.icon}</span>
                        <span className="text-[11px]">{language === 'ar' ? p.labelAr : p.labelEn}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Due Date & Quick Shortcuts */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {t.dueDate || 'موعد التسليم النهائي'}
                </label>
                <div className="flex items-center gap-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => handleQuickDueDate(0)}
                    className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                  >
                    {language === 'ar' ? 'اليوم' : 'Today'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDueDate(1)}
                    className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                  >
                    {language === 'ar' ? 'غداً' : 'Tomorrow'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDueDate(3)}
                    className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                  >
                    {language === 'ar' ? 'بعد 3 أيام' : '+3 Days'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDueDate(7)}
                    className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                  >
                    {language === 'ar' ? 'أسبوع' : '+1 Week'}
                  </button>
                </div>
              </div>
              <div className="relative">
                <Calendar size={16} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full ps-10 pe-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#597867] focus:ring-2 focus:ring-[#597867]/10 outline-none font-semibold text-slate-800 transition-all text-xs sm:text-sm"
                  required
                />
              </div>
            </div>

            {/* Status (if editing) */}
            {editTask && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  {t.status || 'حالة المهمة'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'todo', label: language === 'ar' ? 'قيد الانتظار' : 'To Do', color: 'bg-slate-100 text-slate-700 border-slate-300' },
                    { id: 'in_progress', label: language === 'ar' ? 'جاري التنفيذ' : 'In Progress', color: 'bg-amber-100 text-amber-800 border-amber-300' },
                    { id: 'completed', label: language === 'ar' ? 'تم الإنجاز ✓' : 'Completed', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' }
                  ].map(st => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setStatus(st.id)}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                        status === st.id
                          ? `${st.color} ring-2 ring-[#181E1C] font-black`
                          : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Task Description & Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                {t.taskDescription || 'التفاصيل والملاحظات التشغيلية'}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder={language === 'ar' ? 'أضف أي تفاصيل، روابط، جهات اتصال أو تعليمات لتسهيل تنفيذ المهمة...' : 'Add details, contacts or operational instructions...'}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#597867] focus:ring-2 focus:ring-[#597867]/10 outline-none font-medium text-slate-800 transition-all text-xs sm:text-sm"
              />
            </div>

            {/* Footer Buttons */}
            <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs sm:text-sm font-bold transition-colors"
              >
                {t.cancel || 'إلغاء'}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-[#597867] hover:bg-[#476052] text-white text-xs sm:text-sm font-bold transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>{language === 'ar' ? 'جاري الحفظ...' : 'Saving...'}</span>
                  </>
                ) : (
                  <>
                    <CheckSquare size={16} />
                    <span>{editTask ? (t.saveChanges || 'حفظ التعديلات') : (t.addTask || 'إسناد المهمة')}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
