const express = require("express");
const passport = require("passport");
const { z } = require("zod");
const User = require("../models/User");
const {
  generateToken,
  setTokenCookie,
  clearTokenCookie,
  requireAuth,
} = require("../middleware/auth");

const router = express.Router();

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
router.post("/register", async (req, res, next) => {
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
    });
    await user.setPassword(password);
    await user.save();

    const token = generateToken(user._id);
    setTokenCookie(res, token);

    res.status(201).json({
      message: "Registration successful",
      user: user.toPublicJSON(),
    });
  } catch (err) {
    next(err);
  }
});

// POST /auth/login
router.post("/login", async (req, res, next) => {
  try {
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.errors.map((e) => e.message);
      return res.status(400).json({ error: errors[0], errors });
    }

    const { username, password } = result.data;

    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const isValid = await user.comparePassword(password);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const token = generateToken(user._id);
    setTokenCookie(res, token);

    res.json({
      message: "Login successful",
      user: user.toPublicJSON(),
    });
  } catch (err) {
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

module.exports = router;
