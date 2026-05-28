import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock } from 'lucide-react';
import { useStore } from '../store/useStore';
import { translations } from '../translations';

export default function LoginModal() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, language } = useStore((state) => state);
  const t = translations[language];

  const handleSubmit = (e) => {
    e.preventDefault();
    const success = login(email, password);
    if (!success) {
      setError(t.invalidEmailPassword);
    }
  };

  return (
    <div dir={language === 'ar' ? 'rtl' : 'ltr'} className="fixed inset-0 bg-[#F8FAFC] z-[60] flex flex-col items-center justify-center p-4">
      <motion.div
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8 border border-slate-100 flex flex-col"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <img src="/logo.png" alt="TOJA" className="h-10 w-auto mx-auto mb-4 object-contain" />
        <h2 className="text-2xl font-extrabold text-center text-[#181E1C] mb-2">{t.welcomeBack}</h2>
        <p className="text-sm text-center text-slate-500 mb-8">
          {t.signInAccess}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 text-start">{t.email}</label>
            <div className="relative">
              <Mail className="absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                placeholder={t.email}
                className={`w-full h-11 ps-10 pe-4 rounded-lg border bg-slate-50 text-sm outline-none transition-all ${
                  error ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 text-red-900'
                        : 'border-slate-200 focus:bg-white focus:ring-2 focus:ring-[#597867]/20 focus:border-[#597867] text-[#181E1C]'
                }`}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 text-start">{t.password}</label>
            <div className="relative">
              <Lock className="absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                placeholder={t.password}
                className={`w-full h-11 ps-10 pe-4 rounded-lg border bg-slate-50 text-sm outline-none transition-all ${
                  error ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 text-red-900'
                        : 'border-slate-200 focus:bg-white focus:ring-2 focus:ring-[#597867]/20 focus:border-[#597867] text-[#181E1C]'
                }`}
              />
            </div>
          </div>

          {error && <p className="text-xs font-semibold text-red-500 text-center">{error}</p>}

          <button
            type="submit"
            className="w-full h-12 mt-2 rounded-lg text-sm font-bold text-white bg-[#181E1C] hover:bg-black transition-colors"
          >
            {t.signIn}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
