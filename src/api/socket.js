import { io } from "socket.io-client";
import API_BASE_URL from "./config";

let socket = null;

/**
 * Initialize Socket.IO connection
 */
export function initSocket() {
  if (socket?.connected) {
    return socket;
  }

  // Remove /api from the URL for socket connection
  const socketUrl = API_BASE_URL.replace("/api", "");

  socket = io(socketUrl, {
    withCredentials: true,
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on("connect", () => {
    console.log("Socket connected");
  });

  socket.on("disconnect", (reason) => {
    console.log("Socket disconnected:", reason);
  });

  socket.on("connect_error", (err) => {
    console.log("Socket connection error:", err.message);
  });

  return socket;
}

/**
 * Get the current socket instance
 */
export function getSocket() {
  return socket;
}

/**
 * Disconnect socket
 */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Subscribe to notifications
 * @param {Function} callback - Called when a notification is received
 * @returns {Function} Unsubscribe function
 */
export function onNotification(callback) {
  if (!socket) {
    initSocket();
  }

  socket.on("notification", callback);

  return () => {
    socket?.off("notification", callback);
  };
}

/**
 * Subscribe to notification read events
 * @param {Function} callback - Called when notifications are marked as read
 * @returns {Function} Unsubscribe function
 */
export function onNotificationsRead(callback) {
  if (!socket) {
    initSocket();
  }

  socket.on("notifications:read", callback);

  return () => {
    socket?.off("notifications:read", callback);
  };
}

/**
 * Join a work's room to receive real-time updates
 * @param {string} workId - Work ID to join
 */
export function joinWork(workId) {
  if (!socket) {
    initSocket();
  }

  socket.emit("join:work", workId);
}

/**
 * Leave a work's room
 * @param {string} workId - Work ID to leave
 */
export function leaveWork(workId) {
  if (socket) {
    socket.emit("leave:work", workId);
  }
}

/**
 * Subscribe to new comments on a work
 * @param {Function} callback - Called when a new comment is posted
 * @returns {Function} Unsubscribe function
 */
export function onNewComment(callback) {
  if (!socket) {
    initSocket();
  }

  socket.on("new_comment", callback);

  return () => {
    socket?.off("new_comment", callback);
  };
}

/**
 * Join a community's room
 * @param {string} communityId - Community ID to join
 */
export function joinCommunity(communityId) {
  if (!socket) {
    initSocket();
  }

  socket.emit("join:community", communityId);
}

/**
 * Leave a community's room
 * @param {string} communityId - Community ID to leave
 */
export function leaveCommunity(communityId) {
  if (socket) {
    socket.emit("leave:community", communityId);
  }
}

/**
 * Send typing indicator start
 * @param {string} conversationId - Conversation ID
 */
export function startTyping(conversationId) {
  if (socket) {
    socket.emit("typing:start", { conversationId });
  }
}

/**
 * Send typing indicator stop
 * @param {string} conversationId - Conversation ID
 */
export function stopTyping(conversationId) {
  if (socket) {
    socket.emit("typing:stop", { conversationId });
  }
}

/**
 * Subscribe to typing indicators
 * @param {Function} callback - Called when someone starts/stops typing
 * @returns {Function} Unsubscribe function
 */
export function onTyping(callback) {
  if (!socket) {
    initSocket();
  }

  const handleStart = (data) => callback({ ...data, typing: true });
  const handleStop = (data) => callback({ ...data, typing: false });

  socket.on("typing:start", handleStart);
  socket.on("typing:stop", handleStop);

  return () => {
    socket?.off("typing:start", handleStart);
    socket?.off("typing:stop", handleStop);
  };
}

export default {
  initSocket,
  getSocket,
  disconnectSocket,
  onNotification,
  onNotificationsRead,
  joinWork,
  leaveWork,
  onNewComment,
  joinCommunity,
  leaveCommunity,
  startTyping,
  stopTyping,
  onTyping,
};
