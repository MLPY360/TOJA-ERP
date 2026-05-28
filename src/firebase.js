import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCePNvIrwlz4mci9hvV4YEtbYPiR4ivh1w",
  authDomain: "toja-1999.firebaseapp.com",
  projectId: "toja-1999",
  storageBucket: "toja-1999.firebasestorage.app",
  messagingSenderId: "504908183165",
  appId: "1:504908183165:web:8e345238151ea4c7ec6314"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
