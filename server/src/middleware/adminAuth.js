const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const Admin = require("../models/Admin");
const AdminSession = require("../models/AdminSession");

// Use separate secret for admin tokens
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET + "_admin";
const ADMIN_TOKEN_EXPIRY = "8h"; // Shorter expiry for admin sessions
const ADMIN_SESSION_HOURS = 8;

/**
 * Generate admin JWT token
 */
function generateAdminToken(adminId, sessionId) {
  return jwt.sign(
    { adminId: adminId.toString(), sessionId },
    ADMIN_JWT_SECRET,
    { expiresIn: ADMIN_TOKEN_EXPIRY }
  );
}

/**
 * Create admin session record
 */
async function createAdminSession(adminId, req) {
  const sessionId = uuidv4();
  const expiresAt = new Date(Date.now() + ADMIN_SESSION_HOURS * 60 * 60 * 1000);

  const session = new AdminSession({
    adminId,
    token: sessionId,
    ip: req.ip || req.connection?.remoteAddress || "unknown",
    userAgent: req.headers["user-agent"] || "unknown",
    lastActive: new Date(),
    expiresAt,
  });

  await session.save();
  return session;
}

/**
 * Set admin token in httpOnly cookie
 */
function setAdminTokenCookie(res, token) {
  res.cookie("adminToken", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    maxAge: ADMIN_SESSION_HOURS * 60 * 60 * 1000,
    path: "/",
  });
}

/**
 * Clear admin token cookie
 */
function clearAdminTokenCookie(res) {
  res.cookie("adminToken", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    maxAge: 0,
    path: "/",
  });
}

/**
 * Middleware: Require admin authentication
 */
async function requireAdminAuth(req, res, next) {
  try {
    // Get token from cookie
    const token = req.cookies?.adminToken;
    if (!token) {
      return res.status(401).json({ error: "Admin authentication required" });
    }

    // Verify JWT
    let decoded;
    try {
      decoded = jwt.verify(token, ADMIN_JWT_SECRET);
    } catch (err) {
      clearAdminTokenCookie(res);
      return res.status(401).json({ error: "Invalid or expired admin token" });
    }

    // Check session exists and is valid
    const session = await AdminSession.findOne({
      token: decoded.sessionId,
      adminId: decoded.adminId,
      expiresAt: { $gt: new Date() },
    });

    if (!session) {
      clearAdminTokenCookie(res);
      return res.status(401).json({ error: "Admin session expired or invalid" });
    }

    // Get admin
    const admin = await Admin.findById(decoded.adminId);
    if (!admin) {
      clearAdminTokenCookie(res);
      return res.status(401).json({ error: "Admin account not found" });
    }

    if (!admin.isActive) {
      clearAdminTokenCookie(res);
      return res.status(403).json({ error: "Admin account is deactivated" });
    }

    // Update last active
    session.lastActive = new Date();
    await session.save();

    // Attach admin to request
    req.admin = admin;
    req.adminSession = session;

    next();
  } catch (err) {
    console.error("Admin auth middleware error:", err);
    return res.status(500).json({ error: "Authentication error" });
  }
}

/**
 * Delete admin session (logout)
 */
async function deleteAdminSession(sessionId) {
  await AdminSession.deleteOne({ token: sessionId });
}

/**
 * Delete all sessions for an admin
 */
async function deleteAllAdminSessions(adminId) {
  await AdminSession.deleteMany({ adminId });
}

module.exports = {
  generateAdminToken,
  createAdminSession,
  setAdminTokenCookie,
  clearAdminTokenCookie,
  requireAdminAuth,
  deleteAdminSession,
  deleteAllAdminSessions,
  ADMIN_JWT_SECRET,
};
