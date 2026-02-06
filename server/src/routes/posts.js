const express = require("express");
const { z } = require("zod");
const Post = require("../models/Post");
const { requireAuth, optionalAuth } = require("../middleware/auth");
const { MAX_POST_LENGTH } = require("../config/limits");

const router = express.Router();

// Validation
const createPostSchema = z.object({
  type: z.enum(["work", "discussion", "skin", "audio", "post"]).optional(),
  title: z.string().max(200).optional(),
  caption: z.string().max(MAX_POST_LENGTH).optional(),
  content: z.string().max(5000).optional(),
  tags: z.array(z.string().max(30)).max(10).optional(),
  workId: z.string().optional(),
});

const updatePostSchema = createPostSchema.partial();

// GET /posts - List posts (feed)
router.get("/", optionalAuth, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, type, author } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {};
    if (type) query.type = type;
    if (author) query.authorUsername = author.toLowerCase();

    const [posts, total] = await Promise.all([
      Post.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Post.countDocuments(query),
    ]);

    res.json({
      posts,
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

// GET /posts/mine - List my posts
router.get("/mine", requireAuth, async (req, res, next) => {
  try {
    const posts = await Post.find({ authorId: req.user._id })
      .sort({ createdAt: -1 });

    res.json({ posts });
  } catch (err) {
    next(err);
  }
});

// GET /posts/:id - Get single post
router.get("/:id", optionalAuth, async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    res.json({ post });
  } catch (err) {
    next(err);
  }
});

// POST /posts - Create post
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const result = createPostSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors[0].message });
    }

    const post = new Post({
      ...result.data,
      authorId: req.user._id,
      authorUsername: req.user.username,
    });

    await post.save();

    res.status(201).json({ message: "Post created", post });
  } catch (err) {
    next(err);
  }
});

// PUT /posts/:id - Update post
router.put("/:id", requireAuth, async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }
    if (post.authorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const result = updatePostSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors[0].message });
    }

    Object.assign(post, result.data);
    await post.save();

    res.json({ message: "Post updated", post });
  } catch (err) {
    next(err);
  }
});

// DELETE /posts/:id - Delete post
router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }
    if (post.authorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Not authorized" });
    }

    await Post.findByIdAndDelete(post._id);

    res.json({ message: "Post deleted" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
