// src/firebase.js - Complete Firebase Configuration with Email/Password Auth
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  setDoc,
  updateDoc, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  onSnapshot, 
  serverTimestamp,
  orderBy 
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail
} from 'firebase/auth';

// Firebase configuration - REPLACE WITH YOUR ACTUAL CONFIG FROM FIREBASE CONSOLE
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

// ============ AUTHENTICATION FUNCTIONS ============

export const signUpUser = async (email, password, name) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    // Create user profile immediately after signup
    await createUserProfile(result.user.uid, {
      name,
      email,
      isAdmin: false
    });
    return result.user;
  } catch (error) {
    console.error("Error signing up:", error);
    if
