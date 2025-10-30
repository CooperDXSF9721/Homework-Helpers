// src/components.jsx - UI Components for Homework Helpers
import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Check, Upload, Lock, Search, Users, Trash2 } from 'lucide-react';
import { listenToMessages } from './firebase';

// ============ POSTS VIEW ============

export const PostsView = ({ posts, isAdmin, onCreatePost, onUnlockPost, onRequestChat }) => (
  <div>
    <div className="flex justify-between items-center mb-6">
      <h2 className="text-2xl font-bold text-gray-800">Study Materials</h2>
      <div className="flex gap-4">
        {isAdmin && (
          <button
            onClick={onCreatePost}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2"
          >
            <Upload size={18} />
            Create Post
          </button>
        )}
        {!isAdmin && (
          <button
            onClick={onRequestChat}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <MessageSquare size={18} />
            Request Help
          </button>
        )}
      </div>
    </div>

    {posts.length === 0 ? (
      <div className="text-center py-12">
        <p className="text-gray-500">No study materials yet. Check back soon!</p>
      </div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map(post => (
          <div key={post.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 flex-1">
                {post.title}
              </h3>
              {post.locked ? (
                <Lock size={20} className="text-gray-400" />
              ) : (
                <Check size={20} className="text-green-600" />
              )}
            </div>
            
            {post.imageUrl && !post.locked && (
              <img 
                src={post.imageUrl} 
                alt={post.title}
                className="w-full h-48 object-cover rounded mb-4"
              />
            )}
            
            <div className="flex items-center justify-between mb-4">
              <span className="text-2xl font-bold text-indigo-600">
                ${post.price}
              </span>
              <span className="text-xs text-gray-500">
                by {post.createdBy}
              </span>
            </div>
            
            {post.locked ? (
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  🔒 This material is locked. Pay in person to unlock access.
                </p>
                {isAdmin && (
                  <button
                    onClick={() => onUnlockPost(post.id)}
                    className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 flex items-center justify-center gap-2"
                  >
                    <Users size={18} />
                    Unlock for Student
                  </button>
                )}
              </div>
            ) : (
              <div>
                <div className="bg-gray-50 p-4 rounded mb-4 max-h-32 overflow-y-auto">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{post.content}</p>
                </div>
                {post.fileLinks && post.fileLinks.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700 mb-2">Attached Files:</p>
                    {post.fileLinks.map((file, idx) => (
                      <a
                        key={idx}
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-sm text-indigo-600 hover:underline hover:text-indigo-800 p-2 bg-indigo-50 rounded"
                      >
                        📎 {file.name}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    )}
  </div>
);

// ============ CHATS VIEW ============

export const ChatsView = ({ chats, selectedChat, onSelectChat, onSendMessage, onCloseChat, isAdmin, currentUser, currentUserId }) => {
  if (selectedChat) {
    return (
      <ChatWindow
        chat={selectedChat}
        onClose={() => onSelectChat(null)}
        onSend={onSendMessage}
        onCloseChat={onCloseChat}
        isAdmin={isAdmin}
        currentUser={currentUser}
        currentUserId={currentUserId}
      />
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        {isAdmin ? 'All Active Chats' : 'My Chats'}
      </h2>
      {chats.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <MessageSquare size={48} className="mx-auto mb-4 opacity-50" />
          <p>No active chats. {!isAdmin && 'Request help to get started!'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {chats.map(chat => (
            <div
              key={chat.id}
              onClick={() => onSelectChat(chat)}
              className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition"
            >
              <div className="flex items-center gap-3 mb-4">
                <MessageSquare className="text-indigo-600" size={24} />
                <div>
                  <h3 className="font-semibold text-gray-800">
                    {isAdmin ? `${chat.clientName}` : `Chat with ${chat.adminName}`}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {isAdmin ? `with ${chat.adminName}` : ''}
                  </p>
                </div>
              </div>
              {chat.lastMessage && (
                <p className="text-sm text-gray-600 truncate mb-2">
                  {chat.lastMessage}
                </p>
              )}
              <p className="text-xs text-gray-500">
                Started {chat.createdAt?.toDate?.()?.toLocaleDateString?.() || 'Recently'}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============ CHAT WINDOW ============

export const ChatWindow = ({ chat, onClose, onSend, onCloseChat, isAdmin, currentUser, currentUserId }) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const unsubscribe = listenToMessages(chat.id, (newMessages) => {
      setMessages(newMessages);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
    return () => unsubscribe();
  }, [chat.id]);

  const handleSend = () => {
    if (message.trim()) {
      onSend(message);
      setMessage('');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg max-w-4xl mx-auto">
      <div className="bg-indigo-600 text-white px-6 py-4 rounded-t-lg flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg">
            {isAdmin ? `Chat with ${chat.clientName}` : `Chat with ${chat.adminName}`}
          </h3>
          <p className="text-sm text-indigo-200">Active Chat</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCloseChat}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 text-sm"
          >
            Close Chat
          </button>
          <button onClick={onClose} className="text-white hover:text-indigo-200 p-2">
            <X size={24} />
          </button>
        </div>
      </div>

      <div className="h-96 overflow-y-auto p-6 space-y-4 bg-gray-50">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-20">
            <MessageSquare size={48} className="mx-auto mb-4 opacity-30" />
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <>
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex ${msg.senderId === currentUserId ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    msg.senderId === currentUserId
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-gray-800 shadow'
                  }`}
                >
                  <p className="text-xs font-medium mb-1 opacity-75">{msg.senderName}</p>
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                  <p className="text-xs mt-1 opacity-60">
                    {msg.timestamp?.toDate?.()?.toLocaleTimeString?.() || 'Just now'}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <div className="border-t p-4 flex gap-2 bg-white rounded-b-lg">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type your message..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          onClick={handleSend}
          className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 font-medium"
        >
          Send
        </button>
      </div>
    </div>
  );
};

// ============ ADMIN PROFILE ============

export const AdminProfile = ({ status, onStatusChange, adminName, adminEmail }) => (
  <div className="max-w-2xl mx-auto">
    <h2 className="text-2xl font-bold text-gray-800 mb-6">Admin Profile</h2>
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-6 pb-6 border-b">
        <h3 className="font-semibold text-gray-700 mb-2">Your Information</h3>
        <p className="text-sm text-gray-600">Name: <span className="font-medium">{adminName}</span></p>
        <p className="text-sm text-gray-600">Email: <span className="font-medium">{adminEmail}</span></p>
      </div>
      <div className="mb-6">
        <label className="block text-gray-700 mb-3 font-medium">
          Your Availability Status
        </label>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => onStatusChange('open')}
            className={`py-3 rounded-lg border-2 transition ${
              status === 'open'
                ? 'border-green-600 bg-green-50 text-green-700'
                : 'border-gray-300 text-gray-600 hover:border-green-400'
            }`}
          >
            <Check size={20} className="inline mr-2" />
            Open - Available
          </button>
          <button
            onClick={() => onStatusChange('away')}
            className={`py-3 rounded-lg border-2 transition ${
              status === 'away'
                ? 'border-orange-600 bg-orange-50 text-orange-700'
                : 'border-gray-300 text-gray-600 hover:border-orange-400'
            }`}
          >
            <X size={20} className="inline mr-2" />
            Away - Unavailable
          </button>
        </div>
      </div>
      <div className="pt-6 border-t">
        <p className="text-sm text-gray-600">
          💡 <strong>Tip:</strong> When you're "Away", students won't be able to request new chats with you.
        </p>
      </div>
    </div>
  </div>
);

// ============ ADMIN LOGIN MODAL ============

export const AdminLoginModal = ({ adminPassword, adminName, adminEmail, setAdminPassword, setAdminName, setAdminEmail, onClose, onLogin }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-gray-800">🔐 Admin Access</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X size={24} />
        </button>
      </div>
      <div>
        <label className="block text-gray-700 mb-2 font-medium">Admin Name:</label>
        <input
          type="text"
          value={adminName}
          onChange={(e) => setAdminName(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Your name"
        />
        <label className="block text-gray-700 mb-2 font-medium">Admin Email:</label>
        <input
          type="email"
          value={adminEmail}
          onChange={(e) => setAdminEmail(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="your.email@example.com"
        />
        <label className="block text-gray-700 mb-2 font-medium">Admin Password:</label>
        <input
          type="password"
          value={adminPassword}
          onChange={(e) => setAdminPassword(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && onLogin()}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Password"
        />
        <button
          onClick={onLogin}
          className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 font-medium"
        >
          Login as Admin
        </button>
      </div>
    </div>
  </div>
);

// ============ CREATE POST MODAL ============

export const CreatePostModal = ({ newPost, setNewPost, onClose, onCreate, onImageUpload, onAddFileLink, onRemoveFileLink }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
    <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full my-8">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-gray-800">📝 Create New Post</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X size={24} />
        </button>
      </div>
      <div>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2 font-medium">Title *</label>
          <input
            type="text"
            value={newPost.title}
            onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="e.g., Calculus Study Guide - Chapter 5"
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2 font-medium">Price ($) *</label>
          <input
            type="number"
            step="0.01"
            value={newPost.price}
            onChange={(e) => setNewPost({ ...newPost, price: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="e.g., 15.00"
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2 font-medium">Content</label>
          <textarea
            value={newPost.content}
            onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg h-32 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Study material content (only visible after unlock)..."
          />
          <p className="text-xs text-gray-500 mt-1">
            This content will be hidden until the student unlocks the post
          </p>
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2 font-medium">Upload Image (Imgur)</label>
          <input
            type="file"
            onChange={onImageUpload}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            accept="image/*"
          />
          {newPost.imageUrl && (
            <div className="mt-2">
              <img src={newPost.imageUrl} alt="Preview" className="w-32 h-32 object-cover rounded" />
              <p className="text-xs text-green-600 mt-1">✓ Image uploaded</p>
            </div>
          )}
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2 font-medium">File Links (PDFs, Videos, etc.)</label>
          <button
            onClick={onAddFileLink}
            className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-400 text-gray-600 hover:text-indigo-600"
          >
            + Add File Link (Google Drive, Dropbox, etc.)
          </button>
          {newPost.fileLinks.length > 0 && (
            <div className="mt-2 space-y-2">
              {newPost.fileLinks.map((link, idx) => (
                <div key={idx} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                  <span className="text-sm text-gray-700 truncate flex-1">{link.url}</span>
                  <button
                    onClick={() => onRemoveFileLink(idx)}
                    className="text-red-500 hover:text-red-700 ml-2"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={onCreate}
          className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 font-medium"
        >
          Create Post
        </button>
      </div>
    </div>
  </div>
);

// ============ CHAT REQUEST MODAL ============

export const ChatRequestModal = ({ admins, onClose, onRequest }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-gray-800">💬 Request Chat</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X size={24} />
        </button>
      </div>
      <p className="text-gray-600 mb-4">Select an admin to chat with:</p>
      {admins.length === 0 ? (
        <p className="text-center text-gray-500 py-4">No admins available at the moment</p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {admins.map(admin => (
            <button
              key={admin.id}
              onClick={() => onRequest(admin.userId)}
              disabled={admin.status === 'away'}
              className={`w-full p-4 rounded-lg border-2 text-left transition ${
                admin.status === 'away'
                  ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                  : 'border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 cursor-pointer'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium block">{admin.name}</span>
                  {admin.email && (
                    <span className="text-xs text-gray-500">{admin.email}</span>
                  )}
                </div>
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                  admin.status === 'open'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {admin.status === 'open' ? '● Available' : '○ Away'}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  </div>
);

// ============ UNLOCK POST MODAL ============

export const UnlockPostModal = ({ searchQuery, setSearchQuery, searchResults, onSearch, onUnlock, onClose }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-gray-800">🔓 Unlock Post</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X size={24} />
        </button>
      </div>
      <p className="text-gray-600 mb-4">Search for a student to unlock this post:</p>
      
      <div className="mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && onSearch()}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Student name..."
          />
          <button
            onClick={onSearch}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
          >
            <Search size={20} />
          </button>
        </div>
      </div>

      {searchResults.length > 0 ? (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          <p className="text-sm text-gray-600 mb-2">Found {searchResults.length} student(s):</p>
          {searchResults.map(user => (
            <button
              key={user.id}
              onClick={() => onUnlock(user.id, user.name)}
              className="w-full p-3 rounded-lg border-2 border-gray-200 hover:border-green-400 hover:bg-green-50 text-left transition"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium block">{user.name}</span>
                  {user.email && (
                    <span className="text-xs text-gray-500">{user.email}</span>
                  )}
                </div>
                <Check size={20} className="text-green-600" />
              </div>
            </button>
          ))}
        </div>
      ) : searchQuery ? (
        <p className="text-center text-gray-500 py-4">No students found with that name</p>
      ) : (
        <p className="text-center text-gray-400 py-4 text-sm">Enter a student name and click search</p>
      )}
    </div>
  </div>
);
