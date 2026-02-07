const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const logger = require("../utils/logger");

let io = null;

// Map of userId -> Set of socket ids
const userSockets = new Map();

/**
 * Initialize Socket.IO with the HTTP server
 */
function initializeSocket(httpServer) {
  const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:3000";

  io = new Server(httpServer, {
    cors: {
      origin: clientOrigin,
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Authentication middleware
  io.use((socket, next) => {
    try {
      // Get token from handshake auth or cookies
      const token = socket.handshake.auth?.token ||
                    socket.handshake.headers?.cookie?.match(/token=([^;]+)/)?.[1];

      if (!token) {
        // Allow anonymous connections for public features
        socket.userId = null;
        return next();
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      next();
    } catch (err) {
      // Invalid token - allow as anonymous
      socket.userId = null;
      next();
    }
  });

  // Connection handler
  io.on("connection", (socket) => {
    const userId = socket.userId;

    if (userId) {
      // Track user's sockets
      if (!userSockets.has(userId)) {
        userSockets.set(userId, new Set());
      }
      userSockets.get(userId).add(socket.id);

      // Join user's personal room for targeted notifications
      socket.join(`user:${userId}`);

      logger.info("Socket connected", { userId, socketId: socket.id });
    }

    // Join a work's room to receive real-time updates (comments, etc.)
    socket.on("join:work", (workId) => {
      if (workId) {
        socket.join(`work:${workId}`);
      }
    });

    socket.on("leave:work", (workId) => {
      if (workId) {
        socket.leave(`work:${workId}`);
      }
    });

    // Join a community's room
    socket.on("join:community", (communityId) => {
      if (communityId) {
        socket.join(`community:${communityId}`);
      }
    });

    socket.on("leave:community", (communityId) => {
      if (communityId) {
        socket.leave(`community:${communityId}`);
      }
    });

    // Typing indicators for DMs
    socket.on("typing:start", ({ conversationId }) => {
      if (userId && conversationId) {
        socket.to(`conversation:${conversationId}`).emit("typing:start", { userId });
      }
    });

    socket.on("typing:stop", ({ conversationId }) => {
      if (userId && conversationId) {
        socket.to(`conversation:${conversationId}`).emit("typing:stop", { userId });
      }
    });

    // Disconnect handler
    socket.on("disconnect", () => {
      if (userId) {
        const sockets = userSockets.get(userId);
        if (sockets) {
          sockets.delete(socket.id);
          if (sockets.size === 0) {
            userSockets.delete(userId);
          }
        }
        logger.info("Socket disconnected", { userId, socketId: socket.id });
      }
    });
  });

  return io;
}

/**
 * Get the Socket.IO instance
 */
function getIO() {
  if (!io) {
    throw new Error("Socket.IO not initialized");
  }
  return io;
}

/**
 * Emit to a specific user (all their connected devices)
 */
function emitToUser(userId, event, data) {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
}

/**
 * Emit to all users viewing a work
 */
function emitToWork(workId, event, data) {
  if (io) {
    io.to(`work:${workId}`).emit(event, data);
  }
}

/**
 * Emit to all members of a community
 */
function emitToCommunity(communityId, event, data) {
  if (io) {
    io.to(`community:${communityId}`).emit(event, data);
  }
}

/**
 * Check if a user is currently online
 */
function isUserOnline(userId) {
  return userSockets.has(userId) && userSockets.get(userId).size > 0;
}

/**
 * Get count of online users
 */
function getOnlineUserCount() {
  return userSockets.size;
}

module.exports = {
  initializeSocket,
  getIO,
  emitToUser,
  emitToWork,
  emitToCommunity,
  isUserOnline,
  getOnlineUserCount,
};
