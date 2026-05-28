import React from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { translations } from '../translations';

export default function ActivityLogs({ onClose }) {
  const { activityLogs: logs, language } = useStore();
  const t = translations[language];

  return (
    <div dir={language === 'ar' ? 'rtl' : 'ltr'} className="fixed inset-0 z-50 flex justify-end bg-slate-900/20 backdrop-blur-sm">
      <motion.div
        initial={{ x: language === 'ar' ? '-100%' : '100%' }}
        animate={{ x: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="w-full max-w-md h-full bg-white shadow-2xl flex flex-col border-l border-slate-100"
      >
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
          <div>
            <h2 className="text-lg font-bold text-[#181E1C] text-start">{t.systemAuditLogs}</h2>
            <p className="text-xs text-slate-500 mt-1 text-start">{t.trackInventoryChanges}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 bg-[#F8FAFC]">
          {logs.length === 0 ? (
            <p className="text-sm text-slate-400 text-center mt-10">No activities recorded yet.</p>
          ) : (
            logs.map(log => (
              <div key={log.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-[#597867] bg-[#597867]/10 px-2 py-1 rounded-md">
                    {log.user}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-slate-600 font-medium mt-2 text-start">{log.action}</p>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}