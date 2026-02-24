const express = require("express");
const { z } = require("zod");
const User = require("../models/User");
const Work = require("../models/Work");
const Follow = require("../models/Follow");
const { requireAuth, optionalAuth } = require("../middleware/auth");
const { getPeopleRecommendations } = require("../services/recommendation");

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

// GET /users - Get discoverable users (for community page)
router.get("/", optionalAuth, async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;

    // Get users who are visible (not invisible)
    const query = {
      "preferences.visibility": { $ne: "invisible" },
    };

    // Exclude current user if logged in
    if (req.user) {
      query._id = { $ne: req.user._id };
    }

    const users = await User.find(query)
      .sort({ "stats.followersCount": -1, createdAt: -1 })
      .limit(parseInt(limit))
      .select("username displayName avatarUrl bio stats");

    // If logged in, check which users the current user is following
    let followingIds = [];
    if (req.user) {
      const follows = await Follow.find({ followerId: req.user._id });
      followingIds = follows.map((f) => f.followeeId.toString());
    }

    const usersWithFollowStatus = users.map((u) => ({
      ...u.toObject(),
      isFollowing: followingIds.includes(u._id.toString()),
    }));

    res.json({ users: usersWithFollowStatus });
  } catch (err) {
    next(err);
  }
});

// GET /users/discover - Get recommended creators
router.get("/discover", optionalAuth, async (req, res, next) => {
  try {
    const { limit = 20 } = req.query;

    const result = await getPeopleRecommendations(req.user, {
      limit: parseInt(limit),
    });

    // Add follow status if logged in
    let usersWithFollowStatus = result.users;
    if (req.user) {
      const follows = await Follow.find({ followerId: req.user._id });
      const followingIds = new Set(follows.map((f) => f.followeeId.toString()));

      usersWithFollowStatus = result.users.map((u) => ({
        ...u,
        isFollowing: followingIds.has(u._id.toString()),
      }));
    } else {
      usersWithFollowStatus = result.users.map((u) => ({
        ...u,
        isFollowing: false,
      }));
    }

    res.json({
      users: usersWithFollowStatus,
      mode: result.mode,
      personalized: result.personalized,
    });
  } catch (err) {
    next(err);
  }
});

// GET /users/blocked - Get blocked users
// IMPORTANT: This route must come BEFORE /:username to avoid matching "blocked" as a username
router.get("/blocked", requireAuth, async (req, res, next) => {
  try {
    const blockedUsers = await User.find({ _id: { $in: req.user.blockedUsers } })
      .select("username displayName avatarUrl");

    res.json({ blockedUsers });
  } catch (err) {
    next(err);
  }
});

// GET /users/muted - Get muted users
// IMPORTANT: This route must come BEFORE /:username to avoid matching "muted" as a username
router.get("/muted", requireAuth, async (req, res, next) => {
  try {
    const mutedUsers = await User.find({ _id: { $in: req.user.mutedUsers || [] } })
      .select("username displayName avatarUrl");

    res.json({ mutedUsers });
  } catch (err) {
    next(err);
  }
});

// GET /users/hidden-posts - Get hidden post IDs
// IMPORTANT: This route must come BEFORE /:username to avoid matching "hidden-posts" as a username
router.get("/hidden-posts", requireAuth, async (req, res, next) => {
  try {
    res.json({ hiddenPostIds: req.user.hiddenPosts || [] });
  } catch (err) {
    next(err);
  }
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
      const errors = result.error?.issues?.map((e) => e.message) || ["Invalid input"];
      return res.status(400).json({ error: errors[0], errors });
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
      const errors = result.error?.issues?.map((e) => e.message) || ["Invalid input"];
      return res.status(400).json({ error: errors[0], errors });
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

// POST /users/mute/:userId - Mute a user
router.post("/mute/:userId", requireAuth, async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (userId === req.user._id.toString()) {
      return res.status(400).json({ error: "Cannot mute yourself" });
    }

    if (!req.user.mutedUsers) {
      req.user.mutedUsers = [];
    }

    if (!req.user.mutedUsers.includes(userId)) {
      req.user.mutedUsers.push(userId);
      await req.user.save();
    }

    res.json({ message: "User muted" });
  } catch (err) {
    next(err);
  }
});

// DELETE /users/mute/:userId - Unmute a user
router.delete("/mute/:userId", requireAuth, async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!req.user.mutedUsers) {
      req.user.mutedUsers = [];
    }

    req.user.mutedUsers = req.user.mutedUsers.filter(
      (id) => id.toString() !== userId
    );
    await req.user.save();

    res.json({ message: "User unmuted" });
  } catch (err) {
    next(err);
  }
});

// POST /users/hide-post/:postId - Hide a post
router.post("/hide-post/:postId", requireAuth, async (req, res, next) => {
  try {
    const { postId } = req.params;

    if (!req.user.hiddenPosts) {
      req.user.hiddenPosts = [];
    }

    if (!req.user.hiddenPosts.includes(postId)) {
      req.user.hiddenPosts.push(postId);
      await req.user.save();
    }

    res.json({ message: "Post hidden" });
  } catch (err) {
    next(err);
  }
});

// DELETE /users/hide-post/:postId - Unhide a post
router.delete("/hide-post/:postId", requireAuth, async (req, res, next) => {
  try {
    const { postId } = req.params;

    if (!req.user.hiddenPosts) {
      req.user.hiddenPosts = [];
    }

    req.user.hiddenPosts = req.user.hiddenPosts.filter(
      (id) => id.toString() !== postId
    );
    await req.user.save();

    res.json({ message: "Post unhidden" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
