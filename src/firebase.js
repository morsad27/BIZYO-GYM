import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDPNwCWwy6a4tL3HNKkT7A4ScIbZTljdFc",
  authDomain: "bizyo-management.firebaseapp.com",
  projectId: "bizyo-management",
  storageBucket: "bizyo-management.firebasestorage.app",
  messagingSenderId: "705212536309",
  appId: "1:705212536309:web:6d091c0eea909212b63cbc"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);