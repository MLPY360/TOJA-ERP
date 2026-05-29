import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Wallet, DollarSign, Calendar, Tag, Search, FileText, Users, Download } from 'lucide-react';
import { useStore } from '../store/useStore';
import { translations } from '../translations';
import SettlementReportModal from './SettlementReportModal';

export default function FinanceView() {
  const { 
    expenses, addExpense, deleteExpense, language, 
    products, orders, 
    partners, addPartner, updatePartner, deletePartner,
    withdrawals, addWithdrawal, deleteWithdrawal
  } = useStore();
  const t = translations[language];

  const [activeTab, setActiveTab] = useState('expenses'); // 'expenses' or 'partners'

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
          if (product) {
            orderCost += product.costPrice * item.qty;
            itemsRevenue += product.sellingPrice * item.qty;
          }
        });
        totalProfit += (itemsRevenue - orderCost);
      } else if (order.status === 'Returned') {
         returnLosses += Number(order.shippingFee || 0);
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
      <div className="flex items-center gap-2 p-1.5 bg-slate-200/50 rounded-xl w-full sm:w-max">
        <button
          onClick={() => setActiveTab('expenses')}
          className={`flex-1 sm:px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'expenses' ? 'bg-white text-[#181E1C] shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {t.expenseTracker || 'Expense Tracker'}
        </button>
        <button
          onClick={() => setActiveTab('partners')}
          className={`flex-1 sm:px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'partners' ? 'bg-white text-[#181E1C] shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
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
            <div className="hidden md:block overflow-x-auto w-full">
              <table className="w-full text-start border-collapse whitespace-nowrap">
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

            {/* Mobile Cards */}
            <div className="md:hidden flex flex-col p-4 gap-4 bg-slate-50 border-t border-slate-100">
              {filteredExpenses.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-2xl shadow-sm border border-slate-100">
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                      <Wallet size={24} className="text-slate-400" />
                    </div>
                    <p className="text-[13px] font-semibold text-slate-500">No expenses found</p>
                  </div>
                </div>
              ) : (
                filteredExpenses.map((exp) => (
                  <div key={exp.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col gap-3">
                    <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="font-extrabold text-[#181E1C]">{exp.date}</h3>
                        <span className="inline-flex mt-1 items-center justify-center px-2 py-1 rounded bg-slate-100 text-slate-600 text-[10px] font-bold">
                          {getCategoryTranslation(exp.category)}
                        </span>
                      </div>
                      <div className="text-end">
                        <p className="font-black text-red-500">{Number(exp.amount).toLocaleString('en-EG')} EGP</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="font-semibold text-slate-700 text-sm">{exp.description}</p>
                      <button
                        onClick={() => deleteExpense(exp.id)}
                        className="p-2.5 text-slate-400 hover:text-red-500 bg-slate-50 rounded-xl transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
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
            <div className="hidden md:block overflow-x-auto w-full">
              <table className="w-full text-start border-collapse whitespace-nowrap">
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

            {/* Mobile Cards for Withdrawals */}
            <div className="md:hidden flex flex-col p-4 gap-4 bg-slate-50 border-t border-slate-100">
              {withdrawals.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-2xl shadow-sm border border-slate-100">
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                      <Wallet size={24} className="text-slate-400" />
                    </div>
                    <p className="text-[13px] font-semibold text-slate-500">No withdrawals found</p>
                  </div>
                </div>
              ) : (
                withdrawals.map((w) => {
                  const partner = partners.find(p => p.id === w.partnerId);
                  return (
                    <div key={w.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col gap-3">
                      <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                        <div>
                          <h3 className="font-extrabold text-[#181E1C]">{w.date}</h3>
                          <span className="inline-flex mt-1 items-center justify-center px-2 py-1 rounded bg-slate-100 text-slate-600 text-[10px] font-bold">
                            {partner ? partner.name : 'Unknown Partner'}
                          </span>
                        </div>
                        <div className="text-end">
                          <p className="font-black text-red-500">{Number(w.amount).toLocaleString('en-EG')} EGP</p>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="font-semibold text-slate-700 text-sm">{w.description}</p>
                        <button
                          onClick={() => deleteWithdrawal(w.id)}
                          className="p-2.5 text-slate-400 hover:text-red-500 bg-slate-50 rounded-xl transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
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
