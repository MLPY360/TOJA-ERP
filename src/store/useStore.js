import { create } from 'zustand'
import { collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, getDoc } from 'firebase/firestore'
import { db } from '../firebase'

const STORAGE_KEY = 'toja-inventory-v2-auth'

export const TEAM_USERS = [
  { id: 1, email: "youssefusameh@gmail.com", password: "youssef2004@", name: "Yousef", role: "Art Director" },
  { id: 2, email: "ahmedarnous487@gmail.com", password: "ahmed2204@", name: "Ahmed", role: "Operations" },
  { id: 3, email: "mostafaebrabim42@gmail.com", password: "mostafa2124@", name: "Moustafa", role: "Project Manager" },
  { id: 4, email: "mohameedhasan81@gmail.com", password: "memo2005@", name: "Mohamed", role: "Marketing" }
]

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

    set({ listenersInitialized: true });
  },

  toggleLanguage: () => {
    set(state => ({ language: state.language === 'en' ? 'ar' : 'en' }));
    saveLocalData(get());
  },

  login: (email, password) => {
    const user = TEAM_USERS.find(u => u.email === email && u.password === password)
    if (user) {
      const userData = { id: user.id, name: user.name, email: user.email, role: user.role };
      set({ currentUser: userData })
      localStorage.setItem('toja_user', JSON.stringify(userData));
      get().logActivity('Logged into the system')
      return true
    }
    return false
  },

  logout: () => {
    const user = get().currentUser;
    if (user) {
      get().logActivity('Logged out of the system')
      set({ currentUser: null })
      localStorage.removeItem('toja_user');
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

    if (order.status === 'Cancelled' && newStatus !== 'Cancelled') {
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
    } else if (order.status !== 'Cancelled' && newStatus === 'Cancelled') {
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
  }
}))

export default useStore;
