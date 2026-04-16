const express = require("express");
const { z } = require("zod");
const Post = require("../models/Post");
const User = require("../models/User");
const Follow = require("../models/Follow");
const { requireAuth, optionalAuth } = require("../middleware/auth");
const { MAX_POST_LENGTH } = require("../config/limits");
const { notifyNewPost, notifyMentions } = require("../services/notificationService");
const { getPostRecommendations } = require("../services/recommendation");

const router = express.Router();

// Helper to get user IDs that should be excluded based on visibility
async function getHiddenUserIds(viewerId) {
  // Get all users with invisible visibility - always hidden
  const invisibleUsers = await User.find({
    "preferences.visibility": "invisible",
  }).select("_id");

  const hiddenIds = invisibleUsers.map(u => u._id);

  // Get all users with private visibility
  const privateUsers = await User.find({
    "preferences.visibility": "private",
  }).select("_id");

  if (viewerId) {
    for (const privateUser of privateUsers) {
      const isFollowing = await Follow.findOne({
        followerId: viewerId,
        followeeId: privateUser._id,
      });
      if (!isFollowing) {
        hiddenIds.push(privateUser._id);
      }
    }
  } else {
    hiddenIds.push(...privateUsers.map(u => u._id));
  }

  return hiddenIds;
}

// Validation
const createPostSchema = z.object({
  type: z.enum(["work", "skin", "audio", "post"]).optional(),
  title: z.string().max(200).optional(),
  caption: z.string().max(MAX_POST_LENGTH).optional(),
  content: z.string().max(5000).optional(),
  tags: z.array(z.string().max(30)).max(10).optional(),
  workId: z.string().optional(),
  imageUrl: z.string().url().optional().nullable(),
  isSpoiler: z.boolean().optional(),
  isNSFW: z.boolean().optional(),
});

const updatePostSchema = createPostSchema.partial();

// Helper function to filter posts by muted words
function filterByMutedWords(posts, mutedWords) {
  if (!mutedWords || mutedWords.length === 0) return posts;

  const lowerMutedWords = mutedWords.map(w => w.toLowerCase());

  return posts.filter(post => {
    const textToCheck = `${post.caption || ""} ${post.content || ""} ${post.title || ""} ${(post.tags || []).join(" ")}`.toLowerCase();
    return !lowerMutedWords.some(word => textToCheck.includes(word));
  });
}

// Helper function to filter posts by content filters
function filterByContentFilters(posts, contentFilters) {
  if (!contentFilters) return posts;

  return posts.filter(post => {
    // If user has filter OFF (false), hide content with that flag
    if (!contentFilters.mature && (post.isMature || post.isNSFW)) return false;
    if (!contentFilters.explicit && post.isExplicit) return false;
    if (!contentFilters.violence && post.hasViolence) return false;
    if (!contentFilters.selfHarm && post.hasSelfHarm) return false;
    if (!contentFilters.spoilers && post.isSpoiler) return false;
    return true;
  });
}

// GET /posts - List posts (feed)
router.get("/", optionalAuth, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, type, author } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get users whose content should be hidden based on visibility settings
    const hiddenUserIds = await getHiddenUserIds(req.user?._id);

    const query = {};
    if (type) query.type = type;
    if (author) query.authorUsername = author.toLowerCase();

    // Combine blocked users and hidden users (based on visibility)
    const excludedUserIds = [...hiddenUserIds];
    if (req.user && req.user.blockedUsers && req.user.blockedUsers.length > 0) {
      excludedUserIds.push(...req.user.blockedUsers);
    }
    if (excludedUserIds.length > 0) {
      query.authorId = { $nin: excludedUserIds };
    }

    const [posts, total] = await Promise.all([
      Post.find(query)
        .populate("authorId", "username displayName avatarUrl")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Post.countDocuments(query),
    ]);

    // Transform posts to include author info
    let transformedPosts = posts.map((post) => {
      const p = post.toObject();
      p.author = p.authorId ? {
        _id: p.authorId._id,
        username: p.authorId.username,
        displayName: p.authorId.displayName,
        avatarUrl: p.authorId.avatarUrl,
      } : null;
      return p;
    });

    // Filter out posts containing muted words
    if (req.user && req.user.mutedWords && req.user.mutedWords.length > 0) {
      transformedPosts = filterByMutedWords(transformedPosts, req.user.mutedWords);
    }

    // Apply content filters
    if (req.user && req.user.contentFilters) {
      transformedPosts = filterByContentFilters(transformedPosts, req.user.contentFilters);
    }

    res.json({
      posts: transformedPosts,
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

// GET /posts/feed - Get ranked/personalized post feed
router.get("/feed", optionalAuth, async (req, res, next) => {
  try {
    const { limit = 20, mode = "ranked" } = req.query;

    // Get users whose content should be hidden based on visibility settings
    const hiddenUserIds = await getHiddenUserIds(req.user?._id);

    // Build query to exclude blocked users and hidden users
    const feedQuery = {};
    const excludedUserIds = [...hiddenUserIds];
    if (req.user && req.user.blockedUsers && req.user.blockedUsers.length > 0) {
      excludedUserIds.push(...req.user.blockedUsers);
    }
    if (excludedUserIds.length > 0) {
      feedQuery.authorId = { $nin: excludedUserIds };
    }

    // If mode is "chronological", use the existing logic
    if (mode === "chronological") {
      const posts = await Post.find(feedQuery)
        .populate("authorId", "username displayName avatarUrl")
        .sort({ createdAt: -1 })
        .limit(parseInt(limit));

      let transformedPosts = posts.map((post) => {
        const p = post.toObject();
        p.author = p.authorId
          ? {
              _id: p.authorId._id,
              username: p.authorId.username,
              displayName: p.authorId.displayName,
              avatarUrl: p.authorId.avatarUrl,
            }
          : null;
        return p;
      });

      // Filter out posts containing muted words
      if (req.user && req.user.mutedWords && req.user.mutedWords.length > 0) {
        transformedPosts = filterByMutedWords(transformedPosts, req.user.mutedWords);
      }

      // Apply content filters
      if (req.user && req.user.contentFilters) {
        transformedPosts = filterByContentFilters(transformedPosts, req.user.contentFilters);
      }

      return res.json({
        posts: transformedPosts,
        mode: "chronological",
        personalized: false,
      });
    }

    // Use recommendation service for ranked feed
    const result = await getPostRecommendations(req.user, {
      limit: parseInt(limit),
    });

    // Transform posts to include author info
    let transformedPosts = result.posts.map((post) => {
      const p = { ...post };
      if (post.authorId && typeof post.authorId === "object") {
        p.author = {
          _id: post.authorId._id,
          username: post.authorId.username,
          displayName: post.authorId.displayName,
          avatarUrl: post.authorId.avatarUrl,
        };
      }
      return p;
    });

    // Filter out posts containing muted words
    if (req.user && req.user.mutedWords && req.user.mutedWords.length > 0) {
      transformedPosts = filterByMutedWords(transformedPosts, req.user.mutedWords);
    }

    // Apply content filters
    if (req.user && req.user.contentFilters) {
      transformedPosts = filterByContentFilters(transformedPosts, req.user.contentFilters);
    }

    res.json({
      posts: transformedPosts,
      mode: result.mode,
      personalized: result.personalized,
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

    // Check if viewer can see this author's content
    const isOwner = req.user && post.authorId.toString() === req.user._id.toString();
    if (!isOwner) {
      const author = await User.findById(post.authorId).select("preferences.visibility");
      const visibility = author?.preferences?.visibility;

      if (visibility === "invisible") {
        return res.status(404).json({ error: "Post not found" });
      }

      if (visibility === "private") {
        if (!req.user) {
          return res.status(403).json({ error: "This user has a private profile" });
        }
        const isFollowing = await Follow.findOne({
          followerId: req.user._id,
          followeeId: post.authorId,
        });
        if (!isFollowing) {
          return res.status(403).json({ error: "This user has a private profile" });
        }
      }
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

    // Send response immediately - don't wait for notifications
    res.status(201).json({ message: "Post created", post });

    // Notify followers about the new post (non-blocking)
    try {
      const postTitle = result.data.title || result.data.caption || "New post";
      const postType = result.data.type || "post";
      await notifyNewPost(req.user._id, post._id, postTitle, postType);

      // Check for @mentions in caption and content
      const textToCheck = `${result.data.caption || ""} ${result.data.content || ""}`;
      if (textToCheck.trim()) {
        await notifyMentions(textToCheck, req.user._id, "post", {
          postId: post._id,
        });
      }
    } catch (notifyErr) {
      // Log but don't fail the request - post was already created
      console.error("Failed to send post notifications:", notifyErr.message);
    }
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
    post.editedAt = new Date();
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
