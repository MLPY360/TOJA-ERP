import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Download, ClipboardList, LogOut, Package, BarChart3, LayoutDashboard, Menu, Globe, Wallet, ShieldAlert, Users } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useStore, calculateBatchCapitalMetrics, getAvailableStock, getProductSizes } from './store/useStore';
import { translations } from './translations';
import LoginModal from './components/LoginModal';
import ActivityLogs from './components/ActivityLogs';
import DashboardCard from './components/DashboardCard';
import ProfitChart from './components/ProfitChart';
import BreakEvenCard from './components/BreakEvenCard';
import InventoryTable from './components/InventoryTable';
import AddProductModal from './components/AddProductModal';
import OrdersView from './components/OrdersView';
import AddOrderModal from './components/AddOrderModal';
import FinanceView from './components/FinanceView';
import CustomersView from './components/CustomersView';

function formatEGP(amount) {
  const safeAmount = Number(amount) || 0;
  return safeAmount.toLocaleString('en-EG') + ' EGP';
}

const getSum = (obj) => Object.values(obj || {}).reduce((a, b) => a + b, 0);

export default function App() {
  const { currentUser, logout, products, orders, expenses, language, toggleLanguage, userRole, setUserRole } = useStore();
  const t = translations[language];

  useEffect(() => {
    useStore.getState().initAuthListener();
  }, []);

  const [showLogs, setShowLogs] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // If user switches to operations role while in finance or customers tab, redirect to dashboard
  useEffect(() => {
    if (userRole === 'operations' && (activeTab === 'finance' || activeTab === 'customers')) {
      setActiveTab('dashboard');
    }
  }, [userRole, activeTab]);

  const metrics = useMemo(() => {
    let totalInStock = 0;
    let totalSoldUnits = 0;
    let totalRevenue = 0;
    let totalProfit = 0;
    let cashWithShipping = 0;
    let cashInTreasury = 0;
    let returnLosses = 0;
    let totalExpensesSum = 0;
    let deliveredItemsSold = 0;
    let sumProfitMargin = 0;

    products.forEach(p => {
      const pSizes = getProductSizes(p);
      let pAvailable = 0;
      let pSold = 0;

      pSizes.forEach(sz => {
        pAvailable += getAvailableStock(p, sz);
        const s = Number(p.sold?.[sz] ?? p.sold?.[sz.toUpperCase()] ?? p[`sold${sz}`] ?? 0);
        pSold += Math.max(0, s);
      });

      totalInStock += pAvailable;
      totalSoldUnits += pSold;
      sumProfitMargin += (Number(p.sellingPrice) || 0) - (Number(p.costPrice) || 0);
    });

    orders.forEach(order => {
      if (order.status === 'Delivered - Collected' || order.status === 'Delivered - Pending Cash' || order.status === 'Delivered') {
        let orderCost = 0;
        let itemsRevenue = 0;

        order.items?.forEach(item => {
          const product = products.find(p => p.id === item.productId);
          const itemQty = item.qty || item.quantity || 1;
          if (product) {
            orderCost += (Number(product.costPrice) || 0) * itemQty;
            itemsRevenue += (Number(product.sellingPrice) || 0) * itemQty;
          }
          deliveredItemsSold += itemQty;
        });

        const discountAmt = Number(order.discount?.amount || 0);
        const netItemsRevenue = Math.max(0, itemsRevenue - discountAmt);

        totalRevenue += netItemsRevenue;
        totalProfit += (netItemsRevenue - orderCost);

        const orderTotal = order.total ?? order.totals?.grandTotal ?? 0;

        if (order.status === 'Delivered - Pending Cash') {
          cashWithShipping += orderTotal;
        } else if (order.status === 'Delivered - Collected' || order.status === 'Delivered') {
          cashInTreasury += orderTotal;
        }
      } else if (order.status === 'Returned') {
        returnLosses += Number(order.shippingFee ?? order.totals?.shipping ?? 0);
      }
    });

    expenses.forEach(exp => {
      totalExpensesSum += Number(exp.amount) || 0;
    });

    totalProfit -= returnLosses;
    totalProfit -= totalExpensesSum;

    const avgMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0;
    const avgProfitMarginPerItem = products.length > 0 ? (sumProfitMargin / products.length) : 0;
    const breakEvenPoint = avgProfitMarginPerItem > 0 ? Math.ceil(totalExpensesSum / avgProfitMarginPerItem) : 0;

    const batchMetrics = calculateBatchCapitalMetrics(products, orders, expenses);

    return { totalInStock, totalSoldUnits, totalRevenue, totalProfit, cashWithShipping, cashInTreasury, returnLosses, avgMargin, totalExpensesSum, deliveredItemsSold, breakEvenPoint, batchMetrics };
  }, [products, orders, expenses]);

  const handleEdit = (product) => {
    setEditProduct(product);
    setModalOpen(true);
  };

  const handleAdd = () => {
    setEditProduct(null);
    setModalOpen(true);
  };

  if (!currentUser) {
    return <LoginModal />;
  }

  const handleExport = () => {
    const isOps = userRole === 'operations';
    const data = products.map(p => {
      const stockM = getAvailableStock(p, 'M');
      const stockL = getAvailableStock(p, 'L');
      const stockXL = getAvailableStock(p, 'XL');
      const stockXXL = getAvailableStock(p, 'XXL');

      const pSizes = getProductSizes(p);
      const totalSold = pSizes.reduce((sum, sz) => {
        const s = Number(p.sold?.[sz] ?? p.sold?.[sz.toUpperCase()] ?? p[`sold${sz}`] ?? 0);
        return sum + Math.max(0, s);
      }, 0);
      const rev = totalSold * (Number(p.sellingPrice) || 0);
      const prof = totalSold * ((Number(p.sellingPrice) || 0) - (Number(p.costPrice) || 0));

      const row = {
        "Product Name": p.name,
        "SKU": p.sku,
        "Stock (M)": stockM,
        "Stock (L)": stockL,
        "Stock (XL)": stockXL,
        "Stock (XXL)": stockXXL,
        "Selling Price (EGP)": p.sellingPrice,
        "Total Sold": totalSold
      };

      if (!isOps) {
        row["Cost Price (EGP)"] = p.costPrice;
        row["Total Revenue (EGP)"] = rev;
        row["Total Profit (EGP)"] = prof;
      }

      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "TOJA Inventory");
    XLSX.writeFile(workbook, `TOJA_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <>
      <div dir={language === 'ar' ? 'rtl' : 'ltr'} className="flex h-screen w-full relative overflow-hidden bg-slate-50">
        {/* Animated Aurora Background */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <motion.div
            animate={{ x: [0, 100, -50, 0], y: [0, -50, 50, 0] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute -top-[20%] -left-[10%] w-[50vw] h-[50vw] rounded-full bg-blue-200/30 blur-[120px]"
          />
          <motion.div
            animate={{ x: [0, -100, 50, 0], y: [0, 100, -50, 0] }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="absolute top-[20%] right-[10%] w-[40vw] h-[40vw] rounded-full bg-[#597867]/20 blur-[120px]"
          />
          <motion.div
            animate={{ scale: [1, 1.1, 0.9, 1] }}
            transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
            className="absolute -bottom-[20%] left-[20%] w-[60vw] h-[60vw] rounded-full bg-slate-300/30 blur-[120px]"
          />
        </div>

        {/* Glassmorphism Wrapper */}
        <div className="relative z-10 flex h-full w-full bg-white/40 backdrop-blur-2xl pb-0">
          {/* Sidebar Overlay for Mobile */}
          {isMobileMenuOpen && (
            <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
          )}

          <aside className={`fixed inset-y-0 left-0 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-300 ease-in-out bg-[#181E1C] w-64 text-white flex-shrink-0 flex flex-col justify-between z-50`}>
            <div>
              <div className="flex items-center gap-3.5 px-6 py-8">
                <img src="/logo.png" alt="TOJA" className="h-8 w-auto object-contain invert brightness-0" />
                <div>
                  <h1 className="text-lg font-extrabold tracking-tight text-white">TOJA</h1>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50">
                    Inventory System
                  </p>
                </div>
              </div>
              <nav className="mt-4 px-4 flex flex-col gap-2">
                <div
                  onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }}
                  className={`px-4 py-3 rounded-xl flex items-center gap-3 text-sm font-semibold cursor-pointer transition-colors ${activeTab === 'dashboard' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/80 hover:bg-white/5'}`}
                >
                  <LayoutDashboard size={18} strokeWidth={2} /> {t.dashboard}
                </div>
                <div
                  onClick={() => { setActiveTab('orders'); setIsMobileMenuOpen(false); }}
                  className={`px-4 py-3 rounded-xl flex items-center gap-3 text-sm font-semibold cursor-pointer transition-colors ${activeTab === 'orders' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/80 hover:bg-white/5'}`}
                >
                  <Package size={18} strokeWidth={2} /> {t.orders}
                </div>
                {userRole !== 'operations' && (
                  <div
                    onClick={() => { setActiveTab('customers'); setIsMobileMenuOpen(false); }}
                    className={`px-4 py-3 rounded-xl flex items-center gap-3 text-sm font-semibold cursor-pointer transition-colors ${activeTab === 'customers' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/80 hover:bg-white/5'}`}
                  >
                    <Users size={18} strokeWidth={2} /> {t.customers || 'Customers'}
                  </div>
                )}
                {userRole !== 'operations' && (
                  <div
                    onClick={() => { setActiveTab('finance'); setIsMobileMenuOpen(false); }}
                    className={`px-4 py-3 rounded-xl flex items-center gap-3 text-sm font-semibold cursor-pointer transition-colors ${activeTab === 'finance' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/80 hover:bg-white/5'}`}
                  >
                    <Wallet size={18} strokeWidth={2} /> {t.finance || 'Finance'}
                  </div>
                )}
              </nav>
            </div>

            {/* Sidebar Footer with Role Switcher */}
            <div className="p-5 border-t border-white/10">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div>
                  <p className="text-[10px] uppercase font-bold text-white/40">{t.loggedInAs}</p>
                  <p className="text-sm font-bold truncate text-white">{currentUser.name}</p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                  userRole === 'admin' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                  userRole === 'operations' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                  'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}>
                  {userRole === 'admin' ? t.roleAdmin : userRole === 'operations' ? t.roleOperations : t.roleFinance}
                </span>
              </div>

              <div className="mb-4">
                <label className="text-[10px] uppercase font-bold text-white/40 block mb-1.5">{t.switchRole}</label>
                <select
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value)}
                  className="w-full text-xs font-semibold bg-white/10 hover:bg-white/15 text-white rounded-xl px-3 py-2 border border-white/15 outline-none focus:border-[#597867] transition-colors cursor-pointer"
                >
                  <option value="admin" className="bg-[#181E1C] text-white">{t.roleAdmin}</option>
                  <option value="operations" className="bg-[#181E1C] text-white">{t.roleOperations}</option>
                  <option value="finance" className="bg-[#181E1C] text-white">{t.roleFinance}</option>
                </select>
              </div>

              <button
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-xs font-semibold transition-colors"
              >
                <LogOut size={15} /> {t.logout}
              </button>
            </div>
          </aside>

          <main className="flex-1 h-full overflow-y-auto">
            <div className="min-h-full p-4 sm:p-8 md:p-12 pb-6 md:pb-12">

              <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
                <div className="flex items-center gap-4">
                  <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden p-2 rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm min-h-[44px] min-w-[44px] flex items-center justify-center">
                    <Menu size={20} />
                  </button>
                  <div>
                    <h1 className="text-3xl font-extrabold text-[#181E1C] tracking-tight">
                      {activeTab === 'dashboard' ? t.dashboard : activeTab === 'orders' ? t.orders : activeTab === 'customers' ? (t.customers || 'Customers') : (t.finance || 'Finance')}
                    </h1>
                    <p className="text-sm text-slate-500 mt-1 font-medium">
                      {activeTab === 'dashboard' ? t.overview : activeTab === 'orders' ? t.manageOrders : activeTab === 'customers' ? (t.customerCRM || 'Customer 360 & CRM') : (t.expenseTracker || 'Expense Tracker')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap justify-end">
                  <button
                    onClick={toggleLanguage}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-sm font-semibold shadow-sm transition-all"
                  >
                    <Globe size={16} /> <span className="hidden sm:inline">{t.langToggle}</span>
                  </button>

                  <button
                    onClick={() => setShowLogs(true)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-sm font-semibold shadow-sm transition-all"
                  >
                    <ClipboardList size={16} /> <span className="hidden sm:inline">{t.logs}</span>
                  </button>

                  <button
                    onClick={handleExport}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-[#597867] bg-white text-[#597867] hover:bg-[#597867]/5 text-sm font-bold shadow-sm transition-all"
                  >
                    <Download size={16} strokeWidth={2.5} /> <span className="hidden sm:inline">{t.exportReport}</span>
                  </button>

                  {activeTab === 'dashboard' ? (
                    <button
                      onClick={handleAdd}
                      className="flex items-center justify-center gap-2 rounded-xl bg-[#597867] px-5 py-2.5 text-sm font-bold text-white shadow-md transition-colors hover:bg-[#465f52]"
                    >
                      <Plus size={16} strokeWidth={2.5} /> <span className="hidden sm:inline">{t.addProduct}</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setOrderModalOpen(true)}
                      className="flex items-center justify-center gap-2 rounded-xl bg-[#597867] px-5 py-2.5 text-sm font-bold text-white shadow-md transition-colors hover:bg-[#465f52]"
                    >
                      <Plus size={16} strokeWidth={2.5} /> <span className="hidden sm:inline">{t.addOrder}</span>
                    </button>
                  )}
                </div>
              </div>

              {activeTab === 'dashboard' ? (
                <>
                  {userRole === 'operations' ? (
                    <>
                      <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center gap-3">
                        <ShieldAlert size={20} className="shrink-0 text-amber-600" />
                        <div className="text-xs">
                          <span className="font-bold">{t.roleOperations}:</span> {t.restrictedAccess}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <DashboardCard title={t.totalStock} value={metrics.totalInStock.toLocaleString()} icon="box" index={0} />
                        <DashboardCard title={t.totalSold} value={metrics.totalSoldUnits.toLocaleString()} icon="cart" index={1} />
                        <DashboardCard title={t.orders} value={orders.filter(o => o.status !== 'Cancelled').length.toLocaleString()} icon="truck" index={2} />
                        <DashboardCard title={t.products || 'Products'} value={products.length.toLocaleString()} icon="box" index={3} />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
                        <DashboardCard title={t.totalStock} value={metrics.totalInStock.toLocaleString()} icon="box" index={0} />
                        <DashboardCard title={t.totalSold} value={metrics.totalSoldUnits.toLocaleString()} icon="cart" index={1} />
                        <DashboardCard title={t.totalRevenue} value={formatEGP(metrics.totalRevenue)} icon="dollar" index={2} />
                        <DashboardCard title={t.netProfit} value={formatEGP(metrics.totalProfit)} icon="chart" index={3} />
                        <DashboardCard title={t.cashWithShipping} value={formatEGP(metrics.cashWithShipping)} icon="truck" index={4} />
                        <DashboardCard title={t.cashInTreasury} value={formatEGP(metrics.cashInTreasury)} icon="wallet" index={5} />
                        <DashboardCard title={t.returnLosses} value={formatEGP(metrics.returnLosses)} icon="alert" index={6} />
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                        <div className="lg:col-span-2">
                          <ProfitChart products={products} />
                        </div>
                        <div className="lg:col-span-1">
                          <BreakEvenCard breakEvenPoint={metrics.breakEvenPoint} deliveredItemsSold={metrics.deliveredItemsSold} />
                        </div>
                      </div>
                    </>
                  )}

                  <InventoryTable onEdit={handleEdit} />
                </>
              ) : activeTab === 'orders' ? (
                <OrdersView />
              ) : activeTab === 'customers' ? (
                <CustomersView />
              ) : (
                <FinanceView />
              )}

            </div>
          </main>
        </div>

        {showLogs && <ActivityLogs onClose={() => setShowLogs(false)} />}
        <AddProductModal
          isOpen={modalOpen}
          onClose={() => { setModalOpen(false); setEditProduct(null); }}
          editProduct={editProduct}
        />
        <AddOrderModal
          isOpen={orderModalOpen}
          onClose={() => setOrderModalOpen(false)}
        />
      </div>
    </>
  );
}