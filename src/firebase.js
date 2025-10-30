// src/firebase.js - Firebase with Email/Password Authentication
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
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail
} from 'firebase/auth';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCQAiAl7goHstZk39o0NceX_tgZi02JIoA",
  authDomain: "homework-helpers-df453.firebaseapp.com",
  projectId: "homework-helpers-df453",
  storageBucket: "homework-helpers-df453.firebasestorage.app",
  messagingSenderId: "430379402517",
  appId: "1:430379402517:web:4af48ebaea96f9fd02151c",
  measurementId: "G-1BH20CBV18"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
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
    return { success: true, user: result.user };
  } catch (error) {
    console.error("Error signing up:", error);
    let message = "Error creating account";
    if (error.code === 'auth/email-already-in-use') {
      message = "This email is already registered. Please sign in instead.";
    } else if (error.code === 'auth/weak-password') {
      message = "Password should be at least 6 characters";
    } else if (error.code === 'auth/invalid-email') {
      message = "Invalid email address";
    }
    return { success: false, error: message };
  }
};

export const signInUser = async (email, password) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: result.user };
  } catch (error) {
    console.error("Error signing in:", error);
    let message = "Error signing in";
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
      message = "Invalid email or password";
    } else if (error.code === 'auth/invalid-email') {
      message = "Invalid email address";
    } else if (error.code === 'auth/too-many-requests') {
      message = "Too many failed attempts. Please try again later.";
    }
    return { success: false, error: message };
  }
};

export const signOutUser = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    console.error("Error signing out:", error);
    return { success: false, error: "Error signing out" };
  }
};

export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error) {
    console.error("Error resetting password:", error);
    return { success: false, error: "Error sending reset email" };
  }
};

export const getCurrentUser = () => {
  return auth.currentUser;
};

export const onAuthChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};

// ============ USER FUNCTIONS ============

export const createUserProfile = async (userId, userData) => {
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      ...userData,
      createdAt: serverTimestamp(),
      lastActive: serverTimestamp()
    }, { merge: true });
    return true;
  } catch (error) {
    console.error("Error creating user profile:", error);
    throw error;
  }
};

export const getUserData = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      return userSnap.data();
    }
    return null;
  } catch (error) {
    console.error("Error getting user data:", error);
    throw error;
  }
};

// ============ ADMIN FUNCTIONS ============

export const checkIsAdmin = async (userId) => {
  try {
    const adminRef = doc(db, 'admins', userId);
    const adminSnap = await getDoc(adminRef);
    return adminSnap.exists();
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
};

export const verifyAdminPassword = async (userId, password, adminName, adminEmail) => {
  try {
    const configRef = doc(db, 'config', 'adminPassword');
    const configSnap = await getDoc(configRef);
    
    if (configSnap.exists() && configSnap.data().password === password) {
      const adminRef = doc(db, 'admins', userId);
      await setDoc(adminRef, {
        userId,
        name: adminName,
        email: adminEmail,
        status: 'open',
        createdAt: serverTimestamp()
      }, { merge: true });
      
      await createUserProfile(userId, { 
        name: adminName, 
        isAdmin: true,
        email: adminEmail 
      });
      
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error verifying admin:", error);
    return false;
  }
};

export const getAllAdmins = async () => {
  try {
    const adminsSnapshot = await getDocs(collection(db, 'admins'));
    return adminsSnapshot.docs.map(doc => ({
      id: doc.id,
      userId: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error getting admins:", error);
    return [];
  }
};

export const updateAdminStatus = async (userId, status) => {
  try {
    const adminRef = doc(db, 'admins', userId);
    await updateDoc(adminRef, {
      status: status,
      lastUpdated: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error("Error updating admin status:", error);
    return false;
  }
};

export const getAdminData = async (userId) => {
  try {
    const adminRef = doc(db, 'admins', userId);
    const adminSnap = await getDoc(adminRef);
    if (adminSnap.exists()) {
      return adminSnap.data();
    }
    return null;
  } catch (error) {
    console.error("Error getting admin data:", error);
    return null;
  }
};

// ============ POST FUNCTIONS ============

export const createPost = async (postData) => {
  try {
    const postRef = await addDoc(collection(db, 'posts'), {
      ...postData,
      createdAt: serverTimestamp()
    });
    return postRef.id;
  } catch (error) {
    console.error("Error creating post:", error);
    throw error;
  }
};

export const getAllPosts = async () => {
  try {
    const postsQuery = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const postsSnapshot = await getDocs(postsQuery);
    return postsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error getting posts:", error);
    return [];
  }
};

export const getPost = async (postId) => {
  try {
    const postRef = doc(db, 'posts', postId);
    const postSnap = await getDoc(postRef);
    if (postSnap.exists()) {
      return { id: postSnap.id, ...postSnap.data() };
    }
    return null;
  } catch (error) {
    console.error("Error getting post:", error);
    return null;
  }
};

export const unlockPostForUser = async (postId, userId, unlockedBy) => {
  try {
    await addDoc(collection(db, 'unlockedPosts'), {
      postId,
      userId,
      unlockedBy,
      unlockedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error("Error unlocking post:", error);
    return false;
  }
};

export const checkPostUnlocked = async (postId, userId) => {
  try {
    const q = query(
      collection(db, 'unlockedPosts'),
      where('postId', '==', postId),
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error("Error checking post unlock:", error);
    return false;
  }
};

export const getUserUnlockedPosts = async (userId) => {
  try {
    const q = query(
      collection(db, 'unlockedPosts'),
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data().postId);
  } catch (error) {
    console.error("Error getting unlocked posts:", error);
    return [];
  }
};

// ============ CHAT FUNCTIONS ============

export const createChat = async (clientId, clientName, adminId, adminName, adminEmail) => {
  try {
    const chatRef = await addDoc(collection(db, 'chats'), {
      clientId,
      clientName,
      adminId,
      adminName,
      adminEmail,
      status: 'active',
      createdAt: serverTimestamp(),
      lastMessage: null
    });
    return chatRef.id;
  } catch (error) {
    console.error("Error creating chat:", error);
    throw error;
  }
};

export const getUserChats = async (userId, isAdmin = false) => {
  try {
    const field = isAdmin ? 'adminId' : 'clientId';
    const q = query(
      collection(db, 'chats'),
      where(field, '==', userId),
      where('status', '==', 'active')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error getting chats:", error);
    return [];
  }
};

export const getAllActiveChats = async () => {
  try {
    const q = query(
      collection(db, 'chats'),
      where('status', '==', 'active')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error getting all chats:", error);
    return [];
  }
};

export const sendMessage = async (chatId, senderId, senderName, message) => {
  try {
    await addDoc(collection(db, 'chats', chatId, 'messages'), {
      senderId,
      senderName,
      text: message,
      timestamp: serverTimestamp()
    });

    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, {
      lastMessage: message,
      lastMessageTime: serverTimestamp()
    });

    return true;
  } catch (error) {
    console.error("Error sending message:", error);
    return false;
  }
};

export const listenToMessages = (chatId, callback) => {
  try {
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));
    
    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(messages);
    });
  } catch (error) {
    console.error("Error listening to messages:", error);
    return () => {};
  }
};

export const closeChat = async (chatId) => {
  try {
    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, {
      status: 'closed',
      closedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error("Error closing chat:", error);
    return false;
  }
};

export const getChat = async (chatId) => {
  try {
    const chatRef = doc(db, 'chats', chatId);
    const chatSnap = await getDoc(chatRef);
    if (chatSnap.exists()) {
      return { id: chatSnap.id, ...chatSnap.data() };
    }
    return null;
  } catch (error) {
    console.error("Error getting chat:", error);
    return null;
  }
};

// ============ SEARCH FUNCTIONS ============

export const searchUserByName = async (name) => {
  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    
    const users = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(user => user.name && user.name.toLowerCase().includes(name.toLowerCase()));
    
    return users;
  } catch (error) {
    console.error("Error searching users:", error);
    return [];
  }
};

export { db, auth };
