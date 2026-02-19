const express = require("express");
const { z } = require("zod");
const Admin = require("../models/Admin");
const {
  generateAdminToken,
  createAdminSession,
  setAdminTokenCookie,
  clearAdminTokenCookie,
  requireAdminAuth,
  deleteAdminSession,
} = require("../middleware/adminAuth");

const router = express.Router();

// Validation schemas
const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

/**
 * POST /admin/auth/login
 * Admin login
 */
router.post("/login", async (req, res, next) => {
  try {
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.errors.map((e) => e.message);
      return res.status(400).json({ error: errors[0], errors });
    }

    const { username, password } = result.data;

    // Find admin by username
    const admin = await Admin.findOne({ username: username.toLowerCase() });
    if (!admin) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Check if active
    if (!admin.isActive) {
      return res.status(403).json({ error: "Account is deactivated" });
    }

    // Verify password
    const isValid = await admin.comparePassword(password);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Create session
    const session = await createAdminSession(admin._id, req);

    // Generate token
    const token = generateAdminToken(admin._id, session.token);

    // Set cookie
    setAdminTokenCookie(res, token);

    // Update last login
    admin.lastLogin = new Date();
    await admin.save();

    res.json({
      message: "Login successful",
      admin: admin.toJSON(),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /admin/auth/logout
 * Admin logout
 */
router.post("/logout", requireAdminAuth, async (req, res, next) => {
  try {
    // Delete session
    await deleteAdminSession(req.adminSession.token);

    // Clear cookie
    clearAdminTokenCookie(res);

    res.json({ message: "Logged out successfully" });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /admin/auth/me
 * Get current admin
 */
router.get("/me", requireAdminAuth, async (req, res) => {
  res.json({ admin: req.admin.toJSON() });
});

/**
 * POST /admin/auth/setup
 * Create first admin account (only works if no admins exist)
 * TEMPORARY - remove after first admin is created
 */
router.post("/setup", async (req, res, next) => {
  try {
    // Check if any admin exists
    const existingAdmin = await Admin.findOne({});
    if (existingAdmin) {
      return res.status(403).json({ error: "Setup already complete. Admin account exists." });
    }

    const { username, email, password, displayName } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: "Username, email, and password are required" });
    }

    const admin = new Admin({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      displayName: displayName || undefined,
      role: "admin",
      isActive: true,
    });

    await admin.setPassword(password);
    await admin.save();

    res.json({
      message: "Admin account created successfully",
      admin: admin.toJSON(),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
