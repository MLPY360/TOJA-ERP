import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, FileText, CheckCircle2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useStore } from '../store/useStore';
import { translations } from '../translations';

export default function SettlementReportModal({ isOpen, onClose, netProfit }) {
  const { partners, withdrawals, language } = useStore();
  const t = translations[language];

  const reportData = useMemo(() => {
    return partners.map(partner => {
      const share = (netProfit * (Number(partner.profitSharePercentage) || 0)) / 100;
      const partnerWithdrawals = withdrawals.filter(w => w.partnerId === partner.id);
      const totalWithdrawn = partnerWithdrawals.reduce((sum, w) => sum + Number(w.amount), 0);
      const balance = share - totalWithdrawn;

      return {
        ...partner,
        share,
        totalWithdrawn,
        balance
      };
    });
  }, [partners, withdrawals, netProfit]);

  const handleExport = () => {
    const exportData = reportData.map(p => ({
      "Partner Name": p.name,
      "Profit Share (%)": `${p.profitSharePercentage}%`,
      "Profit Share (EGP)": p.share,
      "Total Withdrawn (EGP)": p.totalWithdrawn,
      "Net Balance (EGP)": p.balance
    }));

    exportData.push({
      "Partner Name": "TOTAL SYSTEM PROFIT",
      "Profit Share (%)": "100%",
      "Profit Share (EGP)": netProfit,
      "Total Withdrawn (EGP)": "",
      "Net Balance (EGP)": ""
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Settlement Report");
    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `TOJA_Settlement_Report_${dateStr}.xlsx`);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div dir={language === 'ar' ? 'rtl' : 'ltr'} className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl shadow-xl w-[95%] md:w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-100"
        >
          <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#597867]/10 text-[#597867] rounded-xl">
                <FileText size={20} />
              </div>
              <h2 className="text-xl font-extrabold text-[#181E1C]">{t.settlementReport || 'Settlement Report'}</h2>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6 text-center shadow-sm">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">True Net Profit</p>
              <p className="text-3xl font-black text-[#597867]">{netProfit.toLocaleString('en-EG')} EGP</p>
            </div>

            <div className="flex flex-col gap-4">
              {reportData.map((partner) => (
                <div key={partner.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                  <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-100">
                    <h3 className="font-extrabold text-lg text-[#181E1C]">{partner.name}</h3>
                    <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">
                      {partner.profitSharePercentage}%
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{t.profitShare || 'Profit Share'}</p>
                      <p className="font-bold text-[#181E1C]">{partner.share.toLocaleString('en-EG')} EGP</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{t.withdrawals || 'Withdrawals'}</p>
                      <p className="font-bold text-red-500">{partner.totalWithdrawn.toLocaleString('en-EG')} EGP</p>
                    </div>
                    <div className="col-span-2 md:col-span-1 bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                      <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">{t.payout || 'Payout'}</p>
                      <p className={`font-black ${partner.balance >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                        {partner.balance.toLocaleString('en-EG')} EGP
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 border-t border-slate-100 bg-white flex justify-end gap-3 shrink-0">
            <button onClick={onClose} className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors text-sm">
              {t.close || 'Close'}
            </button>
            <button onClick={handleExport} className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-white bg-[#597867] hover:bg-[#465f52] shadow-md transition-colors text-sm">
              <Download size={16} strokeWidth={2.5} /> {t.export || 'Export Excel'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
