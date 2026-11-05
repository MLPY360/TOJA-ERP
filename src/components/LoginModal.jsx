import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, CheckCircle2, Loader2 } from 'lucide-react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import { useStore } from '../store/useStore';
import { translations } from '../translations';
import { isAuthorizedStaff } from '../utils/authConfig';

export default function LoginModal() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [resetStatus, setResetStatus] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { login, language } = useStore((state) => state);
  const t = translations[language] || {};
  const isArabic = language === 'ar';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResetStatus('');
    setIsLoading(true);
    const result = await login(email, password);
    setIsLoading(false);
    if (!result?.success) {
      setError(t.invalidEmailPassword || (isArabic ? 'بيانات الدخول غير صحيحة' : 'Invalid email or password'));
    }
  };

  const handleForgotPassword = async () => {
    setError('');
    setResetStatus('');

    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail) {
      setError(
        isArabic
          ? 'يرجى إدخال البريد الإلكتروني أولاً لاستلام رابط إعادة تعيين كلمة المرور.'
          : 'Please enter your email address first to receive the reset link.'
      );
      return;
    }

    // Verify authorized staff whitelist before attempting reset
    if (!isAuthorizedStaff(cleanEmail)) {
      setError(
        isArabic
          ? 'هذا البريد الإلكتروني غير مصرح له بالوصول إلى نظام إدارة TOJA.'
          : 'This email is not authorized for the TOJA ERP system.'
      );
      return;
    }

    setIsResetting(true);
    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      setResetStatus(
        isArabic
          ? 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني.'
          : 'Password reset link has been sent to your email.'
      );
    } catch (err) {
      console.error('Password reset failed:', err);
      if (err.code === 'auth/user-not-found') {
        setError(
          isArabic
            ? 'لا يوجد حساب مسجل بهذا البريد الإلكتروني.'
            : 'No registered user found with this email.'
        );
      } else if (err.code === 'auth/too-many-requests') {
        setError(
          isArabic
            ? 'تم إرسال طلبات كثيرة، يرجى المحاولة بعد قليل.'
            : 'Too many requests. Please try again later.'
        );
      } else {
        setError(
          isArabic
            ? 'تعذر إرسال رابط إعادة التعيين، يرجى التأكد من البريد.'
            : 'Could not send reset link. Please check your email.'
        );
      }
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div dir={isArabic ? 'rtl' : 'ltr'} className="fixed inset-0 bg-[#F8FAFC] z-[60] flex flex-col items-center justify-center p-4">
      <motion.div
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8 border border-slate-100 flex flex-col"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <img src="/logo.png" alt="TOJA" className="h-10 w-auto mx-auto mb-4 object-contain" />
        <h2 className="text-2xl font-extrabold text-center text-[#181E1C] mb-2">{t.welcomeBack || (isArabic ? 'مرحباً بعودتك' : 'Welcome Back')}</h2>
        <p className="text-sm text-center text-slate-500 mb-8">
          {t.signInAccess || (isArabic ? 'قم بتسجيل الدخول للوصول إلى نظام إدارة TOJA' : 'Sign in to access the TOJA ERP System')}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Email Input */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 text-start">
              {t.email || (isArabic ? 'البريد الإلكتروني' : 'Email')}
            </label>
            <div className="relative">
              <Mail className="absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); setResetStatus(''); }}
                placeholder={t.email || 'name@toja.com'}
                className={`w-full h-11 ps-10 pe-4 rounded-lg border bg-slate-50 text-sm outline-none transition-all ${
                  error ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 text-red-900'
                        : 'border-slate-200 focus:bg-white focus:ring-2 focus:ring-[#597867]/20 focus:border-[#597867] text-[#181E1C]'
                }`}
              />
            </div>
          </div>

          {/* Password Input with Forgot Password Link */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider text-start">
                {t.password || (isArabic ? 'كلمة المرور' : 'Password')}
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={isResetting || isLoading}
                className="text-xs font-bold text-[#597867] hover:text-[#465f52] hover:underline transition-colors cursor-pointer flex items-center gap-1"
              >
                {isResetting && <Loader2 size={12} className="animate-spin text-[#597867]" />}
                <span>
                  {isResetting
                    ? (isArabic ? 'جاري الإرسال...' : 'Sending...')
                    : (isArabic ? 'نسيت كلمة المرور؟' : 'Forgot Password?')}
                </span>
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); setResetStatus(''); }}
                placeholder={t.password || '••••••••'}
                className={`w-full h-11 ps-10 pe-4 rounded-lg border bg-slate-50 text-sm outline-none transition-all ${
                  error ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 text-red-900'
                        : 'border-slate-200 focus:bg-white focus:ring-2 focus:ring-[#597867]/20 focus:border-[#597867] text-[#181E1C]'
                }`}
              />
            </div>
          </div>

          {/* Error Message */}
          {error && <p className="text-xs font-semibold text-red-500 text-center leading-snug">{error}</p>}

          {/* Password Reset Confirmation Banner */}
          {resetStatus && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-bold text-center flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>{resetStatus}</span>
            </motion.div>
          )}

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={isLoading || isResetting}
            className={`w-full h-12 mt-2 rounded-lg text-sm font-bold text-white transition-colors cursor-pointer ${
              isLoading || isResetting ? 'bg-slate-400 cursor-not-allowed' : 'bg-[#181E1C] hover:bg-black'
            }`}
          >
            {isLoading ? (isArabic ? 'جاري تسجيل الدخول...' : 'Signing in...') : (t.signIn || (isArabic ? 'تسجيل الدخول' : 'Sign In'))}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
