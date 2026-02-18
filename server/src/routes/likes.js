const express = require("express");
const Like = require("../models/Like");
const Work = require("../models/Work");
const Post = require("../models/Post");
const Comment = require("../models/Comment");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// POST /likes/work/:workId - Like or love a work
router.post("/work/:workId", requireAuth, async (req, res, next) => {
  try {
    const { workId } = req.params;
    const { type = "like" } = req.body; // "like" or "love"

    const work = await Work.findById(workId);
    if (!work) {
      return res.status(404).json({ error: "Work not found" });
    }

    const existing = await Like.findOne({ userId: req.user._id, workId });

    if (existing) {
      // If same type, already done
      if (existing.type === type) {
        return res.status(400).json({ error: `Already ${type}d` });
      }
      // Change type (e.g., from like to love)
      const oldType = existing.type;
      existing.type = type;
      await existing.save();

      // Update counts
      if (oldType === "like") {
        await Work.findByIdAndUpdate(workId, { $inc: { likesCount: -1 } });
      } else {
        await Work.findByIdAndUpdate(workId, { $inc: { lovesCount: -1 } });
      }
      if (type === "like") {
        await Work.findByIdAndUpdate(workId, { $inc: { likesCount: 1 } });
      } else {
        await Work.findByIdAndUpdate(workId, { $inc: { lovesCount: 1 } });
      }

      return res.json({ message: `Changed to ${type}`, type });
    }

    await Like.create({ userId: req.user._id, workId, type });

    if (type === "love") {
      await Work.findByIdAndUpdate(workId, { $inc: { lovesCount: 1 } });
    } else {
      await Work.findByIdAndUpdate(workId, { $inc: { likesCount: 1 } });
    }

    res.status(201).json({ message: type === "love" ? "Loved" : "Liked", type });
  } catch (err) {
    next(err);
  }
});

// DELETE /likes/work/:workId - Unlike/unlove a work
router.delete("/work/:workId", requireAuth, async (req, res, next) => {
  try {
    const { workId } = req.params;

    const like = await Like.findOneAndDelete({ userId: req.user._id, workId });
    if (!like) {
      return res.status(404).json({ error: "Not liked" });
    }

    if (like.type === "love") {
      await Work.findByIdAndUpdate(workId, { $inc: { lovesCount: -1 } });
    } else {
      await Work.findByIdAndUpdate(workId, { $inc: { likesCount: -1 } });
    }

    res.json({ message: "Removed" });
  } catch (err) {
    next(err);
  }
});

// GET /likes/works - Get all works the user has liked/loved
router.get("/works", requireAuth, async (req, res, next) => {
  try {
    const likes = await Like.find({
      userId: req.user._id,
      workId: { $ne: null },
    }).select("workId type");

    const workLikes = {};
    likes.forEach((l) => {
      workLikes[l.workId.toString()] = l.type;
    });

    res.json({ workLikes });
  } catch (err) {
    next(err);
  }
});

// POST /likes/post/:postId - Like a post
router.post("/post/:postId", requireAuth, async (req, res, next) => {
  try {
    const { postId } = req.params;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const existing = await Like.findOne({ userId: req.user._id, postId });
    if (existing) {
      return res.status(400).json({ error: "Already liked" });
    }

    await Like.create({ userId: req.user._id, postId });
    await Post.findByIdAndUpdate(postId, { $inc: { likesCount: 1 } });

    res.status(201).json({ message: "Liked" });
  } catch (err) {
    next(err);
  }
});

// DELETE /likes/post/:postId - Unlike a post
router.delete("/post/:postId", requireAuth, async (req, res, next) => {
  try {
    const { postId } = req.params;

    const like = await Like.findOneAndDelete({ userId: req.user._id, postId });
    if (!like) {
      return res.status(404).json({ error: "Not liked" });
    }

    await Post.findByIdAndUpdate(postId, { $inc: { likesCount: -1 } });

    res.json({ message: "Unliked" });
  } catch (err) {
    next(err);
  }
});

// POST /likes/comment/:commentId - Like a comment
router.post("/comment/:commentId", requireAuth, async (req, res, next) => {
  try {
    const { commentId } = req.params;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    const existing = await Like.findOne({ userId: req.user._id, commentId });
    if (existing) {
      return res.status(400).json({ error: "Already liked" });
    }

    await Like.create({ userId: req.user._id, commentId });
    await Comment.findByIdAndUpdate(commentId, { $inc: { likesCount: 1 } });

    res.status(201).json({ message: "Liked" });
  } catch (err) {
    next(err);
  }
});

// DELETE /likes/comment/:commentId - Unlike a comment
router.delete("/comment/:commentId", requireAuth, async (req, res, next) => {
  try {
    const { commentId } = req.params;

    const like = await Like.findOneAndDelete({ userId: req.user._id, commentId });
    if (!like) {
      return res.status(404).json({ error: "Not liked" });
    }

    await Comment.findByIdAndUpdate(commentId, { $inc: { likesCount: -1 } });

    res.json({ message: "Unliked" });
  } catch (err) {
    next(err);
  }
});

// GET /likes/check - Check what user has liked
router.get("/check", requireAuth, async (req, res, next) => {
  try {
    const { workId, postId, commentId } = req.query;

    const query = { userId: req.user._id };
    if (workId) query.workId = workId;
    if (postId) query.postId = postId;
    if (commentId) query.commentId = commentId;

    const like = await Like.findOne(query);

    res.json({ liked: !!like });
  } catch (err) {
    next(err);
  }
});

// GET /likes/posts - Get all post IDs the user has liked
router.get("/posts", requireAuth, async (req, res, next) => {
  try {
    const likes = await Like.find({
      userId: req.user._id,
      postId: { $ne: null },
    }).select("postId");

    const postIds = likes.map((l) => l.postId.toString());

    res.json({ postIds });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
