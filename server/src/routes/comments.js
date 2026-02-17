const express = require("express");
const { z } = require("zod");
const Comment = require("../models/Comment");
const Work = require("../models/Work");
const Post = require("../models/Post");
const { requireAuth } = require("../middleware/auth");
const { MAX_COMMENT_LENGTH } = require("../config/limits");
const {
  notifyNewComment,
  notifyCommentReply,
  notifyPostComment,
  notifyMentions,
} = require("../services/notificationService");

const router = express.Router();

// Validation
const createCommentSchema = z.object({
  text: z.string().min(1).max(MAX_COMMENT_LENGTH),
  workId: z.string().optional(),
  postId: z.string().optional(),
  parentId: z.string().optional(),
});

// GET /comments - Get comments for a work or post
router.get("/", async (req, res, next) => {
  try {
    const { workId, postId, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    if (!workId && !postId) {
      return res.status(400).json({ error: "workId or postId required" });
    }

    const query = { parentId: null }; // Top-level comments only
    if (workId) query.workId = workId;
    if (postId) query.postId = postId;

    const [comments, total] = await Promise.all([
      Comment.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Comment.countDocuments(query),
    ]);

    res.json({
      comments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /comments/:id/replies - Get replies to a comment
router.get("/:id/replies", async (req, res, next) => {
  try {
    const replies = await Comment.find({ parentId: req.params.id })
      .sort({ createdAt: 1 });

    res.json({ replies });
  } catch (err) {
    next(err);
  }
});

// POST /comments - Create comment
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const result = createCommentSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors[0].message });
    }

    const { text, workId, postId, parentId } = result.data;

    if (!workId && !postId) {
      return res.status(400).json({ error: "workId or postId required" });
    }

    const comment = new Comment({
      text,
      workId: workId || null,
      postId: postId || null,
      parentId: parentId || null,
      authorId: req.user._id,
      authorUsername: req.user.username,
    });

    await comment.save();

    // Update comment count and send notifications
    if (workId) {
      const work = await Work.findByIdAndUpdate(workId, { $inc: { commentsCount: 1 } }, { new: true });

      // If this is a reply to another comment, notify the original commenter
      if (parentId) {
        const parentComment = await Comment.findById(parentId);
        if (parentComment && parentComment.authorId.toString() !== req.user._id.toString()) {
          await notifyCommentReply(
            parentComment.authorId,
            req.user._id,
            workId,
            text,
            comment._id
          );
        }
      } else if (work && work.authorId) {
        // Notify work author about new top-level comment
        await notifyNewComment(workId, work.authorId, req.user._id, text, comment._id);
      }
    }

    if (postId) {
      const post = await Post.findByIdAndUpdate(postId, { $inc: { commentsCount: 1 } }, { new: true });

      // If this is a reply to another comment, notify the original commenter
      if (parentId) {
        const parentComment = await Comment.findById(parentId);
        if (parentComment && parentComment.authorId.toString() !== req.user._id.toString()) {
          await notifyCommentReply(
            parentComment.authorId,
            req.user._id,
            null, // No workId for post comments
            text,
            comment._id
          );
        }
      } else if (post && post.authorId) {
        // Notify post author about new top-level comment
        await notifyPostComment(postId, post.authorId, req.user._id, text, comment._id);
      }
    }

    // Check for @mentions in the comment text
    await notifyMentions(text, req.user._id, "comment", {
      workId: workId || null,
      postId: postId || null,
      commentId: comment._id,
    });

    res.status(201).json({ message: "Comment added", comment });
  } catch (err) {
    next(err);
  }
});

// DELETE /comments/:id - Delete comment
router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }
    if (comment.authorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Not authorized" });
    }

    // Update comment count
    if (comment.workId) {
      await Work.findByIdAndUpdate(comment.workId, { $inc: { commentsCount: -1 } });
    }
    if (comment.postId) {
      await Post.findByIdAndUpdate(comment.postId, { $inc: { commentsCount: -1 } });
    }

    await Comment.findByIdAndDelete(comment._id);

    res.json({ message: "Comment deleted" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
