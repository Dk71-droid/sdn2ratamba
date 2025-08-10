// js/firebase.js
// Inisialisasi Firebase dan ekspor objek serta fungsi yang dibutuhkan

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithCustomToken, // NEW: Import signInWithCustomToken
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  query,
  where,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  onSnapshot,
  serverTimestamp,
  getDocs,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Konfigurasi Firebase Anda
const firebaseConfig = {
  apiKey: "AIzaSyBWTYZH2OZuyq_mnbbxiap7iBg-17II55A", // Ganti dengan kunci API Firebase Anda
  authDomain: "tabungansiswa-8bbd6.firebaseapp.com",
  projectId: "tabungansiswa-8bbd6",
  storageBucket: "tabungansiswa-8bbd6.firebasestorage.app",
  messagingSenderId: "1068130708793",
  appId: "1:1068130708793:web:d6afeed38a9d42dd034ce8",
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Ekspor objek dan fungsi Firebase yang dibutuhkan
export {
  app,
  auth,
  db,
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithCustomToken, // NEW: Export signInWithCustomToken
  collection,
  query,
  where,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  onSnapshot,
  serverTimestamp,
  getDocs,
  deleteDoc,
};
