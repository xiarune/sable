import { api } from "./client";

/**
 * Messages/Inbox API
 */
const messagesApi = {
  // Get total unread message count
  getUnreadCount: () => api.get("/messages/unread-count"),

  // Get all threads for current user
  getThreads: () => api.get("/messages/threads"),

  // Get message requests (from non-followers)
  getRequests: () => api.get("/messages/requests"),

  // Accept a message request (move to inbox)
  acceptRequest: (threadId) => api.put(`/messages/requests/${threadId}/accept`),

  // Decline a message request
  declineRequest: (threadId) => api.delete(`/messages/requests/${threadId}`),

  // Create a new thread with a user
  createThread: (recipientId) => api.post("/messages/threads", { recipientId }),

  // Get a single thread with messages
  getThread: (threadId) => api.get(`/messages/threads/${threadId}`),

  // Send a message to a thread
  sendMessage: (threadId, data) => api.post(`/messages/threads/${threadId}`, data),

  // Mark messages as seen
  markSeen: (threadId) => api.put(`/messages/threads/${threadId}/seen`),

  // Mute a thread
  mute: (threadId) => api.put(`/messages/threads/${threadId}/mute`),

  // Unmute a thread
  unmute: (threadId) => api.put(`/messages/threads/${threadId}/unmute`),

  // Delete a thread
  deleteThread: (threadId) => api.delete(`/messages/threads/${threadId}`),

  // Add reaction to a message
  addReaction: (messageId, emoji) => api.post(`/messages/${messageId}/reactions`, { emoji }),

  // Remove reaction from a message
  removeReaction: (messageId, emoji) => api.delete(`/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`),

  // Get files shared in inbox (all threads)
  getFiles: () => api.get("/messages/files"),

  // Search users for new message
  searchUsers: (query) => api.get(`/messages/users?q=${encodeURIComponent(query)}`),

  // Get mutuals for messaging suggestions
  getMutuals: () => api.get("/messages/mutuals"),

  // Update inbox settings (read receipts toggle)
  updateSettings: (settings) => api.put("/messages/settings", settings),

  // Get inbox settings
  getSettings: () => api.get("/messages/settings"),
};

export default messagesApi;
