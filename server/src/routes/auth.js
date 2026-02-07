const express = require("express");
const crypto = require("crypto");
const passport = require("passport");
const { z } = require("zod");
const User = require("../models/User");
const {
  generateToken,
  setTokenCookie,
  clearTokenCookie,
  requireAuth,
} = require("../middleware/auth");
const { sendVerificationEmail, sendPasswordResetEmail } = require("../utils/email");
const { authLimiter, passwordResetLimiter } = require("../middleware/rateLimiter");
const logger = require("../utils/logger");

const router = express.Router();

// Helper to generate random token
function generateRandomToken() {
  return crypto.randomBytes(32).toString("hex");
}

// Validation schemas
const registerSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username can only contain letters, numbers, and underscores"
    ),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password must be at most 100 characters"),
});

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

const setUsernameSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username can only contain letters, numbers, and underscores"
    ),
});

// POST /auth/register
router.post("/register", authLimiter, async (req, res, next) => {
  try {
    const result = registerSchema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.errors.map((e) => e.message);
      return res.status(400).json({ error: errors[0], errors });
    }

    const { username, email, password } = result.data;
    const usernameLower = username.toLowerCase();

    // Check if username already exists
    const existingUsername = await User.findOne({ username: usernameLower });
    if (existingUsername) {
      return res.status(400).json({ error: "Username already taken" });
    }

    // Check if email already exists
    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return res.status(400).json({ error: "Email already registered" });
    }

    // Create user
    const user = new User({
      username: usernameLower,
      displayName: username,
      email: email.toLowerCase(),
      needsUsername: false,
      emailVerified: false,
    });
    await user.setPassword(password);

    // Generate email verification token
    const verificationToken = generateRandomToken();
    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await user.save();

    // Send verification email (don't wait for it)
    sendVerificationEmail(user, verificationToken).catch((err) => {
      console.error("Failed to send verification email:", err);
    });

    const token = generateToken(user._id);
    setTokenCookie(res, token);

    logger.logAuth("register", user._id, true, req.ip);

    res.status(201).json({
      message: "Registration successful. Please check your email to verify your account.",
      user: user.toPublicJSON(),
    });
  } catch (err) {
    logger.logAuth("register", null, false, req.ip);
    next(err);
  }
});

// POST /auth/login
router.post("/login", authLimiter, async (req, res, next) => {
  try {
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.errors.map((e) => e.message);
      return res.status(400).json({ error: errors[0], errors });
    }

    const { username, password } = result.data;

    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) {
      logger.logAuth("login", null, false, req.ip);
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const isValid = await user.comparePassword(password);
    if (!isValid) {
      logger.logAuth("login", user._id, false, req.ip);
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const token = generateToken(user._id);
    setTokenCookie(res, token);

    logger.logAuth("login", user._id, true, req.ip);

    res.json({
      message: "Login successful",
      user: user.toPublicJSON(),
    });
  } catch (err) {
    logger.logAuth("login", null, false, req.ip);
    next(err);
  }
});

// GET /auth/google - Initiate Google OAuth
router.get("/google", (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(501).json({ error: "Google OAuth not configured" });
  }
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })(req, res, next);
});

// GET /auth/google/callback - Google OAuth callback
router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${process.env.CLIENT_ORIGIN || "http://localhost:3000"}/login?error=google_auth_failed`,
  }),
  (req, res) => {
    const user = req.user;
    const token = generateToken(user._id);
    setTokenCookie(res, token);

    const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:3000";

    if (user.needsUsername) {
      res.redirect(`${clientOrigin}/onboarding/username`);
    } else {
      res.redirect(clientOrigin);
    }
  }
);

// GET /auth/username/availability - Check if username is available
router.get("/username/availability", async (req, res, next) => {
  try {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }

    const result = setUsernameSchema.safeParse({ username });
    if (!result.success) {
      return res.json({
        available: false,
        error: result.error.errors[0].message,
      });
    }

    const existing = await User.findOne({ username: username.toLowerCase() });

    res.json({
      available: !existing,
      username: username.toLowerCase(),
    });
  } catch (err) {
    next(err);
  }
});

// POST /auth/username - Set username (for Google users)
router.post("/username", requireAuth, async (req, res, next) => {
  try {
    const result = setUsernameSchema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.errors.map((e) => e.message);
      return res.status(400).json({ error: errors[0], errors });
    }

    const { username } = result.data;
    const usernameLower = username.toLowerCase();

    // Check if username is taken
    const existing = await User.findOne({
      username: usernameLower,
      _id: { $ne: req.user._id },
    });
    if (existing) {
      return res.status(400).json({ error: "Username already taken" });
    }

    // Update user
    req.user.username = usernameLower;
    req.user.displayName = username;
    req.user.needsUsername = false;
    await req.user.save();

    res.json({
      message: "Username set successfully",
      user: req.user.toPublicJSON(),
    });
  } catch (err) {
    next(err);
  }
});

// POST /auth/logout
router.post("/logout", (req, res) => {
  clearTokenCookie(res);
  res.json({ message: "Logged out successfully" });
});

// GET /auth/me
router.get("/me", requireAuth, (req, res) => {
  res.json({
    user: req.user.toPublicJSON(),
  });
});

// GET /auth/username-available/:username - Check username availability (alternative URL)
router.get("/username-available/:username", async (req, res, next) => {
  try {
    const { username } = req.params;

    const result = setUsernameSchema.safeParse({ username });
    if (!result.success) {
      return res.json({
        available: false,
        error: result.error.errors[0].message,
      });
    }

    const existing = await User.findOne({ username: username.toLowerCase() });

    res.json({
      available: !existing,
      username: username.toLowerCase(),
    });
  } catch (err) {
    next(err);
  }
});

// POST /auth/set-username - Set username (for Google users, alternative URL)
router.post("/set-username", requireAuth, async (req, res, next) => {
  try {
    const result = setUsernameSchema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.errors.map((e) => e.message);
      return res.status(400).json({ error: errors[0], errors });
    }

    const { username } = result.data;
    const usernameLower = username.toLowerCase();

    // Check if username is taken
    const existing = await User.findOne({
      username: usernameLower,
      _id: { $ne: req.user._id },
    });
    if (existing) {
      return res.status(400).json({ error: "Username already taken" });
    }

    // Update user
    req.user.username = usernameLower;
    req.user.displayName = username;
    req.user.needsUsername = false;
    await req.user.save();

    res.json({
      message: "Username set successfully",
      user: req.user.toPublicJSON(),
    });
  } catch (err) {
    next(err);
  }
});

// POST /auth/verify-email - Verify email with token
router.post("/verify-email", async (req, res, next) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Verification token is required" });
    }

    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired verification token" });
    }

    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    res.json({ message: "Email verified successfully" });
  } catch (err) {
    next(err);
  }
});

// POST /auth/resend-verification - Resend verification email
router.post("/resend-verification", requireAuth, async (req, res, next) => {
  try {
    if (req.user.emailVerified) {
      return res.status(400).json({ error: "Email is already verified" });
    }

    // Generate new verification token
    const verificationToken = generateRandomToken();
    req.user.emailVerificationToken = verificationToken;
    req.user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await req.user.save();

    await sendVerificationEmail(req.user, verificationToken);

    res.json({ message: "Verification email sent" });
  } catch (err) {
    next(err);
  }
});

// POST /auth/forgot-password - Request password reset
router.post("/forgot-password", passwordResetLimiter, async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({ message: "If an account exists with that email, a reset link has been sent." });
    }

    // Generate reset token
    const resetToken = generateRandomToken();
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    await sendPasswordResetEmail(user, resetToken);

    res.json({ message: "If an account exists with that email, a reset link has been sent." });
  } catch (err) {
    next(err);
  }
});

// POST /auth/reset-password - Reset password with token
router.post("/reset-password", async (req, res, next) => {
  try {
    const { token, password } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Reset token is required" });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired reset token" });
    }

    await user.setPassword(password);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.json({ message: "Password reset successfully. You can now log in with your new password." });
  } catch (err) {
    next(err);
  }
});

// POST /auth/validate-reset-token - Check if reset token is valid
router.post("/validate-reset-token", async (req, res, next) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ valid: false, error: "Token is required" });
    }

    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() },
    });

    res.json({ valid: !!user });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
