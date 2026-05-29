import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Download, ClipboardList, LogOut, Package, BarChart3, LayoutDashboard, Menu, Globe } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useStore } from './store/useStore';
import { translations } from './translations';
import LoginModal from './components/LoginModal';
import ActivityLogs from './components/ActivityLogs';
import DashboardCard from './components/DashboardCard';
import ProfitChart from './components/ProfitChart';
import InventoryTable from './components/InventoryTable';
import AddProductModal from './components/AddProductModal';
import OrdersView from './components/OrdersView';
import AddOrderModal from './components/AddOrderModal';

function formatEGP(amount) {
  return amount.toLocaleString('en-EG') + ' EGP';
}

const getSum = (obj) => Object.values(obj || {}).reduce((a, b) => a + b, 0);

export default function App() {
  const { currentUser, logout, products, orders, language, toggleLanguage, initializeListeners } = useStore();
  const t = translations[language];

  useEffect(() => {
    useStore.getState().initAuthListener();
  }, []);
  const [showLogs, setShowLogs] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  const metrics = useMemo(() => {
    let totalInStock = 0;
    let totalSoldUnits = 0;
    let totalRevenue = 0;
    let totalProfit = 0;
    let cashWithShipping = 0;
    let cashInTreasury = 0;
    let returnLosses = 0;

    products.forEach(p => {
      const pInitial = getSum(p.initialStock);
      const pSold = getSum(p.sold);
      
      totalInStock += (pInitial - pSold);
      totalSoldUnits += pSold;
    });

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
        
        totalRevenue += itemsRevenue;
        totalProfit += (itemsRevenue - orderCost);
        
        if (order.status === 'Delivered - Pending Cash') {
          cashWithShipping += order.total;
        } else if (order.status === 'Delivered - Collected' || order.status === 'Delivered') {
          cashInTreasury += order.total;
        }
      } else if (order.status === 'Returned') {
         returnLosses += Number(order.shippingFee || 0);
      }
    });

    totalProfit -= returnLosses;

    const avgMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0;
    return { totalInStock, totalSoldUnits, totalRevenue, totalProfit, cashWithShipping, cashInTreasury, returnLosses, avgMargin };
  }, [products, orders]);

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
    const data = products.map(p => {
      const stockM = (p.initialStock?.M || 0) - (p.sold?.M || 0);
      const stockL = (p.initialStock?.L || 0) - (p.sold?.L || 0);
      const stockXL = (p.initialStock?.XL || 0) - (p.sold?.XL || 0);
      const stockXXL = (p.initialStock?.XXL || 0) - (p.sold?.XXL || 0);
      
      const totalSold = (p.sold?.M || 0) + (p.sold?.L || 0) + (p.sold?.XL || 0) + (p.sold?.XXL || 0);
      const rev = totalSold * p.sellingPrice;
      const prof = totalSold * (p.sellingPrice - p.costPrice);
      
      return {
        "Product Name": p.name,
        "SKU": p.sku,
        "Stock (M)": stockM,
        "Stock (L)": stockL,
        "Stock (XL)": stockXL,
        "Stock (XXL)": stockXXL,
        "Cost Price (EGP)": p.costPrice,
        "Selling Price (EGP)": p.sellingPrice,
        "Total Sold": totalSold,
        "Total Revenue (EGP)": rev,
        "Total Profit (EGP)": prof
      };
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
        <div className="relative z-10 flex h-full w-full bg-white/40 backdrop-blur-2xl">
          {isSidebarOpen && (
            <div 
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}
          <aside className={`absolute inset-y-0 left-0 z-50 transform ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} md:relative md:translate-x-0 transition duration-200 ease-in-out bg-[#181E1C] w-64 text-white flex-shrink-0 flex flex-col justify-between`}>
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
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-3 rounded-xl flex items-center gap-3 text-sm font-semibold cursor-pointer transition-colors ${activeTab === 'dashboard' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/80 hover:bg-white/5'}`}
            >
              <LayoutDashboard size={18} strokeWidth={2} /> {t.dashboard}
            </div>
            <div 
              onClick={() => setActiveTab('orders')}
              className={`px-4 py-3 rounded-xl flex items-center gap-3 text-sm font-semibold cursor-pointer transition-colors ${activeTab === 'orders' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/80 hover:bg-white/5'}`}
            >
              <Package size={18} strokeWidth={2} /> {t.orders}
            </div>
            <div 
              onClick={() => alert(t.comingSoon)}
              className="px-4 py-3 text-white/50 hover:text-white/80 hover:bg-white/5 rounded-xl flex items-center gap-3 text-sm font-medium cursor-pointer transition-colors"
            >
              <BarChart3 size={18} strokeWidth={2} /> {t.analytics}
            </div>
          </nav>
        </div>
        
        <div className="p-6 border-t border-white/10">
          <p className="text-xs text-white/50 mb-1">{t.loggedInAs}</p>
          <p className="text-sm font-bold truncate mb-4">{currentUser.name}</p>
          <button 
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm font-semibold transition-colors"
          >
            <LogOut size={16} /> {t.logout}
          </button>
        </div>
      </aside>

      <main className="flex-1 h-full overflow-y-auto">
        <div className="min-h-full p-8 md:p-12">
          
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="md:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <Menu size={24} />
              </button>
              <div>
                <h1 className="text-3xl font-extrabold text-[#181E1C] tracking-tight">
                  {activeTab === 'dashboard' ? t.dashboard : t.orders}
                </h1>
                <p className="text-sm text-slate-500 mt-1 font-medium">
                  {activeTab === 'dashboard' ? t.overview : t.manageOrders}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
                 <DashboardCard title={t.totalStock} value={metrics.totalInStock.toLocaleString()} icon="box" index={0} />
                 <DashboardCard title={t.totalSold} value={metrics.totalSoldUnits.toLocaleString()} icon="cart" index={1} />
                 <DashboardCard title={t.totalRevenue} value={formatEGP(metrics.totalRevenue)} icon="dollar" index={2} />
                 <DashboardCard title={t.netProfit} value={formatEGP(metrics.totalProfit)} icon="chart" index={3} />
                 <DashboardCard title={t.cashWithShipping} value={formatEGP(metrics.cashWithShipping)} icon="truck" index={4} />
                 <DashboardCard title={t.cashInTreasury} value={formatEGP(metrics.cashInTreasury)} icon="wallet" index={5} />
                 <DashboardCard title={t.returnLosses} value={formatEGP(metrics.returnLosses)} icon="alert" index={6} />
              </div>

              <div className="mb-8">
                <ProfitChart products={products} />
              </div>

              <InventoryTable onEdit={handleEdit} />
            </>
          ) : (
            <OrdersView />
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
