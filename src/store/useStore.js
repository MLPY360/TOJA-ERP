import { create } from 'zustand'
import { collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, getDoc } from 'firebase/firestore'
import { db, auth } from '../firebase'
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth'

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
  } catch {}
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
  expenses: [],
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
      const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      set({ orders });
    });

    onSnapshot(query(collection(db, "activityLogs"), orderBy("timestamp", "desc")), (snapshot) => {
      const activityLogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      set({ activityLogs });
    });

    onSnapshot(query(collection(db, "expenses"), orderBy("date", "desc")), (snapshot) => {
      const expenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      set({ expenses });
    });

    set({ listenersInitialized: true });
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

  reportDefectiveItem: async (id, size) => {
    const productRef = doc(db, "products", id);
    const productSnap = await getDoc(productRef);
    if (productSnap.exists()) {
      const data = productSnap.data();
      const currentStock = data.initialStock[size] - data.sold[size];
      if (currentStock > 0) {
        await updateDoc(productRef, {
          [`initialStock.${size}`]: data.initialStock[size] - 1
        });
        get().logActivity(`تم تسجيل قطعة تالفة: ${data.name} (مقاس ${size})`)
      }
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
          console.log("Attempting to update product ID:", item.productId);
          const productRef = doc(db, 'products', item.productId);
          const productSnap = await getDoc(productRef);
          
          if (!productSnap.exists()) {
            console.error(`Product doc NOT FOUND for ID: ${item.productId}`);
            continue; 
          }

          const productData = productSnap.data();
          const currentSold = productData.sold || { M: 0, L: 0, XL: 0, XXL: 0 };
          
          await updateDoc(productRef, {
            [`sold.${item.size}`]: (currentSold[item.size] || 0) + Number(item.qty)
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
        const productRef = doc(db, "products", item.productId);
        const productSnap = await getDoc(productRef);
        if (productSnap.exists()) {
          const data = productSnap.data();
          const currentSold = data.sold || { M: 0, L: 0, XL: 0, XXL: 0 };
          const newSold = { ...currentSold, [item.size]: (currentSold[item.size] || 0) + item.qty };
          await updateDoc(productRef, { sold: newSold });
        }
      }
    } else if (!isOldRestockingStatus && isNewRestockingStatus) {
      for (const item of order.items) {
        const productRef = doc(db, "products", item.productId);
        const productSnap = await getDoc(productRef);
        if (productSnap.exists()) {
          const data = productSnap.data();
          const currentSold = data.sold || { M: 0, L: 0, XL: 0, XXL: 0 };
          const newSold = { ...currentSold, [item.size]: Math.max(0, (currentSold[item.size] || 0) - item.qty) };
          await updateDoc(productRef, { sold: newSold });
        }
      }
    }

    get().logActivity(`Updated order ${order.displayId || orderId} status to ${newStatus}`);
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
  }
}))

export default useStore;
