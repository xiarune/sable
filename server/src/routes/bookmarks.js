const express = require("express");
const Bookmark = require("../models/Bookmark");
const Work = require("../models/Work");
const Post = require("../models/Post");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// All routes require auth
router.use(requireAuth);

// GET /bookmarks - List my bookmarks
router.get("/", async (req, res, next) => {
  try {
    const { type, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = { userId: req.user._id };
    if (type) query.type = type;

    const [bookmarks, total] = await Promise.all([
      Bookmark.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Bookmark.countDocuments(query),
    ]);

    res.json({
      bookmarks,
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

// POST /bookmarks/work/:workId - Bookmark a work
router.post("/work/:workId", async (req, res, next) => {
  try {
    const { workId } = req.params;

    const work = await Work.findById(workId);
    if (!work) {
      return res.status(404).json({ error: "Work not found" });
    }

    const existing = await Bookmark.findOne({ userId: req.user._id, workId });
    if (existing) {
      return res.status(400).json({ error: "Already bookmarked" });
    }

    const bookmark = await Bookmark.create({
      userId: req.user._id,
      type: "work",
      workId,
      title: work.title,
      authorUsername: work.authorUsername,
      coverUrl: work.coverImageUrl || "",
    });

    await Work.findByIdAndUpdate(workId, { $inc: { bookmarksCount: 1 } });

    res.status(201).json({ message: "Bookmarked", bookmark });
  } catch (err) {
    next(err);
  }
});

// DELETE /bookmarks/work/:workId - Remove work bookmark
router.delete("/work/:workId", async (req, res, next) => {
  try {
    const { workId } = req.params;

    const bookmark = await Bookmark.findOneAndDelete({
      userId: req.user._id,
      workId,
    });

    if (!bookmark) {
      return res.status(404).json({ error: "Bookmark not found" });
    }

    await Work.findByIdAndUpdate(workId, { $inc: { bookmarksCount: -1 } });

    res.json({ message: "Bookmark removed" });
  } catch (err) {
    next(err);
  }
});

// POST /bookmarks/post/:postId - Bookmark a post
router.post("/post/:postId", async (req, res, next) => {
  try {
    const { postId } = req.params;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const existing = await Bookmark.findOne({ userId: req.user._id, postId });
    if (existing) {
      return res.status(400).json({ error: "Already bookmarked" });
    }

    const bookmark = await Bookmark.create({
      userId: req.user._id,
      type: "post",
      postId,
      title: post.title || post.caption?.slice(0, 50),
      authorUsername: post.authorUsername,
      coverUrl: post.imageUrl || "",
    });

    res.status(201).json({ message: "Bookmarked", bookmark });
  } catch (err) {
    next(err);
  }
});

// DELETE /bookmarks/post/:postId - Remove post bookmark
router.delete("/post/:postId", async (req, res, next) => {
  try {
    const { postId } = req.params;

    const bookmark = await Bookmark.findOneAndDelete({
      userId: req.user._id,
      postId,
    });

    if (!bookmark) {
      return res.status(404).json({ error: "Bookmark not found" });
    }

    res.json({ message: "Bookmark removed" });
  } catch (err) {
    next(err);
  }
});

// POST /bookmarks/audio/:audioId - Bookmark an audio track
router.post("/audio/:audioId", async (req, res, next) => {
  try {
    const { audioId } = req.params;
    const { workId, title, authorUsername } = req.body;

    // Try to get cover from associated work (only if workId is a valid ObjectId)
    let coverUrl = "";
    let validWorkId = null;
    if (workId && /^[0-9a-fA-F]{24}$/.test(workId)) {
      validWorkId = workId;
      const work = await Work.findById(workId);
      if (work?.coverImageUrl) {
        coverUrl = work.coverImageUrl;
      }
    }

    // Use findOneAndUpdate with upsert to avoid race conditions and index conflicts
    const bookmark = await Bookmark.findOneAndUpdate(
      { userId: req.user._id, audioId },
      {
        $setOnInsert: {
          userId: req.user._id,
          type: "audio",
          audioId,
          workId: validWorkId,
          title: title || "Audio Track",
          authorUsername: authorUsername || "Unknown",
          coverUrl,
        },
      },
      { upsert: true, new: true }
    );

    res.status(201).json({ message: "Audio bookmarked", bookmark });
  } catch (err) {
    next(err);
  }
});

// DELETE /bookmarks/audio/:audioId - Remove audio bookmark
router.delete("/audio/:audioId", async (req, res, next) => {
  try {
    const { audioId } = req.params;

    const bookmark = await Bookmark.findOneAndDelete({
      userId: req.user._id,
      audioId,
    });

    if (!bookmark) {
      return res.status(404).json({ error: "Bookmark not found" });
    }

    res.json({ message: "Bookmark removed" });
  } catch (err) {
    next(err);
  }
});

// GET /bookmarks/check - Check if bookmarked
router.get("/check", async (req, res, next) => {
  try {
    const { workId, postId, audioId } = req.query;

    const query = { userId: req.user._id };
    if (workId) query.workId = workId;
    if (postId) query.postId = postId;
    if (audioId) query.audioId = audioId;

    const bookmark = await Bookmark.findOne(query);

    res.json({ bookmarked: !!bookmark });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
