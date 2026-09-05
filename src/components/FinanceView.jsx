import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Plus, Trash2, Wallet, DollarSign, Calendar, Tag, Search, FileText,
  Users, Download, UploadCloud, CheckCircle2, AlertTriangle, RefreshCw, FileSpreadsheet,
  Target, TrendingUp
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useStore } from '../store/useStore';
import { translations } from '../translations';
import SettlementReportModal from './SettlementReportModal';

export default function FinanceView() {
  const {
    expenses, addExpense, deleteExpense, language,
    products, orders,
    partners, addPartner, updatePartner, deletePartner,
    withdrawals, addWithdrawal, deleteWithdrawal,
    bulkReconcileCourier
  } = useStore();
  const t = translations[language];

  const [activeTab, setActiveTab] = useState('expenses'); // 'expenses' | 'unit_economics' | 'partners' | 'reconciliation'

  // Expenses State
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [expenseCategory, setExpenseCategory] = useState('Ads');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseSearch, setExpenseSearch] = useState('');

  // Partners State
  const [isAddingPartner, setIsAddingPartner] = useState(false);
  const [partnerName, setPartnerName] = useState('');
  const [partnerShare, setPartnerShare] = useState('');

  // Withdrawals State
  const [isAddingWithdrawal, setIsAddingWithdrawal] = useState(false);
  const [withdrawalPartnerId, setWithdrawalPartnerId] = useState('');
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [withdrawalDate, setWithdrawalDate] = useState(new Date().toISOString().split('T')[0]);
  const [withdrawalDescription, setWithdrawalDescription] = useState('');

  const [isReportOpen, setIsReportOpen] = useState(false);

  // Reconciliation State
  const [carrierName, setCarrierName] = useState('Bosta');
  const [batchName, setBatchName] = useState(`Bosta-${new Date().toISOString().slice(0, 10)}`);
  const [settlementFile, setSettlementFile] = useState(null);
  const [settlementData, setSettlementData] = useState(null);
  const [isReconciling, setIsReconciling] = useState(false);
  const [reconcileSuccess, setReconcileSuccess] = useState(false);

  // Unit Economics State
  const [uePeriod, setUePeriod] = useState('all'); // 'all' | 'month' | 'last30'
  const [isAddingAdSpend, setIsAddingAdSpend] = useState(false);
  const [adPlatform, setAdPlatform] = useState('Meta Ads');
  const [adAmount, setAdAmount] = useState('');
  const [adCampaign, setAdCampaign] = useState('');
  const [adDate, setAdDate] = useState(new Date().toISOString().split('T')[0]);

  const processSettlementRows = (rows, fileName) => {
    const matched = [];
    const unmatched = [];
    let totalCollected = 0;
    let totalFees = 0;
    let totalExpected = 0;

    rows.forEach((row, idx) => {
      const rowKeys = Object.keys(row);
      const idKey = rowKeys.find(k => /track|order|ref|awb|code|بوليصة|شحنة|طلب/i.test(k)) || rowKeys[0];
      const amountKey = rowKeys.find(k => /collect|cod|cash|amount|مبلغ|تحصيل/i.test(k));
      const feeKey = rowKeys.find(k => /fee|shipping|delivery|cost|تكلفة|مصاريف/i.test(k));

      const rawId = String(row[idKey] || '').trim();
      const rawCollected = Number(row[amountKey]) || 0;
      const rawFee = Number(row[feeKey]) || 0;

      if (!rawId) return;

      const cleanTarget = rawId.toLowerCase().replace(/[^a-z0-9]/gi, '');
      const matchedOrder = orders.find(o => {
        const oDisplay = (o.displayId || '').toLowerCase().replace(/[^a-z0-9]/gi, '');
        const oId = (o.id || '').toLowerCase().replace(/[^a-z0-9]/gi, '');
        const oCustom = (o.orderId || o.orderNumber || o.customId || '').toLowerCase().replace(/[^a-z0-9]/gi, '');
        return (
          (cleanTarget && (oDisplay.includes(cleanTarget) || cleanTarget.includes(oDisplay))) ||
          (cleanTarget && (oCustom.includes(cleanTarget) || cleanTarget.includes(oCustom))) ||
          oId === cleanTarget
        );
      });

      if (matchedOrder) {
        const expected = Number(matchedOrder.total || matchedOrder.totalAmount || 0);
        const fee = rawFee > 0 ? rawFee : Number(matchedOrder.shippingFee || 0);
        const collected = rawCollected > 0 ? rawCollected : expected;
        const variance = collected - expected;

        matched.push({
          orderId: matchedOrder.id,
          displayId: matchedOrder.displayId || matchedOrder.orderId || matchedOrder.id,
          customerName: matchedOrder.customerName || 'Customer',
          phone: matchedOrder.phone || '',
          expectedAmount: expected,
          collectedAmount: collected,
          courierFee: fee,
          variance,
          rawTracking: rawId
        });

        totalCollected += collected;
        totalFees += fee;
        totalExpected += expected;
      } else {
        unmatched.push({
          rawId,
          collected: rawCollected,
          fee: rawFee,
          rowIdx: idx + 1
        });
      }
    });

    const netPayout = totalCollected - totalFees;
    setSettlementFile(fileName);
    setSettlementData({
      matched,
      unmatched,
      totalCollected,
      totalFees,
      netPayout,
      totalExpected
    });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

        processSettlementRows(rows, file.name);
      } catch (err) {
        console.error("Error parsing settlement sheet:", err);
        alert("Failed to parse file. Please ensure it is a valid Excel or CSV file.");
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleApplySettlement = async () => {
    if (!settlementData || settlementData.matched.length === 0) return;
    setIsReconciling(true);

    const feeVarianceTotal = settlementData.matched.reduce((sum, item) => {
      return sum + (item.variance < 0 ? Math.abs(item.variance) : 0);
    }, 0);

    const res = await bulkReconcileCourier({
      batchName: batchName || `Batch-${new Date().toISOString().slice(0, 10)}`,
      carrierName: carrierName || 'Bosta',
      matchedOrders: settlementData.matched,
      feeVarianceTotal
    });

    setIsReconciling(false);
    if (res?.success) {
      setReconcileSuccess(true);
      setTimeout(() => {
        setSettlementData(null);
        setSettlementFile(null);
        setReconcileSuccess(false);
      }, 3500);
    }
  };

  // --- Calculations ---
  const totalExpensesSum = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);

  const netProfit = useMemo(() => {
    let totalProfit = 0;
    let returnLosses = 0;
    let totalExp = 0;

    orders.forEach(order => {
      if (order.status === 'Delivered - Collected' || order.status === 'Delivered - Pending Cash' || order.status === 'Delivered') {
        let orderCost = 0;
        let itemsRevenue = 0;
        order.items?.forEach(item => {
          const product = products.find(p => p.id === item.productId);
          const itemQty = item.qty || item.quantity || 1; // قراءة الكمية بالطريقتين
          if (product) {
            orderCost += product.costPrice * itemQty;
            itemsRevenue += product.sellingPrice * itemQty;
          }
        });
        const discountAmt = Number(order.discount?.amount || 0);
        const netItemsRevenue = Math.max(0, itemsRevenue - discountAmt);
        totalProfit += (netItemsRevenue - orderCost);
      } else if (order.status === 'Returned') {
        // قراءة مصاريف الشحن بالطريقتين لتفادي الإيرور
        returnLosses += Number(order.shippingFee ?? order.totals?.shipping ?? 0);
      }
    });

    expenses.forEach(exp => {
      totalExp += Number(exp.amount) || 0;
    });

    return totalProfit - returnLosses - totalExp;
  }, [products, orders, expenses]);

  // --- Expenses Logic ---
  const filteredExpenses = expenses.filter(exp => {
    const q = expenseSearch.toLowerCase();
    return exp.description.toLowerCase().includes(q) || exp.category.toLowerCase().includes(q);
  });

  const handleAddExpense = (e) => {
    e.preventDefault();
    if (!expenseAmount || Number(expenseAmount) <= 0) return;
    addExpense({
      category: expenseCategory,
      amount: Number(expenseAmount),
      date: expenseDate,
      description: expenseDescription
    });
    setIsAddingExpense(false);
    setExpenseAmount('');
    setExpenseDescription('');
    setExpenseDate(new Date().toISOString().split('T')[0]);
  };

  // --- Unit Economics Calculations ---
  const unitEconomicsMetrics = useMemo(() => {
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const isInPeriod = (dateStr) => {
      if (uePeriod === 'all') return true;
      if (!dateStr) return false;
      const d = new Date(dateStr);
      if (uePeriod === 'month') return dateStr.startsWith(currentMonth);
      if (uePeriod === 'last30') return d >= thirtyDaysAgo;
      return true;
    };

    const filteredOrders = orders.filter(o => isInPeriod(o.createdAt));

    let netDeliveredRevenue = 0;
    let deliveredCOGS = 0;
    let deliveredOrdersCount = 0;
    let courierFeesPaid = 0;
    let returnLosses = 0;

    filteredOrders.forEach(o => {
      const isDelivered = o.status === 'Delivered - Collected' || o.status === 'Delivered' || o.status === 'Delivered - Pending Cash';
      if (isDelivered) {
        deliveredOrdersCount += 1;
        let itemsRev = 0;
        let itemsCost = 0;
        (o.items || []).forEach(item => {
          const p = products.find(prod => prod.id === item.productId);
          const qty = Number(item.qty || item.quantity) || 1;
          const sellPrice = Number(item.unitPrice || p?.sellingPrice || 0);
          const costPrice = Number(p?.costPrice || 0);
          itemsRev += sellPrice * qty;
          itemsCost += costPrice * qty;
        });
        const discountAmt = Number(o.discount?.amount || 0);
        netDeliveredRevenue += Math.max(0, itemsRev - discountAmt);
        deliveredCOGS += itemsCost;
        courierFeesPaid += Number(o.shippingFee ?? o.totals?.shipping ?? 0);
      } else if (o.status === 'Returned') {
        returnLosses += Number(o.shippingFee ?? o.totals?.shipping ?? 0);
      }
    });

    const filteredExpenses = expenses.filter(e => isInPeriod(e.date));

    let totalAdSpend = 0;
    let metaSpend = 0;
    let tiktokSpend = 0;
    let otherAdSpend = 0;

    filteredExpenses.forEach(exp => {
      const isAd = exp.category === 'Ads' || /ad|meta|tiktok|marketing|facebook|إعلان|تسويق/i.test(exp.category || '') || /ad|meta|tiktok|facebook/i.test(exp.description || '');
      if (isAd) {
        const amt = Number(exp.amount) || 0;
        totalAdSpend += amt;
        const desc = (exp.description || '').toLowerCase();
        if (/meta|facebook|ig|إنستجرام/.test(desc)) {
          metaSpend += amt;
        } else if (/tiktok|تيك/.test(desc)) {
          tiktokSpend += amt;
        } else {
          otherAdSpend += amt;
        }
      }
    });

    const grossProfit = netDeliveredRevenue - deliveredCOGS;
    const grossMarginPct = netDeliveredRevenue > 0 ? ((grossProfit / netDeliveredRevenue) * 100).toFixed(1) : 0;
    const blendedCAC = deliveredOrdersCount > 0 ? Math.round(totalAdSpend / deliveredOrdersCount) : 0;
    const roas = totalAdSpend > 0 ? (netDeliveredRevenue / totalAdSpend).toFixed(2) : '0.00';
    const netContributionMargin = netDeliveredRevenue - deliveredCOGS - totalAdSpend - courierFeesPaid - returnLosses;
    const contributionMarginPct = netDeliveredRevenue > 0 ? ((netContributionMargin / netDeliveredRevenue) * 100).toFixed(1) : 0;

    return {
      netDeliveredRevenue,
      deliveredCOGS,
      deliveredOrdersCount,
      courierFeesPaid,
      returnLosses,
      totalAdSpend,
      metaSpend,
      tiktokSpend,
      otherAdSpend,
      grossProfit,
      grossMarginPct,
      blendedCAC,
      roas,
      netContributionMargin,
      contributionMarginPct
    };
  }, [orders, expenses, products, uePeriod]);

  const handleQuickAddAdSpend = (e) => {
    e.preventDefault();
    if (!adAmount || Number(adAmount) <= 0) return;
    addExpense({
      category: 'Ads',
      amount: Number(adAmount),
      date: adDate,
      description: `[${adPlatform}] ${adCampaign.trim() || 'Paid Ads Campaign'}`
    });
    setAdAmount('');
    setAdCampaign('');
    setIsAddingAdSpend(false);
  };

  const getCategoryTranslation = (cat) => {
    switch (cat) {
      case 'Ads': return t.ads || 'Ads (Meta/TikTok)';
      case 'Packaging': return t.packaging || 'Packaging';
      case 'Fixed Costs': return t.fixedCosts || 'Fixed Costs';
      case 'Other': return t.other || 'Other';
      default: return cat;
    }
  };

  // --- Partners Logic ---
  const handleAddPartner = (e) => {
    e.preventDefault();
    if (!partnerName || !partnerShare) return;

    const currentTotalShare = partners.reduce((sum, p) => sum + Number(p.profitSharePercentage), 0);
    const newShare = Number(partnerShare);

    if (currentTotalShare + newShare > 100) {
      alert(`Cannot add partner. Total profit share cannot exceed 100%. Current total is ${currentTotalShare}%.`);
      return;
    }

    addPartner({
      name: partnerName,
      profitSharePercentage: newShare
    });
    setIsAddingPartner(false);
    setPartnerName('');
    setPartnerShare('');
  };

  const handleAddWithdrawal = (e) => {
    e.preventDefault();
    if (!withdrawalPartnerId || !withdrawalAmount || Number(withdrawalAmount) <= 0) return;

    addWithdrawal({
      partnerId: withdrawalPartnerId,
      amount: Number(withdrawalAmount),
      date: withdrawalDate,
      description: withdrawalDescription
    });

    setIsAddingWithdrawal(false);
    setWithdrawalAmount('');
    setWithdrawalDescription('');
    setWithdrawalDate(new Date().toISOString().split('T')[0]);
    setWithdrawalPartnerId('');
  };

  return (
    <div className="flex flex-col gap-6">

      {/* Top Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-200/50 rounded-xl w-full sm:w-max flex-wrap">
        <button
          onClick={() => setActiveTab('expenses')}
          className={`flex-1 sm:px-5 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${activeTab === 'expenses' ? 'bg-white text-[#181E1C] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          {t.expenseTracker || 'Expense Tracker'}
        </button>
        <button
          onClick={() => setActiveTab('unit_economics')}
          className={`flex-1 sm:px-5 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${activeTab === 'unit_economics' ? 'bg-white text-[#181E1C] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          {t.unitEconomics || 'Unit Economics & Marketing'}
        </button>
        <button
          onClick={() => setActiveTab('reconciliation')}
          className={`flex-1 sm:px-5 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${activeTab === 'reconciliation' ? 'bg-white text-[#181E1C] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          {t.courierReconciliation || 'Courier Settlement'}
        </button>
        <button
          onClick={() => setActiveTab('partners')}
          className={`flex-1 sm:px-5 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${activeTab === 'partners' ? 'bg-white text-[#181E1C] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          {t.partnersLedger || 'Partners Ledger'}
        </button>
      </div>

      {activeTab === 'expenses' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-6 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-slate-100 flex flex-col justify-between h-32 md:col-span-1"
            >
              <div className="flex justify-between items-center">
                <h3 className="uppercase text-xs font-bold text-slate-500 tracking-wider">{t.totalExpenses || 'Total Expenses'}</h3>
                <div className="p-2.5 rounded-full bg-red-500/10 text-red-500">
                  <Wallet size={18} strokeWidth={2.5} />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-[#181E1C] mt-4">
                {totalExpensesSum.toLocaleString('en-EG')} EGP
              </div>
            </motion.div>
          </div>

          <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-slate-100 overflow-hidden">
            <div className="flex flex-col gap-4 border-b border-slate-100 px-7 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#181E1C]">
                  {t.expenseTracker || 'Expense Tracker'}
                </h2>
                <p className="mt-1 text-[12px] font-medium text-slate-400">
                  {expenses.length} records · {filteredExpenses.length} shown
                </p>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search size={15} strokeWidth={2} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder={t.searchPlaceholder || 'Search...'}
                    value={expenseSearch}
                    onChange={(e) => setExpenseSearch(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-[13px] font-medium text-[#181E1C] placeholder:text-slate-400 outline-none transition-all focus:border-[#597867] focus:bg-white focus:ring-2 focus:ring-[#597867]/10"
                  />
                </div>
                <button
                  onClick={() => setIsAddingExpense(!isAddingExpense)}
                  className="flex items-center justify-center gap-2 rounded-xl bg-[#597867] px-4 py-2.5 text-sm font-bold text-white shadow-md transition-colors hover:bg-[#465f52] whitespace-nowrap"
                >
                  <Plus size={16} strokeWidth={2.5} /> <span className="hidden sm:inline">{t.addExpense || 'Add Expense'}</span>
                </button>
              </div>
            </div>

            {isAddingExpense && (
              <div className="p-6 bg-slate-50 border-b border-slate-100">
                <form onSubmit={handleAddExpense} className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 text-start">Category</label>
                      <div className="relative">
                        <Tag className="absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <select
                          value={expenseCategory}
                          onChange={(e) => setExpenseCategory(e.target.value)}
                          className="w-full h-11 ps-10 pe-4 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:border-[#597867] focus:ring-2 focus:ring-[#597867]/20"
                        >
                          <option value="Ads">{t.ads || 'Ads (Meta/TikTok)'}</option>
                          <option value="Packaging">{t.packaging || 'Packaging'}</option>
                          <option value="Fixed Costs">{t.fixedCosts || 'Fixed Costs'}</option>
                          <option value="Other">{t.other || 'Other'}</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 text-start">{t.amount || 'Amount'}</label>
                      <div className="relative">
                        <DollarSign className="absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                          type="number"
                          min="1"
                          required
                          value={expenseAmount}
                          onChange={(e) => setExpenseAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-full h-11 ps-10 pe-4 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:border-[#597867] focus:ring-2 focus:ring-[#597867]/20"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 text-start">{t.date || 'Date'}</label>
                      <div className="relative">
                        <Calendar className="absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                          type="date"
                          required
                          value={expenseDate}
                          onChange={(e) => setExpenseDate(e.target.value)}
                          className="w-full h-11 ps-10 pe-4 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:border-[#597867] focus:ring-2 focus:ring-[#597867]/20"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 text-start">{t.description || 'Description'}</label>
                      <div className="relative">
                        <FileText className="absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                          type="text"
                          required
                          value={expenseDescription}
                          onChange={(e) => setExpenseDescription(e.target.value)}
                          placeholder="..."
                          className="w-full h-11 ps-10 pe-4 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:border-[#597867] focus:ring-2 focus:ring-[#597867]/20"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 mt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingExpense(false)}
                      className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors text-sm"
                    >
                      {t.cancel || 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-xl font-bold text-white bg-[#597867] hover:bg-[#465f52] shadow-md transition-colors text-sm"
                    >
                      {t.addExpense || 'Save Expense'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Desktop Table */}
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[800px] text-start border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-bold">
                    <th className="p-4 px-6 font-semibold text-start">{t.date || 'Date'}</th>
                    <th className="p-4 font-semibold text-start">Category</th>
                    <th className="p-4 font-semibold text-start">{t.description || 'Description'}</th>
                    <th className="p-4 font-semibold text-start">{t.amount || 'Amount'}</th>
                    <th className="p-4 font-semibold px-6 text-end">{t.actions || 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="p-8 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                            <Wallet size={24} className="text-slate-400" />
                          </div>
                          <p className="text-[13px] font-semibold text-slate-500">No expenses found</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map((exp, index) => (
                      <motion.tr
                        key={exp.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="p-4 px-6 align-middle text-start">
                          <p className="font-extrabold text-[#181E1C]">{exp.date}</p>
                        </td>
                        <td className="p-4 align-middle text-start">
                          <span className="inline-flex items-center justify-center px-2 py-1 rounded bg-slate-100 text-slate-600 text-xs font-bold">
                            {getCategoryTranslation(exp.category)}
                          </span>
                        </td>
                        <td className="p-4 align-middle text-start">
                          <p className="font-semibold text-slate-700">{exp.description}</p>
                        </td>
                        <td className="p-4 align-middle text-start">
                          <p className="font-black text-red-500">{Number(exp.amount).toLocaleString('en-EG')} EGP</p>
                        </td>
                        <td className="p-4 align-middle px-6 text-end">
                          <button
                            onClick={() => deleteExpense(exp.id)}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>


          </div>
        </>
      )}

      {activeTab === 'unit_economics' && (
        <div className="flex flex-col gap-6 text-start">
          {/* Top Period & Controls Bar */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-black text-slate-900">{t.unitEconomics}</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Calculate true profit margins after Product COGS, Paid Ads, Courier Delivery Fees, and Return losses.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Period Selector */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
                {[
                  { id: 'all', label: t.allTime },
                  { id: 'month', label: t.thisMonth },
                  { id: 'last30', label: t.last30Days }
                ].map(p => (
                  <button
                    key={p.id}
                    onClick={() => setUePeriod(p.id)}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      uePeriod === p.id ? 'bg-white text-[#181E1C] shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Quick Log Ad Spend Button */}
              <button
                onClick={() => setIsAddingAdSpend(!isAddingAdSpend)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-[#181E1C] hover:bg-black text-white rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                <Plus size={14} />
                <span>{t.logAdSpend}</span>
              </button>
            </div>
          </div>

          {/* Quick Ad Spend Entry Form */}
          {isAddingAdSpend && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleQuickAddAdSpend}
              className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col gap-4"
            >
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">{t.logAdSpend}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">{t.adPlatform}</label>
                  <select
                    value={adPlatform}
                    onChange={(e) => setAdPlatform(e.target.value)}
                    className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-[#597867]"
                  >
                    <option value="Meta Ads">Meta Ads (FB/IG)</option>
                    <option value="TikTok Ads">TikTok Ads</option>
                    <option value="Snapchat Ads">Snapchat Ads</option>
                    <option value="Google Ads">Google Ads</option>
                    <option value="Influencer">Influencer Marketing</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Amount (EGP)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="e.g. 2500"
                    value={adAmount}
                    onChange={(e) => setAdAmount(e.target.value)}
                    className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-[#597867]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={adDate}
                    onChange={(e) => setAdDate(e.target.value)}
                    className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-[#597867]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">{t.campaignName}</label>
                  <input
                    type="text"
                    placeholder="e.g. Winter Drop Conversion"
                    value={adCampaign}
                    onChange={(e) => setAdCampaign(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-xl p-2.5 bg-slate-50 outline-none focus:border-[#597867]"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingAdSpend(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#597867] text-white rounded-xl text-xs font-bold hover:bg-[#465f52]"
                >
                  Save Ad Expense
                </button>
              </div>
            </motion.form>
          )}

          {/* 6 Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Blended CAC */}
            <div className="bg-white rounded-2xl p-5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-slate-100">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-[10px] font-extrabold uppercase tracking-wider">{t.blendedCAC}</span>
                <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                  <Target size={16} />
                </div>
              </div>
              <p className="text-2xl font-black text-[#181E1C] mt-2">
                {unitEconomicsMetrics.blendedCAC.toLocaleString('en-EG')} <span className="text-xs font-bold text-slate-400">EGP / order</span>
              </p>
              <p className="text-[11px] font-bold text-slate-400 mt-1">
                Based on {unitEconomicsMetrics.deliveredOrdersCount} delivered orders
              </p>
            </div>

            {/* ROAS */}
            <div className="bg-white rounded-2xl p-5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-slate-100">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-[10px] font-extrabold uppercase tracking-wider">{t.roas}</span>
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <TrendingUp size={16} />
                </div>
              </div>
              <p className="text-2xl font-black text-emerald-600 mt-2">
                {unitEconomicsMetrics.roas}x
              </p>
              <p className="text-[11px] font-bold text-slate-400 mt-1">
                Net Delivered Revenue / Ad Spend
              </p>
            </div>

            {/* Net Contribution Margin */}
            <div className="bg-white rounded-2xl p-5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-slate-100">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-[10px] font-extrabold uppercase tracking-wider">{t.contributionMargin}</span>
                <div className="p-2 rounded-xl bg-[#597867]/10 text-[#597867]">
                  <DollarSign size={16} />
                </div>
              </div>
              <p className={`text-2xl font-black mt-2 ${unitEconomicsMetrics.netContributionMargin >= 0 ? 'text-[#597867]' : 'text-red-600'}`}>
                {unitEconomicsMetrics.netContributionMargin.toLocaleString('en-EG')} EGP
              </p>
              <p className="text-[11px] font-bold text-slate-400 mt-1">
                Margin: {unitEconomicsMetrics.contributionMarginPct}% of net sales
              </p>
            </div>

            {/* Total Ad Spend */}
            <div className="bg-white rounded-2xl p-5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-slate-100">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">{t.adSpend}</span>
              <p className="text-xl font-black text-slate-900 mt-2">
                {unitEconomicsMetrics.totalAdSpend.toLocaleString('en-EG')} EGP
              </p>
              <div className="flex items-center gap-2 mt-2 text-[10px] font-bold text-slate-500">
                <span>Meta: {unitEconomicsMetrics.metaSpend.toLocaleString()}</span> ·
                <span>TikTok: {unitEconomicsMetrics.tiktokSpend.toLocaleString()}</span>
              </div>
            </div>

            {/* Net Delivered Revenue */}
            <div className="bg-white rounded-2xl p-5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-slate-100">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">{t.netDeliveredRevenue}</span>
              <p className="text-xl font-black text-slate-900 mt-2">
                {unitEconomicsMetrics.netDeliveredRevenue.toLocaleString('en-EG')} EGP
              </p>
              <p className="text-[11px] font-bold text-slate-400 mt-1">
                Gross Margin: {unitEconomicsMetrics.grossMarginPct}%
              </p>
            </div>

            {/* Return Losses */}
            <div className="bg-white rounded-2xl p-5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-slate-100">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">{t.returnLossesPaid}</span>
              <p className="text-xl font-black text-red-600 mt-2">
                -{unitEconomicsMetrics.returnLosses.toLocaleString('en-EG')} EGP
              </p>
              <p className="text-[11px] font-bold text-slate-400 mt-1">
                Courier Delivery Fees: {unitEconomicsMetrics.courierFeesPaid.toLocaleString()} EGP
              </p>
            </div>
          </div>

          {/* Unit Economics Waterfall Breakdown */}
          <div className="bg-white rounded-2xl p-6 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-slate-100">
            <h4 className="text-sm font-black text-[#181E1C] uppercase tracking-wider mb-4">
              {t.unitEconomicsWaterfall}
            </h4>

            <div className="space-y-4 text-xs">
              {/* Gross Delivered Sales */}
              <div>
                <div className="flex justify-between font-extrabold mb-1">
                  <span className="text-slate-800">1. {t.netDeliveredRevenue}</span>
                  <span className="font-mono text-emerald-700">+{unitEconomicsMetrics.netDeliveredRevenue.toLocaleString()} EGP (100%)</span>
                </div>
                <div className="w-full h-2 bg-emerald-500 rounded-full" />
              </div>

              {/* COGS */}
              <div>
                <div className="flex justify-between font-bold mb-1 text-slate-600">
                  <span>2. {t.cogs} (Fabric & Production)</span>
                  <span className="font-mono text-red-600">
                    -{unitEconomicsMetrics.deliveredCOGS.toLocaleString()} EGP ({unitEconomicsMetrics.netDeliveredRevenue > 0 ? ((unitEconomicsMetrics.deliveredCOGS / unitEconomicsMetrics.netDeliveredRevenue) * 100).toFixed(1) : 0}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-400" style={{ width: `${Math.min(100, unitEconomicsMetrics.netDeliveredRevenue > 0 ? (unitEconomicsMetrics.deliveredCOGS / unitEconomicsMetrics.netDeliveredRevenue) * 100 : 0)}%` }} />
                </div>
              </div>

              {/* Ad Spend */}
              <div>
                <div className="flex justify-between font-bold mb-1 text-slate-600">
                  <span>3. {t.adSpend} (Meta, TikTok)</span>
                  <span className="font-mono text-purple-600">
                    -{unitEconomicsMetrics.totalAdSpend.toLocaleString()} EGP ({unitEconomicsMetrics.netDeliveredRevenue > 0 ? ((unitEconomicsMetrics.totalAdSpend / unitEconomicsMetrics.netDeliveredRevenue) * 100).toFixed(1) : 0}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500" style={{ width: `${Math.min(100, unitEconomicsMetrics.netDeliveredRevenue > 0 ? (unitEconomicsMetrics.totalAdSpend / unitEconomicsMetrics.netDeliveredRevenue) * 100 : 0)}%` }} />
                </div>
              </div>

              {/* Courier Delivery Fees */}
              <div>
                <div className="flex justify-between font-bold mb-1 text-slate-600">
                  <span>4. {t.courierFeesPaid}</span>
                  <span className="font-mono text-blue-600">
                    -{unitEconomicsMetrics.courierFeesPaid.toLocaleString()} EGP ({unitEconomicsMetrics.netDeliveredRevenue > 0 ? ((unitEconomicsMetrics.courierFeesPaid / unitEconomicsMetrics.netDeliveredRevenue) * 100).toFixed(1) : 0}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-400" style={{ width: `${Math.min(100, unitEconomicsMetrics.netDeliveredRevenue > 0 ? (unitEconomicsMetrics.courierFeesPaid / unitEconomicsMetrics.netDeliveredRevenue) * 100 : 0)}%` }} />
                </div>
              </div>

              {/* Return Losses */}
              <div>
                <div className="flex justify-between font-bold mb-1 text-slate-600">
                  <span>5. {t.returnLossesPaid}</span>
                  <span className="font-mono text-amber-600">
                    -{unitEconomicsMetrics.returnLosses.toLocaleString()} EGP ({unitEconomicsMetrics.netDeliveredRevenue > 0 ? ((unitEconomicsMetrics.returnLosses / unitEconomicsMetrics.netDeliveredRevenue) * 100).toFixed(1) : 0}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500" style={{ width: `${Math.min(100, unitEconomicsMetrics.netDeliveredRevenue > 0 ? (unitEconomicsMetrics.returnLosses / unitEconomicsMetrics.netDeliveredRevenue) * 100 : 0)}%` }} />
                </div>
              </div>

              {/* Final Net Pocket Margin */}
              <div className="pt-3 border-t border-slate-200">
                <div className="flex justify-between items-center text-sm font-black">
                  <span className="text-[#181E1C]">= {t.contributionMargin}</span>
                  <span className={`font-mono text-base ${unitEconomicsMetrics.netContributionMargin >= 0 ? 'text-[#597867]' : 'text-red-600'}`}>
                    {unitEconomicsMetrics.netContributionMargin >= 0 ? '+' : ''}{unitEconomicsMetrics.netContributionMargin.toLocaleString()} EGP ({unitEconomicsMetrics.contributionMarginPct}%)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'partners' && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-xl font-extrabold text-[#181E1C]">{t.partnersLedger || 'Partners Ledger'}</h2>
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={() => setIsAddingPartner(!isAddingPartner)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl bg-white border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
              >
                <Users size={16} /> {isAddingPartner ? t.cancel || 'Cancel' : 'Add Partner'}
              </button>
              <button
                onClick={() => setIsReportOpen(true)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl bg-[#597867] px-4 py-2.5 text-sm font-bold text-white shadow-md transition-colors hover:bg-[#465f52]"
              >
                <FileText size={16} /> {t.generateSettlementReport || 'Settlement Report'}
              </button>
            </div>
          </div>

          {/* Add Partner Form */}
          {isAddingPartner && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <form onSubmit={handleAddPartner} className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="flex-1 w-full">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Partner Name</label>
                  <input
                    type="text"
                    required
                    value={partnerName}
                    onChange={e => setPartnerName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full h-11 px-4 rounded-lg border border-slate-200 bg-slate-50 text-sm outline-none focus:border-[#597867] focus:ring-2 focus:ring-[#597867]/20"
                  />
                </div>
                <div className="flex-1 w-full">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Profit Share (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={partnerShare}
                    onChange={e => setPartnerShare(e.target.value)}
                    placeholder="e.g. 50"
                    className="w-full h-11 px-4 rounded-lg border border-slate-200 bg-slate-50 text-sm outline-none focus:border-[#597867] focus:ring-2 focus:ring-[#597867]/20"
                  />
                </div>
                <button type="submit" className="w-full sm:w-auto h-11 px-6 rounded-lg font-bold text-white bg-[#597867] hover:bg-[#465f52] shadow-sm transition-colors">
                  Save Partner
                </button>
              </form>
            </motion.div>
          )}

          {/* Partner Summaries */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {partners.map(partner => {
              const share = (netProfit * (Number(partner.profitSharePercentage) || 0)) / 100;
              const partnerWithdrawals = withdrawals.filter(w => w.partnerId === partner.id);
              const totalWithdrawn = partnerWithdrawals.reduce((sum, w) => sum + Number(w.amount), 0);
              const balance = share - totalWithdrawn;

              return (
                <div key={partner.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col gap-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4">
                    <button onClick={() => deletePartner(partner.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div>
                    <h3 className="font-extrabold text-[#181E1C] text-lg">{partner.name}</h3>
                    <p className="text-xs font-bold text-slate-400 mt-0.5">{partner.profitSharePercentage}% {t.profitShare || 'Profit Share'}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">{t.profitShare || 'Profit Share'}</p>
                      <p className="font-black text-[#597867] text-sm">{share.toLocaleString('en-EG')} EGP</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">{t.withdrawals || 'Withdrawals'}</p>
                      <p className="font-black text-red-500 text-sm">{totalWithdrawn.toLocaleString('en-EG')} EGP</p>
                    </div>
                    <div className="col-span-2 bg-slate-100 rounded-xl p-3 border border-slate-200">
                      <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">{t.netBalance || 'Net Balance'}</p>
                      <p className={`font-black text-lg ${balance >= 0 ? 'text-[#181E1C]' : 'text-red-500'}`}>
                        {balance.toLocaleString('en-EG')} EGP
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            {partners.length === 0 && (
              <div className="col-span-full p-8 text-center bg-white rounded-2xl border border-dashed border-slate-300 text-slate-500 text-sm font-semibold">
                No partners added yet. Add a partner to see their summary.
              </div>
            )}
          </div>

          {/* Withdrawals Section */}
          <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-slate-100 overflow-hidden mt-4">
            <div className="flex flex-col gap-4 border-b border-slate-100 px-7 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#181E1C]">
                  {t.withdrawals || 'Withdrawals'}
                </h2>
                <p className="mt-1 text-[12px] font-medium text-slate-400">
                  {withdrawals.length} records
                </p>
              </div>
              <button
                onClick={() => setIsAddingWithdrawal(!isAddingWithdrawal)}
                disabled={partners.length === 0}
                className="flex items-center justify-center gap-2 rounded-xl bg-[#181E1C] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-black whitespace-nowrap disabled:opacity-50"
              >
                <Plus size={16} strokeWidth={2.5} /> <span className="hidden sm:inline">{t.newWithdrawal || 'New Withdrawal'}</span>
              </button>
            </div>

            {isAddingWithdrawal && partners.length > 0 && (
              <div className="p-6 bg-slate-50 border-b border-slate-100">
                <form onSubmit={handleAddWithdrawal} className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 text-start">Partner</label>
                      <select
                        required
                        value={withdrawalPartnerId}
                        onChange={(e) => setWithdrawalPartnerId(e.target.value)}
                        className="w-full h-11 px-4 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:border-[#597867] focus:ring-2 focus:ring-[#597867]/20"
                      >
                        <option value="" disabled>Select Partner</option>
                        {partners.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 text-start">{t.amount || 'Amount'}</label>
                      <div className="relative">
                        <DollarSign className="absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                          type="number"
                          min="1"
                          required
                          value={withdrawalAmount}
                          onChange={(e) => setWithdrawalAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-full h-11 ps-10 pe-4 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:border-[#597867] focus:ring-2 focus:ring-[#597867]/20"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 text-start">{t.date || 'Date'}</label>
                      <div className="relative">
                        <Calendar className="absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                          type="date"
                          required
                          value={withdrawalDate}
                          onChange={(e) => setWithdrawalDate(e.target.value)}
                          className="w-full h-11 ps-10 pe-4 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:border-[#597867] focus:ring-2 focus:ring-[#597867]/20"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 text-start">{t.description || 'Description'}</label>
                      <div className="relative">
                        <FileText className="absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                          type="text"
                          required
                          value={withdrawalDescription}
                          onChange={(e) => setWithdrawalDescription(e.target.value)}
                          placeholder="e.g. Monthly Payout"
                          className="w-full h-11 ps-10 pe-4 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:border-[#597867] focus:ring-2 focus:ring-[#597867]/20"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 mt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingWithdrawal(false)}
                      className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors text-sm"
                    >
                      {t.cancel || 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-xl font-bold text-white bg-[#181E1C] hover:bg-black shadow-md transition-colors text-sm"
                    >
                      Save Withdrawal
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Desktop Withdrawals Table */}
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[800px] text-start border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-bold">
                    <th className="p-4 px-6 font-semibold text-start">{t.date || 'Date'}</th>
                    <th className="p-4 font-semibold text-start">Partner</th>
                    <th className="p-4 font-semibold text-start">{t.description || 'Description'}</th>
                    <th className="p-4 font-semibold text-start">{t.amount || 'Amount'}</th>
                    <th className="p-4 font-semibold px-6 text-end">{t.actions || 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="p-8 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                            <Wallet size={24} className="text-slate-400" />
                          </div>
                          <p className="text-[13px] font-semibold text-slate-500">No withdrawals found</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    withdrawals.map((w, index) => {
                      const partner = partners.find(p => p.id === w.partnerId);
                      return (
                        <motion.tr
                          key={w.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                        >
                          <td className="p-4 px-6 align-middle text-start">
                            <p className="font-extrabold text-[#181E1C]">{w.date}</p>
                          </td>
                          <td className="p-4 align-middle text-start">
                            <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
                              {partner ? partner.name : 'Unknown Partner'}
                            </span>
                          </td>
                          <td className="p-4 align-middle text-start">
                            <p className="font-semibold text-slate-700">{w.description}</p>
                          </td>
                          <td className="p-4 align-middle text-start">
                            <p className="font-black text-red-500">{Number(w.amount).toLocaleString('en-EG')} EGP</p>
                          </td>
                          <td className="p-4 align-middle px-6 text-end">
                            <button
                              onClick={() => deleteWithdrawal(w.id)}
                              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </motion.tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>


          </div>
        </div>
      )}

      {activeTab === 'reconciliation' && (
        <div className="flex flex-col gap-6 text-start">
          {/* Top Controls: Carrier & Batch Config & Upload */}
          <div className="bg-white rounded-2xl p-6 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-slate-100 flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">{t.courierReconciliation}</h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Match courier cash transfers and shipping fees against pending delivered orders.
                </p>
              </div>

              {reconcileSuccess && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold animate-pulse">
                  <CheckCircle2 size={16} />
                  <span>{t.settlementSuccess}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-100">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1.5">{t.selectCarrier}</label>
                <select
                  value={carrierName}
                  onChange={(e) => {
                    setCarrierName(e.target.value);
                    setBatchName(`${e.target.value}-${new Date().toISOString().slice(0, 10)}`);
                  }}
                  className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 outline-none focus:border-[#597867] focus:bg-white"
                >
                  <option value="Bosta">Bosta (بوسطة)</option>
                  <option value="Mylerz">Mylerz (مايلرز)</option>
                  <option value="Aramex">Aramex (أرامكس)</option>
                  <option value="J&T">J&T Express (جي أند تي)</option>
                  <option value="Quick">Quick Delivery</option>
                  <option value="Other">Other / يدوي</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1.5">Batch Name / اسم الدفعة</label>
                <input
                  type="text"
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 outline-none focus:border-[#597867] focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1.5">{t.uploadSettlementSheet}</label>
                <label className="w-full h-11 px-4 rounded-xl border-2 border-dashed border-slate-300 hover:border-[#597867] bg-slate-50 hover:bg-emerald-50/40 transition-colors flex items-center justify-center gap-2 cursor-pointer text-xs font-bold text-slate-600">
                  <UploadCloud size={18} className="text-[#597867]" />
                  <span className="truncate">{settlementFile || "Browse Excel / CSV"}</span>
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* If Settlement Data is Loaded */}
          {settlementData && (
            <div className="flex flex-col gap-6">
              {/* Summary Metric Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col gap-1">
                  <span className="text-[11px] font-bold uppercase text-slate-400">{t.matchedOrders}</span>
                  <span className="text-2xl font-black text-slate-900">
                    {settlementData.matched.length} <span className="text-xs text-slate-400 font-normal">/ {settlementData.matched.length + settlementData.unmatched.length}</span>
                  </span>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col gap-1">
                  <span className="text-[11px] font-bold uppercase text-slate-400">{t.expectedAmount}</span>
                  <span className="text-2xl font-black text-slate-700">
                    {settlementData.totalExpected.toLocaleString('en-EG')} <span className="text-xs font-normal">EGP</span>
                  </span>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col gap-1">
                  <span className="text-[11px] font-bold uppercase text-slate-400">{t.courierFee}</span>
                  <span className="text-2xl font-black text-red-600">
                    {settlementData.totalFees.toLocaleString('en-EG')} <span className="text-xs font-normal">EGP</span>
                  </span>
                </div>

                <div className="bg-emerald-50/80 rounded-2xl p-5 border border-emerald-200 shadow-sm flex flex-col gap-1">
                  <span className="text-[11px] font-bold uppercase text-emerald-800">{t.netPayout}</span>
                  <span className="text-2xl font-black text-emerald-700">
                    {settlementData.netPayout.toLocaleString('en-EG')} <span className="text-xs font-normal">EGP</span>
                  </span>
                </div>
              </div>

              {/* Unmatched Warnings Banner */}
              {settlementData.unmatched.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-amber-900 text-xs font-bold">
                    <AlertTriangle size={16} className="text-amber-600" />
                    <span>{settlementData.unmatched.length} {t.unmatchedOrders}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {settlementData.unmatched.slice(0, 20).map((u, i) => (
                      <span key={i} className="text-[10px] font-semibold bg-white border border-amber-300 text-amber-800 px-2 py-0.5 rounded-md">
                        {u.rawId} (Row #{u.rowIdx})
                      </span>
                    ))}
                    {settlementData.unmatched.length > 20 && (
                      <span className="text-[10px] font-bold text-amber-700 self-center">
                        +{settlementData.unmatched.length - 20} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Matched Orders Review Table */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    {t.matchedOrders} ({settlementData.matched.length})
                  </h4>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setSettlementData(null); setSettlementFile(null); }}
                      className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
                    >
                      {t.cancel}
                    </button>
                    <button
                      onClick={handleApplySettlement}
                      disabled={isReconciling || settlementData.matched.length === 0}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <CheckCircle2 size={16} />
                      <span>{isReconciling ? t.uploading || 'Applying...' : t.applySettlement}</span>
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  <table className="w-full text-xs text-start border-collapse">
                    <thead className="bg-slate-50 text-slate-500 font-bold sticky top-0 border-b border-slate-100">
                      <tr>
                        <th className="p-3 px-4 text-start">Order ID</th>
                        <th className="p-3 text-start">{t.customer}</th>
                        <th className="p-3 text-end">{t.expectedAmount}</th>
                        <th className="p-3 text-end">{t.collectedAmount}</th>
                        <th className="p-3 text-end">{t.courierFee}</th>
                        <th className="p-3 text-center">{t.feeVariance}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {settlementData.matched.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-3 px-4 font-bold text-slate-900">{item.displayId}</td>
                          <td className="p-3 font-semibold text-slate-700">{item.customerName}</td>
                          <td className="p-3 text-end font-semibold text-slate-600">{item.expectedAmount.toLocaleString('en-EG')} EGP</td>
                          <td className="p-3 text-end font-extrabold text-emerald-700">{item.collectedAmount.toLocaleString('en-EG')} EGP</td>
                          <td className="p-3 text-end font-semibold text-red-600">-{item.courierFee.toLocaleString('en-EG')} EGP</td>
                          <td className="p-3 text-center">
                            {item.variance === 0 ? (
                              <span className="text-[10px] font-bold text-emerald-600">✓ Exact</span>
                            ) : item.variance < 0 ? (
                              <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                                {item.variance} EGP
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                +{item.variance} EGP
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {!settlementData && (
            <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-200 flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <FileSpreadsheet size={28} />
              </div>
              <p className="text-sm font-bold text-slate-700">{t.noSettlementData}</p>
              <p className="text-xs text-slate-400 max-w-sm">
                {t.dropSettlementFile}
              </p>
            </div>
          )}
        </div>
      )}

      <SettlementReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        netProfit={netProfit}
      />
    </div>
  );
}