const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Session = require("../models/Session");

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-change-me";
const JWT_EXPIRES_IN = "7d";

// Generate JWT token with session ID
function generateToken(userId, sessionId) {
  return jwt.sign({ userId, sessionId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Create a new session
async function createSession(userId, req) {
  const userAgent = req.get("user-agent") || "";
  const ip = req.ip || req.connection?.remoteAddress;

  // Parse user agent for device info
  const device = parseDevice(userAgent);
  const browser = parseBrowser(userAgent);
  const os = parseOS(userAgent);

  const session = await Session.create({
    userId,
    token: require("crypto").randomBytes(32).toString("hex"),
    device,
    browser,
    os,
    ip,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  });

  return session;
}

// Simple user agent parsers
function parseDevice(ua) {
  if (/mobile/i.test(ua)) return "Mobile";
  if (/tablet/i.test(ua)) return "Tablet";
  return "Desktop";
}

function parseBrowser(ua) {
  if (/firefox/i.test(ua)) return "Firefox";
  if (/edg/i.test(ua)) return "Edge";
  if (/chrome/i.test(ua)) return "Chrome";
  if (/safari/i.test(ua)) return "Safari";
  return "Unknown";
}

function parseOS(ua) {
  if (/windows/i.test(ua)) return "Windows";
  if (/mac/i.test(ua)) return "macOS";
  if (/linux/i.test(ua)) return "Linux";
  if (/android/i.test(ua)) return "Android";
  if (/iphone|ipad/i.test(ua)) return "iOS";
  return "Unknown";
}

// Set token as httpOnly cookie
function setTokenCookie(res, token) {
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

// Clear token cookie
function clearTokenCookie(res) {
  res.cookie("token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 0,
  });
}

// Middleware: require authentication
async function requireAuth(req, res, next) {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      clearTokenCookie(res);
      return res.status(401).json({ error: "User not found" });
    }

    // Verify session exists and update lastActive
    if (decoded.sessionId) {
      const session = await Session.findById(decoded.sessionId);
      if (!session) {
        clearTokenCookie(res);
        return res.status(401).json({ error: "Session expired" });
      }
      // Update lastActive in background
      Session.updateOne({ _id: decoded.sessionId }, { lastActive: new Date() }).exec();
      req.sessionId = decoded.sessionId;
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      clearTokenCookie(res);
      return res.status(401).json({ error: "Invalid or expired token" });
    }
    next(err);
  }
}

// Middleware: optionally attach user if logged in (doesn't require auth)
async function optionalAuth(req, res, next) {
  try {
    const token = req.cookies.token;

    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.userId);
      if (user) {
        req.user = user;
      }
    }
    next();
  } catch (err) {
    // Invalid token, just continue without user
    next();
  }
}

// Middleware: require admin privileges
async function requireAdmin(req, res, next) {
  try {
    // First, require authentication
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      clearTokenCookie(res);
      return res.status(401).json({ error: "User not found" });
    }

    // Check admin status
    if (!user.isAdmin) {
      return res.status(403).json({ error: "Admin privileges required" });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      clearTokenCookie(res);
      return res.status(401).json({ error: "Invalid or expired token" });
    }
    next(err);
  }
}

module.exports = {
  generateToken,
  createSession,
  setTokenCookie,
  clearTokenCookie,
  requireAuth,
  optionalAuth,
  requireAdmin,
};
