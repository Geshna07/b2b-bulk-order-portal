// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA4oQgmRW9MImq7nlI2OR8aBBwmijc2jVA",
  authDomain: "startup-glass-23kpg.firebaseapp.com",
  projectId: "startup-glass-23kpg",
  storageBucket: "startup-glass-23kpg.firebasestorage.app",
  messagingSenderId: "992191424492",
  appId: "1:992191424492:web:195814000683d8a7dd02c9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, "ai-studio-b2bbulkorderport-a4a0694c-1e99-4e4c-b915-7c9a490b1e92");
const auth = getAuth(app);

export { app, db, auth };
