import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Sliders, Target, TrendingUp, DollarSign, Clock,
  Sparkles, CheckCircle2, ArrowRight, RotateCcw, AlertCircle
} from 'lucide-react';
import { simulateBatchReinvestment } from '../../utils/financialIntelligence';
import { translations } from '../../translations';

export default function BatchReinvestmentSimulator({
  defaultVelocity = 8,
  language = 'ar'
}) {
  const t = translations[language];
  const isAr = language === 'ar';

  // Interactive Simulator State
  const [plannedUnits, setPlannedUnits] = useState(500);
  const [unitCost, setUnitCost] = useState(185);
  const [retailPrice, setRetailPrice] = useState(450);
  const [marketingBudget, setMarketingBudget] = useState(15000);
  const [dailyVelocity, setDailyVelocity] = useState(defaultVelocity || 8);

  const simulation = useMemo(() => {
    return simulateBatchReinvestment({
      plannedUnits,
      unitCost,
      retailPrice,
      marketingBudget,
      historicalDailyVelocity: dailyVelocity,
      returnRate: 0.12
    });
  }, [plannedUnits, unitCost, retailPrice, marketingBudget, dailyVelocity]);

  const handleReset = () => {
    setPlannedUnits(500);
    setUnitCost(185);
    setRetailPrice(450);
    setMarketingBudget(15000);
    setDailyVelocity(defaultVelocity || 8);
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-slate-100 flex flex-col gap-6">
      {/* Title & Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-600">
            <Sliders size={24} strokeWidth={2.3} />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-[#181E1C]">
              {t.batchSimulator || 'Interactive Batch Reinvestment & What-If Simulator'}
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {t.batchSimulatorDesc || 'Model future batch units, break-even targets, and projected ROI at various sell-through rates'}
            </p>
          </div>
        </div>

        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors self-start sm:self-auto"
        >
          <RotateCcw size={14} />
          <span>{isAr ? 'إعادة ضبط الافتراضات' : 'Reset Defaults'}</span>
        </button>
      </div>

      {/* Simulator Inputs & Quick Sliders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 p-5 bg-slate-50/80 rounded-2xl border border-slate-200/80">
        {/* Input 1: Planned Units */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-600">
              {t.plannedBatchUnits || 'Planned Batch Units'}
            </label>
            <span className="text-xs font-black text-[#181E1C] bg-white px-2 py-0.5 rounded border border-slate-200">
              {plannedUnits} {isAr ? 'قطعة' : 'units'}
            </span>
          </div>
          <input
            type="range"
            min="50"
            max="3000"
            step="50"
            value={plannedUnits}
            onChange={(e) => setPlannedUnits(Number(e.target.value))}
            className="w-full accent-[#597867] cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-400 font-bold">
            <span>50</span>
            <span>1,500</span>
            <span>3,000</span>
          </div>
        </div>

        {/* Input 2: Unit Cost Price */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-600">
              {t.unitManufacturingCost || 'Unit Cost (EGP)'}
            </label>
            <span className="text-xs font-black text-[#181E1C] bg-white px-2 py-0.5 rounded border border-slate-200">
              {unitCost} EGP
            </span>
          </div>
          <input
            type="range"
            min="50"
            max="800"
            step="5"
            value={unitCost}
            onChange={(e) => setUnitCost(Number(e.target.value))}
            className="w-full accent-[#597867] cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-400 font-bold">
            <span>50 EGP</span>
            <span>400 EGP</span>
            <span>800 EGP</span>
          </div>
        </div>

        {/* Input 3: Target Retail Price */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-600">
              {t.targetRetailPrice || 'Target Retail Price (EGP)'}
            </label>
            <span className="text-xs font-black text-[#181E1C] bg-white px-2 py-0.5 rounded border border-slate-200">
              {retailPrice} EGP
            </span>
          </div>
          <input
            type="range"
            min="100"
            max="1500"
            step="10"
            value={retailPrice}
            onChange={(e) => setRetailPrice(Number(e.target.value))}
            className="w-full accent-[#597867] cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-400 font-bold">
            <span>100 EGP</span>
            <span>750 EGP</span>
            <span>1,500 EGP</span>
          </div>
        </div>

        {/* Input 4: Marketing/Ad Budget */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-600">
              {t.marketingAdBudget || 'Marketing Budget (EGP)'}
            </label>
            <span className="text-xs font-black text-[#181E1C] bg-white px-2 py-0.5 rounded border border-slate-200">
              {marketingBudget.toLocaleString('en-EG')} EGP
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="80000"
            step="2500"
            value={marketingBudget}
            onChange={(e) => setMarketingBudget(Number(e.target.value))}
            className="w-full accent-[#597867] cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-400 font-bold">
            <span>0 EGP</span>
            <span>40k EGP</span>
            <span>80k EGP</span>
          </div>
        </div>
      </div>

      {/* Simulator Instant Key Outputs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Output 1: Total Capital Required */}
        <div className="bg-slate-900 text-white rounded-2xl p-5 flex flex-col justify-between gap-3 shadow-md">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">
              {t.totalBatchInvestment || 'Total Capital Required'}
            </span>
            <DollarSign size={16} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
              {simulation.totalCapitalRequired.toLocaleString('en-EG')} <span className="text-xs font-bold text-slate-400">EGP</span>
            </p>
            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-300 font-medium">
              <span>{isAr ? 'تصنيع:' : 'Prod:'} {simulation.manufacturingCost.toLocaleString('en-EG')} EGP</span>
              <span>+ {isAr ? 'إعلانات:' : 'Ads:'} {simulation.marketingBudget.toLocaleString('en-EG')} EGP</span>
            </div>
          </div>
        </div>

        {/* Output 2: Break-Even Volume */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">
              {t.breakEvenVolume || 'Break-Even Sales Volume'}
            </span>
            <Target size={16} className="text-[#597867]" />
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black text-[#181E1C]">
              {simulation.breakEvenUnits} <span className="text-xs font-bold text-slate-400">{t.unitsToBreakEven || 'units'}</span>
            </p>
            <div className="mt-1 flex items-center justify-between text-[11px] font-bold text-slate-500">
              <span>{simulation.breakEvenPct}% {t.breakEvenBatchPct || 'of batch'}</span>
              <span className="text-emerald-600 font-extrabold">
                {isAr ? 'تغطية 100% للتكلفة' : '100% Payback'}
              </span>
            </div>
          </div>
        </div>

        {/* Output 3: Days to Capital Recovery */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">
              {t.daysToCapitalRecovery || 'Est. Days to Payback'}
            </span>
            <Clock size={16} className="text-purple-600" />
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black text-purple-700">
              ~{simulation.daysToBreakEven} <span className="text-xs font-bold text-slate-400">{isAr ? 'يوم' : 'Days'}</span>
            </p>
            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>{isAr ? 'بمعدل:' : 'At pace:'} {simulation.historicalDailyVelocity} {isAr ? 'قطعة/يوم' : 'units/day'}</span>
              <span className="text-slate-700 font-bold">{simulation.daysToFullSellOut}d {isAr ? 'للبيع الكامل' : 'sellout'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sell-Through Profit Scenarios (70%, 85%, 100%) */}
      <div className="flex flex-col gap-3">
        <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
          <TrendingUp size={15} className="text-[#597867]" />
          <span>{t.sellThroughScenarios || 'Sell-Through Pure Profit Scenarios'}</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {simulation.scenarios.map((scenario) => {
            const isTarget = scenario.sellThroughPct === 85;
            const isFull = scenario.sellThroughPct === 100;

            return (
              <div
                key={scenario.sellThroughPct}
                className={`rounded-2xl p-5 border flex flex-col justify-between gap-3 relative transition-all ${
                  isTarget
                    ? 'bg-emerald-50/70 border-emerald-300 shadow-md ring-1 ring-emerald-400/20'
                    : isFull
                    ? 'bg-gradient-to-br from-indigo-50/60 to-purple-50/60 border-indigo-200'
                    : 'bg-slate-50/80 border-slate-200'
                }`}
              >
                {/* Header with Sell-Through Badge */}
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs text-slate-800">
                    {scenario.sellThroughPct === 70 ? (t.conservative70 || 'Conservative (70%)') :
                     scenario.sellThroughPct === 85 ? (t.target85 || 'Target Goal (85%)') :
                     (t.full100 || 'Full Sell-Out (100%)')}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                    isTarget ? 'bg-emerald-600 text-white' :
                    isFull ? 'bg-indigo-600 text-white' :
                    'bg-slate-200 text-slate-700'
                  }`}>
                    {scenario.soldUnits} {isAr ? 'قطعة' : 'units'}
                  </span>
                </div>

                {/* Pure Profit Amount */}
                <div>
                  <p className="text-[11px] font-extrabold uppercase text-slate-500">
                    {t.pureProjectedProfit || 'Pure Net Profit'}
                  </p>
                  <p className={`text-2xl font-black mt-0.5 ${
                    scenario.pureProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'
                  }`}>
                    {scenario.pureProfit >= 0 ? `+${scenario.pureProfit.toLocaleString('en-EG')}` : scenario.pureProfit.toLocaleString('en-EG')} <span className="text-xs font-bold opacity-75">EGP</span>
                  </p>
                </div>

                {/* ROI and Revenue Metrics */}
                <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs font-bold text-slate-600">
                  <div>
                    <span className="text-slate-400 text-[10px] block">{t.returnOnCapital || 'ROI'}:</span>
                    <span className="text-emerald-700 font-extrabold">+{scenario.roiPct}%</span>
                  </div>
                  <div className="text-end">
                    <span className="text-slate-400 text-[10px] block">{isAr ? 'الإيراد الإجمالي:' : 'Gross Rev:'}</span>
                    <span className="text-[#181E1C] font-extrabold">{scenario.grossRevenue.toLocaleString('en-EG')} EGP</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
