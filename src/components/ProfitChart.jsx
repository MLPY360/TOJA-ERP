import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '../store/useStore'
import { translations } from '../translations'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-5 py-3.5 shadow-lg">
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </p>
      {payload.map((entry, i) => (
        <p key={i} className="text-[13px] font-bold" style={{ color: entry.color }}>
          {entry.name}: {Number(entry.value).toLocaleString('en-EG')} EGP
        </p>
      ))}
    </div>
  )
}

export default function ProfitChart({ products }) {
  const { language } = useStore()
  const t = translations[language]

  const chartData = useMemo(() => {
    return products.map((p) => {
      const totalSold = (p.sold?.M || 0) + (p.sold?.L || 0) + (p.sold?.XL || 0) + (p.sold?.XXL || 0)
      return {
        name: p.name.length > 16 ? p.name.substring(0, 16) + '…' : p.name,
        revenue: totalSold * p.sellingPrice,
        profit: totalSold * (p.sellingPrice - p.costPrice),
      }
    })
  }, [products])

  return (
    <motion.div
      dir={language === 'ar' ? 'rtl' : 'ltr'}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="rounded-2xl border border-slate-200/80 bg-white p-7 text-start"
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      {/* Header */}
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-[13px] font-bold uppercase tracking-[0.08em] text-toja-charcoal">
            {t.revenueProfitByProduct}
          </h3>
          <p className="mt-1 text-[12px] font-medium text-slate-400">
            {t.performanceAcrossInventory}
          </p>
        </div>
        <div className="flex items-center gap-5">
          <span className="flex items-center gap-2 text-[12px] font-medium text-slate-400">
            <span className="inline-block h-2 w-6 rounded-full bg-toja-green/25" />
            {t.totalRevenue}
          </span>
          <span className="flex items-center gap-2 text-[12px] font-medium text-slate-400">
            <span className="inline-block h-2 w-6 rounded-full bg-toja-green" />
            {t.netProfit}
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
            <defs>
              <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#597867" stopOpacity={0.12} />
                <stop offset="100%" stopColor="#597867" stopOpacity={0.01} />
              </linearGradient>
              <linearGradient id="gradProfit" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#597867" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#597867" stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: '#94a3b8', fontFamily: 'Montserrat', fontWeight: 500 }}
              axisLine={{ stroke: '#e2e8f0' }}
              tickLine={false}
              dy={8}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#94a3b8', fontFamily: 'Montserrat', fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              dx={-4}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#597867', strokeWidth: 1, strokeDasharray: '4 4' }} />
            <Area
              type="monotone"
              dataKey="revenue"
              name={t.totalRevenue}
              stroke="#597867"
              strokeWidth={1.5}
              strokeOpacity={0.35}
              fill="url(#gradRevenue)"
            />
            <Area
              type="monotone"
              dataKey="profit"
              name={t.netProfit}
              stroke="#597867"
              strokeWidth={2.5}
              fill="url(#gradProfit)"
              dot={false}
              activeDot={{ r: 5, fill: '#597867', strokeWidth: 2, stroke: '#fff' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  )
}
