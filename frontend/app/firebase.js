import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };