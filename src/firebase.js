// firebase.js - Firebase Configuration and Functions
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, updateDoc, doc, getDoc, getDocs, query, where, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';

// Firebase configuration - REPLACE WITH YOUR ACTUAL CONFIG
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
const storage = getStorage(app);
const auth = getAuth(app);

// ============ USER FUNCTIONS ============

// Sign in user anonymously (tracks device)
export const signInUser = async () => {
  try {
    const result = await signInAnonymously(auth);
    return result.user;
  } catch (error) {
    console.error("Error signing in:", error);
    throw error;
  }
};

// Get current user
export const getCurrentUser = () => {
  return auth.currentUser;
};

// Listen for auth state changes
export const onAuthChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};

// Create or update user profile
export const createUserProfile = async (userId, userData) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      ...userData,
      lastActive: serverTimestamp()
    }).catch(async () => {
      // If document doesn't exist, create it
      await addDoc(collection(db, 'users'), {
        userId,
        ...userData,
        createdAt: serverTimestamp(),
        lastActive: serverTimestamp()
      });
    });
    return true;
  } catch (error) {
    console.error("Error creating user profile:", error);
    throw error;
  }
};

// Get user data
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

// Check if user is admin
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

// Verify admin password and create admin record
export const verifyAdminPassword = async (userId, password, adminName) => {
  try {
    // Get the admin password from Firestore (you'll set this manually)
    const configRef = doc(db, 'config', 'adminPassword');
    const configSnap = await getDoc(configRef);
    
    if (configSnap.exists() && configSnap.data().password === password) {
      // Create admin record
      await updateDoc(doc(db, 'admins', userId), {
        name: adminName,
        status: 'open',
        createdAt: serverTimestamp()
      }).catch(async () => {
        await addDoc(collection(db, 'admins'), {
          userId,
          name: adminName,
          status: 'open',
          createdAt: serverTimestamp()
        });
      });
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error verifying admin:", error);
    return false;
  }
};

// Get all admins
export const getAllAdmins = async () => {
  try {
    const adminsSnapshot = await getDocs(collection(db, 'admins'));
    return adminsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error getting admins:", error);
    return [];
  }
};

// Update admin status
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

// ============ POST FUNCTIONS ============

// Create a new post
export const createPost = async (postData, files) => {
  try {
    // Upload files if any
    const uploadedFiles = [];
    if (files && files.length > 0) {
      for (const file of files) {
        const fileRef = ref(storage, `posts/${Date.now()}_${file.name}`);
        await uploadBytes(fileRef, file);
        const url = await getDownloadURL(fileRef);
        uploadedFiles.push({
          name: file.name,
          url: url,
          type: file.type
        });
      }
    }

    // Create post document
    const postRef = await addDoc(collection(db, 'posts'), {
      ...postData,
      files: uploadedFiles,
      createdAt: serverTimestamp()
    });

    return postRef.id;
  } catch (error) {
    console.error("Error creating post:", error);
    throw error;
  }
};

// Get all posts
export const getAllPosts = async () => {
  try {
    const postsSnapshot = await getDocs(collection(db, 'posts'));
    return postsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error getting posts:", error);
    return [];
  }
};

// Get single post
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

// Unlock post for a user
export const unlockPostForUser = async (postId, userId) => {
  try {
    await addDoc(collection(db, 'unlockedPosts'), {
      postId,
      userId,
      unlockedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error("Error unlocking post:", error);
    return false;
  }
};

// Check if user has unlocked a post
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

// Get all unlocked posts for a user
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

// Create a new chat
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

    // Send email notification (you'll integrate EmailJS here)
    await sendChatNotification(adminEmail, clientName, adminName, chatRef.id);

    return chatRef.id;
  } catch (error) {
    console.error("Error creating chat:", error);
    throw error;
  }
};

// Get chats for a user
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

// Send a message in a chat
export const sendMessage = async (chatId, senderId, senderName, message) => {
  try {
    await addDoc(collection(db, 'chats', chatId, 'messages'), {
      senderId,
      senderName,
      text: message,
      timestamp: serverTimestamp()
    });

    // Update last message in chat
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

// Listen to messages in real-time
export const listenToMessages = (chatId, callback) => {
  const messagesRef = collection(db, 'chats', chatId, 'messages');
  return onSnapshot(messagesRef, (snapshot) => {
    const messages = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    // Sort by timestamp
    messages.sort((a, b) => {
      if (!a.timestamp || !b.timestamp) return 0;
      return a.timestamp.seconds - b.timestamp.seconds;
    });
    callback(messages);
  });
};

// Close a chat
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

// ============ EMAIL NOTIFICATION FUNCTION ============
// This is a placeholder - you'll integrate EmailJS
const sendChatNotification = async (adminEmail, clientName, adminName, chatId) => {
  // TODO: Integrate with EmailJS
  console.log(`Email notification would be sent to ${adminEmail}`);
  console.log(`Client ${clientName} requested chat with ${adminName}`);
  console.log(`Chat ID: ${chatId}`);
  
  // EmailJS integration example:
  // emailjs.send('service_id', 'template_id', {
  //   to_email: adminEmail,
  //   client_name: clientName,
  //   admin_name: adminName,
  //   chat_link: `https://yourdomain.github.io/Homework-Helpers?chat=${chatId}`
  // });
};

export { db, storage, auth };
