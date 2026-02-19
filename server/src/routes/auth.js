const express = require("express");
const crypto = require("crypto");
const passport = require("passport");
const { z } = require("zod");
const User = require("../models/User");
const {
  generateToken,
  createSession,
  setTokenCookie,
  clearTokenCookie,
  requireAuth,
} = require("../middleware/auth");
const Session = require("../models/Session");
const { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail } = require("../utils/email");
const { authLimiter, passwordResetLimiter } = require("../middleware/rateLimiter");
const logger = require("../utils/logger");
const {
  generateSecret,
  generateQRCode,
  verifyToken,
  generateBackupCodes,
  hashBackupCode,
  verifyBackupCode,
} = require("../utils/twoFactor");

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
      const errors = result.error?.issues?.map((e) => e.message) || result.error?.errors?.map((e) => e.message) || ["Invalid input"];
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

    // Create session and generate token
    const session = await createSession(user._id, req);
    const token = generateToken(user._id, session._id);
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
      const errors = result.error?.issues?.map((e) => e.message) || result.error?.errors?.map((e) => e.message) || ["Invalid input"];
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

    // Check if 2FA is enabled
    if (user.twoFactor?.enabled) {
      logger.logAuth("login_2fa_required", user._id, true, req.ip);
      return res.json({
        requires2FA: true,
        userId: user._id,
        message: "Please enter your 2FA code",
      });
    }

    // Create session and generate token
    const session = await createSession(user._id, req);
    const token = generateToken(user._id, session._id);
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
  async (req, res) => {
    const user = req.user;
    const session = await createSession(user._id, req);
    const token = generateToken(user._id, session._id);
    setTokenCookie(res, token);

    const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:3000";

    if (user.needsUsername) {
      res.redirect(`${clientOrigin}/onboarding/username`);
    } else if (!user.interests?.completedOnboarding) {
      // Existing user who hasn't completed onboarding
      res.redirect(`${clientOrigin}/onboarding/interests`);
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
      const errors = result.error?.issues?.map((e) => e.message) || result.error?.errors?.map((e) => e.message) || ["Invalid input"];
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
router.post("/logout", async (req, res) => {
  try {
    // Delete session if token exists
    const token = req.cookies.token;
    if (token) {
      const jwt = require("jsonwebtoken");
      const decoded = jwt.decode(token);
      if (decoded?.sessionId) {
        await Session.findByIdAndDelete(decoded.sessionId);
      }
    }
  } catch {
    // Ignore errors during logout cleanup
  }
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
      const errors = result.error?.issues?.map((e) => e.message) || result.error?.errors?.map((e) => e.message) || ["Invalid input"];
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

    // Send welcome email (don't wait for it)
    sendWelcomeEmail(user).catch((err) => {
      console.error("Failed to send welcome email:", err);
    });

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

// ============================================
// Two-Factor Authentication (2FA) Routes
// ============================================

// GET /auth/2fa/status - Get 2FA status
router.get("/2fa/status", requireAuth, (req, res) => {
  res.json({
    enabled: req.user.twoFactor?.enabled || false,
    method: req.user.twoFactor?.method || null,
    hasBackupCodes: (req.user.twoFactor?.backupCodes?.length || 0) > 0,
  });
});

// POST /auth/2fa/setup - Start 2FA setup
router.post("/2fa/setup", requireAuth, async (req, res, next) => {
  try {
    // Generate new secret
    const { secret, otpauthUrl } = generateSecret(req.user.username);

    // Generate QR code
    const qrCodeDataUrl = await generateQRCode(otpauthUrl);

    // Store secret temporarily (not enabled yet)
    req.user.twoFactor = {
      ...req.user.twoFactor,
      enabled: false,
      method: "authenticator",
      secret,
    };
    await req.user.save();

    res.json({
      message: "Scan the QR code with your authenticator app",
      qrCode: qrCodeDataUrl,
      secret, // Manual entry option
    });
  } catch (err) {
    next(err);
  }
});

// POST /auth/2fa/verify - Verify token and enable 2FA
router.post("/2fa/verify", requireAuth, async (req, res, next) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Verification token is required" });
    }

    if (!req.user.twoFactor?.secret) {
      return res.status(400).json({ error: "2FA setup not started. Please start setup first." });
    }

    // Verify the token
    const isValid = verifyToken(token, req.user.twoFactor.secret);

    if (!isValid) {
      return res.status(400).json({ error: "Invalid verification code. Please try again." });
    }

    // Generate backup codes
    const backupCodes = generateBackupCodes(10);
    const hashedBackupCodes = backupCodes.map(hashBackupCode);

    // Enable 2FA
    req.user.twoFactor.enabled = true;
    req.user.twoFactor.backupCodes = hashedBackupCodes;
    await req.user.save();

    logger.logAuth("2fa_enabled", req.user._id, true, req.ip);

    res.json({
      message: "Two-factor authentication enabled successfully",
      backupCodes, // Show once, user must save these
    });
  } catch (err) {
    next(err);
  }
});

// POST /auth/2fa/disable - Disable 2FA
router.post("/2fa/disable", requireAuth, async (req, res, next) => {
  try {
    const { password, token } = req.body;

    if (!password) {
      return res.status(400).json({ error: "Password is required" });
    }

    // Verify password
    const isPasswordValid = await req.user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid password" });
    }

    // If 2FA is enabled, require token or backup code
    if (req.user.twoFactor?.enabled) {
      if (!token) {
        return res.status(400).json({ error: "2FA token or backup code is required" });
      }

      // Try TOTP first
      let isTokenValid = verifyToken(token, req.user.twoFactor.secret);

      // If TOTP fails, try backup code
      if (!isTokenValid) {
        const backupResult = verifyBackupCode(token, req.user.twoFactor.backupCodes || []);
        isTokenValid = backupResult.valid;
      }

      if (!isTokenValid) {
        return res.status(401).json({ error: "Invalid 2FA token or backup code" });
      }
    }

    // Disable 2FA
    req.user.twoFactor = {
      enabled: false,
      method: undefined,
      secret: undefined,
      backupCodes: [],
    };
    await req.user.save();

    logger.logAuth("2fa_disabled", req.user._id, true, req.ip);

    res.json({ message: "Two-factor authentication disabled" });
  } catch (err) {
    next(err);
  }
});

// POST /auth/2fa/backup-codes - Regenerate backup codes
router.post("/2fa/backup-codes", requireAuth, async (req, res, next) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: "Password is required" });
    }

    // Verify password
    const isPasswordValid = await req.user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid password" });
    }

    if (!req.user.twoFactor?.enabled) {
      return res.status(400).json({ error: "2FA is not enabled" });
    }

    // Generate new backup codes
    const backupCodes = generateBackupCodes(10);
    const hashedBackupCodes = backupCodes.map(hashBackupCode);

    req.user.twoFactor.backupCodes = hashedBackupCodes;
    await req.user.save();

    logger.info("Backup codes regenerated", { userId: req.user._id });

    res.json({
      message: "New backup codes generated",
      backupCodes,
    });
  } catch (err) {
    next(err);
  }
});

// POST /auth/2fa/validate - Validate 2FA token (for login)
router.post("/2fa/validate", authLimiter, async (req, res, next) => {
  try {
    const { userId, token } = req.body;

    if (!userId || !token) {
      return res.status(400).json({ error: "User ID and token are required" });
    }

    const user = await User.findById(userId);

    if (!user || !user.twoFactor?.enabled) {
      return res.status(400).json({ error: "Invalid request" });
    }

    // Try TOTP first
    let isValid = verifyToken(token, user.twoFactor.secret);
    let usedBackupCode = false;

    // If TOTP fails, try backup code
    if (!isValid) {
      const backupResult = verifyBackupCode(token, user.twoFactor.backupCodes || []);
      if (backupResult.valid) {
        isValid = true;
        usedBackupCode = true;

        // Remove used backup code
        user.twoFactor.backupCodes.splice(backupResult.index, 1);
        await user.save();
      }
    }

    if (!isValid) {
      logger.logAuth("2fa_validate", user._id, false, req.ip);
      return res.status(401).json({ error: "Invalid 2FA code" });
    }

    // Create session and generate auth token
    const session = await createSession(user._id, req);
    const authToken = generateToken(user._id, session._id);
    setTokenCookie(res, authToken);

    logger.logAuth("2fa_validate", user._id, true, req.ip);

    res.json({
      message: "2FA verification successful",
      user: user.toPublicJSON(),
      usedBackupCode,
      remainingBackupCodes: user.twoFactor.backupCodes.length,
    });
  } catch (err) {
    next(err);
  }
});

// ============================================
// Onboarding Routes (Interest Selection)
// ============================================

// Predefined genres and fandoms for selection
const ONBOARDING_GENRES = [
  { slug: "fantasy", name: "Fantasy", icon: "🐉" },
  { slug: "romance", name: "Romance", icon: "💕" },
  { slug: "sci-fi", name: "Sci-Fi", icon: "🚀" },
  { slug: "horror", name: "Horror", icon: "👻" },
  { slug: "mystery", name: "Mystery", icon: "🔍" },
  { slug: "thriller", name: "Thriller", icon: "😱" },
  { slug: "adventure", name: "Adventure", icon: "🗺️" },
  { slug: "drama", name: "Drama", icon: "🎭" },
  { slug: "comedy", name: "Comedy", icon: "😂" },
  { slug: "historical", name: "Historical", icon: "🏰" },
  { slug: "slice-of-life", name: "Slice of Life", icon: "☕" },
  { slug: "action", name: "Action", icon: "💥" },
  { slug: "supernatural", name: "Supernatural", icon: "✨" },
  { slug: "dystopian", name: "Dystopian", icon: "🏚️" },
  { slug: "poetry", name: "Poetry", icon: "📝" },
];

const ONBOARDING_FANDOMS = [
  { slug: "harry-potter", name: "Harry Potter", category: "Books" },
  { slug: "marvel", name: "Marvel", category: "Comics" },
  { slug: "dc", name: "DC", category: "Comics" },
  { slug: "star-wars", name: "Star Wars", category: "Movies" },
  { slug: "lord-of-the-rings", name: "Lord of the Rings", category: "Books" },
  { slug: "percy-jackson", name: "Percy Jackson", category: "Books" },
  { slug: "hunger-games", name: "Hunger Games", category: "Books" },
  { slug: "twilight", name: "Twilight", category: "Books" },
  { slug: "anime-manga", name: "Anime & Manga", category: "Anime" },
  { slug: "k-pop", name: "K-Pop", category: "Music" },
  { slug: "supernatural-tv", name: "Supernatural (TV)", category: "TV" },
  { slug: "sherlock", name: "Sherlock", category: "TV" },
  { slug: "doctor-who", name: "Doctor Who", category: "TV" },
  { slug: "game-of-thrones", name: "Game of Thrones", category: "TV" },
  { slug: "stranger-things", name: "Stranger Things", category: "TV" },
  { slug: "bts", name: "BTS", category: "Music" },
  { slug: "taylor-swift", name: "Taylor Swift", category: "Music" },
  { slug: "original-fiction", name: "Original Fiction", category: "Original" },
  { slug: "video-games", name: "Video Games", category: "Games" },
  { slug: "disney", name: "Disney", category: "Movies" },
];

// GET /auth/onboarding/options - Get available genres and fandoms
router.get("/onboarding/options", (req, res) => {
  res.json({
    genres: ONBOARDING_GENRES,
    fandoms: ONBOARDING_FANDOMS,
  });
});

// POST /auth/onboarding/interests - Save user's selected interests
router.post("/onboarding/interests", requireAuth, async (req, res, next) => {
  try {
    const { genres = [], fandoms = [] } = req.body;

    // Validate arrays
    if (!Array.isArray(genres) || !Array.isArray(fandoms)) {
      return res.status(400).json({ error: "Genres and fandoms must be arrays" });
    }

    // Limit selections (soft limits)
    const selectedGenres = genres.slice(0, 5);
    const selectedFandoms = fandoms.slice(0, 10);

    // Update user interests
    req.user.interests = {
      genres: selectedGenres,
      fandoms: selectedFandoms,
      completedOnboarding: true,
    };
    await req.user.save();

    res.json({
      message: "Interests saved successfully",
      user: req.user.toPublicJSON(),
    });
  } catch (err) {
    next(err);
  }
});

// POST /auth/onboarding/skip - Skip interest selection
router.post("/onboarding/skip", requireAuth, async (req, res, next) => {
  try {
    // Mark onboarding as completed without setting interests
    if (!req.user.interests) {
      req.user.interests = {};
    }
    req.user.interests.completedOnboarding = true;
    await req.user.save();

    res.json({
      message: "Onboarding skipped",
      user: req.user.toPublicJSON(),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
