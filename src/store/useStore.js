import { create } from 'zustand'
import { collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, getDoc, setDoc } from 'firebase/firestore'
import { db, auth } from '../firebase'
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth'

export const normalizePhone = (phone) => {
  if (!phone) return '';
  let cleaned = phone.toString().replace(/\D/g, '');
  if (cleaned.startsWith('0020')) cleaned = cleaned.slice(4);
  else if (cleaned.startsWith('20')) cleaned = cleaned.slice(2);
  while (cleaned.startsWith('0')) {
    cleaned = cleaned.slice(1);
  }
  return cleaned;
};

export const calculateBatchCapitalMetrics = (products = [], orders = [], expenses = []) => {
  let totalProductionCost = 0;
  let totalBatchUnits = 0;
  let remainingStockUnits = 0;
  let remainingStockCostValue = 0;
  let remainingStockRetailValue = 0;
  let totalPotentialRevenue = 0;

  (products || []).forEach(p => {
    const costPrice = Number(p.costPrice) || 0;
    const sellingPrice = Number(p.sellingPrice) || 0;

    // Initial units across all sizes
    const initialStockObj = p.initialStock || {};
    const productInitialUnits = Object.values(initialStockObj).reduce((sum, v) => sum + (Number(v) || 0), 0);

    // Sold units across all sizes
    const soldObj = p.sold || {};
    const productSoldUnits = Object.values(soldObj).reduce((sum, v) => sum + (Number(v) || 0), 0);

    // Remaining units
    const productRemainingUnits = Math.max(0, productInitialUnits - productSoldUnits);

    totalBatchUnits += productInitialUnits;
    totalProductionCost += productInitialUnits * costPrice;
    totalPotentialRevenue += productInitialUnits * sellingPrice;

    remainingStockUnits += productRemainingUnits;
    remainingStockCostValue += productRemainingUnits * costPrice;
    remainingStockRetailValue += productRemainingUnits * sellingPrice;
  });

  // Operating & other expenses
  const totalOperatingExpenses = (expenses || []).reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);

  // Net collected revenue from delivered orders (Delivered - Collected or Delivered)
  let netCollectedRevenue = 0;
  let pendingCourierRevenue = 0;
  let deliveredOrdersCount = 0;

  (orders || []).forEach(order => {
    if (order.isDeleted) return; // Skip soft-deleted orders
    const isDeliveredCollected = order.status === 'Delivered - Collected' || order.status === 'Delivered';
    const isPendingCash = order.status === 'Delivered - Pending Cash';

    if (isDeliveredCollected || isPendingCash) {
      let itemsRevenue = 0;
      (order.items || []).forEach(item => {
        const p = (products || []).find(prod => prod.id === item.productId);
        const qty = Number(item.qty || item.quantity) || 1;
        const sellPrice = Number(item.unitPrice ?? p?.sellingPrice ?? 0);
        itemsRevenue += sellPrice * qty;
      });
      const discountAmt = Number(order.discount?.amount || 0);
      const netOrderRevenue = Math.max(0, itemsRevenue - discountAmt);

      if (isDeliveredCollected) {
        netCollectedRevenue += netOrderRevenue;
        deliveredOrdersCount += 1;
      } else if (isPendingCash) {
        pendingCourierRevenue += netOrderRevenue;
      }
    }
  });

  // Total Capital Required for Break-Even (Production Cost + Operating Expenses)
  const totalCapitalRequired = totalProductionCost + totalOperatingExpenses;

  // Recovery % (clamped at 100 for progress bar, and raw percentage)
  const rawRecoveryPct = totalCapitalRequired > 0 
    ? (netCollectedRevenue / totalCapitalRequired) * 100 
    : (netCollectedRevenue > 0 ? 100 : 0);
  const recoveryProgressPct = Math.min(100, Math.max(0, rawRecoveryPct));

  // Remaining Capital to Break-Even: max(0, totalCapitalRequired - netCollectedRevenue)
  const remainingToBreakEven = Math.max(0, totalCapitalRequired - netCollectedRevenue);

  // Pure Net Profit Zone: max(0, netCollectedRevenue - totalCapitalRequired)
  const pureNetProfit = Math.max(0, netCollectedRevenue - totalCapitalRequired);

  // Projected Total Profit on Batch Sell-Out: Total Potential Revenue - Total Production Cost - Total Expenses
  const projectedTotalProfit = totalPotentialRevenue - totalProductionCost - totalOperatingExpenses;

  const isPureProfitZone = netCollectedRevenue >= totalCapitalRequired && totalCapitalRequired > 0;

  return {
    totalProductionCost,
    totalBatchUnits,
    totalOperatingExpenses,
    totalCapitalRequired,
    netCollectedRevenue,
    pendingCourierRevenue,
    deliveredOrdersCount,
    rawRecoveryPct,
    recoveryProgressPct,
    remainingToBreakEven,
    pureNetProfit,
    remainingStockUnits,
    remainingStockCostValue,
    remainingStockRetailValue,
    totalPotentialRevenue,
    projectedTotalProfit,
    isPureProfitZone
  };
};

const STORAGE_KEY = 'toja-inventory-v2-auth'

function loadLocalData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const data = JSON.parse(raw)
      return {
        language: data.language || 'en'
      }
    }
  } catch { }
  return {
    language: 'en'
  }
}

function saveLocalData(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    language: state.language
  }))
}

const loadedState = loadLocalData()

export const useStore = create((set, get) => ({
  products: [],
  activityLogs: [],
  orders: [],
  deletedOrders: [],
  blacklist: [],
  expenses: [],
  partners: [],
  withdrawals: [],
  inventoryMovements: [],
  userRole: (() => {
    try {
      return localStorage.getItem('toja_user_role') || 'admin';
    } catch {
      return 'admin';
    }
  })(),
  currentUser: (() => {
    try {
      const raw = localStorage.getItem('toja_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })(),
  language: (() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw).language : 'en';
    } catch {
      return 'en';
    }
  })(),
  listenersInitialized: false,

  initAuthListener: () => {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        const userData = { id: user.uid, name: user.displayName || user.email.split('@')[0], email: user.email, role: "User" };
        set({ currentUser: userData });
        localStorage.setItem('toja_user', JSON.stringify(userData));
        get().initializeListeners();
      } else {
        set({ currentUser: null });
        localStorage.removeItem('toja_user');
      }
    });
  },

  initializeListeners: () => {
    if (get().listenersInitialized) return;

    onSnapshot(collection(db, "products"), (snapshot) => {
      const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      set({ products });
    });

    onSnapshot(query(collection(db, "orders"), orderBy("createdAt", "desc")), (snapshot) => {
      const allOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const orders = allOrders.filter(o => !o.isDeleted);
      const deletedOrders = allOrders.filter(o => !!o.isDeleted);
      set({ orders, deletedOrders });
    });

    onSnapshot(collection(db, "blacklist"), (snapshot) => {
      const blacklist = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      set({ blacklist });
    });

    onSnapshot(query(collection(db, "activityLogs"), orderBy("timestamp", "desc")), (snapshot) => {
      const activityLogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      set({ activityLogs });
    });

    onSnapshot(query(collection(db, "expenses"), orderBy("date", "desc")), (snapshot) => {
      const expenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      set({ expenses });
    });

    onSnapshot(collection(db, "partners"), (snapshot) => {
      const partners = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      set({ partners });
    });

    onSnapshot(query(collection(db, "withdrawals"), orderBy("date", "desc")), (snapshot) => {
      const withdrawals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      set({ withdrawals });
    });

    onSnapshot(query(collection(db, "inventory_movements"), orderBy("timestamp", "desc")), (snapshot) => {
      const inventoryMovements = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      set({ inventoryMovements });
    });

    set({ listenersInitialized: true });
  },

  setUserRole: (role) => {
    set({ userRole: role });
    try {
      localStorage.setItem('toja_user_role', role);
    } catch {}
  },

  toggleLanguage: () => {
    set(state => ({ language: state.language === 'en' ? 'ar' : 'en' }));
    saveLocalData(get());
  },

  login: async (email, password) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      get().logActivity('Logged into the system');
      return { success: true };
    } catch (error) {
      console.error("Login failed:", error);
      return { success: false, error: error.code };
    }
  },

  logout: async () => {
    try {
      const user = get().currentUser;
      if (user) {
        get().logActivity('Logged out of the system');
      }
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  },

  logActivity: async (action) => {
    const user = get().currentUser
    if (!user) return
    const log = {
      user: user.name,
      action,
      timestamp: new Date().toISOString()
    }
    await addDoc(collection(db, "activityLogs"), log);
  },

  addProduct: async (product) => {
    const newProduct = {
      ...product,
      sold: { M: 0, L: 0, XL: 0, XXL: 0 },
      createdAt: new Date().toISOString()
    }
    await addDoc(collection(db, "products"), newProduct);
    get().logActivity(`Added new product: ${product.name} (${product.sku})`)
  },

  updateProduct: async (id, data) => {
    const productRef = doc(db, "products", id);
    await updateDoc(productRef, data);
    const product = get().products.find(p => p.id === id);
    if (product) {
      get().logActivity(`Updated product details: ${product.name} (${product.sku})`)
    }
  },

  deleteProduct: async (id) => {
    const product = get().products.find(p => p.id === id);
    await deleteDoc(doc(db, "products", id));
    if (product) {
      get().logActivity(`Deleted product: ${product.name} (${product.sku})`)
    }
  },

  logInventoryMovement: async ({
    productId,
    productName,
    sku,
    size,
    changeType,
    quantityDelta,
    previousStock = 0,
    newStock = 0,
    relatedOrderId = null,
    reason = '',
    costImpactEGP = 0
  }) => {
    try {
      const user = get().currentUser;
      const movement = {
        productId,
        productName: productName || '',
        sku: sku || '',
        size: size || 'M',
        changeType,
        quantityDelta: Number(quantityDelta) || 0,
        previousStock: Number(previousStock) || 0,
        newStock: Number(newStock) || 0,
        relatedOrderId: relatedOrderId || null,
        reason: reason || '',
        costImpactEGP: Number(costImpactEGP) || 0,
        performedBy: {
          uid: user?.id || 'system',
          name: user?.name || 'System',
          email: user?.email || ''
        },
        timestamp: new Date().toISOString()
      };
      await addDoc(collection(db, "inventory_movements"), movement);
    } catch (error) {
      console.error("Failed to log inventory movement:", error);
    }
  },

  reportDefectiveItem: async (id, size, qty = 1, reason = 'Defective garment') => {
    try {
      const productRef = doc(db, "products", id);
      const productSnap = await getDoc(productRef);
      if (productSnap.exists()) {
        const data = productSnap.data();
        const currentInitial = (data.initialStock && data.initialStock[size]) || 0;
        const currentSold = (data.sold && data.sold[size]) || 0;
        const availableStock = currentInitial - currentSold;
        const deductQty = Math.min(availableStock > 0 ? availableStock : qty, qty);

        if (deductQty > 0) {
          const newInitial = Math.max(0, currentInitial - deductQty);
          await updateDoc(productRef, {
            [`initialStock.${size}`]: newInitial
          });

          // Post expense automatically to reflect write-off in Net Profit
          const costPrice = Number(data.costPrice) || 0;
          const costImpact = costPrice * deductQty;
          if (costImpact > 0) {
            await get().addExpense({
              category: 'Defective Stock Write-Off',
              amount: costImpact,
              date: new Date().toISOString().split('T')[0],
              description: `Defective write-off: ${data.name} (${size} x${deductQty}) - ${reason}`
            });
          }

          // Log movement in inventory_movements ledger
          await get().logInventoryMovement({
            productId: id,
            productName: data.name,
            sku: data.sku,
            size,
            changeType: 'DEFECT_WRITEOFF',
            quantityDelta: -deductQty,
            previousStock: availableStock,
            newStock: availableStock - deductQty,
            reason,
            costImpactEGP: costImpact
          });

          get().logActivity(`تم تسجيل إهلاك تالف: ${data.name} (مقاس ${size} × ${deductQty}) - تكلفة: ${costImpact} ج.م`);
        }
      }
    } catch (error) {
      console.error("Failed to report defective item:", error);
    }
  },

  adjustStock: async ({ productId, size, delta, changeType = 'AUDIT_CORRECTION', reason = '' }) => {
    try {
      const productRef = doc(db, "products", productId);
      const productSnap = await getDoc(productRef);
      if (!productSnap.exists()) return;

      const data = productSnap.data();
      const currentInitial = (data.initialStock && data.initialStock[size]) || 0;
      const currentSold = (data.sold && data.sold[size]) || 0;
      const currentAvailable = currentInitial - currentSold;
      const newInitial = Math.max(0, currentInitial + delta);

      await updateDoc(productRef, {
        [`initialStock.${size}`]: newInitial
      });

      const costPrice = Number(data.costPrice) || 0;
      let costImpact = 0;

      if (changeType === 'DEFECT_WRITEOFF' && delta < 0) {
        costImpact = costPrice * Math.abs(delta);
        await get().addExpense({
          category: 'Defective Stock Write-Off',
          amount: costImpact,
          date: new Date().toISOString().split('T')[0],
          description: `Defective write-off: ${data.name} (${size} x${Math.abs(delta)}) - ${reason}`
        });
      }

      await get().logInventoryMovement({
        productId,
        productName: data.name,
        sku: data.sku,
        size,
        changeType,
        quantityDelta: delta,
        previousStock: currentAvailable,
        newStock: currentAvailable + delta,
        reason,
        costImpactEGP: costImpact
      });

      get().logActivity(`Adjusted stock for ${data.name} (${size}): ${delta > 0 ? `+${delta}` : delta} [${changeType}]`);
      return { success: true };
    } catch (error) {
      console.error("Failed to adjust stock:", error);
      return { success: false, error };
    }
  },

  addOrder: async (orderData) => {
    try {
      console.log('Attempting to add new order:', orderData);
      const displayId = `ORD-${Date.now().toString().slice(-4)}`;
      const newOrder = {
        ...orderData,
        displayId,
        status: 'Pending',
        createdAt: new Date().toISOString(),
        createdBy: get().currentUser?.name || 'System'
      };

      console.log('Step 1: Saving order to Firestore');
      const docRef = await addDoc(collection(db, 'orders'), newOrder);
      console.log('Order saved successfully with ID:', docRef.id);

      console.log('Step 2: Deducting stock for order items');
      for (const item of orderData.items) {
        try {
          const productId = item.productId || item.id;
          if (!productId) continue;

          console.log("Attempting to update product ID:", productId);
          const productRef = doc(db, 'products', productId);
          const productSnap = await getDoc(productRef);

          if (!productSnap.exists()) {
            console.error(`Product doc NOT FOUND for ID: ${productId}`);
            continue;
          }

          const productData = productSnap.data();
          const currentSold = productData.sold || { M: 0, L: 0, XL: 0, XXL: 0 };
          const qty = Number(item.qty) || Number(item.quantity) || 1;

          await updateDoc(productRef, {
            [`sold.${item.size}`]: (currentSold[item.size] || 0) + qty
          });
          console.log(`Successfully updated sold count for ${item.size}`);
        } catch (err) {
          console.error("Error updating product stock:", err);
        }
      }

      get().logActivity(`Added new order for ${newOrder.customerName} (${displayId})`);
      console.log('Order process completed successfully');
    } catch (error) {
      console.error('Failed to add order:', error);
    }
  },

  updateOrderStatus: async (orderId, newStatus) => {
    const order = get().orders.find(o => o.id === orderId);
    if (!order) return;

    const orderRef = doc(db, "orders", orderId);
    await updateDoc(orderRef, { status: newStatus });

    const isOldRestockingStatus = order.status === 'Cancelled' || order.status === 'Returned';
    const isNewRestockingStatus = newStatus === 'Cancelled' || newStatus === 'Returned';

    if (isOldRestockingStatus && !isNewRestockingStatus) {
      for (const item of order.items) {
        const productId = item.productId || item.id;
        if (!productId) continue;

        const productRef = doc(db, "products", productId);
        const productSnap = await getDoc(productRef);
        if (productSnap.exists()) {
          const data = productSnap.data();
          const currentSold = data.sold || { M: 0, L: 0, XL: 0, XXL: 0 };
          const qty = Number(item.qty) || Number(item.quantity) || 1;
          const newSold = { ...currentSold, [item.size]: (currentSold[item.size] || 0) + qty };
          await updateDoc(productRef, { sold: newSold });
        }
      }
    } else if (!isOldRestockingStatus && isNewRestockingStatus) {
      for (const item of order.items) {
        const productId = item.productId || item.id;
        if (!productId) continue;

        const productRef = doc(db, "products", productId);
        const productSnap = await getDoc(productRef);
        if (productSnap.exists()) {
          const data = productSnap.data();
          const currentSold = data.sold || { M: 0, L: 0, XL: 0, XXL: 0 };
          const qty = Number(item.qty) || Number(item.quantity) || 1;
          const newSold = { ...currentSold, [item.size]: Math.max(0, (currentSold[item.size] || 0) - qty) };
          await updateDoc(productRef, { sold: newSold });
        }
      }
    }

    get().logActivity(`Updated order ${order.displayId || orderId} status to ${newStatus}`);
  },

  updateOrderReturnReason: async (orderId, reason) => {
    try {
      const orderRef = doc(db, "orders", orderId);
      await updateDoc(orderRef, { returnReason: reason });
      get().logActivity(`Updated return reason for order ${orderId}`);
    } catch (error) {
      console.error('Failed to update return reason:', error);
    }
  },

  updateOrder: async (orderId, updatedData) => {
    try {
      const order = get().orders.find(o => o.id === orderId);
      if (!order) return;

      const orderRef = doc(db, 'orders', orderId);

      // Only update inventory if status is not cancelled/returned
      const isActiveOrder = order.status !== 'Cancelled' && order.status !== 'Returned';

      if (isActiveOrder) {
        // Revert old items
        for (const item of order.items) {
          const productId = item.productId || item.id;
          if (!productId) continue;

          const productRef = doc(db, 'products', productId);
          const productSnap = await getDoc(productRef);
          if (productSnap.exists()) {
            const data = productSnap.data();
            const currentSold = data.sold || { M: 0, L: 0, XL: 0, XXL: 0 };
            const qty = Number(item.qty) || Number(item.quantity) || 1;
            const newSold = { ...currentSold, [item.size]: Math.max(0, (currentSold[item.size] || 0) - qty) };
            await updateDoc(productRef, { sold: newSold });
          }
        }
        // Apply new items
        for (const item of updatedData.items) {
          const productId = item.productId || item.id;
          if (!productId) continue;

          const productRef = doc(db, 'products', productId);
          const productSnap = await getDoc(productRef);
          if (productSnap.exists()) {
            const data = productSnap.data();
            const currentSold = data.sold || { M: 0, L: 0, XL: 0, XXL: 0 };
            const qty = Number(item.qty) || Number(item.quantity) || 1;
            const newSold = { ...currentSold, [item.size]: (currentSold[item.size] || 0) + qty };
            await updateDoc(productRef, { sold: newSold });
          }
        }
      }

      await updateDoc(orderRef, updatedData);
      get().logActivity(`Updated order details: ${order.displayId || orderId}`);
    } catch (error) {
      console.error('Failed to update order:', error);
    }
  },

  addExpense: async (expenseData) => {
    try {
      await addDoc(collection(db, "expenses"), {
        ...expenseData,
        createdAt: new Date().toISOString()
      });
      get().logActivity(`Added expense: ${expenseData.category} - ${expenseData.amount}`);
    } catch (error) {
      console.error("Failed to add expense:", error);
    }
  },

  deleteExpense: async (id) => {
    try {
      const expense = get().expenses.find(e => e.id === id);
      await deleteDoc(doc(db, "expenses", id));
      if (expense) {
        get().logActivity(`Deleted expense: ${expense.category} - ${expense.amount}`);
      }
    } catch (error) {
      console.error("Failed to delete expense:", error);
    }
  },

  addPartner: async (partnerData) => {
    try {
      await addDoc(collection(db, "partners"), {
        ...partnerData,
        createdAt: new Date().toISOString()
      });
      get().logActivity(`Added partner: ${partnerData.name}`);
    } catch (error) {
      console.error("Failed to add partner:", error);
    }
  },

  updatePartner: async (id, data) => {
    try {
      const partnerRef = doc(db, "partners", id);
      await updateDoc(partnerRef, data);
      get().logActivity(`Updated partner details`);
    } catch (error) {
      console.error("Failed to update partner:", error);
    }
  },

  deletePartner: async (id) => {
    try {
      const partner = get().partners.find(p => p.id === id);
      await deleteDoc(doc(db, "partners", id));
      if (partner) {
        get().logActivity(`Deleted partner: ${partner.name}`);
      }
    } catch (error) {
      console.error("Failed to delete partner:", error);
    }
  },

  addWithdrawal: async (withdrawalData) => {
    try {
      await addDoc(collection(db, "withdrawals"), {
        ...withdrawalData,
        createdAt: new Date().toISOString()
      });
      get().logActivity(`Added withdrawal of ${withdrawalData.amount}`);
    } catch (error) {
      console.error("Failed to add withdrawal:", error);
    }
  },

  deleteWithdrawal: async (id) => {
    try {
      await deleteDoc(doc(db, "withdrawals", id));
      get().logActivity(`Deleted withdrawal record`);
    } catch (error) {
      console.error("Failed to delete withdrawal:", error);
    }
  },

  deleteOrder: async (orderId) => {
    try {
      const order = [...get().orders, ...(get().deletedOrders || [])].find(o => o.id === orderId);
      if (!order) return;

      const isRestocked = order.status === 'Cancelled' || order.status === 'Returned';
      if (!isRestocked && order.items) {
        for (const item of order.items) {
          const productId = item.productId || item.id;
          if (!productId) continue;

          const productRef = doc(db, 'products', productId);
          const productSnap = await getDoc(productRef);
          if (productSnap.exists()) {
            const data = productSnap.data();
            const currentSold = data.sold || { M: 0, L: 0, XL: 0, XXL: 0 };
            const qty = Number(item.qty) || Number(item.quantity) || 1;
            const newSold = { ...currentSold, [item.size]: Math.max(0, (currentSold[item.size] || 0) - qty) };
            await updateDoc(productRef, { sold: newSold });
          }
        }
      }

      const orderRef = doc(db, "orders", orderId);
      await updateDoc(orderRef, {
        isDeleted: true,
        deletedAt: new Date().toISOString(),
        deletedBy: get().currentUser?.name || 'System'
      });
      get().logActivity(`Soft-deleted order: ${order.displayId || orderId} (Inventory restored)`);
    } catch (error) {
      console.error("Failed to soft-delete order:", error);
    }
  },

  restoreOrder: async (orderId) => {
    try {
      const order = [...get().orders, ...(get().deletedOrders || [])].find(o => o.id === orderId);
      if (!order) return;

      const isActive = order.status !== 'Cancelled' && order.status !== 'Returned';
      if (isActive && order.items) {
        for (const item of order.items) {
          const productId = item.productId || item.id;
          if (!productId) continue;

          const productRef = doc(db, 'products', productId);
          const productSnap = await getDoc(productRef);
          if (productSnap.exists()) {
            const data = productSnap.data();
            const currentSold = data.sold || { M: 0, L: 0, XL: 0, XXL: 0 };
            const qty = Number(item.qty) || Number(item.quantity) || 1;
            const newSold = { ...currentSold, [item.size]: (currentSold[item.size] || 0) + qty };
            await updateDoc(productRef, { sold: newSold });
          }
        }
      }

      const orderRef = doc(db, "orders", orderId);
      await updateDoc(orderRef, {
        isDeleted: false,
        restoredAt: new Date().toISOString(),
        restoredBy: get().currentUser?.name || 'System'
      });
      get().logActivity(`Restored order: ${order.displayId || orderId} (Inventory re-allocated)`);
    } catch (error) {
      console.error("Failed to restore order:", error);
    }
  },

  toggleBlacklistCustomer: async ({ phone, customerName, reason, isBlacklisted }) => {
    try {
      const cleanPhone = normalizePhone(phone);
      if (!cleanPhone) return;

      if (isBlacklisted) {
        await setDoc(doc(db, "blacklist", cleanPhone), {
          phone: cleanPhone,
          rawPhone: phone,
          customerName: customerName || '',
          reason: reason || 'High return risk / Delivery refusal',
          createdAt: new Date().toISOString(),
          createdBy: get().currentUser?.name || 'System'
        });
        get().logActivity(`Blacklisted customer: ${customerName || cleanPhone} (${cleanPhone})`);
      } else {
        await deleteDoc(doc(db, "blacklist", cleanPhone));
        get().logActivity(`Removed customer from blacklist: ${cleanPhone}`);
      }
    } catch (error) {
      console.error("Failed to toggle blacklist:", error);
    }
  },

  addOrderNote: async (orderId, noteText) => {
    try {
      const order = get().orders.find(o => o.id === orderId);
      if (!order) return;

      const note = {
        text: noteText,
        createdAt: new Date().toISOString(),
        createdBy: get().currentUser?.name || 'System'
      };
      const updatedNotes = order.notes ? [...order.notes, note] : [note];
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, { notes: updatedNotes });
      get().logActivity(`Added internal note to order ${order.displayId || orderId}`);
    } catch (error) {
      console.error("Failed to add order note:", error);
    }
  },

  deleteOrderNote: async (orderId, noteTimestamp) => {
    try {
      const order = get().orders.find(o => o.id === orderId);
      if (!order || !order.notes) return;

      const updatedNotes = order.notes.filter(note => note.createdAt !== noteTimestamp);
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, { notes: updatedNotes });
      get().logActivity(`Deleted an internal note from order ${order.displayId || orderId}`);
    } catch (error) {
      console.error("Failed to delete order note:", error);
    }
  },

  createExchangeOrder: async ({ parentOrder, incomingItem, outgoingItem, exchangeShippingFee = 0, notes = '' }) => {
    try {
      const displayId = `EXC-${Date.now().toString().slice(-4)}`;
      const replacementProduct = get().products.find(p => p.id === outgoingItem.productId);

      // 1. Decrement outgoing replacement item from inventory
      if (replacementProduct) {
        const productRef = doc(db, 'products', replacementProduct.id);
        const productSnap = await getDoc(productRef);
        if (productSnap.exists()) {
          const pData = productSnap.data();
          const currentSold = pData.sold || { M: 0, L: 0, XL: 0, XXL: 0 };
          const qty = Number(outgoingItem.qty) || 1;
          await updateDoc(productRef, {
            [`sold.${outgoingItem.size}`]: (currentSold[outgoingItem.size] || 0) + qty
          });

          await get().logInventoryMovement({
            productId: replacementProduct.id,
            productName: replacementProduct.name,
            sku: replacementProduct.sku,
            size: outgoingItem.size,
            changeType: 'EXCHANGE_OUT',
            quantityDelta: -qty,
            relatedOrderId: displayId,
            reason: `Exchange replacement for parent: ${parentOrder.displayId || parentOrder.id}`
          });
        }
      }

      // 2. Restock incoming returned item if restockImmediately is true
      if (incomingItem && incomingItem.productId) {
        const returnedProduct = get().products.find(p => p.id === incomingItem.productId);
        if (returnedProduct) {
          const returnedRef = doc(db, 'products', returnedProduct.id);
          const returnedSnap = await getDoc(returnedRef);
          if (returnedSnap.exists()) {
            const rData = returnedSnap.data();
            const currentSold = rData.sold || { M: 0, L: 0, XL: 0, XXL: 0 };
            const retQty = Number(incomingItem.qty) || 1;
            await updateDoc(returnedRef, {
              [`sold.${incomingItem.size}`]: Math.max(0, (currentSold[incomingItem.size] || 0) - retQty)
            });

            await get().logInventoryMovement({
              productId: returnedProduct.id,
              productName: returnedProduct.name,
              sku: returnedProduct.sku,
              size: incomingItem.size,
              changeType: 'EXCHANGE_IN',
              quantityDelta: retQty,
              relatedOrderId: displayId,
              reason: `Returned item from exchange (Parent: ${parentOrder.displayId || parentOrder.id})`
            });
          }
        }
      }

      // 3. Create exchange child order
      const outQty = Number(outgoingItem.qty) || 1;
      const unitPrice = Number(replacementProduct?.sellingPrice || outgoingItem.sellingPrice || 0);
      const subtotal = unitPrice * outQty;
      const fee = Number(exchangeShippingFee) || 0;
      const total = fee; // Customer only pays the exchange shipping fee for 1:1 size swaps

      const newExchangeOrder = {
        customerName: parentOrder.customerName || '',
        phone: parentOrder.phone || '',
        governorate: parentOrder.governorate || '',
        address: parentOrder.address || '',
        orderType: 'exchange',
        parentOrderId: parentOrder.id,
        parentOrderDisplayId: parentOrder.displayId || parentOrder.orderId || parentOrder.id,
        items: [{
          productId: outgoingItem.productId,
          productName: replacementProduct?.name || 'Replacement Item',
          size: outgoingItem.size,
          qty: outQty,
          unitPrice
        }],
        incomingItem: {
          productId: incomingItem?.productId || '',
          productName: incomingItem?.productName || '',
          size: incomingItem?.size || 'M',
          qty: Number(incomingItem?.qty) || 1,
          restocked: true
        },
        shippingFee: fee,
        subtotal,
        discount: { type: 'fixed', value: 0, amount: 0 },
        total,
        status: 'Pending',
        displayId,
        createdAt: new Date().toISOString(),
        createdBy: get().currentUser?.name || 'System',
        notes: notes ? [{
          text: notes,
          author: get().currentUser?.name || 'System',
          createdAt: new Date().toISOString()
        }] : []
      };

      await addDoc(collection(db, 'orders'), newExchangeOrder);

      // 4. Append note to parent order
      await get().addOrderNote(
        parentOrder.id,
        `تم إنشاء طلب استبدال مرتبط برقم: ${displayId} (مقاس بديل: ${outgoingItem.size} مقابل ${incomingItem?.size})`
      );

      get().logActivity(`Created exchange order ${displayId} for parent ${parentOrder.displayId || parentOrder.id}`);
      return { success: true, displayId };
    } catch (error) {
      console.error("Failed to create exchange order:", error);
      return { success: false, error };
    }
  },

  updatePartialDelivery: async (orderId, itemsWithStatus, notes = '') => {
    try {
      const order = [...get().orders, ...(get().deletedOrders || [])].find(o => o.id === orderId);
      if (!order) return;

      let newSubtotal = 0;
      for (const item of itemsWithStatus) {
        const itemQty = Number(item.qty) || Number(item.quantity) || 1;
        const product = get().products.find(p => p.id === item.productId);
        const price = Number(item.unitPrice || product?.sellingPrice || 0);

        if (item.itemStatus === 'accepted' || !item.itemStatus) {
          newSubtotal += price * itemQty;
        } else if (item.itemStatus === 'returned') {
          // Revert sold stock for this returned line item
          if (product) {
            const productRef = doc(db, 'products', product.id);
            const productSnap = await getDoc(productRef);
            if (productSnap.exists()) {
              const pData = productSnap.data();
              const currentSold = pData.sold || { M: 0, L: 0, XL: 0, XXL: 0 };
              await updateDoc(productRef, {
                [`sold.${item.size}`]: Math.max(0, (currentSold[item.size] || 0) - itemQty)
              });

              await get().logInventoryMovement({
                productId: product.id,
                productName: product.name,
                sku: product.sku,
                size: item.size,
                changeType: 'ORDER_RETURN',
                quantityDelta: itemQty,
                relatedOrderId: order.displayId || order.id,
                reason: `Partial return for order ${order.displayId || order.id}`
              });
            }
          }
        }
      }

      const shipping = Number(order.shippingFee ?? order.totals?.shipping ?? 0);
      const discountAmt = Number(order.discount?.amount || 0);
      const newTotal = Math.max(0, newSubtotal - discountAmt + shipping);

      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        items: itemsWithStatus,
        subtotal: newSubtotal,
        total: newTotal,
        orderType: 'partial_delivery',
        partialDeliveryProcessedAt: new Date().toISOString()
      });

      if (notes) {
        await get().addOrderNote(orderId, notes);
      } else {
        await get().addOrderNote(orderId, `تم تسجيل تسليم جزئي وتحديث الإجمالي إلى ${newTotal} ج.م واسترجاع المرتجعات للمخزون.`);
      }

      get().logActivity(`Processed partial delivery for order ${order.displayId || orderId}: New total ${newTotal} EGP`);
      return { success: true };
    } catch (error) {
      console.error("Failed to process partial delivery:", error);
      return { success: false, error };
    }
  },

  bulkReconcileCourier: async ({ batchName, carrierName, matchedOrders, feeVarianceTotal = 0 }) => {
    try {
      const now = new Date().toISOString();
      const userName = get().currentUser?.name || 'System';

      for (const item of matchedOrders) {
        const orderRef = doc(db, 'orders', item.orderId);
        await updateDoc(orderRef, {
          status: 'Delivered - Collected',
          courierReconciliation: {
            carrierName: carrierName || 'Courier',
            batchName: batchName || `Batch-${now.slice(0, 10)}`,
            collectedAmount: Number(item.collectedAmount) || 0,
            courierFee: Number(item.courierFee) || 0,
            reconciledAt: now,
            reconciledBy: userName
          }
        });
      }

      if (feeVarianceTotal > 0) {
        await get().addExpense({
          category: 'Shipping Discrepancy',
          amount: feeVarianceTotal,
          date: now.split('T')[0],
          description: `Courier fee variance for batch ${batchName} (${carrierName})`
        });
      }

      // Save settlement batch log
      await addDoc(collection(db, 'courier_settlements'), {
        batchName: batchName || `Batch-${now.slice(0, 10)}`,
        carrierName: carrierName || 'Courier',
        reconciledCount: matchedOrders.length,
        feeVarianceTotal,
        reconciledAt: now,
        reconciledBy: userName
      });

      get().logActivity(`Reconciled courier settlement: ${matchedOrders.length} orders marked Delivered - Collected (${carrierName})`);
      return { success: true };
    } catch (error) {
      console.error("Failed to reconcile courier settlement:", error);
      return { success: false, error };
    }
  },

  getBatchCapitalMetrics: () => {
    const { products, orders, expenses } = get();
    return calculateBatchCapitalMetrics(products, orders, expenses);
  }
}))

export default useStore;
