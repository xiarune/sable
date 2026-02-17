const express = require("express");
const Follow = require("../models/Follow");
const FollowRequest = require("../models/FollowRequest");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { requireAuth } = require("../middleware/auth");
const { notifyNewFollower, notifyFollowRequest } = require("../services/notificationService");

const router = express.Router();

// POST /follows/:userId - Follow a user (or send follow request for private accounts)
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

    // Check if target user has a private profile
    const isPrivate = followee.preferences?.visibility === "private";

    if (isPrivate) {
      // Check if there's already a pending request
      const existingRequest = await FollowRequest.findOne({
        requesterId: req.user._id,
        targetId: followeeId,
        status: "pending",
      });

      if (existingRequest) {
        return res.status(400).json({ error: "Follow request already pending" });
      }

      // Create a follow request
      const followRequest = new FollowRequest({
        requesterId: req.user._id,
        targetId: followeeId,
        status: "pending",
      });

      await followRequest.save();

      // Send notification to the private user
      await notifyFollowRequest(followeeId, req.user._id, followRequest._id);

      return res.status(201).json({
        message: "Follow request sent",
        status: "pending",
        followRequest,
      });
    }

    // Public profile - follow immediately
    const follow = new Follow({
      followerId: req.user._id,
      followeeId,
    });

    await follow.save();

    // Update counts
    await User.findByIdAndUpdate(req.user._id, { $inc: { "stats.followingCount": 1 } });
    await User.findByIdAndUpdate(followeeId, { $inc: { "stats.followersCount": 1 } });

    // Create notification using the service
    await notifyNewFollower(followeeId, req.user._id);

    res.status(201).json({ message: "Followed", status: "following", follow });
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
      // Also check for pending follow requests and cancel them
      const pendingRequest = await FollowRequest.findOneAndDelete({
        requesterId: req.user._id,
        targetId: followeeId,
        status: "pending",
      });

      if (pendingRequest) {
        // Also remove the notification
        await Notification.deleteOne({
          followRequestId: pendingRequest._id,
        });
        return res.json({ message: "Follow request cancelled" });
      }

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

// GET /follows/requests - Get my pending follow requests (requests TO me)
router.get("/requests", requireAuth, async (req, res, next) => {
  try {
    const requests = await FollowRequest.find({
      targetId: req.user._id,
      status: "pending",
    })
      .populate("requesterId", "username displayName avatarUrl")
      .sort({ createdAt: -1 });

    res.json({ requests });
  } catch (err) {
    next(err);
  }
});

// GET /follows/requests/sent - Get follow requests I've sent
router.get("/requests/sent", requireAuth, async (req, res, next) => {
  try {
    const requests = await FollowRequest.find({
      requesterId: req.user._id,
      status: "pending",
    })
      .populate("targetId", "username displayName avatarUrl")
      .sort({ createdAt: -1 });

    res.json({ requests });
  } catch (err) {
    next(err);
  }
});

// PUT /follows/requests/:requestId/accept - Accept a follow request
router.put("/requests/:requestId/accept", requireAuth, async (req, res, next) => {
  try {
    const request = await FollowRequest.findOne({
      _id: req.params.requestId,
      targetId: req.user._id,
      status: "pending",
    });

    if (!request) {
      return res.status(404).json({ error: "Follow request not found" });
    }

    // Update request status
    request.status = "accepted";
    await request.save();

    // Create the follow relationship
    const follow = new Follow({
      followerId: request.requesterId,
      followeeId: req.user._id,
    });

    await follow.save();

    // Update counts
    await User.findByIdAndUpdate(request.requesterId, { $inc: { "stats.followingCount": 1 } });
    await User.findByIdAndUpdate(req.user._id, { $inc: { "stats.followersCount": 1 } });

    // Mark the original notification as read
    await Notification.updateOne(
      { followRequestId: request._id },
      { read: true }
    );

    // Send notification to the requester that their request was accepted
    await notifyNewFollower(request.requesterId, req.user._id);

    res.json({ message: "Follow request accepted", follow });
  } catch (err) {
    next(err);
  }
});

// PUT /follows/requests/:requestId/decline - Decline a follow request
router.put("/requests/:requestId/decline", requireAuth, async (req, res, next) => {
  try {
    const request = await FollowRequest.findOne({
      _id: req.params.requestId,
      targetId: req.user._id,
      status: "pending",
    });

    if (!request) {
      return res.status(404).json({ error: "Follow request not found" });
    }

    // Update request status
    request.status = "declined";
    await request.save();

    // Remove the notification
    await Notification.deleteOne({ followRequestId: request._id });

    res.json({ message: "Follow request declined" });
  } catch (err) {
    next(err);
  }
});

// GET /follows/check/:userId - Check follow status with a user
router.get("/check/:userId", requireAuth, async (req, res, next) => {
  try {
    const targetId = req.params.userId;

    // Check if following
    const follow = await Follow.findOne({
      followerId: req.user._id,
      followeeId: targetId,
    });

    if (follow) {
      return res.json({ status: "following" });
    }

    // Check if there's a pending request
    const pendingRequest = await FollowRequest.findOne({
      requesterId: req.user._id,
      targetId,
      status: "pending",
    });

    if (pendingRequest) {
      return res.json({ status: "pending", requestId: pendingRequest._id });
    }

    res.json({ status: "none" });
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
