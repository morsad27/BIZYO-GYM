import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCMZMepKka1qonx_QDYCN5mWIiIoSfM0-E",
    authDomain: "bizyo-gym-management.firebaseapp.com",
    projectId: "bizyo-gym-management",
    storageBucket: "bizyo-gym-management.firebasestorage.app",
    messagingSenderId: "640136574067",
    appId: "1:640136574067:web:8c72b7ddc64ea1697c2606"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);