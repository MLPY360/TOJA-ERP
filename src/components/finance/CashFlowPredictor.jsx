import React from 'react';
import { motion } from 'framer-motion';
import {
  Wallet, Truck, Clock, ShieldCheck, ShieldAlert,
  ArrowUpRight, DollarSign, Calendar, TrendingUp, AlertCircle, RefreshCw
} from 'lucide-react';
import { translations } from '../../translations';

export default function CashFlowPredictor({
  cashFlow,
  language = 'ar'
}) {
  const t = translations[language];
  const isAr = language === 'ar';

  const {
    cashInTreasury = 0,
    storeDeliverySuccessRatePct = 85,
    shippedOrdersCount = 0,
    shippedGrossCOD = 0,
    shippedProjectedNet = 0,
    pendingCashOrdersCount = 0,
    pendingCashGrossCOD = 0,
    pendingProjectedNet = 0,
    inboundCod7Days = 0,
    inboundCod14Days = 0,
    recent30dExpenses = 0,
    effectiveMonthlyBurn = 0,
    dailyBurnRate = 0,
    productionReserve = 0,
    safePartnerDividends = 0,
    isDividendsSafe = false,
    reserveDeficit = 0,
    runwayDays = 0,
    projectedRunwayDays = 0,
    runwayStatus = 'healthy'
  } = cashFlow || {};

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-slate-100 flex flex-col gap-6">
      {/* Title & Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600">
            <Wallet size={24} strokeWidth={2.3} />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-[#181E1C]">
              {t.cashFlowForecast || 'Smart Cash Flow & Working Capital Predictor'}
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {t.cashFlowForecastDesc || 'Forecast inbound COD treasury payouts, safe partner dividends, and operating runway'}
            </p>
          </div>
        </div>

        {/* Historical Delivery Rate Reference Badge */}
        <div className="flex items-center gap-2 self-start sm:self-auto px-3.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600">
          <span className="text-slate-400">{isAr ? 'نسبة تسليم المتاجر تاريخياً:' : 'Hist. Delivery Rate:'}</span>
          <span className="font-black text-emerald-600">{storeDeliverySuccessRatePct}%</span>
        </div>
      </div>

      {/* Main 4 Cash Flow KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Physical Cash in Treasury */}
        <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-5 flex flex-col justify-between gap-3 relative overflow-hidden">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">
              {t.cashInTreasury || 'Cash in Treasury'}
            </span>
            <div className="p-2 rounded-xl bg-[#597867]/10 text-[#597867]">
              <Wallet size={16} />
            </div>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black text-[#181E1C]">
              {cashInTreasury.toLocaleString('en-EG')} <span className="text-xs font-bold text-slate-400">EGP</span>
            </p>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              {isAr ? 'السيولة الفعلية المحصلة بالخزينة' : 'Actual settled & collected liquidity'}
            </p>
          </div>
          <div className="text-[10px] text-slate-400 font-semibold pt-2 border-t border-slate-200/60">
            {isAr ? 'بعد خصم المصاريف وسحوبات الشركاء' : 'Net of expenses & partner withdrawals'}
          </div>
        </div>

        {/* Card 2: Expected Inbound COD (7 & 14 Days) */}
        <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-5 flex flex-col justify-between gap-3 relative overflow-hidden">
          <div className="flex justify-between items-center text-blue-800">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">
              {t.inboundCod7d || 'Inbound COD (7 Days)'}
            </span>
            <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
              <Truck size={16} />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl sm:text-3xl font-black text-blue-700">
                +{inboundCod7Days.toLocaleString('en-EG')} <span className="text-xs font-bold text-blue-500">EGP</span>
              </p>
            </div>
            <div className="flex items-center justify-between text-[11px] text-blue-900 font-bold mt-1">
              <span>{t.inboundCod14d || 'In 14 Days'}:</span>
              <span className="font-extrabold">+{inboundCod14Days.toLocaleString('en-EG')} EGP</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-blue-700 font-semibold pt-2 border-t border-blue-200/60">
            <Clock size={12} />
            <span>
              {pendingCashOrdersCount} {isAr ? 'شحنة محصلة' : 'delivered'} + {shippedOrdersCount} {isAr ? 'في الطريق' : 'shipped'}
            </span>
          </div>
        </div>

        {/* Card 3: Safe Partner Dividends */}
        <div className={`rounded-2xl p-5 border flex flex-col justify-between gap-3 relative overflow-hidden ${
          isDividendsSafe
            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
            : 'bg-amber-50/70 border-amber-200 text-amber-950'
        }`}>
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">
              {t.safePartnerDividends || 'Safe Partner Dividends'}
            </span>
            <div className={`p-2 rounded-xl ${
              isDividendsSafe ? 'bg-emerald-200/80 text-emerald-800' : 'bg-amber-200/80 text-amber-800'
            }`}>
              {isDividendsSafe ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
            </div>
          </div>

          <div>
            <p className={`text-2xl sm:text-3xl font-black ${isDividendsSafe ? 'text-emerald-700' : 'text-amber-800'}`}>
              {safePartnerDividends.toLocaleString('en-EG')} <span className="text-xs font-bold opacity-75">EGP</span>
            </p>
            <div className="mt-1 flex items-center gap-1.5 text-[11px] font-bold">
              <span className={`inline-block w-2 h-2 rounded-full ${isDividendsSafe ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span>
                {isDividendsSafe ? (t.safeToDistribute || 'Safe to Distribute') : (t.dividendsLocked || 'Locked: Retain for Ops')}
              </span>
            </div>
          </div>

          <div className="text-[10px] opacity-75 font-semibold pt-2 border-t border-current/10">
            {t.productionReserve || 'Reserve Buffer'}: {productionReserve.toLocaleString('en-EG')} EGP
          </div>
        </div>

        {/* Card 4: Working Capital Runway */}
        <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-5 flex flex-col justify-between gap-3 relative overflow-hidden">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">
              {t.workingCapitalRunway || 'Working Capital Runway'}
            </span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600">
              <TrendingUp size={16} />
            </div>
          </div>

          <div>
            <p className="text-2xl sm:text-3xl font-black text-[#181E1C]">
              {runwayDays} <span className="text-xs font-bold text-slate-400">{isAr ? 'يوم تشغيل' : 'Days'}</span>
            </p>
            <div className="mt-1 flex items-center justify-between text-[11px] font-bold">
              <span className="text-slate-500">{t.projectedRunwayWithCOD || 'With Inbound COD'}:</span>
              <span className="text-purple-700 font-extrabold">{projectedRunwayDays} {isAr ? 'يوم' : 'Days'}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] font-semibold pt-2 border-t border-slate-200/60">
            <span className={`w-2 h-2 rounded-full ${
              runwayStatus === 'healthy' ? 'bg-emerald-500' :
              runwayStatus === 'caution' ? 'bg-amber-500' : 'bg-rose-500'
            }`} />
            <span className="text-slate-600">
              {runwayStatus === 'healthy' ? (t.runwayHealthy || 'Strong Liquidity') :
               runwayStatus === 'caution' ? (t.runwayCaution || 'Moderate Buffer') :
               (t.runwayCritical || 'Tight Runway')}
            </span>
          </div>
        </div>
      </div>

      {/* Cash Flow Deep-Dive Details Banner */}
      <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-white text-slate-600 shadow-sm shrink-0 mt-0.5">
            <AlertCircle size={18} className="text-[#597867]" />
          </div>
          <div>
            <h4 className="font-extrabold text-slate-800">
              {isAr ? 'معادلة الأرباح القابلة للتوزيع بأمان (Safe Dividends Formula)' : 'Safe Partner Dividends Calculation'}
            </h4>
            <p className="text-slate-500 mt-0.5 leading-relaxed">
              {isAr
                ? `الأرباح القابلة للتوزيع = ماكس(0، رصيد الخزينة [${cashInTreasury.toLocaleString('en-EG')} ج.م] - مصاريف 30 يوماً واحتياطي إعادة الإنتاج [${productionReserve.toLocaleString('en-EG')} ج.م]). معدل الحرق اليومي المقدر: ${dailyBurnRate.toLocaleString('en-EG')} ج.م/يوم.`
                : `Safe Dividends = max(0, Treasury Cash [${cashInTreasury.toLocaleString('en-EG')} EGP] - 30-Day Operational & Production Reserve [${productionReserve.toLocaleString('en-EG')} EGP]). Estimated daily burn: ${dailyBurnRate.toLocaleString('en-EG')} EGP/day.`}
            </p>
          </div>
        </div>

        <div className="shrink-0 self-end sm:self-center">
          <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 shadow-sm">
            <span>{isAr ? 'معدل الحرق (30 يوم):' : '30-Day Burn:'}</span>
            <span className="font-black text-[#181E1C]">{effectiveMonthlyBurn.toLocaleString('en-EG')} EGP</span>
          </div>
        </div>
      </div>
    </div>
  );
}
