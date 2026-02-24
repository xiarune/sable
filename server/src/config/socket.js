const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const logger = require("../utils/logger");
const User = require("../models/User");

let io = null;

// Map of userId -> Set of socket ids
const userSockets = new Map();

// Track user activity for away status (5 min idle = away)
const userActivity = new Map();
const AWAY_TIMEOUT = 5 * 60 * 1000; // 5 minutes

/**
 * Update user presence in database
 */
async function updateUserPresence(userId, status) {
  try {
    const update = {
      "presence.status": status,
      "presence.lastActiveAt": new Date(),
    };
    if (status === "offline") {
      update["presence.lastSeenAt"] = new Date();
    }
    await User.updateOne({ _id: userId }, { $set: update });
  } catch (err) {
    logger.error("Failed to update presence", { userId, error: err.message });
  }
}

/**
 * Initialize Socket.IO with the HTTP server
 */
function initializeSocket(httpServer) {
  // Support multiple origins (comma-separated in CLIENT_ORIGIN)
  const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:3000";
  const allowedOrigins = clientOrigin.split(",").map((origin) => origin.trim());

  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      },
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
      const isFirstConnection = !userSockets.has(userId) || userSockets.get(userId).size === 0;
      if (!userSockets.has(userId)) {
        userSockets.set(userId, new Set());
      }
      userSockets.get(userId).add(socket.id);

      // Join user's personal room for targeted notifications
      socket.join(`user:${userId}`);

      // Set user online if first connection
      if (isFirstConnection) {
        updateUserPresence(userId, "online");
        userActivity.set(userId, Date.now());
      }

      logger.info("Socket connected", { userId, socketId: socket.id });
    }

    // Track activity to detect away status
    socket.on("activity", () => {
      if (userId) {
        userActivity.set(userId, Date.now());
        // If was away, set back to online
        User.findById(userId).select("presence.status").then((user) => {
          if (user?.presence?.status === "away") {
            updateUserPresence(userId, "online");
          }
        }).catch(() => {});
      }
    });

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

    // Join a message thread room
    socket.on("join:thread", (threadId) => {
      if (threadId) {
        socket.join(`thread:${threadId}`);
      }
    });

    socket.on("leave:thread", (threadId) => {
      if (threadId) {
        socket.leave(`thread:${threadId}`);
      }
    });

    // Typing indicators for DMs
    socket.on("typing:start", ({ threadId }) => {
      if (userId && threadId) {
        socket.to(`thread:${threadId}`).emit("typing:start", { userId, threadId });
      }
    });

    socket.on("typing:stop", ({ threadId }) => {
      if (userId && threadId) {
        socket.to(`thread:${threadId}`).emit("typing:stop", { userId, threadId });
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
            userActivity.delete(userId);
            // Set user offline
            updateUserPresence(userId, "offline");
          }
        }
        logger.info("Socket disconnected", { userId, socketId: socket.id });
      }
    });
  });

  // Check for away users every minute
  setInterval(() => {
    const now = Date.now();
    userActivity.forEach((lastActive, odUserId) => {
      if (now - lastActive > AWAY_TIMEOUT) {
        updateUserPresence(odUserId, "away");
      }
    });
  }, 60 * 1000);

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
