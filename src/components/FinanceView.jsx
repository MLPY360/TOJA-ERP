import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Wallet, DollarSign, Calendar, Tag, Search, FileText } from 'lucide-react';
import { useStore } from '../store/useStore';
import { translations } from '../translations';

export default function FinanceView() {
  const { expenses, addExpense, deleteExpense, language } = useStore();
  const t = translations[language];

  const [isAdding, setIsAdding] = useState(false);
  const [category, setCategory] = useState('Ads');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const totalExpensesSum = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);

  const filteredExpenses = expenses.filter(exp => {
    const q = searchQuery.toLowerCase();
    return exp.description.toLowerCase().includes(q) || exp.category.toLowerCase().includes(q);
  });

  const handleAddExpense = (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;
    addExpense({
      category,
      amount: Number(amount),
      date,
      description
    });
    setIsAdding(false);
    setAmount('');
    setDescription('');
    setDate(new Date().toISOString().split('T')[0]);
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

  return (
    <div className="flex flex-col gap-6">
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
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-[13px] font-medium text-[#181E1C] placeholder:text-slate-400 outline-none transition-all focus:border-[#597867] focus:bg-white focus:ring-2 focus:ring-[#597867]/10"
              />
            </div>
            <button
              onClick={() => setIsAdding(!isAdding)}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#597867] px-4 py-2.5 text-sm font-bold text-white shadow-md transition-colors hover:bg-[#465f52] whitespace-nowrap"
            >
              <Plus size={16} strokeWidth={2.5} /> <span className="hidden sm:inline">{t.addExpense || 'Add Expense'}</span>
            </button>
          </div>
        </div>

        {isAdding && (
          <div className="p-6 bg-slate-50 border-b border-slate-100">
            <form onSubmit={handleAddExpense} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 text-start">Category</label>
                  <div className="relative">
                    <Tag className="absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
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
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
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
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
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
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="..."
                      className="w-full h-11 ps-10 pe-4 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:border-[#597867] focus:ring-2 focus:ring-[#597867]/20"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
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

        <div className="overflow-x-auto w-full">
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
      </div>
    </div>
  );
}
