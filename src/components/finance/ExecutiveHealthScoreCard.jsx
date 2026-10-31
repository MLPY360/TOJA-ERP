import React from 'react';
import { motion } from 'framer-motion';
import {
  Activity, Sparkles, AlertTriangle, ShieldCheck, ShieldAlert,
  TrendingUp, Tag, Truck, CheckCircle2, ArrowRight
} from 'lucide-react';
import { translations } from '../../translations';

export default function ExecutiveHealthScoreCard({
  healthScore,
  language = 'ar',
  onActionClick
}) {
  const t = translations[language];
  const isAr = language === 'ar';

  const {
    totalScore = 0,
    grade = 'B',
    gradeLabel = 'Grade B',
    gradeLabelAr = 'تصنيف B',
    gradeColor = 'text-blue-600 bg-blue-50 border-blue-200',
    pillars = [],
    actionPoints = []
  } = healthScore || {};

  // Action point icon resolver
  const getActionIcon = (type) => {
    switch (type) {
      case 'dead_capital':
        return <Tag size={16} className="text-amber-600" />;
      case 'inbound_cod':
        return <Truck size={16} className="text-blue-600" />;
      case 'safe_dividends':
        return <CheckCircle2 size={16} className="text-emerald-600" />;
      case 'reserve_defense':
        return <ShieldAlert size={16} className="text-purple-600" />;
      case 'restock_star':
        return <Sparkles size={16} className="text-teal-600" />;
      case 'margin_leak':
        return <AlertTriangle size={16} className="text-rose-600" />;
      default:
        return <Activity size={16} className="text-slate-600" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl p-6 sm:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-slate-100 relative overflow-hidden"
    >
      {/* Decorative ambient gradient */}
      <div className="absolute top-0 end-0 w-80 h-80 bg-gradient-to-br from-[#597867]/10 via-emerald-100/20 to-transparent rounded-full blur-3xl pointer-events-none -z-0" />

      <div className="relative z-10 flex flex-col gap-6">
        {/* Header & Main Score Gauge */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="flex items-start gap-4">
            <div className="p-3.5 rounded-2xl bg-[#597867] text-white shadow-lg shadow-[#597867]/20 shrink-0">
              <Activity size={26} strokeWidth={2.3} />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-[#181E1C]">
                  {t.executiveHealthScore || 'Executive Financial Health Score'}
                </h2>
                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border shadow-sm ${gradeColor}`}>
                  {isAr ? gradeLabelAr : gradeLabel}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                {t.executiveHealthDesc || 'Real-time composite solvency & operational efficiency score based on 4 financial pillars'}
              </p>
            </div>
          </div>

          {/* Big Composite Score Gauge */}
          <div className="flex items-center gap-4 bg-slate-50 border border-slate-100 p-3.5 sm:px-6 rounded-2xl self-start lg:self-auto shrink-0 shadow-inner">
            <div className="relative flex items-center justify-center">
              <svg className="w-16 h-16 sm:w-20 sm:h-20 transform -rotate-90">
                <circle
                  cx="50%"
                  cy="50%"
                  r="30"
                  stroke="currentColor"
                  strokeWidth="6"
                  className="text-slate-200"
                  fill="transparent"
                />
                <circle
                  cx="50%"
                  cy="50%"
                  r="30"
                  stroke="currentColor"
                  strokeWidth="6"
                  strokeDasharray={188.4}
                  strokeDashoffset={188.4 - (188.4 * Math.min(100, Math.max(0, totalScore))) / 100}
                  strokeLinecap="round"
                  className={`${
                    totalScore >= 80 ? 'text-emerald-500' :
                    totalScore >= 65 ? 'text-teal-600' :
                    totalScore >= 50 ? 'text-amber-500' : 'text-rose-500'
                  } transition-all duration-1000 ease-out`}
                  fill="transparent"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl sm:text-2xl font-black text-[#181E1C] leading-none">
                  {totalScore}
                </span>
                <span className="text-[9px] font-bold text-slate-400 mt-0.5">/ 100</span>
              </div>
            </div>

            <div className="flex flex-col">
              <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                {t.healthScoreOutOf || 'Brand Health'}
              </span>
              <span className={`text-sm sm:text-base font-black ${
                totalScore >= 80 ? 'text-emerald-700' :
                totalScore >= 65 ? 'text-teal-700' :
                totalScore >= 50 ? 'text-amber-700' : 'text-rose-700'
              }`}>
                {totalScore >= 85 ? (isAr ? 'ممتاز جداً 🚀' : 'Superb Scalability 🚀') :
                 totalScore >= 70 ? (isAr ? 'نمو مستقر ومتزن ✅' : 'Stable Growth ✅') :
                 totalScore >= 50 ? (isAr ? 'حذر تشغيلي ⚠️' : 'Operational Caution ⚠️') :
                 (isAr ? 'ضغط سيولة حرج 🔴' : 'Capital Stress 🔴')}
              </span>
            </div>
          </div>
        </div>

        {/* 4 Pillars Breakdown Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {pillars.map((pillar) => (
            <div
              key={pillar.id}
              className="bg-slate-50/70 border border-slate-100 rounded-2xl p-4 flex flex-col justify-between gap-3 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">
                  {isAr ? pillar.labelAr : pillar.labelEn}
                </span>
                <span className="text-xs font-black text-[#181E1C]">
                  {pillar.score} <span className="text-[10px] text-slate-400 font-semibold">/ {pillar.max}</span>
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pillar.pct}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className={`h-full rounded-full ${
                    pillar.pct >= 80 ? 'bg-emerald-500' :
                    pillar.pct >= 60 ? 'bg-teal-500' :
                    pillar.pct >= 40 ? 'bg-amber-500' : 'bg-rose-500'
                  }`}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <span>{pillar.detail}</span>
                <span className="font-bold text-slate-600">{pillar.pct}%</span>
              </div>
            </div>
          ))}
        </div>

        {/* 3 Strategic Action Points */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-5 text-white shadow-lg flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-emerald-400 animate-pulse" />
              <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
                {t.strategicActionPoints || 'Executive Action Points for Partners'}
              </h3>
            </div>
            <span className="text-[11px] font-bold text-slate-400 bg-white/10 px-2.5 py-0.5 rounded-full">
              {actionPoints.length} {isAr ? 'إجراءات ذات أولوية' : 'Priority Actions'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-1">
            {actionPoints.map((action, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-3.5 flex flex-col justify-between gap-2.5 transition-all text-xs"
              >
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 rounded-lg bg-white/10 shrink-0 mt-0.5">
                    {getActionIcon(action.type)}
                  </div>
                  <p className="text-slate-200 font-semibold leading-relaxed">
                    {isAr ? action.textAr : action.textEn}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
