import { create } from 'zustand'
import { collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, getDoc, setDoc } from 'firebase/firestore'
import { db, auth } from '../firebase'
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth'
import { logger } from '../utils/logger'
import { SUPER_ADMIN_EMAILS, isSuperAdmin } from '../utils/authConfig'

export { SUPER_ADMIN_EMAILS, isSuperAdmin }

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

export const normalizeSize = (size) => {
  if (!size) return '';
  const trimmed = String(size).trim().toUpperCase();
  // Alias resolution: Convert 2XL to XXL, 3XL to XXXL, etc.
  if (trimmed === '2XL') return 'XXL';
  if (trimmed === '3XL') return 'XXXL';
  if (trimmed === '4XL') return 'XXXXL';
  return trimmed;
};

export const getAvailableStock = (product, size) => {
  if (!product || !size) return 0;
  const norm = normalizeSize(size);
  const rawStr = String(size).trim();
  const rawUpper = rawStr.toUpperCase();

  // Keys to check in order of priority:
  // 1. Normalized size (e.g. 'XXL')
  // 2. Raw uppercase / trimmed
  // 3. Alternative aliases (e.g. if 'XXL', check '2XL'; if '2XL', check 'XXL')
  const keys = [norm, rawUpper, rawStr];
  if (norm === 'XXL' || rawUpper === '2XL') {
    keys.push('XXL', '2XL');
  } else if (norm === 'XXXL' || rawUpper === '3XL') {
    keys.push('XXXL', '3XL');
  } else if (norm === 'XXXXL' || rawUpper === '4XL') {
    keys.push('XXXXL', '4XL');
  }
  const uniqueKeys = Array.from(new Set(keys.filter(Boolean)));

  // 1. Resolve Initial Stock (support dynamic object, legacy flat keys, aliases, and case-insensitivity)
  let initial = undefined;
  for (const k of uniqueKeys) {
    const val = product.initialStock?.[k] 
             ?? product.initial?.[k] 
             ?? product[`initialStock${k}`] 
             ?? product[`initialStock${k.toLowerCase()}`]
             ?? product[`stock${k}`] 
             ?? product[`stock${k.toLowerCase()}`];
    if (val !== undefined && val !== null) {
      initial = Number(val);
      break;
    }
  }
  if (initial === undefined) initial = 0;
  
  // 2. Resolve Sold Count
  let sold = undefined;
  for (const k of uniqueKeys) {
    const val = product.sold?.[k] 
             ?? product[`sold${k}`] 
             ?? product[`sold${k.toLowerCase()}`];
    if (val !== undefined && val !== null) {
      sold = Number(val);
      break;
    }
  }
  if (sold === undefined) sold = 0;

  return Math.max(0, Number(initial) - Number(sold));
};

export const getProductSizes = (product) => {
  if (!product) return ['M', 'L', 'XL', 'XXL'];
  const sizes = new Set();
  
  // 1. From dynamic initialStock object
  if (product.initialStock && typeof product.initialStock === 'object') {
    Object.keys(product.initialStock).forEach(s => {
      const n = normalizeSize(s);
      if (n) sizes.add(n);
    });
  }
  
  // 2. From dynamic initial object (fallback)
  if (product.initial && typeof product.initial === 'object') {
    Object.keys(product.initial).forEach(s => {
      const n = normalizeSize(s);
      if (n) sizes.add(n);
    });
  }

  // 3. From dynamic sold object
  if (product.sold && typeof product.sold === 'object') {
    Object.keys(product.sold).forEach(s => {
      const n = normalizeSize(s);
      if (n) sizes.add(n);
    });
  }
  
  // 4. From legacy flat keys (initialStockM, stockM, soldM, etc.)
  const candidateSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', 'XXXL', '3XL', 'XXXXL', '4XL', 'Oversize', 'Free Size'];
  candidateSizes.forEach(s => {
    if (
      product[`initialStock${s}`] !== undefined || 
      product[`initialStock${s.toLowerCase()}`] !== undefined || 
      product[`stock${s}`] !== undefined || 
      product[`stock${s.toLowerCase()}`] !== undefined || 
      product[`sold${s}`] !== undefined ||
      product[`sold${s.toLowerCase()}`] !== undefined
    ) {
      const n = normalizeSize(s);
      if (n) sizes.add(n);
    }
  });

  if (sizes.size === 0) {
    return ['M', 'L', 'XL', 'XXL'];
  }

  const standardOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'XXXXL', 'Oversize', 'Free Size'];
  const arr = Array.from(sizes);
  arr.sort((a, b) => {
    const idxA = standardOrder.indexOf(a);
    const idxB = standardOrder.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });

  return arr;
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

    const sizes = getProductSizes(p);
    let productInitialUnits = 0;
    let productRemainingUnits = 0;

    sizes.forEach(sz => {
      const init = Number(
        p.initialStock?.[sz] 
        ?? p.initialStock?.[sz.toUpperCase()]
        ?? (sz === 'XXL' ? p.initialStock?.['2XL'] : undefined)
        ?? (sz === 'XXXL' ? p.initialStock?.['3XL'] : undefined)
        ?? (sz === 'XXXXL' ? p.initialStock?.['4XL'] : undefined)
        ?? p.initial?.[sz] 
        ?? p[`initialStock${sz}`] 
        ?? p[`stock${sz}`] 
        ?? 0
      );
      productInitialUnits += Math.max(0, init);
      productRemainingUnits += getAvailableStock(p, sz);
    });

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
      const rawUser = localStorage.getItem('toja_user');
      const user = rawUser ? JSON.parse(rawUser) : null;
      if (user && isSuperAdmin(user.email)) {
        return localStorage.getItem('toja_user_role') || 'admin';
      }
      return 'operations';
    } catch {
      return 'operations';
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
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        const isSuper = isSuperAdmin(user.email);
        let role = 'operations';

        if (isSuper) {
          // Super Admins default to 'admin' (or keep selected role if testing other roles)
          const savedRole = localStorage.getItem('toja_user_role');
          role = savedRole || 'admin';
          localStorage.setItem('toja_user_role', role);
        } else {
          // For all other users, default to 'operations' or read assigned role from users/{uid}
          try {
            const userSnap = await getDoc(doc(db, "users", user.uid));
            if (userSnap.exists()) {
              const data = userSnap.data();
              if (data.role && data.role !== 'admin') {
                role = data.role;
              }
            }
          } catch (e) {
            console.warn("Could not fetch user document for role:", e);
          }
          // Strict lockdown: non-super admin CANNOT have 'admin' role under any circumstance
          if (role === 'admin') {
            role = 'operations';
          }
          localStorage.setItem('toja_user_role', role);
        }

        const userData = {
          id: user.uid,
          name: user.displayName || user.email.split('@')[0],
          email: user.email,
          role
        };
        set({ currentUser: userData, userRole: role });
        localStorage.setItem('toja_user', JSON.stringify(userData));
        get().initializeListeners();
      } else {
        set({ currentUser: null, userRole: 'operations' });
        localStorage.removeItem('toja_user');
        localStorage.removeItem('toja_user_role');
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
    const user = get().currentUser;
    if (!isSuperAdmin(user?.email)) {
      console.warn("Unauthorized role switch attempt blocked for:", user?.email);
      logger.warn('RBAC_ROLE_SWITCH_BLOCKED', 'auth', {
        userId: user?.id,
        userEmail: user?.email,
        attemptedRole: role
      }, `Non-super admin attempted to switch role to ${role}`);
      return;
    }
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
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      logger.info('AUTH_LOGIN', 'auth', { email, uid: userCred.user?.uid }, `Logged into the system as ${email}`);
      get().logActivity('Logged into the system');
      return { success: true };
    } catch (error) {
      console.error("Login failed:", error);
      logger.error('AUTH_LOGIN_FAILED', 'auth', error, { email }, `Login failed for ${email}: ${error.code}`);
      return { success: false, error: error.code };
    }
  },

  logout: async () => {
    try {
      const user = get().currentUser;
      if (user) {
        logger.info('AUTH_LOGOUT', 'auth', { userId: user.id, name: user.name, email: user.email }, `User ${user.name} logged out`);
        get().logActivity('Logged out of the system');
      }
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
      logger.error('AUTH_LOGOUT_FAILED', 'auth', error, {}, 'Logout error');
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
    try {
      await addDoc(collection(db, "activityLogs"), log);
    } catch (err) {
      console.warn("Failed to write to activityLogs:", err);
    }
  },

  addProduct: async (product) => {
    try {
      const initialStock = {};
      if (product.initialStock && typeof product.initialStock === 'object') {
        Object.entries(product.initialStock).forEach(([k, v]) => {
          const norm = normalizeSize(k);
          if (norm) {
            initialStock[norm] = (initialStock[norm] || 0) + (Number(v) || 0);
          }
        });
      }
      const newProduct = {
        ...product,
        initialStock,
        sold: { M: 0, L: 0, XL: 0, XXL: 0 },
        createdAt: new Date().toISOString()
      };
      const docRef = await addDoc(collection(db, "products"), newProduct);
      logger.info('PRODUCT_CREATE', 'inventory', {
        productId: docRef.id,
        name: product.name,
        sku: product.sku,
        costPrice: product.costPrice,
        sellingPrice: product.sellingPrice,
        initialStock
      }, `Added new product: ${product.name} (${product.sku})`);
      get().logActivity(`Added new product: ${product.name} (${product.sku})`);
    } catch (error) {
      console.error("Failed to add product:", error);
      logger.error('PRODUCT_CREATE', 'inventory', error, { sku: product?.sku, name: product?.name });
    }
  },

  updateProduct: async (id, data) => {
    try {
      const productRef = doc(db, "products", id);
      const updatePayload = { ...data };
      if (data.initialStock && typeof data.initialStock === 'object') {
        const normalizedInitial = {};
        Object.entries(data.initialStock).forEach(([k, v]) => {
          const norm = normalizeSize(k);
          if (norm) {
            normalizedInitial[norm] = (normalizedInitial[norm] || 0) + (Number(v) || 0);
          }
        });
        updatePayload.initialStock = normalizedInitial;
      }
      await updateDoc(productRef, updatePayload);
      const product = get().products.find(p => p.id === id);
      logger.info('PRODUCT_UPDATE', 'inventory', {
        productId: id,
        sku: product?.sku,
        name: product?.name,
        updatedFields: Object.keys(data)
      }, `Updated product details: ${product?.name || id}`);
      if (product) {
        get().logActivity(`Updated product details: ${product.name} (${product.sku})`);
      }
    } catch (error) {
      console.error("Failed to update product:", error);
      logger.error('PRODUCT_UPDATE', 'inventory', error, { productId: id });
    }
  },

  deleteProduct: async (id) => {
    try {
      const product = get().products.find(p => p.id === id);
      await deleteDoc(doc(db, "products", id));
      logger.warn('PRODUCT_DELETE', 'inventory', {
        productId: id,
        sku: product?.sku,
        name: product?.name
      }, `Deleted product: ${product?.name || id} (${product?.sku || ''})`);
      if (product) {
        get().logActivity(`Deleted product: ${product.name} (${product.sku})`);
      }
    } catch (error) {
      console.error("Failed to delete product:", error);
      logger.error('PRODUCT_DELETE', 'inventory', error, { productId: id });
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
      const normSize = normalizeSize(size) || 'M';
      const productRef = doc(db, "products", id);
      const productSnap = await getDoc(productRef);
      if (productSnap.exists()) {
        const data = productSnap.data();
        const availableStock = getAvailableStock(data, normSize);
        const currentInitial = (data.initialStock && (data.initialStock[normSize] ?? (normSize === 'XXL' ? data.initialStock['2XL'] : undefined))) || 0;
        const deductQty = Math.min(availableStock > 0 ? availableStock : qty, qty);

        if (deductQty > 0) {
          const newInitial = Math.max(0, currentInitial - deductQty);
          await updateDoc(productRef, {
            [`initialStock.${normSize}`]: newInitial
          });

          // Post expense automatically to reflect write-off in Net Profit
          const costPrice = Number(data.costPrice) || 0;
          const costImpact = costPrice * deductQty;
          if (costImpact > 0) {
            await get().addExpense({
              category: 'Defective Stock Write-Off',
              amount: costImpact,
              date: new Date().toISOString().split('T')[0],
              description: `Defective write-off: ${data.name} (${normSize} x${deductQty}) - ${reason}`
            });
          }

          // Log movement in inventory_movements ledger
          await get().logInventoryMovement({
            productId: id,
            productName: data.name,
            sku: data.sku,
            size: normSize,
            changeType: 'DEFECT_WRITEOFF',
            quantityDelta: -deductQty,
            previousStock: availableStock,
            newStock: availableStock - deductQty,
            reason,
            costImpactEGP: costImpact
          });

          logger.warn('DEFECT_WRITEOFF', 'inventory', {
            productId: id,
            productName: data.name,
            sku: data.sku,
            size: normSize,
            deductQty,
            costImpactEGP: costImpact,
            reason,
            remainingStock: availableStock - deductQty
          }, `Reported defective write-off: ${data.name} (${normSize} x${deductQty}) - ${costImpact} EGP`);

          get().logActivity(`تم تسجيل إهلاك تالف: ${data.name} (مقاس ${normSize} × ${deductQty}) - تكلفة: ${costImpact} ج.م`);
        }
      }
    } catch (error) {
      console.error("Failed to report defective item:", error);
      logger.error('DEFECT_WRITEOFF', 'inventory', error, { productId: id, size, qty, reason });
    }
  },

  adjustStock: async ({ productId, size, delta, changeType = 'AUDIT_CORRECTION', reason = '' }) => {
    try {
      const normSize = normalizeSize(size) || 'M';
      const productRef = doc(db, "products", productId);
      const productSnap = await getDoc(productRef);
      if (!productSnap.exists()) return;

      const data = productSnap.data();
      const currentInitial = (data.initialStock && (data.initialStock[normSize] ?? (normSize === 'XXL' ? data.initialStock['2XL'] : undefined))) || 0;
      const currentAvailable = getAvailableStock(data, normSize);
      const newInitial = Math.max(0, currentInitial + delta);

      await updateDoc(productRef, {
        [`initialStock.${normSize}`]: newInitial
      });

      const costPrice = Number(data.costPrice) || 0;
      let costImpact = 0;

      if (changeType === 'DEFECT_WRITEOFF' && delta < 0) {
        costImpact = costPrice * Math.abs(delta);
        await get().addExpense({
          category: 'Defective Stock Write-Off',
          amount: costImpact,
          date: new Date().toISOString().split('T')[0],
          description: `Defective write-off: ${data.name} (${normSize} x${Math.abs(delta)}) - ${reason}`
        });
      }

      await get().logInventoryMovement({
        productId,
        productName: data.name,
        sku: data.sku,
        size: normSize,
        changeType,
        quantityDelta: delta,
        previousStock: currentAvailable,
        newStock: currentAvailable + delta,
        reason,
        costImpactEGP: costImpact
      });

      logger.info('INVENTORY_ADJUST', 'inventory', {
        productId,
        productName: data.name,
        sku: data.sku,
        size: normSize,
        delta,
        previousStock: currentAvailable,
        newStock: currentAvailable + delta,
        changeType,
        reason,
        costImpactEGP: costImpact
      }, `Adjusted stock for ${data.name} (${normSize}): ${delta > 0 ? `+${delta}` : delta} [${changeType}]`);

      if (currentAvailable + delta <= 0) {
        logger.warn('INVENTORY_STOCK_DEPLETED', 'inventory', {
          productId,
          sku: data.sku,
          size: normSize,
          stock: currentAvailable + delta
        }, `Stock depleted to 0 for ${data.name} (${normSize})`);
      }

      get().logActivity(`Adjusted stock for ${data.name} (${normSize}): ${delta > 0 ? `+${delta}` : delta} [${changeType}]`);
      return { success: true };
    } catch (error) {
      console.error("Failed to adjust stock:", error);
      logger.error('INVENTORY_ADJUST', 'inventory', error, { productId, size, delta, changeType, reason });
      return { success: false, error };
    }
  },

  addOrder: async (orderData) => {
    logger.newRequestId();
    try {
      console.log('Attempting to add new order:', orderData);
      const displayId = `ORD-${Date.now().toString().slice(-4)}`;
      const normalizedItems = (orderData.items || []).map(item => ({
        ...item,
        size: normalizeSize(item.size) || 'M'
      }));

      const newOrder = {
        ...orderData,
        items: normalizedItems,
        displayId,
        status: 'Pending',
        createdAt: new Date().toISOString(),
        createdBy: get().currentUser?.name || 'System'
      };

      console.log('Step 1: Saving order to Firestore');
      const docRef = await addDoc(collection(db, 'orders'), newOrder);
      console.log('Order saved successfully with ID:', docRef.id);

      console.log('Step 2: Deducting stock for order items');
      for (const item of normalizedItems) {
        try {
          const productId = item.productId || item.id;
          if (!productId) continue;

          console.log("Attempting to update product ID:", productId);
          const productRef = doc(db, 'products', productId);
          const productSnap = await getDoc(productRef);

          if (!productSnap.exists()) {
            console.error(`Product doc NOT FOUND for ID: ${productId}`);
            logger.warn('ORDER_PRODUCT_NOT_FOUND', 'orders', { productId, orderId: docRef.id, displayId }, `Product ${productId} not found during stock deduction`);
            continue;
          }

          const productData = productSnap.data();
          const currentSold = productData.sold || { M: 0, L: 0, XL: 0, XXL: 0 };
          const qty = Number(item.qty) || Number(item.quantity) || 1;
          const sz = normalizeSize(item.size) || 'M';

          await updateDoc(productRef, {
            [`sold.${sz}`]: (currentSold[sz] || 0) + qty
          });
          console.log(`Successfully updated sold count for ${sz}`);
        } catch (err) {
          console.error("Error updating product stock:", err);
          logger.error('ORDER_STOCK_DEDUCT_FAILED', 'inventory', err, { orderId: docRef.id, item });
        }
      }

      logger.info('ORDER_CREATE', 'orders', {
        orderId: docRef.id,
        displayId,
        customerName: newOrder.customerName,
        phone: newOrder.phone,
        governorate: newOrder.governorate,
        itemCount: normalizedItems.length,
        total: newOrder.total ?? newOrder.totals?.grandTotal ?? 0
      }, `Created new order ${displayId} for ${newOrder.customerName}`);

      get().logActivity(`Added new order for ${newOrder.customerName} (${displayId})`);
      console.log('Order process completed successfully');
      return { success: true, orderId: docRef.id, displayId };
    } catch (error) {
      console.error('Failed to add order:', error);
      logger.error('ORDER_CREATE', 'orders', error, { customerName: orderData.customerName, phone: orderData.phone }, 'Failed to add order');
    }
  },

  updateOrderStatus: async (orderId, newStatus) => {
    try {
      const order = get().orders.find(o => o.id === orderId);
      if (!order) return;

      const orderRef = doc(db, "orders", orderId);
      await updateDoc(orderRef, { status: newStatus });

      const isOldRestockingStatus = order.status === 'Cancelled' || order.status === 'Returned';
      const isNewRestockingStatus = newStatus === 'Cancelled' || newStatus === 'Returned';

      if (isOldRestockingStatus && !isNewRestockingStatus) {
        for (const item of order.items || []) {
          const productId = item.productId || item.id;
          if (!productId) continue;

          const productRef = doc(db, "products", productId);
          const productSnap = await getDoc(productRef);
          if (productSnap.exists()) {
            const data = productSnap.data();
            const currentSold = data.sold || { M: 0, L: 0, XL: 0, XXL: 0 };
            const qty = Number(item.qty) || Number(item.quantity) || 1;
            const sz = normalizeSize(item.size) || 'M';
            const newSold = { ...currentSold, [sz]: (currentSold[sz] || 0) + qty };
            await updateDoc(productRef, { sold: newSold });
          }
        }
      } else if (!isOldRestockingStatus && isNewRestockingStatus) {
        for (const item of order.items || []) {
          const productId = item.productId || item.id;
          if (!productId) continue;

          const productRef = doc(db, "products", productId);
          const productSnap = await getDoc(productRef);
          if (productSnap.exists()) {
            const data = productSnap.data();
            const currentSold = data.sold || { M: 0, L: 0, XL: 0, XXL: 0 };
            const qty = Number(item.qty) || Number(item.quantity) || 1;
            const sz = normalizeSize(item.size) || 'M';
            const newSold = { ...currentSold, [sz]: Math.max(0, (currentSold[sz] || 0) - qty) };
            await updateDoc(productRef, { sold: newSold });
          }
        }
      }

      if (isNewRestockingStatus) {
        logger.warn('ORDER_STATUS_RESTOCKED', 'orders', {
          orderId,
          displayId: order.displayId || orderId,
          oldStatus: order.status,
          newStatus
        }, `Order ${order.displayId || orderId} transitioned to ${newStatus}; items returned to inventory`);
      } else {
        logger.info('ORDER_STATUS_UPDATE', 'orders', {
          orderId,
          displayId: order.displayId || orderId,
          oldStatus: order.status,
          newStatus
        }, `Updated order ${order.displayId || orderId} status to ${newStatus}`);
      }

      get().logActivity(`Updated order ${order.displayId || orderId} status to ${newStatus}`);
    } catch (error) {
      console.error('Failed to update order status:', error);
      logger.error('ORDER_STATUS_UPDATE', 'orders', error, { orderId, newStatus });
    }
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

      // Normalize items in updatedData
      const normalizedUpdatedItems = (updatedData.items || []).map(item => ({
        ...item,
        size: normalizeSize(item.size) || 'M'
      }));

      // Only update inventory if status is not cancelled/returned
      const isActiveOrder = order.status !== 'Cancelled' && order.status !== 'Returned';

      if (isActiveOrder) {
        // Revert old items
        for (const item of order.items || []) {
          const productId = item.productId || item.id;
          if (!productId) continue;

          const productRef = doc(db, 'products', productId);
          const productSnap = await getDoc(productRef);
          if (productSnap.exists()) {
            const data = productSnap.data();
            const currentSold = data.sold || { M: 0, L: 0, XL: 0, XXL: 0 };
            const qty = Number(item.qty) || Number(item.quantity) || 1;
            const sz = normalizeSize(item.size) || 'M';
            const newSold = { ...currentSold, [sz]: Math.max(0, (currentSold[sz] || 0) - qty) };
            await updateDoc(productRef, { sold: newSold });
          }
        }
        // Apply new items
        for (const item of normalizedUpdatedItems) {
          const productId = item.productId || item.id;
          if (!productId) continue;

          const productRef = doc(db, 'products', productId);
          const productSnap = await getDoc(productRef);
          if (productSnap.exists()) {
            const data = productSnap.data();
            const currentSold = data.sold || { M: 0, L: 0, XL: 0, XXL: 0 };
            const qty = Number(item.qty) || Number(item.quantity) || 1;
            const sz = normalizeSize(item.size) || 'M';
            const newSold = { ...currentSold, [sz]: (currentSold[sz] || 0) + qty };
            await updateDoc(productRef, { sold: newSold });
          }
        }
      }

      await updateDoc(orderRef, {
        ...updatedData,
        items: normalizedUpdatedItems
      });

      logger.info('ORDER_UPDATE', 'orders', {
        orderId,
        displayId: order.displayId || orderId,
        updatedFields: Object.keys(updatedData),
        itemsCount: normalizedUpdatedItems.length
      }, `Updated order details: ${order.displayId || orderId}`);

      get().logActivity(`Updated order details: ${order.displayId || orderId}`);
    } catch (error) {
      console.error('Failed to update order:', error);
      logger.error('ORDER_UPDATE', 'orders', error, { orderId });
    }
  },

  addExpense: async (expenseData) => {
    try {
      const docRef = await addDoc(collection(db, "expenses"), {
        ...expenseData,
        createdAt: new Date().toISOString()
      });
      logger.info('EXPENSE_ADD', 'finance', {
        expenseId: docRef.id,
        category: expenseData.category,
        amount: expenseData.amount,
        date: expenseData.date
      }, `Added expense: ${expenseData.category} - ${expenseData.amount} EGP`);
      get().logActivity(`Added expense: ${expenseData.category} - ${expenseData.amount}`);
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error("Failed to add expense:", error);
      logger.error('EXPENSE_ADD', 'finance', error, { category: expenseData?.category, amount: expenseData?.amount });
      return { success: false, error };
    }
  },

  deleteExpense: async (id) => {
    try {
      const expense = get().expenses.find(e => e.id === id);
      await deleteDoc(doc(db, "expenses", id));
      logger.warn('EXPENSE_DELETE', 'finance', {
        expenseId: id,
        category: expense?.category,
        amount: expense?.amount
      }, `Deleted expense: ${expense?.category || id}`);
      if (expense) {
        get().logActivity(`Deleted expense: ${expense.category} - ${expense.amount}`);
      }
      return { success: true };
    } catch (error) {
      console.error("Failed to delete expense:", error);
      logger.error('EXPENSE_DELETE', 'finance', error, { expenseId: id });
      return { success: false, error };
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
            const sz = normalizeSize(item.size) || 'M';
            const newSold = { ...currentSold, [sz]: Math.max(0, (currentSold[sz] || 0) - qty) };
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

      logger.warn('ORDER_DELETE', 'orders', {
        orderId,
        displayId: order.displayId || orderId,
        customerName: order.customerName,
        total: order.total ?? order.totals?.grandTotal ?? 0
      }, `Soft-deleted order: ${order.displayId || orderId} (Inventory restored)`);

      get().logActivity(`Soft-deleted order: ${order.displayId || orderId} (Inventory restored)`);
    } catch (error) {
      console.error("Failed to soft-delete order:", error);
      logger.error('ORDER_DELETE', 'orders', error, { orderId });
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
            const sz = normalizeSize(item.size) || 'M';
            const newSold = { ...currentSold, [sz]: (currentSold[sz] || 0) + qty };
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

      logger.info('ORDER_RESTORE', 'orders', {
        orderId,
        displayId: order.displayId || orderId,
        customerName: order.customerName
      }, `Restored order: ${order.displayId || orderId} (Inventory re-allocated)`);

      get().logActivity(`Restored order: ${order.displayId || orderId} (Inventory re-allocated)`);
    } catch (error) {
      console.error("Failed to restore order:", error);
      logger.error('ORDER_RESTORE', 'orders', error, { orderId });
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

        logger.warn('BLACKLIST_ADD', 'crm', {
          phone: cleanPhone,
          customerName: customerName || '',
          reason: reason || 'High return risk / Delivery refusal'
        }, `Blacklisted customer: ${customerName || cleanPhone} (${cleanPhone})`);

        get().logActivity(`Blacklisted customer: ${customerName || cleanPhone} (${cleanPhone})`);
      } else {
        await deleteDoc(doc(db, "blacklist", cleanPhone));

        logger.info('BLACKLIST_REMOVE', 'crm', {
          phone: cleanPhone
        }, `Removed customer from blacklist: ${cleanPhone}`);

        get().logActivity(`Removed customer from blacklist: ${cleanPhone}`);
      }
    } catch (error) {
      console.error("Failed to toggle blacklist:", error);
      logger.error('BLACKLIST_MUTATE', 'crm', error, { phone, customerName, isBlacklisted });
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

      const outSize = normalizeSize(outgoingItem.size) || 'M';
      const inSize = normalizeSize(incomingItem?.size) || 'M';

      // 1. Decrement outgoing replacement item from inventory
      if (replacementProduct) {
        const productRef = doc(db, 'products', replacementProduct.id);
        const productSnap = await getDoc(productRef);
        if (productSnap.exists()) {
          const pData = productSnap.data();
          const currentSold = pData.sold || { M: 0, L: 0, XL: 0, XXL: 0 };
          const qty = Number(outgoingItem.qty) || 1;
          await updateDoc(productRef, {
            [`sold.${outSize}`]: (currentSold[outSize] || 0) + qty
          });

          await get().logInventoryMovement({
            productId: replacementProduct.id,
            productName: replacementProduct.name,
            sku: replacementProduct.sku,
            size: outSize,
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
              [`sold.${inSize}`]: Math.max(0, (currentSold[inSize] || 0) - retQty)
            });

            await get().logInventoryMovement({
              productId: returnedProduct.id,
              productName: returnedProduct.name,
              sku: returnedProduct.sku,
              size: inSize,
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
          size: outSize,
          qty: outQty,
          unitPrice
        }],
        incomingItem: {
          productId: incomingItem?.productId || '',
          productName: incomingItem?.productName || '',
          size: inSize,
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
        `تم إنشاء طلب استبدال مرتبط برقم: ${displayId} (مقاس بديل: ${outSize} مقابل ${inSize})`
      );

      logger.info('EXCHANGE_CREATE', 'orders', {
        parentOrderId: parentOrder.id,
        parentOrderDisplayId: parentOrder.displayId || parentOrder.orderId || parentOrder.id,
        exchangeDisplayId: displayId,
        outgoingProduct: replacementProduct?.name,
        outgoingSize: outSize,
        incomingSize: inSize,
        exchangeShippingFee: fee
      }, `Created exchange order ${displayId} for parent ${parentOrder.displayId || parentOrder.id}`);

      get().logActivity(`Created exchange order ${displayId} for parent ${parentOrder.displayId || parentOrder.id}`);
      return { success: true, displayId };
    } catch (error) {
      console.error("Failed to create exchange order:", error);
      logger.error('EXCHANGE_CREATE', 'orders', error, { parentOrderId: parentOrder?.id });
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
              const sz = normalizeSize(item.size) || 'M';
              await updateDoc(productRef, {
                [`sold.${sz}`]: Math.max(0, (currentSold[sz] || 0) - itemQty)
              });

              await get().logInventoryMovement({
                productId: product.id,
                productName: product.name,
                sku: product.sku,
                size: sz,
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

      logger.info('PARTIAL_DELIVERY', 'orders', {
        orderId,
        displayId: order.displayId || orderId,
        newTotal,
        itemsCount: itemsWithStatus.length
      }, `Processed partial delivery for order ${order.displayId || orderId}: New total ${newTotal} EGP`);

      get().logActivity(`Processed partial delivery for order ${order.displayId || orderId}: New total ${newTotal} EGP`);
      return { success: true };
    } catch (error) {
      console.error("Failed to process partial delivery:", error);
      logger.error('PARTIAL_DELIVERY', 'orders', error, { orderId });
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

        logger.warn('COURIER_FEE_VARIANCE', 'finance', {
          batchName,
          carrierName,
          feeVarianceTotal
        }, `Courier fee variance recorded as expense: ${feeVarianceTotal} EGP`);
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

      logger.info('COURIER_RECONCILE_BATCH', 'finance', {
        batchName: batchName || `Batch-${now.slice(0, 10)}`,
        carrierName: carrierName || 'Courier',
        reconciledCount: matchedOrders.length,
        feeVarianceTotal
      }, `Settled courier reconciliation batch: ${matchedOrders.length} orders marked Delivered - Collected (${carrierName})`);

      get().logActivity(`Reconciled courier settlement: ${matchedOrders.length} orders marked Delivered - Collected (${carrierName})`);
      return { success: true };
    } catch (error) {
      console.error("Failed to reconcile courier settlement:", error);
      logger.error('COURIER_RECONCILE_BATCH', 'finance', error, { batchName, carrierName });
      return { success: false, error };
    }
  },

  getBatchCapitalMetrics: () => {
    const { products, orders, expenses } = get();
    return calculateBatchCapitalMetrics(products, orders, expenses);
  }
}))

export default useStore;
