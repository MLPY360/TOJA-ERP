import React from 'react';
import { motion } from 'framer-motion';
import { Package, ShoppingCart, DollarSign, TrendingUp } from 'lucide-react';

const icons = {
  box: Package,
  cart: ShoppingCart,
  dollar: DollarSign,
  chart: TrendingUp
};

export default function DashboardCard({ title, value, icon, index }) {
  const Icon = icons[icon] || Package;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      whileHover={{ scale: 1.02 }}
      className="bg-white rounded-2xl p-6 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-slate-100 flex flex-col justify-between h-32 cursor-pointer"
    >
      <div className="flex justify-between items-center">
        <h3 className="uppercase text-xs font-bold text-slate-500 tracking-wider">{title}</h3>
        <div className="p-2.5 rounded-full bg-[#597867]/10 text-[#597867]">
          <Icon size={18} strokeWidth={2.5} />
        </div>
      </div>
      <div className="text-3xl font-extrabold text-[#181E1C] mt-4">{value}</div>
    </motion.div>
  );
}
