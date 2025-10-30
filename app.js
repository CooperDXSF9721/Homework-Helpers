// app.js - Complete JavaScript for Homework Helpers
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
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
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// YOUR FIREBASE CONFIG
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
const auth = getAuth(app);
const db = getFirestore(app);

// Global state
let currentUser = null;
let isAdmin = false;
let authMode = 'signin'; // 'signin', 'signup', 'reset'
let currentView = 'posts';
let selectedChatId = null;
let selectedPostId = null;
let fileLinks = [];
let chatUnsubscribe = null;

// DOM Elements
const authContainer = document.getElementById('authContainer');
const appContainer = document.getElementById('appContainer');
const authError = document.getElementById('authError');
const authSubtitle = document.getElementById('authSubtitle');
const nameField = document.getElementById('nameField');
const passwordField = document.getElementById('passwordField');
const passwordHelp = document.getElementById('passwordHelp');
const forgotPasswordLink = document.getElementById('forgotPasswordLink');
const authSubmitBtn = document.getElementById('authSubmitBtn');
const switchModeText = document.getElementById('switchModeText');
const switchModeLink = document.getElementById('switchModeLink');

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    setupAuthListeners();
    setupAppListeners();
    
    // Listen for auth state changes
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            await loadUserData();
        } else {
            showAuth();
        }
    });
});

// ============ AUTH FUNCTIONS ============

function setupAuthListeners() {
    // Toggle password visibility
    document.getElementById('togglePassword').addEventListener('click', () => {
        const passwordInput = document.getElementById('authPassword');
        const btn = document.getElementById('togglePassword');
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            btn.textContent = '🙈';
        } else {
            passwordInput.type = 'password';
            btn.textContent = '👁️';
        }
    });

    // Submit button
    authSubmitBtn.addEventListener('click', handleAuthSubmit);

    // Enter key
    document.querySelectorAll('#authForm input').forEach(input => {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleAuthSubmit();
        });
    });

    // Switch mode link
    switchModeLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (authMode === 'signin') {
            setAuthMode('signup');
        } else {
            setAuthMode('signin');
        }
    });

    // Forgot password link
    document.getElementById('forgotPasswordBtn').addEventListener('click', (e) => {
        e.preventDefault();
        setAuthMode('reset');
    });
}

function setAuthMode(mode) {
    authMode = mode;
    authError.style.display = 'none';

    if (mode === 'signin') {
        authSubtitle.textContent = 'Sign in to your account';
        nameField.style.display = 'none';
        passwordField.style.display = 'block';
        passwordHelp.style.display = 'none';
        forgotPasswordLink.style.display = 'block';
        authSubmitBtn.textContent = 'Sign In';
        switchModeText.innerHTML = 'Don\'t have an account? <a href="#" id="switchModeLink">Sign up</a>';
    } else if (mode === 'signup') {
        authSubtitle.textContent = 'Create a new account';
        nameField.style.display = 'block';
        passwordField.style.display = 'block';
        passwordHelp.style.display = 'block';
        forgotPasswordLink.style.display = 'none';
        authSubmitBtn.textContent = 'Create Account';
        switchModeText.innerHTML = 'Already have an account? <a href="#" id="switchModeLink">Sign in</a>';
    } else if (mode === 'reset') {
        authSubtitle.textContent = 'Reset your password';
        nameField.style.display = 'none';
        passwordField.style.display = 'none';
        passwordHelp.style.display = 'none';
        forgotPasswordLink.style.display = 'none';
        authSubmitBtn.textContent = 'Send Reset Email';
        switchModeText.innerHTML = 'Already have an account? <a href="#" id="switchModeLink">Sign in</a>';
    }

    // Re-attach event listener
    document.getElementById('switchModeLink').addEventListener('click', (e) => {
        e.preventDefault();
        if (authMode === 'signin') {
            setAuthMode('signup');
        } else {
            setAuthMode('signin');
        }
    });
}

async function handleAuthSubmit() {
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
    const name = document.getElementById('authName').value.trim();

    authError.style.display = 'none';

    try {
        showLoading(true);

        if (authMode === 'signin') {
            if (!email || !password) {
                showError('Please enter email and password');
                return;
            }
            await signInWithEmailAndPassword(auth, email, password);
        } else if (authMode === 'signup') {
            if (!name || !email || !password) {
                showError('Please fill in all fields');
                return;
            }
            if (password.length < 6) {
                showError('Password must be at least 6 characters');
                return;
            }
            const userCred = await createUserWithEmailAndPassword(auth, email, password);
            await setDoc(doc(db, 'users', userCred.user.uid), {
                name: name,
                email: email,
                isAdmin: false,
                createdAt: serverTimestamp()
            });
        } else if (authMode === 'reset') {
            if (!email) {
                showError('Please enter your email address');
                return;
            }
            await sendPasswordResetEmail(auth, email);
            alert('Password reset email sent! Check your inbox.');
            setAuthMode('signin');
            document.getElementById('authEmail').value = '';
        }
    } catch (error) {
        console.error('Auth error:', error);
        let message = 'An error occurred';
        if (error.code === 'auth/email-already-in-use') {
            message = 'This email is already registered';
        } else if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
            message = 'Invalid email or password';
        } else if (error.code === 'auth/invalid-email') {
            message = 'Invalid email address';
        } else if (error.code === 'auth/weak-password') {
            message = 'Password should be at least 6 characters';
        }
        showError(message);
    } finally {
        showLoading(false);
    }
}

function showError(message) {
    authError.textContent = message;
    authError.style.display = 'block';
}

function showAuth() {
    authContainer.style.display = 'flex';
    appContainer.style.display = 'none';
}

function showApp() {
    authContainer.style.display = 'none';
    appContainer.style.display = 'block';
}

// ============ APP FUNCTIONS ============

async function loadUserData() {
    try {
        showLoading(true);
        
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (!userDoc.exists()) {
            await signOut(auth);
            return;
        }

        const userData = userDoc.data();
        document.getElementById('userDisplay').textContent = `${userData.name}`;

        // Check if admin
        const adminDoc = await getDoc(doc(db, 'admins', currentUser.uid));
        isAdmin = adminDoc.exists();

        if (isAdmin) {
            document.getElementById('userDisplay').textContent = `👑 ${userData.name}`;
            document.getElementById('createPostBtn').style.display = 'block';
            document.getElementById('adminProfileBtn').style.display = 'block';
            document.getElementById('chatsTitle').textContent = 'All Chats';
            const adminData = adminDoc.data();
            document.getElementById('adminInfo').innerHTML = `
                <p><strong>Name:</strong> ${adminData.name}</p>
                <p><strong>Email:</strong> ${adminData.email}</p>
            `;
        }

        showApp();
        await loadPosts();
        await loadChats();
    } catch (error) {
        console.error('Error loading user data:', error);
    } finally {
        showLoading(false);
    }
}

function setupAppListeners() {
    // Secret admin button
    document.getElementById('secretAdminBtn').addEventListener('click', () => {
        document.getElementById('adminModal').style.display = 'flex';
    });

    // Sign out
    document.getElementById('signOutBtn').addEventListener('click', async () => {
        await signOut(auth);
        location.reload();
    });

    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.dataset.view;
            switchView(view);
        });
    });

    // Create post button
    document.getElementById('createPostBtn').addEventListener('click', () => {
        document.getElementById('createPostModal').style.display = 'flex';
        fileLinks = [];
        updateFileLinksDisplay();
    });

    // Request chat button
    document.getElementById('requestChatBtn').addEventListener('click', async () => {
        await loadAdminsForChat();
        document.getElementById('requestChatModal').style.display = 'flex';
    });

    // Close modals
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.modal').style.display = 'none';
        });
    });

    // Admin login
    document.getElementById('adminLoginBtn').addEventListener('click', handleAdminLogin);

    // Create post
    document.getElementById('submitPostBtn').addEventListener('click', handleCreatePost);

    // Add file link
    document.getElementById('addFileLinkBtn').addEventListener('click', () => {
        const url = prompt('Enter file URL (Google Drive, Dropbox, etc.):');
        if (url && url.trim()) {
            const name = prompt('Enter a name for this file:', 'Attached File');
            fileLinks.push({ url: url.trim(), name: name || 'Attached File' });
            updateFileLinksDisplay();
        }
    });

    // Image URL preview
    document.getElementById('postImageUrl').addEventListener('input', (e) => {
        const url = e.target.value;
        const preview = document.getElementById('imagePreview');
        const img = document.getElementById('previewImg');
        if (url) {
            img.src = url;
            preview.style.display = 'block';
        } else {
            preview.style.display = 'none';
        }
    });

    // Status buttons
    document.getElementById('statusOpenBtn').addEventListener('click', () => updateAdminStatus('open'));
    document.getElementById('statusAwayBtn').addEventListener('click', () => updateAdminStatus('away'));

    // Search student
    document.getElementById('searchStudentBtn').addEventListener('click', searchStudents);

    // Chat actions
    document.getElementById('sendMessageBtn').addEventListener('click', sendMessage);
    document.getElementById('messageInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
    document.getElementById('backToChatsList').addEventListener('click', () => {
        if (chatUnsubscribe) chatUnsubscribe();
        switchView('chats');
    });
    document.getElementById('closeChatBtn').addEventListener('click', closeChat);
}

function switchView(view) {
    currentView = view;
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.view === view) {
            btn.classList.add('active');
        }
    });

    document.querySelectorAll('.view').forEach(v => {
        v.classList.remove('active');
    });

    if (view === 'posts') {
        document.getElementById('postsView').classList.add('active');
    } else if (view === 'chats') {
        document.getElementById('chatsView').classList.add('active');
        loadChats();
    } else if (view === 'profile') {
        document.getElementById('profileView').classList.add('active');
    } else if (view === 'chatWindow') {
        document.getElementById('chatWindowView').classList.add('active');
    }
}

// ============ ADMIN FUNCTIONS ============

async function handleAdminLogin() {
    const name = document.getElementById('adminName').value.trim();
    const email = document.getElementById('adminEmail').value.trim();
    const password = ('thehwguys')

    if (!name || !email || !password) {
        alert('Please fill in all fields');
        return;
    }

    try {
        // Check password
        const configDoc = await getDoc(doc(db, 'config', 'adminPassword'));
        if (!configDoc.exists() || configDoc.data().password !== password) {
            alert('Incorrect password');
            return;
        }

        // Create admin record
        await setDoc(doc(db, 'admins', currentUser.uid), {
            userId: currentUser.uid,
            name: name,
            email: email,
            status: 'open',
            createdAt: serverTimestamp()
        });

        // Update user record
        await updateDoc(doc(db, 'users', currentUser.uid), {
            isAdmin: true
        });

        alert('Admin access granted!');
        document.getElementById('adminModal').style.display = 'none';
        location.reload();
    } catch (error) {
        console.error('Admin login error:', error);
        alert('Error logging in as admin');
    }
}

async function updateAdminStatus(status) {
    try {
        await updateDoc(doc(db, 'admins', currentUser.uid), {
            status: status
        });

        document.getElementById('statusOpenBtn').classList.remove('active');
        document.getElementById('statusAwayBtn').classList.remove('active');
        if (status === 'open') {
            document.getElementById('statusOpenBtn').classList.add('active');
        } else {
            document.getElementById('statusAwayBtn').classList.add('active');
        }
    } catch (error) {
        console.error('Error updating status:', error);
    }
}

// ============ POST FUNCTIONS ============

async function loadPosts() {
    try {
        const postsQuery = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
        const postsSnapshot = await getDocs(postsQuery);
        
        // Get unlocked posts for current user
        const unlockedQuery = query(
            collection(db, 'unlockedPosts'),
            where('userId', '==', currentUser.uid)
        );
        const unlockedSnapshot = await getDocs(unlockedQuery);
        const unlockedPostIds = unlockedSnapshot.docs.map(doc => doc.data().postId);

        const postsList = document.getElementById('postsList');
        postsList.innerHTML = '';

        if (postsSnapshot.empty) {
            postsList.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📚</div><p>No study materials yet. Check back soon!</p></div>';
            return;
        }

        postsSnapshot.forEach(docSnapshot => {
            const post = docSnapshot.data();
            const postId = docSnapshot.id;
            const isUnlocked = unlockedPostIds.includes(postId);

            const postCard = createPostCard(post, postId, isUnlocked);
            postsList.appendChild(postCard);
        });
    } catch (error) {
        console.error('Error loading posts:', error);
    }
}

function createPostCard(post, postId, isUnlocked) {
    const card = document.createElement('div');
    card.className = 'post-card';

    let html = `
        <div class="post-header">
            <div class="post-title">${post.title}</div>
            <div class="post-lock">${isUnlocked ? '✅' : '🔒'}</div>
        </div>
    `;

    if (post.imageUrl && !isUnlocked) {
        // Don't show image if locked
    } else if (post.imageUrl && isUnlocked) {
        html += `<img src="${post.imageUrl}" class="post-image" alt="${post.title}">`;
    }

    html += `
        <div class="post-price-section">
            <div class="post-price">$${post.price}</div>
            <div class="post-author">by ${post.createdBy}</div>
        </div>
    `;

    if (isUnlocked) {
        html += `<div class="post-content">${post.content || 'No additional content'}</div>`;
        if (post.fileLinks && post.fileLinks.length > 0) {
            html += '<div class="file-links">';
            post.fileLinks.forEach(link => {
                html += `<a href="${link.url}" target="_blank" class="file-link">📎 ${link.name}</a>`;
            });
            html += '</div>';
        }
    } else {
        html += '<p class="post-message">🔒 This material is locked. Pay in person to unlock access.</p>';
        if (isAdmin) {
            html += `<button onclick="unlockPost('${postId}')" class="btn-success">Unlock for Student</button>`;
        }
    }

    card.innerHTML = html;
    return card;
}

async function handleCreatePost() {
    const title = document.getElementById('postTitle').value.trim();
    const price = document.getElementById('postPrice').value;
    const content = document.getElementById('postContent').value.trim();
    const imageUrl = document.getElementById('postImageUrl').value.trim();

    if (!title || !price) {
        alert('Please fill in title and price');
        return;
    }

    try {
        showLoading(true);

        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        const userName = userDoc.data().name;

        await addDoc(collection(db, 'posts'), {
            title: title,
            price: parseFloat(price),
            content: content,
            imageUrl: imageUrl,
            fileLinks: fileLinks,
            createdBy: userName,
            createdById: currentUser.uid,
            createdAt: serverTimestamp()
        });

        document.getElementById('createPostModal').style.display = 'none';
        document.getElementById('postTitle').value = '';
        document.getElementById('postPrice').value = '';
        document.getElementById('postContent').value = '';
        document.getElementById('postImageUrl').value = '';
        document.getElementById('imagePreview').style.display = 'none';
        fileLinks = [];

        alert('Post created successfully!');
        await loadPosts();
    } catch (error) {
        console.error('Error creating post:', error);
        alert('Error creating post');
    } finally {
        showLoading(false);
    }
}

function updateFileLinksDisplay() {
    const container = document.getElementById('fileLinksContainer');
    container.innerHTML = '';
    
    fileLinks.forEach((link, index) => {
        const div = document.createElement('div');
        div.className = 'file-link-item';
        div.innerHTML = `
            <span>${link.name}: ${link.url.substring(0, 40)}...</span>
            <button onclick="removeFileLink(${index})" class="remove-file">Remove</button>
        `;
        container.appendChild(div);
    });
}

window.removeFileLink = function(index) {
    fileLinks.splice(index, 1);
    updateFileLinksDisplay();
};

window.unlockPost = function(postId) {
    selectedPostId = postId;
    document.getElementById('unlockPostModal').style.display = 'flex';
    document.getElementById('studentSearch').value = '';
    document.getElementById('searchResults').innerHTML = '';
};

async function searchStudents() {
    const searchQuery = document.getElementById('studentSearch').value.trim();
    if (!searchQuery) return;

    try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const results = [];
        
        usersSnapshot.forEach(doc => {
            const user = doc.data();
            if (user.name && user.name.toLowerCase().includes(searchQuery.toLowerCase())) {
                results.push({ id: doc.id, ...user });
            }
        });

        const resultsDiv = document.getElementById('searchResults');
        resultsDiv.innerHTML = '';

        if (results.length === 0) {
            resultsDiv.innerHTML = '<p class="empty-state">No students found</p>';
            return;
        }

        results.forEach(user => {
            const div = document.createElement('div');
            div.className = 'search-result';
            div.innerHTML = `
                <div><strong>${user.name}</strong></div>
                <div style="font-size: 12px; color: #999;">${user.email}</div>
            `;
            div.onclick = () => unlockPostForStudent(user.id, user.name);
            resultsDiv.appendChild(div);
        });
    } catch (error) {
        console.error('Error searching students:', error);
    }
}

async function unlockPostForStudent(userId, userName) {
    try {
        await addDoc(collection(db, 'unlockedPosts'), {
            postId: selectedPostId,
            userId: userId,
            unlockedBy: currentUser.uid,
            unlockedAt: serverTimestamp()
        });

        alert(`Post unlocked for ${userName}`);
        document.getElementById('unlockPostModal').style.display = 'none';
        await loadPosts();
    } catch (error) {
        console.error('Error unlocking post:', error);
        alert('Error unlocking post');
    }
}

// ============ CHAT FUNCTIONS ============

async function loadChats() {
    try {
        let chatsQuery;
        if (isAdmin) {
            chatsQuery = query(
                collection(db, 'chats'),
                where('status', '==', 'active')
            );
        } else {
            chatsQuery = query(
                collection(db, 'chats'),
                where('clientId', '==', currentUser.uid),
                where('status', '==', 'active')
            );
        }

        const chatsSnapshot = await getDocs(chatsQuery);
        const chatsList = document.getElementById('chatsList');
        chatsList.innerHTML = '';

        if (chatsSnapshot.empty) {
            chatsList.innerHTML = '<div class="empty-state"><div class="empty-state-icon">💬</div><p>No active chats. Request help to get started!</p></div>';
            return;
        }

        chatsSnapshot.forEach(docSnapshot => {
            const chat = docSnapshot.data();
            const chatId = docSnapshot.id;

            const chatCard = document.createElement('div');
            chatCard.className = 'chat-card';
            chatCard.onclick = () => openChat(chatId, chat);

            chatCard.innerHTML = `
                <div class="chat-card-header">
                    <span style="font-size: 24px;">💬</span>
                    <div>
                        <h3>${isAdmin ? chat.clientName : `Chat with ${chat.adminName}`}</h3>
                        <p class="chat-card-subtitle">${isAdmin ? `with ${chat.adminName}` : ''}</p>
                    </div>
                </div>
                ${chat.lastMessage ? `<p class="chat-last-message">${chat.lastMessage}</p>` : ''}
                <p class="chat-date">Started recently</p>
            `;

            chatsList.appendChild(chatCard);
        });
    } catch (error) {
        console.error('Error loading chats:', error);
    }
}

async function loadAdminsForChat() {
    try {
        const adminsSnapshot = await getDocs(collection(db, 'admins'));
        const adminsList = document.getElementById('adminsList');
        adminsList.innerHTML = '';

        if (adminsSnapshot.empty) {
            adminsList.innerHTML = '<p class="empty-state">No admins available at the moment</p>';
            return;
        }

        adminsSnapshot.forEach(docSnapshot => {
            const admin = docSnapshot.data();
            const isAvailable = admin.status === 'open';

            const adminItem = document.createElement('div');
            adminItem.className = `admin-item ${!isAvailable ? 'disabled' : ''}`;
            if (isAvailable) {
                adminItem.onclick = () => requestChatWithAdmin(docSnapshot.id, admin);
            }

            adminItem.innerHTML = `
                <div class="admin-item-header">
                    <div>
                        <div class="admin-name">${admin.name}</div>
                        <div class="admin-email">${admin.email}</div>
                    </div>
                    <span class="admin-status ${admin.status}">${admin.status === 'open' ? '● Available' : '○ Away'}</span>
                </div>
            `;

            adminsList.appendChild(adminItem);
        });
    } catch (error) {
        console.error('Error loading admins:', error);
    }
}

async function requestChatWithAdmin(adminId, admin) {
    try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        const userName = userDoc.data().name;

        await addDoc(collection(db, 'chats'), {
            clientId: currentUser.uid,
            clientName: userName,
            adminId: adminId,
            adminName: admin.name,
            adminEmail: admin.email,
            status: 'active',
            createdAt: serverTimestamp()
        });

        document.getElementById('requestChatModal').style.display = 'none';
        alert(`Chat request sent to ${admin.name}!`);
        await loadChats();
    } catch (error) {
        console.error('Error requesting chat:', error);
        alert('Error requesting chat');
    }
}

async function openChat(chatId, chat) {
    selectedChatId = chatId;
    document.getElementById('chatTitle').textContent = isAdmin ? `Chat with ${chat.clientName}` : `Chat with ${chat.adminName}`;
    switchView('chatWindow');

    // Listen to messages in real-time
    const messagesQuery = query(
        collection(db, 'chats', chatId, 'messages'),
        orderBy('timestamp', 'asc')
    );

    chatUnsubscribe = onSnapshot(messagesQuery, (snapshot) => {
        const messagesDiv = document.getElementById('chatMessages');
        messagesDiv.innerHTML = '';

        if (snapshot.empty) {
            messagesDiv.innerHTML = '<div class="empty-state"><div class="empty-state-icon">💬</div><p>No messages yet. Start the conversation!</p></div>';
            return;
        }

        snapshot.forEach(docSnapshot => {
            const msg = docSnapshot.data();
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${msg.senderId === currentUser.uid ? 'sent' : 'received'}`;
            messageDiv.innerHTML = `
                <div class="message-bubble">
                    <div class="message-sender">${msg.senderName}</div>
                    <div>${msg.text}</div>
                    <div class="message-time">Just now</div>
                </div>
            `;
            messagesDiv.appendChild(messageDiv);
        });

        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    });
}

async function sendMessage() {
    const input = document.getElementById('messageInput');
    const message = input.value.trim();
    if (!message || !selectedChatId) return;

    try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        const userName = userDoc.data().name;

        await addDoc(collection(db, 'chats', selectedChatId, 'messages'), {
            senderId: currentUser.uid,
            senderName: userName,
            text: message,
            timestamp: serverTimestamp()
        });

        await updateDoc(doc(db, 'chats', selectedChatId), {
            lastMessage: message,
            lastMessageTime: serverTimestamp()
        });

        input.value = '';
    } catch (error) {
        console.error('Error sending message:', error);
        alert('Error sending message');
    }
}

async function closeChat() {
    if (!selectedChatId) return;
    
    if (!confirm('Are you sure you want to close this chat?')) return;

    try {
        await updateDoc(doc(db, 'chats', selectedChatId), {
            status: 'closed',
            closedAt: serverTimestamp()
        });

        if (chatUnsubscribe) chatUnsubscribe();
        alert('Chat closed successfully');
        switchView('chats');
    } catch (error) {
        console.error('Error closing chat:', error);
        alert('Error closing chat');
    }
}

// ============ UTILITY FUNCTIONS ============

function showLoading(show) {
    document.getElementById('loadingSpinner').style.display = show ? 'flex' : 'none';
}
