// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA78jO4rnYMC7TS93XvThnzWZxAJgy1Jn0",
  authDomain: "ganga-maxx-b2b.firebaseapp.com",
  projectId: "ganga-maxx-b2b",
  storageBucket: "ganga-maxx-b2b.firebasestorage.app",
  messagingSenderId: "89022591023",
  appId: "1:89022591023:web:4e74f35ca96cd9cc8756da",
  measurementId: "G-C3LTRQ11FL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
