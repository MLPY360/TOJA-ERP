import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, AlertTriangle, Tag, Search, TrendingUp, TrendingDown,
  ArrowUpRight, Package, CheckCircle2, DollarSign, Filter, RefreshCw
} from 'lucide-react';
import { translations } from '../../translations';

export default function ProductContributionMatrix({
  productsContribution,
  language = 'ar'
}) {
  const t = translations[language];
  const isAr = language === 'ar';

  const [filterBadge, setFilterBadge] = useState('all'); // 'all' | 'scale_up' | 'margin_leak' | 'dead_capital' | 'balanced'
  const [searchTerm, setSearchTerm] = useState('');

  const { matrix = [], summary = {} } = productsContribution || {};

  const filteredProducts = useMemo(() => {
    return matrix.filter(p => {
      // Badge filter
      if (filterBadge !== 'all' && p.badge !== filterBadge) {
        return false;
      }
      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchName = (p.name || '').toLowerCase().includes(q);
        const matchSku = (p.sku || '').toLowerCase().includes(q);
        if (!matchName && !matchSku) return false;
      }
      return true;
    });
  }, [matrix, filterBadge, searchTerm]);

  // Badge visual helper
  const renderBadge = (badge) => {
    switch (badge) {
      case 'scale_up':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs">
            <span>🌟</span>
            <span>{isAr ? 'ستار / فرصة توسع' : 'Scale Up (Star)'}</span>
          </span>
        );
      case 'margin_leak':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-rose-100 text-rose-800 border border-rose-300 shadow-xs">
            <span>⚠️</span>
            <span>{isAr ? 'تسريب أرباح' : 'Margin Leak'}</span>
          </span>
        );
      case 'dead_capital':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-amber-100 text-amber-900 border border-amber-300 shadow-xs">
            <span>💤</span>
            <span>{isAr ? 'رأس مال راكد' : 'Dead Capital'}</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <span>⚖️</span>
            <span>{isAr ? 'متوازن' : 'Balanced'}</span>
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-slate-100 flex flex-col gap-6">
      {/* Header & Section Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600">
            <Sparkles size={24} strokeWidth={2.3} />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-[#181E1C]">
              {t.productContributionMatrix || 'Product Contribution Matrix & Profit Classification'}
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {t.productContributionDesc || 'Stars vs Bleeders: Net margins, return losses, dead capital identification & advisory actions'}
            </p>
          </div>
        </div>

        {/* Quick Summary Pill Counters */}
        <div className="flex items-center gap-1.5 flex-wrap self-start md:self-auto text-xs font-bold">
          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
            🌟 {summary.scaleUpCount || 0} {isAr ? 'ستار' : 'Stars'}
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 border border-rose-200">
            ⚠️ {summary.marginLeakCount || 0} {isAr ? 'تسريب' : 'Leaks'}
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
            💤 {summary.deadCapitalCount || 0} {isAr ? 'راكد' : 'Dead'}
          </span>
        </div>
      </div>

      {/* Dead Capital Warning Banner if present */}
      {summary.deadCapitalCount > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50/60 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-amber-950 font-bold">
            <Tag size={18} className="text-amber-600 shrink-0" />
            <span>
              <strong>{summary.totalDeadCapitalCost?.toLocaleString('en-EG')} EGP</strong> {t.deadCapitalLockedAlert || 'tied in stagnant inventory (>14 days low velocity)'}
            </span>
          </div>
          <span className="text-[11px] font-bold text-amber-800 bg-amber-200/60 px-3 py-1 rounded-lg self-start sm:self-auto">
            {isAr ? 'توصية: تسييل المخزون بعروض حزم' : 'Action: Bundle liquidation recommended'}
          </span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl text-xs font-bold overflow-x-auto">
          {[
            { id: 'all', label: t.filterAll || 'All SKUs', count: matrix.length },
            { id: 'scale_up', label: t.filterScaleUp || '🌟 Scale Up', count: summary.scaleUpCount },
            { id: 'margin_leak', label: t.filterMarginLeak || '⚠️ Margin Leak', count: summary.marginLeakCount },
            { id: 'dead_capital', label: t.filterDeadCapital || '💤 Dead Capital', count: summary.deadCapitalCount },
            { id: 'balanced', label: t.filterBalanced || '⚖️ Balanced', count: summary.balancedCount }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterBadge(f.id)}
              className={`px-3 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
                filterBadge === f.id
                  ? 'bg-white text-[#181E1C] shadow-sm font-black'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>{f.label}</span>
              <span className="text-[10px] opacity-60">({f.count || 0})</span>
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-64">
          <Search size={15} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t.searchProductOrSku || 'Search product name or SKU...'}
            className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl ps-9 pe-4 py-2.5 outline-none focus:border-[#597867] focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Product Contribution Table / Cards */}
      <div className="overflow-x-auto rounded-2xl border border-slate-100">
        <table className="w-full text-start text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider text-[11px] font-bold">
              <th className="p-3.5 px-4 text-start">{t.product || 'Product / SKU'}</th>
              <th className="p-3.5 text-center">{t.status || 'Classification'}</th>
              <th className="p-3.5 text-end">{t.price || 'Price / Cost'}</th>
              <th className="p-3.5 text-end">{t.grossMarginPct || 'Gross Margin %'}</th>
              <th className="p-3.5 text-center">{t.deliverySuccessRate || 'Delivery Success %'}</th>
              <th className="p-3.5 text-end">{t.returnLossesWasted || 'Return Losses'}</th>
              <th className="p-3.5 text-end">{t.realizedNetCash || 'Realized Net Cash'}</th>
              <th className="p-3.5 text-center">{t.salesVelocity14d || '14d Velocity'}</th>
              <th className="p-3.5 text-start min-w-[200px]">{t.actionAdvisory || 'Action Recommendation'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan="9" className="p-8 text-center text-slate-400 font-bold">
                  {t.noProductsMatched || 'No products match this filter'}
                </td>
              </tr>
            ) : (
              filteredProducts.map((p) => (
                <tr
                  key={p.id}
                  className={`hover:bg-slate-50/70 transition-colors ${
                    p.badge === 'scale_up' ? 'bg-emerald-50/20' :
                    p.badge === 'margin_leak' ? 'bg-rose-50/20' :
                    p.badge === 'dead_capital' ? 'bg-amber-50/20' : ''
                  }`}
                >
                  {/* Product & SKU */}
                  <td className="p-3.5 px-4 text-start">
                    <div className="flex items-center gap-3">
                      {p.imageUrl ? (
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                          <Package size={18} />
                        </div>
                      )}
                      <div>
                        <p className="font-extrabold text-[#181E1C] text-xs sm:text-sm">{p.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{p.sku}</p>
                      </div>
                    </div>
                  </td>

                  {/* Badge */}
                  <td className="p-3.5 text-center whitespace-nowrap">
                    {renderBadge(p.badge)}
                  </td>

                  {/* Selling Price & Cost */}
                  <td className="p-3.5 text-end whitespace-nowrap">
                    <p className="font-extrabold text-[#181E1C]">{p.sellingPrice.toLocaleString('en-EG')} EGP</p>
                    <p className="text-[10px] text-slate-400 font-medium">{p.costPrice.toLocaleString('en-EG')} EGP cost</p>
                  </td>

                  {/* Gross Margin % */}
                  <td className="p-3.5 text-end whitespace-nowrap">
                    <span className={`inline-block px-2 py-0.5 rounded font-black text-xs ${
                      p.grossMarginPct >= 50 ? 'bg-emerald-100 text-emerald-800' :
                      p.grossMarginPct >= 35 ? 'bg-teal-50 text-teal-800' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {p.grossMarginPct}%
                    </span>
                    <p className="text-[10px] text-slate-400 mt-0.5">+{p.grossMarginPerUnit} EGP/unit</p>
                  </td>

                  {/* Delivery Success Rate % */}
                  <td className="p-3.5 text-center whitespace-nowrap">
                    {p.deliverySuccessRate !== null ? (
                      <div>
                        <span className={`font-black text-xs ${
                          p.deliverySuccessRate >= 80 ? 'text-emerald-600' :
                          p.deliverySuccessRate >= 70 ? 'text-amber-600' :
                          'text-rose-600'
                        }`}>
                          {p.deliverySuccessRate}%
                        </span>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {p.deliveredUnits} / {p.totalCompleted} {isAr ? 'مستلم' : 'dlvd'}
                        </p>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">
                        {isAr ? 'لا بيانات تسليم' : 'No data yet'}
                      </span>
                    )}
                  </td>

                  {/* Return Losses */}
                  <td className="p-3.5 text-end whitespace-nowrap">
                    {p.returnLossesIncurred > 0 ? (
                      <div>
                        <span className="font-black text-rose-600">
                          -{p.returnLossesIncurred.toLocaleString('en-EG')} EGP
                        </span>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {p.returnedUnits} {isAr ? 'قطعة مرتجعة' : 'ret. units'}
                        </p>
                      </div>
                    ) : (
                      <span className="text-slate-400 font-bold">0 EGP</span>
                    )}
                  </td>

                  {/* Realized Net Cash */}
                  <td className="p-3.5 text-end whitespace-nowrap">
                    <span className={`font-black text-xs sm:text-sm ${
                      p.realizedNetCash > 0 ? 'text-emerald-700' :
                      p.realizedNetCash < 0 ? 'text-rose-600' :
                      'text-slate-600'
                    }`}>
                      {p.realizedNetCash > 0 ? `+${p.realizedNetCash.toLocaleString('en-EG')}` : p.realizedNetCash.toLocaleString('en-EG')} EGP
                    </span>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {p.deliveredUnits} {isAr ? 'مباع' : 'sold'}
                    </p>
                  </td>

                  {/* Sales Velocity 14d & Remaining Stock */}
                  <td className="p-3.5 text-center whitespace-nowrap">
                    <span className={`inline-block px-2 py-0.5 rounded font-black text-xs ${
                      p.unitsSoldLast14Days >= 5 ? 'bg-emerald-100 text-emerald-800' :
                      p.unitsSoldLast14Days > 1 ? 'bg-slate-100 text-slate-700' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {p.unitsSoldLast14Days} {isAr ? 'قطعة' : 'units'}
                    </span>
                    <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                      {p.stockUnits} {isAr ? 'بالمخزن' : 'in stock'}
                    </p>
                  </td>

                  {/* Action Recommendation */}
                  <td className="p-3.5 text-start">
                    <div className="p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs text-[11px] font-semibold text-slate-700">
                      {isAr ? p.recommendationAr : p.recommendationEn}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
