import React from 'react';
import { motion } from 'framer-motion';
import { Target, CheckCircle2, AlertCircle } from 'lucide-react';
import { useStore } from '../store/useStore';
import { translations } from '../translations';

export default function BreakEvenCard({ breakEvenPoint, deliveredItemsSold }) {
  const { language } = useStore();
  const t = translations[language];

  const targetAchieved = deliveredItemsSold >= breakEvenPoint;
  const percentage = breakEvenPoint > 0 ? Math.min((deliveredItemsSold / breakEvenPoint) * 100, 100) : 100;
  const remaining = Math.max(breakEvenPoint - deliveredItemsSold, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-6 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-slate-100 flex flex-col w-full h-full"
    >
      <div className="flex justify-between items-center mb-6">
        <h3 className="uppercase text-xs font-bold text-slate-500 tracking-wider">
          {t.breakEvenAnalysis || 'Break-even Analysis'}
        </h3>
        <div className="p-2.5 rounded-full bg-blue-500/10 text-blue-500">
          <Target size={18} strokeWidth={2.5} />
        </div>
      </div>

      <div className="flex flex-col gap-5 flex-1">
        <div className="flex justify-between items-end">
          <div>
            <p className="text-3xl font-black text-[#181E1C]">{breakEvenPoint}</p>
            <p className="text-xs font-bold text-slate-400 mt-1">{t.itemsNeededBreakEven || 'Items needed to break even'}</p>
          </div>
          <div className="text-end">
            <p className="text-xl font-bold text-blue-500">{deliveredItemsSold}</p>
            <p className="text-xs font-bold text-slate-400 mt-1">{t.itemsSold || 'Items Sold'}</p>
          </div>
        </div>

        <div className="relative w-full h-3 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className={`absolute top-0 start-0 h-full rounded-full ${targetAchieved ? 'bg-emerald-500' : 'bg-blue-500'}`}
          />
        </div>

        <div className={`flex items-start gap-2 p-3 rounded-xl border ${targetAchieved ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-blue-50 border-blue-100 text-blue-700'}`}>
          {targetAchieved ? (
            <CheckCircle2 size={18} className="shrink-0 mt-0.5 text-emerald-500" />
          ) : (
            <AlertCircle size={18} className="shrink-0 mt-0.5 text-blue-500" />
          )}
          <p className="text-sm font-bold leading-tight">
            {targetAchieved 
              ? (t.targetAchieved || 'Target Achieved! You are now making pure profit.') 
              : `${remaining} ${t.remainingToBreakEven || 'Remaining to break even'}`}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
