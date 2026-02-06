const express = require("express");
const { z } = require("zod");
const User = require("../models/User");
const Work = require("../models/Work");
const Follow = require("../models/Follow");
const { requireAuth, optionalAuth } = require("../middleware/auth");

const router = express.Router();

// Validation
const updateProfileSchema = z.object({
  displayName: z.string().max(50).optional(),
  bio: z.string().max(500).optional(),
  link: z.string().max(200).optional(),
  pronouns: z.string().max(30).optional(),
  avatarUrl: z.string().optional(),
  bannerUrl: z.string().optional(),
  country: z.string().optional(),
  region: z.string().optional(),
  timezone: z.string().optional(),
});

const updatePreferencesSchema = z.object({
  language: z.string().optional(),
  theme: z.string().optional(),
  visibility: z.enum(["public", "private", "invisible"]).optional(),
  viewPrefs: z
    .object({
      fontSize: z.number().min(13).max(20).optional(),
      lineHeight: z.number().min(1.6).max(2.3).optional(),
      readingWidth: z.number().min(560).max(900).optional(),
      theme: z.enum(["paper", "dark"]).optional(),
    })
    .optional(),
  audioPrefs: z
    .object({
      autoplay: z.boolean().optional(),
      crossfade: z.boolean().optional(),
      crossfadeSeconds: z.number().optional(),
    })
    .optional(),
  dmSetting: z.enum(["everyone", "community", "mutuals", "none"]).optional(),
  silentMode: z.boolean().optional(),
  readReceipts: z.boolean().optional(),
});

// GET /users/:username - Get public profile
router.get("/:username", optionalAuth, async (req, res, next) => {
  try {
    const user = await User.findOne({ username: req.params.username.toLowerCase() });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if current user is following
    let isFollowing = false;
    if (req.user) {
      const follow = await Follow.findOne({
        followerId: req.user._id,
        followeeId: user._id,
      });
      isFollowing = !!follow;
    }

    // Get public works
    const works = await Work.find({
      authorId: user._id,
      privacy: "Public",
      status: "published",
    })
      .sort({ publishedAt: -1 })
      .limit(10)
      .select("-chapters");

    res.json({
      user: user.toPublicJSON(),
      isFollowing,
      works,
    });
  } catch (err) {
    next(err);
  }
});

// PUT /users/profile - Update my profile
router.put("/profile", requireAuth, async (req, res, next) => {
  try {
    const result = updateProfileSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors[0].message });
    }

    Object.assign(req.user, result.data);
    await req.user.save();

    res.json({ message: "Profile updated", user: req.user.toPublicJSON() });
  } catch (err) {
    next(err);
  }
});

// PUT /users/preferences - Update my preferences
router.put("/preferences", requireAuth, async (req, res, next) => {
  try {
    const result = updatePreferencesSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors[0].message });
    }

    // Merge preferences
    if (result.data.viewPrefs) {
      req.user.preferences.viewPrefs = {
        ...req.user.preferences.viewPrefs,
        ...result.data.viewPrefs,
      };
      delete result.data.viewPrefs;
    }

    if (result.data.audioPrefs) {
      req.user.preferences.audioPrefs = {
        ...req.user.preferences.audioPrefs,
        ...result.data.audioPrefs,
      };
      delete result.data.audioPrefs;
    }

    Object.assign(req.user.preferences, result.data);
    await req.user.save();

    res.json({ message: "Preferences updated", preferences: req.user.preferences });
  } catch (err) {
    next(err);
  }
});

// PUT /users/content-filters - Update content filters
router.put("/content-filters", requireAuth, async (req, res, next) => {
  try {
    const { mature, explicit, violence, selfHarm, spoilers } = req.body;

    if (mature !== undefined) req.user.contentFilters.mature = mature;
    if (explicit !== undefined) req.user.contentFilters.explicit = explicit;
    if (violence !== undefined) req.user.contentFilters.violence = violence;
    if (selfHarm !== undefined) req.user.contentFilters.selfHarm = selfHarm;
    if (spoilers !== undefined) req.user.contentFilters.spoilers = spoilers;

    await req.user.save();

    res.json({ message: "Content filters updated", contentFilters: req.user.contentFilters });
  } catch (err) {
    next(err);
  }
});

// POST /users/block/:userId - Block a user
router.post("/block/:userId", requireAuth, async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (userId === req.user._id.toString()) {
      return res.status(400).json({ error: "Cannot block yourself" });
    }

    if (!req.user.blockedUsers.includes(userId)) {
      req.user.blockedUsers.push(userId);
      await req.user.save();
    }

    // Also unfollow
    await Follow.deleteOne({ followerId: req.user._id, followeeId: userId });
    await Follow.deleteOne({ followerId: userId, followeeId: req.user._id });

    res.json({ message: "User blocked" });
  } catch (err) {
    next(err);
  }
});

// DELETE /users/block/:userId - Unblock a user
router.delete("/block/:userId", requireAuth, async (req, res, next) => {
  try {
    const { userId } = req.params;

    req.user.blockedUsers = req.user.blockedUsers.filter(
      (id) => id.toString() !== userId
    );
    await req.user.save();

    res.json({ message: "User unblocked" });
  } catch (err) {
    next(err);
  }
});

// GET /users/blocked - Get blocked users
router.get("/blocked", requireAuth, async (req, res, next) => {
  try {
    const blockedUsers = await User.find({ _id: { $in: req.user.blockedUsers } })
      .select("username displayName avatarUrl");

    res.json({ blockedUsers });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
