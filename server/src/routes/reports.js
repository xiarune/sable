const express = require("express");
const Report = require("../models/Report");
const Post = require("../models/Post");
const Comment = require("../models/Comment");
const Work = require("../models/Work");
const User = require("../models/User");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// POST /reports - Create a report
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { targetType, targetId, reason, description } = req.body;

    if (!targetType || !targetId || !reason) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Validate target exists and get target user
    let targetUserId;
    if (targetType === "post") {
      const post = await Post.findById(targetId);
      if (!post) return res.status(404).json({ error: "Post not found" });
      targetUserId = post.authorId;
    } else if (targetType === "comment") {
      const comment = await Comment.findById(targetId);
      if (!comment) return res.status(404).json({ error: "Comment not found" });
      targetUserId = comment.userId;
    } else if (targetType === "work") {
      const work = await Work.findById(targetId);
      if (!work) return res.status(404).json({ error: "Work not found" });
      targetUserId = work.authorId;
    } else if (targetType === "user") {
      const user = await User.findById(targetId);
      if (!user) return res.status(404).json({ error: "User not found" });
      targetUserId = user._id;
    } else {
      return res.status(400).json({ error: "Invalid target type" });
    }

    // Check if already reported
    const existing = await Report.findOne({
      reporterId: req.user._id,
      targetType,
      targetId,
    });

    if (existing) {
      return res.status(400).json({ error: "You have already reported this content" });
    }

    // Cannot report yourself
    if (targetUserId.toString() === req.user._id.toString()) {
      return res.status(400).json({ error: "Cannot report your own content" });
    }

    const report = await Report.create({
      reporterId: req.user._id,
      targetType,
      targetId,
      targetUserId,
      reason,
      description: description || "",
    });

    res.status(201).json({ message: "Report submitted", report: { _id: report._id } });
  } catch (err) {
    next(err);
  }
});

// GET /reports/mine - Get my submitted reports
router.get("/mine", requireAuth, async (req, res, next) => {
  try {
    const reports = await Report.find({ reporterId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ reports });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
