import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyARq1VKz107bdMCCGCeRcKwIVzJJ2srY3A",
  authDomain: "flowmaps-5679e.firebaseapp.com",
  databaseURL: "https://flowmaps-5679e-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "flowmaps-5679e",
  storageBucket: "flowmaps-5679e.firebasestorage.app",
  messagingSenderId: "215130069403",
  appId: "1:215130069403:web:6a1be032135620ca94e93e",
  measurementId: "G-VSYEMG1PLM"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

const db = getFirestore(app);

export { auth, db };