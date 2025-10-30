import React, { useState, useEffect } from 'react';
import { LogOut, Loader, Eye, EyeOff } from 'lucide-react';
import {
  signUpUser,
  signInUser,
  signOutUser,
  resetPassword,
  onAuthChange,
  getUserData,
  checkIsAdmin,
  verifyAdminPassword,
  getAllAdmins,
  updateAdminStatus,
  getAdminData,
  createPost,
  getAllPosts,
  unlockPostForUser,
  getUserUnlockedPosts,
  createChat,
  getUserChats,
  getAllActiveChats,
  searchUserByName
} from './firebase';
import { initEmailJS, notifyAllAdmins } from './emailService';
import { uploadImageToImgur } from './imgurService';
import {
  PostsView,
  ChatsView,
  AdminProfile,
  AdminLoginModal,
  CreatePostModal,
  ChatRequestModal,
  UnlockPostModal
} from './components';

const App = () => {
  // Auth states
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('signin'); // 'signin', 'signup', 'reset'
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // App states
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAdminPrompt, setShowAdminPrompt] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [view, setView] = useState('posts');
  const [posts, setPosts] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [chats, setChats] = useState([]);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showChatRequest, setShowChatRequest] = useState(false);
  const [userName, setUserName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [selectedChat, setSelectedChat] = useState(null);
  const [adminStatus, setAdminStatus] = useState('open');
  const [unlockedPostIds, setUnlockedPostIds] = useState([]);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [selectedPostToUnlock, setSelectedPostToUnlock] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  const [newPost, setNewPost] = useState({
    title: '',
    price: '',
    content: '',
    imageUrl: '',
    fileLinks: []
  });

  useEffect(() => {
    initEmailJS();
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      const unsubscribe = onAuthChange(async (user) => {
        if (user) {
          setCurrentUser(user);
          setIsAuthenticated(true);
          setShowAuthModal(false);
          
          const userData = await getUserData(user.uid);
          if (userData && userData.name) {
            setUserName(userData.name);
            
            const adminStatus = await checkIsAdmin(user.uid);
            setIsAdmin(adminStatus);
            
            if (adminStatus) {
              const adminData = await getAdminData(user.uid);
              if (adminData) {
                setAdminStatus(adminData.status || 'open');
                setAdminEmail(adminData.email || '');
              }
            }
            
            await loadAllData(user.uid, adminStatus);
          }
          
          setLoading(false);
        } else {
          setIsAuthenticated(false);
          setShowAuthModal(true);
          setLoading(false);
        }
      });

      return () => unsubscribe();
    } catch (error) {
      console.error('Error initializing app:', error);
      setLoading(false);
    }
  };

  const loadAllData = async (userId, isAdminUser) => {
    try {
      const allPosts = await getAllPosts();
      const unlocked = await getUserUnlockedPosts(userId);
      setUnlockedPostIds(unlocked);
      
      const postsWithLockStatus = allPosts.map(post => ({
        ...post,
        locked: !unlocked.includes(post.id)
      }));
      setPosts(postsWithLockStatus);

      const allAdmins = await getAllAdmins();
      setAdmins(allAdmins);

      const userChats = isAdminUser 
        ? await getAllActiveChats()
        : await getUserChats(userId, false);
      setChats(userChats);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  // ============ AUTH HANDLERS ============

  const handleSignUp = async () => {
    setAuthError('');
    if (!authName.trim() || !authEmail.trim() || !authPassword.trim()) {
      setAuthError('Please fill in all fields');
      return;
    }
    if (authPassword.length < 6) {
      setAuthError('Password must be at least 6 characters');
      return;
    }

    setAuthLoading(true);
    const result = await signUpUser(authEmail, authPassword, authName);
    setAuthLoading(false);

    if (result.success) {
      setAuthEmail('');
      setAuthPassword('');
      setAuthName('');
      setAuthError('');
    } else {
      setAuthError(result.error);
    }
  };

  const handleSignIn = async () => {
    setAuthError('');
    if (!authEmail.trim() || !authPassword.trim()) {
      setAuthError('Please enter email and password');
      return;
    }

    setAuthLoading(true);
    const result = await signInUser(authEmail, authPassword);
    setAuthLoading(false);

    if (result.success) {
      setAuthEmail('');
      setAuthPassword('');
      setAuthError('');
    } else {
      setAuthError(result.error);
    }
  };

  const handleResetPassword = async () => {
    setAuthError('');
    if (!authEmail.trim()) {
      setAuthError('Please enter your email address');
      return;
    }

    setAuthLoading(true);
    const result = await resetPassword(authEmail);
    setAuthLoading(false);

    if (result.success) {
      alert('Password reset email sent! Check your inbox.');
      setAuthMode('signin');
      setAuthEmail('');
    } else {
      setAuthError(result.error);
    }
  };

  const handleSignOut = async () => {
    const result = await signOutUser();
    if (result.success) {
      setIsAdmin(false);
      setView('posts');
    }
  };

  // ============ ADMIN HANDLERS ============

  const handleAdminLogin = async () => {
    if (!adminPassword || !adminName.trim() || !adminEmail.trim()) {
      alert('Please enter admin name, email, and password');
      return;
    }

    try {
      const isVerified = await verifyAdminPassword(
        currentUser.uid,
        adminPassword,
        adminName.trim(),
        adminEmail.trim()
      );

      if (isVerified) {
        setIsAdmin(true);
        setShowAdminPrompt(false);
        setAdminPassword('');
        alert('Admin access granted!');
        await loadAllData(currentUser.uid, true);
      } else {
        alert('Incorrect password');
        setAdminPassword('');
      }
    } catch (error) {
      console.error('Error logging in as admin:', error);
      alert('Error logging in. Please try again.');
    }
  };

  // ============ POST HANDLERS ============

  const handleCreatePost = async () => {
    if (!newPost.title || !newPost.price) {
      alert('Please fill in title and price');
      return;
    }

    try {
      setLoading(true);
      await createPost({
        title: newPost.title,
        price: parseFloat(newPost.price),
        content: newPost.content,
        imageUrl: newPost.imageUrl,
        fileLinks: newPost.fileLinks,
        createdBy: userName,
        createdById: currentUser.uid
      });

      setShowCreatePost(false);
      setNewPost({ title: '', price: '', content: '', imageUrl: '', fileLinks: [] });
      alert('Post created successfully!');
      
      await loadAllData(currentUser.uid, isAdmin);
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Error creating post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    try {
      setLoading(true);
      const imageUrl = await uploadImageToImgur(file);
      setNewPost({ ...newPost, imageUrl });
      alert('Image uploaded successfully!');
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error uploading image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddFileLink = () => {
    const link = prompt('Enter file URL (Google Drive, Dropbox, etc.):');
    if (link && link.trim()) {
      setNewPost({
        ...newPost,
        fileLinks: [...newPost.fileLinks, { url: link.trim(), name: 'Attached File' }]
      });
    }
  };

  const handleRemoveFileLink = (index) => {
    const newLinks = newPost.fileLinks.filter((_, i) => i !== index);
    setNewPost({ ...newPost, fileLinks: newLinks });
  };

  // ============ UNLOCK HANDLERS ============

  const handleUnlockPostClick = (postId) => {
    setSelectedPostToUnlock(postId);
    setShowUnlockModal(true);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleSearchUsers = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      const results = await searchUserByName(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching users:', error);
      alert('Error searching users');
    }
  };

  const handleUnlockForUser = async (userId, userName) => {
    try {
      await unlockPostForUser(selectedPostToUnlock, userId, currentUser.uid);
      alert(`Post unlocked for ${userName}`);
      setShowUnlockModal(false);
      setSelectedPostToUnlock(null);
      setSearchQuery('');
      setSearchResults([]);
      await loadAllData(currentUser.uid, isAdmin);
    } catch (error) {
      console.error('Error unlocking post:', error);
      alert('Error unlocking post');
    }
  };

  // ============ CHAT HANDLERS ============

  const handleRequestChat = async (adminId) => {
    const admin = admins.find(a => a.userId === adminId);
    if (!admin || admin.status === 'away') return;

    try {
      const chatId = await createChat(
        currentUser.uid,
        userName,
        admin.userId,
        admin.name,
        admin.email || 'admin@example.com'
      );

      await notifyAllAdmins(admins, userName, admin.name, chatId);

      setShowChatRequest(false);
      alert(`Chat request sent to ${admin.name}!`);
      
      const userChats = await getUserChats(currentUser.uid, isAdmin);
      setChats(userChats);
    } catch (error) {
      console.error('Error requesting chat:', error);
      alert('Error requesting chat.');
    }
  };

  const handleSendMessage = async (message) => {
    if (!selectedChat || !message.trim()) return;

    try {
      await sendMessage(selectedChat.id, currentUser.uid, userName, message);
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Error sending message.');
    }
  };

  const handleCloseChat = async () => {
    if (!selectedChat) return;

    const confirmClose = window.confirm('Are you sure you want to close this chat?');
    if (!confirmClose) return;

    try {
      await closeChat(selectedChat.id);
      setSelectedChat(null);
      alert('Chat closed successfully');
      
      const userChats = isAdmin 
        ? await getAllActiveChats()
        : await getUserChats(currentUser.uid, false);
      setChats(userChats);
    } catch (error) {
      console.error('Error closing chat:', error);
      alert('Error closing chat.');
    }
  };

  const handleStatusChange = async (status) => {
    setAdminStatus(status);
    try {
      await updateAdminStatus(currentUser.uid, status);
      const allAdmins = await getAllAdmins();
      setAdmins(allAdmins);
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  // ============ RENDER ============

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader className="animate-spin text-indigo-600 mx-auto mb-4" size={48} />
          <p className="text-gray-600">Loading Homework Helpers...</p>
        </div>
      </div>
    );
  }

  if (showAuthModal && !isAuthenticated) {
    return (
      <AuthModal
        mode={authMode}
        setMode={setAuthMode}
        email={authEmail}
        setEmail={setAuthEmail}
        password={authPassword}
        setPassword={setAuthPassword}
        name={authName}
        setName={setAuthName}
        showPassword={showPassword}
        setShowPassword={setShowPassword}
        error={authError}
        loading={authLoading}
        onSignUp={handleSignUp}
        onSignIn={handleSignIn}
        onReset={handleResetPassword}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <button
        onClick={() => setShowAdminPrompt(true)}
        className="fixed top-2 left-2 w-3 h-3 bg-gray-200 rounded-full opacity-10 hover:opacity-30 z-50"
        title="Admin Access"
      />

      <header className="bg-indigo-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Homework Helpers</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm">
              {isAdmin ? '👑 Admin' : '👤'} {userName}
            </span>
            <button
              onClick={handleSignOut}
              className="text-sm bg-indigo-700 px-3 py-1 rounded hover:bg-indigo-800 flex items-center gap-1"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-8">
            <button
              onClick={() => setView('posts')}
              className={`py-4 px-2 border-b-2 ${
                view === 'posts'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-600 hover:text-indigo-600'
              }`}
            >
              Study Materials
            </button>
            <button
              onClick={() => setView('chats')}
              className={`py-4 px-2 border-b-2 ${
                view === 'chats'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-600 hover:text-indigo-600'
              }`}
            >
              {isAdmin ? 'All Chats' : 'My Chats'}
            </button>
            {isAdmin && (
              <button
                onClick={() => setView('profile')}
                className={`py-4 px-2 border-b-2 ${
                  view === 'profile'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-600 hover:text-indigo-600'
                }`}
              >
                Admin Profile
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {view === 'posts' && (
          <PostsView
            posts={posts}
            isAdmin={isAdmin}
            onCreatePost={() => setShowCreatePost(true)}
            onUnlockPost={handleUnlockPostClick}
            onRequestChat={() => setShowChatRequest(true)}
          />
        )}

        {view === 'chats' && (
          <ChatsView
            chats={chats}
            selectedChat={selectedChat}
            onSelectChat={setSelectedChat}
            onSendMessage={handleSendMessage}
            onCloseChat={handleCloseChat}
            isAdmin={isAdmin}
            currentUser={userName}
            currentUserId={currentUser.uid}
          />
        )}

        {view === 'profile' && isAdmin && (
          <AdminProfile
            status={adminStatus}
            onStatusChange={handleStatusChange}
            adminName={userName}
            adminEmail={adminEmail}
          />
        )}
      </main>

      {showAdminPrompt && (
        <AdminLoginModal
          adminPassword={adminPassword}
          adminName={adminName}
          adminEmail={adminEmail}
          setAdminPassword={setAdminPassword}
          setAdminName={setAdminName}
          setAdminEmail={setAdminEmail}
          onClose={() => {
            setShowAdminPrompt(false);
            setAdminPassword('');
            setAdminName('');
            setAdminEmail('');
          }}
          onLogin={handleAdminLogin}
        />
      )}

      {showCreatePost && (
        <CreatePostModal
          newPost={newPost}
          setNewPost={setNewPost}
          onClose={() => setShowCreatePost(false)}
          onCreate={handleCreatePost}
          onImageUpload={handleImageUpload}
          onAddFileLink={handleAddFileLink}
          onRemoveFileLink={handleRemoveFileLink}
        />
      )}

      {showChatRequest && (
        <ChatRequestModal
          admins={admins}
          onClose={() => setShowChatRequest(false)}
          onRequest={handleRequestChat}
        />
      )}

      {showUnlockModal && (
        <UnlockPostModal
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchResults={searchResults}
          onSearch={handleSearchUsers}
          onUnlock={handleUnlockForUser}
          onClose={() => {
            setShowUnlockModal(false);
            setSelectedPostToUnlock(null);
            setSearchQuery('');
            setSearchResults([]);
          }}
        />
      )}
    </div>
  );
};

// ============ AUTH MODAL COMPONENT ============

const AuthModal = ({ mode, setMode, email, setEmail, password, setPassword, name, setName, showPassword, setShowPassword, error, loading, onSignUp, onSignIn, onReset }) => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
    <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
      <h1 className="text-3xl font-bold text-indigo-600 mb-2 text-center">
        Homework Helpers
      </h1>
      <p className="text-gray-600 text-center mb-6">
        {mode === 'signin' && 'Sign in to your account'}
        {mode === 'signup' && 'Create a new account'}
        {mode === 'reset' && 'Reset your password'}
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {mode === 'signup' && (
          <div>
            <label className="block text-gray-700 mb-2 font-medium">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="John Doe"
            />
          </div>
        )}

        <div>
          <label className="block text-gray-700 mb-2 font-medium">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (mode === 'signin' ? onSignIn() : mode === 'signup' ? onSignUp() : onReset())}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="your.email@example.com"
          />
        </div>

        {mode !== 'reset' && (
          <div>
            <label className="block text-gray-700 mb-2 font-medium">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (mode === 'signin' ? onSignIn() : onSignUp())}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="••••••••"
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {mode === 'signup' && (
              <p className="text-xs text-gray-500 mt-1">At least 6 characters</p>
            )}
          </div>
        )}

        {mode === 'signin' && (
          <button
            onClick={() => setMode('reset')}
            className="text-sm text-indigo-600 hover:underline"
          >
            Forgot password?
          </button>
        )}

        <button
          onClick={mode === 'signin' ? onSignIn : mode === 'signup' ? onSignUp : onReset}
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading && <Loader className="animate-spin" size={18} />}
          {mode === 'signin' && 'Sign In'}
          {mode === 'signup' && 'Create Account'}
          {mode === 'reset' && 'Send Reset Email'}
        </button>

        <div className="text-center mt-4">
          {mode === 'signin' && (
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <button
                onClick={() => {
                  setMode('signup');
                  setError('');
                }}
                className="text-indigo-600 hover:underline font-medium"
              >
                Sign up
              </button>
            </p>
          )}
          {(mode === 'signup' || mode === 'reset') && (
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <button
                onClick={() => {
                  setMode('signin');
                  setError('');
                }}
                className="text-indigo-600 hover:underline font-medium"
              >
                Sign in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  </div>
);

// ============ OTHER COMPONENTS (continue in next message) ============

export default App;
