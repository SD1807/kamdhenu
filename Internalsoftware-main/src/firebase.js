// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";



// ✅ Replace the following with your own Firebase config
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCmzyAPxp6jhYW9YZvPCD8c-lwshBBnR30",
  authDomain: "fo-data-portal.firebaseapp.com",
  projectId: "fo-data-portal",
  storageBucket: "fo-data-portal.appspot.com",
  messagingSenderId: "299000972057",
  appId: "1:299000972057:web:075ef8dbdef9a5fe413b88",
  measurementId: "G-NNVG3BZ8LE"
};
// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore and export
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
