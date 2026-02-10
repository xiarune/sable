const express = require("express");
const { z } = require("zod");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const User = require("../models/User");
const Draft = require("../models/Draft");
const Work = require("../models/Work");
const Follow = require("../models/Follow");
const Session = require("../models/Session");
const { requireAuth } = require("../middleware/auth");
const { sendEmailChangeEmail } = require("../utils/email");
const logger = require("../utils/logger");

const router = express.Router();

// ============================================
// ACCOUNT SETTINGS
// ============================================

// Change password
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
});

router.put("/account/password", requireAuth, async (req, res, next) => {
  try {
    const result = changePasswordSchema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error?.issues?.map((e) => e.message) || ["Invalid input"];
      return res.status(400).json({ error: errors[0], errors });
    }

    const { currentPassword, newPassword } = result.data;

    // If user signed up with OAuth and has no password, allow setting one
    if (req.user.passwordHash) {
      const isMatch = await req.user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({ error: "Current password is incorrect" });
      }
    }

    await req.user.setPassword(newPassword);
    await req.user.save();

    logger.logAuth("password_change", req.user._id, true, req.ip);
    res.json({ message: "Password updated successfully" });
  } catch (err) {
    next(err);
  }
});

// Change email (requires verification)
const changeEmailSchema = z.object({
  newEmail: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required to change email"),
});

router.put("/account/email", requireAuth, async (req, res, next) => {
  try {
    const result = changeEmailSchema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error?.issues?.map((e) => e.message) || ["Invalid input"];
      return res.status(400).json({ error: errors[0], errors });
    }

    const { newEmail, password } = result.data;

    // Verify password
    if (!req.user.passwordHash) {
      return res.status(400).json({ error: "Please set a password first" });
    }

    const isMatch = await req.user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ error: "Password is incorrect" });
    }

    // Check if email is already taken
    const existingUser = await User.findOne({ email: newEmail.toLowerCase() });
    if (existingUser && existingUser._id.toString() !== req.user._id.toString()) {
      return res.status(400).json({ error: "Email is already in use" });
    }

    // Generate verification token for new email
    const verificationToken = crypto.randomBytes(32).toString("hex");

    // Store pending email change
    req.user.pendingEmail = newEmail.toLowerCase();
    req.user.pendingEmailToken = verificationToken;
    req.user.pendingEmailExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await req.user.save();

    // Send verification email to new address
    await sendEmailChangeEmail(req.user, newEmail.toLowerCase(), verificationToken);

    res.json({ message: "Verification email sent to your new address" });
  } catch (err) {
    next(err);
  }
});

// Confirm email change
router.post("/account/email/confirm/:token", async (req, res, next) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({
      pendingEmailToken: token,
      pendingEmailExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired token" });
    }

    // Update email
    user.email = user.pendingEmail;
    user.pendingEmail = undefined;
    user.pendingEmailToken = undefined;
    user.pendingEmailExpires = undefined;
    await user.save();

    logger.logAuth("email_change", user._id, true, req.ip);
    res.json({ message: "Email updated successfully" });
  } catch (err) {
    next(err);
  }
});

// Change username
const changeUsernameSchema = z.object({
  newUsername: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  password: z.string().min(1, "Password is required"),
});

router.put("/account/username", requireAuth, async (req, res, next) => {
  try {
    const result = changeUsernameSchema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error?.issues?.map((e) => e.message) || ["Invalid input"];
      return res.status(400).json({ error: errors[0], errors });
    }

    const { newUsername, password } = result.data;

    // Verify password
    if (!req.user.passwordHash) {
      return res.status(400).json({ error: "Please set a password first" });
    }

    const isMatch = await req.user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ error: "Password is incorrect" });
    }

    // Check if username is taken
    const existingUser = await User.findOne({ username: newUsername.toLowerCase() });
    if (existingUser && existingUser._id.toString() !== req.user._id.toString()) {
      return res.status(400).json({ error: "Username is already taken" });
    }

    req.user.username = newUsername.toLowerCase();
    await req.user.save();

    res.json({ message: "Username updated successfully", username: req.user.username });
  } catch (err) {
    next(err);
  }
});

// Delete account
const deleteAccountSchema = z.object({
  password: z.string().min(1, "Password is required"),
  confirmation: z.literal("DELETE MY ACCOUNT"),
});

router.delete("/account", requireAuth, async (req, res, next) => {
  try {
    const result = deleteAccountSchema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error?.issues?.map((e) => e.message) || ["Invalid input"];
      return res.status(400).json({ error: errors[0], errors });
    }

    const { password } = result.data;

    // Verify password (skip for OAuth-only users)
    if (req.user.passwordHash) {
      const isMatch = await req.user.comparePassword(password);
      if (!isMatch) {
        return res.status(400).json({ error: "Password is incorrect" });
      }
    }

    const userId = req.user._id;

    // Delete user's data
    await Promise.all([
      Draft.deleteMany({ authorId: userId }),
      Work.deleteMany({ authorId: userId }),
      Follow.deleteMany({ $or: [{ followerId: userId }, { followeeId: userId }] }),
      Session.deleteMany({ userId }),
    ]);

    // Delete user
    await User.findByIdAndDelete(userId);

    // Clear auth cookie
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    logger.logAuth("account_delete", userId, true, req.ip);
    res.json({ message: "Account deleted successfully" });
  } catch (err) {
    next(err);
  }
});

// Export user data (GDPR)
router.get("/account/export", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Gather all user data
    const [drafts, works, following, followers] = await Promise.all([
      Draft.find({ authorId: userId }),
      Work.find({ authorId: userId }),
      Follow.find({ followerId: userId }).populate("followeeId", "username displayName"),
      Follow.find({ followeeId: userId }).populate("followerId", "username displayName"),
    ]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      user: {
        username: req.user.username,
        displayName: req.user.displayName,
        email: req.user.email,
        bio: req.user.bio,
        pronouns: req.user.pronouns,
        link: req.user.link,
        country: req.user.country,
        region: req.user.region,
        timezone: req.user.timezone,
        createdAt: req.user.createdAt,
        preferences: req.user.preferences,
        contentFilters: req.user.contentFilters,
      },
      drafts: drafts.map((d) => ({
        title: d.title,
        summary: d.summary,
        content: d.content,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      })),
      works: works.map((w) => ({
        title: w.title,
        summary: w.summary,
        chapters: w.chapters,
        tags: w.tags,
        createdAt: w.createdAt,
        publishedAt: w.publishedAt,
      })),
      following: following.map((f) => ({
        username: f.followeeId?.username,
        displayName: f.followeeId?.displayName,
        followedAt: f.createdAt,
      })),
      followers: followers.map((f) => ({
        username: f.followerId?.username,
        displayName: f.followerId?.displayName,
        followedAt: f.createdAt,
      })),
    };

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="sable-data-export-${req.user.username}.json"`);
    res.json(exportData);
  } catch (err) {
    next(err);
  }
});

// ============================================
// PRIVACY SETTINGS
// ============================================

const privacySchema = z.object({
  showListeningActivity: z.boolean().optional(),
  showCollections: z.boolean().optional(),
  allowDMRequests: z.boolean().optional(),
});

router.put("/privacy", requireAuth, async (req, res, next) => {
  try {
    const result = privacySchema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error?.issues?.map((e) => e.message) || ["Invalid input"];
      return res.status(400).json({ error: errors[0], errors });
    }

    Object.assign(req.user.preferences.privacy, result.data);
    await req.user.save();

    res.json({
      message: "Privacy settings updated",
      privacy: req.user.preferences.privacy
    });
  } catch (err) {
    next(err);
  }
});

router.get("/privacy", requireAuth, async (req, res, next) => {
  try {
    res.json({ privacy: req.user.preferences.privacy });
  } catch (err) {
    next(err);
  }
});

// ============================================
// MUTED WORDS
// ============================================

router.get("/muted-words", requireAuth, async (req, res, next) => {
  try {
    res.json({ mutedWords: req.user.mutedWords || [] });
  } catch (err) {
    next(err);
  }
});

router.post("/muted-words", requireAuth, async (req, res, next) => {
  try {
    const { word } = req.body;

    if (!word || typeof word !== "string") {
      return res.status(400).json({ error: "Word is required" });
    }

    const normalized = word.toLowerCase().trim();
    if (normalized.length < 2 || normalized.length > 50) {
      return res.status(400).json({ error: "Word must be 2-50 characters" });
    }

    if (!req.user.mutedWords) {
      req.user.mutedWords = [];
    }

    if (req.user.mutedWords.length >= 100) {
      return res.status(400).json({ error: "Maximum 100 muted words allowed" });
    }

    if (!req.user.mutedWords.includes(normalized)) {
      req.user.mutedWords.push(normalized);
      await req.user.save();
    }

    res.json({ message: "Word added", mutedWords: req.user.mutedWords });
  } catch (err) {
    next(err);
  }
});

router.delete("/muted-words/:word", requireAuth, async (req, res, next) => {
  try {
    const word = req.params.word.toLowerCase().trim();

    req.user.mutedWords = (req.user.mutedWords || []).filter((w) => w !== word);
    await req.user.save();

    res.json({ message: "Word removed", mutedWords: req.user.mutedWords });
  } catch (err) {
    next(err);
  }
});

// ============================================
// NOTIFICATION SETTINGS
// ============================================

const notificationSettingsSchema = z.object({
  // Email notifications
  emailOnNewFollower: z.boolean().optional(),
  emailOnNewComment: z.boolean().optional(),
  emailOnNewLike: z.boolean().optional(),
  emailOnNewMessage: z.boolean().optional(),
  emailOnNewChapter: z.boolean().optional(),
  emailDigest: z.enum(["none", "daily", "weekly"]).optional(),
  // Push notifications
  pushOnNewFollower: z.boolean().optional(),
  pushOnNewComment: z.boolean().optional(),
  pushOnNewLike: z.boolean().optional(),
  pushOnNewMessage: z.boolean().optional(),
  pushOnNewChapter: z.boolean().optional(),
});

router.get("/notifications", requireAuth, async (req, res, next) => {
  try {
    res.json({
      notifications: req.user.notificationSettings || getDefaultNotificationSettings()
    });
  } catch (err) {
    next(err);
  }
});

router.put("/notifications", requireAuth, async (req, res, next) => {
  try {
    const result = notificationSettingsSchema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error?.issues?.map((e) => e.message) || ["Invalid input"];
      return res.status(400).json({ error: errors[0], errors });
    }

    if (!req.user.notificationSettings) {
      req.user.notificationSettings = getDefaultNotificationSettings();
    }

    Object.assign(req.user.notificationSettings, result.data);
    await req.user.save();

    res.json({
      message: "Notification settings updated",
      notifications: req.user.notificationSettings
    });
  } catch (err) {
    next(err);
  }
});

function getDefaultNotificationSettings() {
  return {
    emailOnNewFollower: true,
    emailOnNewComment: true,
    emailOnNewLike: false,
    emailOnNewMessage: true,
    emailOnNewChapter: true,
    emailDigest: "none",
    pushOnNewFollower: true,
    pushOnNewComment: true,
    pushOnNewLike: true,
    pushOnNewMessage: true,
    pushOnNewChapter: true,
  };
}

// ============================================
// SESSION MANAGEMENT
// ============================================

router.get("/sessions", requireAuth, async (req, res, next) => {
  try {
    const sessions = await Session.find({ userId: req.user._id })
      .sort({ lastActive: -1 });

    res.json({
      sessions: sessions.map((s) => ({
        id: s._id,
        device: s.device,
        browser: s.browser,
        os: s.os,
        ip: s.ip,
        location: s.location,
        lastActive: s.lastActive,
        createdAt: s.createdAt,
        isCurrent: s._id.toString() === req.sessionId,
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.delete("/sessions/:sessionId", requireAuth, async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    const session = await Session.findOne({
      _id: sessionId,
      userId: req.user._id
    });

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    await session.deleteOne();

    res.json({ message: "Session terminated" });
  } catch (err) {
    next(err);
  }
});

router.delete("/sessions", requireAuth, async (req, res, next) => {
  try {
    // Delete all sessions except current
    await Session.deleteMany({
      userId: req.user._id,
      _id: { $ne: req.sessionId }
    });

    res.json({ message: "All other sessions terminated" });
  } catch (err) {
    next(err);
  }
});

// ============================================
// CONNECTED ACCOUNTS
// ============================================

router.get("/connected-accounts", requireAuth, async (req, res, next) => {
  try {
    const accounts = [];

    if (req.user.providers?.google?.googleId) {
      accounts.push({
        provider: "google",
        email: req.user.providers.google.email,
        name: req.user.providers.google.name,
        connectedAt: req.user.providers.google.connectedAt,
      });
    }

    if (req.user.providers?.apple?.appleId) {
      accounts.push({
        provider: "apple",
        email: req.user.providers.apple.email,
        connectedAt: req.user.providers.apple.connectedAt,
      });
    }

    if (req.user.providers?.discord?.discordId) {
      accounts.push({
        provider: "discord",
        username: req.user.providers.discord.username,
        connectedAt: req.user.providers.discord.connectedAt,
      });
    }

    res.json({
      accounts,
      hasPassword: !!req.user.passwordHash,
    });
  } catch (err) {
    next(err);
  }
});

router.delete("/connected-accounts/:provider", requireAuth, async (req, res, next) => {
  try {
    const { provider } = req.params;
    const validProviders = ["google", "apple", "discord"];

    if (!validProviders.includes(provider)) {
      return res.status(400).json({ error: "Invalid provider" });
    }

    // Check if user has other login methods
    const hasPassword = !!req.user.passwordHash;
    const connectedProviders = validProviders.filter(
      (p) => req.user.providers?.[p]?.[`${p}Id`]
    );

    if (!hasPassword && connectedProviders.length <= 1) {
      return res.status(400).json({
        error: "Cannot disconnect - you need at least one login method"
      });
    }

    // Disconnect provider
    req.user.providers[provider] = undefined;
    await req.user.save();

    res.json({ message: `${provider} disconnected successfully` });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
