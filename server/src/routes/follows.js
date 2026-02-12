const express = require("express");
const Follow = require("../models/Follow");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// POST /follows/:userId - Follow a user
router.post("/:userId", requireAuth, async (req, res, next) => {
  try {
    const followeeId = req.params.userId;

    if (followeeId === req.user._id.toString()) {
      return res.status(400).json({ error: "Cannot follow yourself" });
    }

    const followee = await User.findById(followeeId);
    if (!followee) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if already following
    const existing = await Follow.findOne({
      followerId: req.user._id,
      followeeId,
    });

    if (existing) {
      return res.status(400).json({ error: "Already following" });
    }

    const follow = new Follow({
      followerId: req.user._id,
      followeeId,
    });

    await follow.save();

    // Update counts
    await User.findByIdAndUpdate(req.user._id, { $inc: { "stats.followingCount": 1 } });
    await User.findByIdAndUpdate(followeeId, { $inc: { "stats.followersCount": 1 } });

    // Create notification
    await Notification.create({
      recipientId: followeeId,
      type: "follow",
      actorId: req.user._id,
      actorUsername: req.user.username,
      title: `${req.user.username} followed you`,
    });

    res.status(201).json({ message: "Followed", follow });
  } catch (err) {
    next(err);
  }
});

// DELETE /follows/:userId - Unfollow a user
router.delete("/:userId", requireAuth, async (req, res, next) => {
  try {
    const followeeId = req.params.userId;

    const follow = await Follow.findOneAndDelete({
      followerId: req.user._id,
      followeeId,
    });

    if (!follow) {
      return res.status(404).json({ error: "Not following this user" });
    }

    // Update counts
    await User.findByIdAndUpdate(req.user._id, { $inc: { "stats.followingCount": -1 } });
    await User.findByIdAndUpdate(followeeId, { $inc: { "stats.followersCount": -1 } });

    res.json({ message: "Unfollowed" });
  } catch (err) {
    next(err);
  }
});

// GET /follows/followers - Get my followers
router.get("/followers", requireAuth, async (req, res, next) => {
  try {
    const follows = await Follow.find({ followeeId: req.user._id })
      .populate("followerId", "username displayName avatarUrl")
      .sort({ createdAt: -1 });

    const followers = follows.map((f) => f.followerId);

    res.json({ followers });
  } catch (err) {
    next(err);
  }
});

// GET /follows/following - Get who I'm following
router.get("/following", requireAuth, async (req, res, next) => {
  try {
    const follows = await Follow.find({ followerId: req.user._id })
      .populate("followeeId", "username displayName avatarUrl")
      .sort({ createdAt: -1 });

    const following = follows.map((f) => f.followeeId);

    res.json({ following });
  } catch (err) {
    next(err);
  }
});

// GET /follows/check/:userId - Check if following
router.get("/check/:userId", requireAuth, async (req, res, next) => {
  try {
    const follow = await Follow.findOne({
      followerId: req.user._id,
      followeeId: req.params.userId,
    });

    res.json({ following: !!follow });
  } catch (err) {
    next(err);
  }
});

// GET /follows/user/:username/followers - Get a user's followers (public)
router.get("/user/:username/followers", async (req, res, next) => {
  try {
    const user = await User.findOne({ username: req.params.username.toLowerCase() });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const follows = await Follow.find({ followeeId: user._id })
      .populate("followerId", "username displayName avatarUrl")
      .sort({ createdAt: -1 });

    const followers = follows.map((f) => f.followerId);

    res.json({ followers });
  } catch (err) {
    next(err);
  }
});

// GET /follows/user/:username/following - Get who a user is following (public)
router.get("/user/:username/following", async (req, res, next) => {
  try {
    const user = await User.findOne({ username: req.params.username.toLowerCase() });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const follows = await Follow.find({ followerId: user._id })
      .populate("followeeId", "username displayName avatarUrl")
      .sort({ createdAt: -1 });

    const following = follows.map((f) => f.followeeId);

    res.json({ following });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
