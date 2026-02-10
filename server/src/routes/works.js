const express = require("express");
const { z } = require("zod");
const Work = require("../models/Work");
const Draft = require("../models/Draft");
const { requireAuth, optionalAuth } = require("../middleware/auth");
const { MAX_WORKS_PER_USER, MAX_CHAPTERS, MAX_BODY_LENGTH, MAX_TAGS, MAX_TAG_LENGTH } = require("../config/limits");

const router = express.Router();

// Validation schemas
const chapterSchema = z.object({
  id: z.string().min(1),
  title: z.string().max(200).default("Untitled Chapter"),
  body: z.string().max(MAX_BODY_LENGTH).default(""),
  order: z.number().int().min(0),
  audioUrl: z.string().optional(),
});

const createWorkSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  chapters: z.array(chapterSchema).max(MAX_CHAPTERS),
  tags: z.array(z.string().max(MAX_TAG_LENGTH)).max(MAX_TAGS).optional(),
  skin: z.enum(["Default", "Parchment"]).optional(),
  privacy: z.enum(["Public", "Following", "Private"]).optional(),
  language: z.enum(["English", "Vietnamese", "Japanese", "French", "Spanish"]).optional(),
  genre: z.string().optional(),
  fandom: z.string().optional(),
  coverImageUrl: z.string().optional(),
  audioUrl: z.string().optional(),
  imageUrls: z.array(z.string()).optional(),
});

const updateWorkSchema = createWorkSchema.partial();

// GET /works - List public works (with pagination and search)
router.get("/", optionalAuth, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, genre, fandom, language, tag, author, q, sort = "newest" } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = { privacy: "Public", status: "published" };
    if (genre) query.genre = genre;
    if (fandom) query.fandom = fandom;
    if (language) query.language = language;
    if (tag) query.tags = tag;
    if (author) query.authorUsername = author.toLowerCase();

    // Text search
    if (q && q.length >= 2) {
      query.$or = [
        { title: { $regex: q, $options: "i" } },
        { authorUsername: { $regex: q, $options: "i" } },
        { tags: { $regex: q, $options: "i" } },
      ];
    }

    // Sort options
    let sortOption = { publishedAt: -1 }; // newest (default)
    if (sort === "oldest") sortOption = { publishedAt: 1 };

    const [works, total] = await Promise.all([
      Work.find(query)
        .sort(sortOption)
        .skip(skip)
        .limit(parseInt(limit))
        .select("-chapters"),
      Work.countDocuments(query),
    ]);

    res.json({
      works,
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

// GET /works/mine - List my works
router.get("/mine", requireAuth, async (req, res, next) => {
  try {
    const works = await Work.find({ authorId: req.user._id })
      .sort({ updatedAt: -1 })
      .select("-chapters");

    res.json({
      works,
      limits: { maxWorks: MAX_WORKS_PER_USER, currentCount: works.length },
    });
  } catch (err) {
    next(err);
  }
});

// GET /works/:id - Get single work
router.get("/:id", optionalAuth, async (req, res, next) => {
  try {
    const work = await Work.findById(req.params.id);
    if (!work) {
      return res.status(404).json({ error: "Work not found" });
    }

    const isAuthor = req.user && work.authorId.toString() === req.user._id.toString();

    // Check privacy
    // Public: anyone can view
    // Private: only author
    // Following: requires auth (real follow check comes later)
    if (work.privacy === "Private") {
      if (!isAuthor) {
        return res.status(403).json({ error: "This work is private" });
      }
    } else if (work.privacy === "Following") {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required to view this work" });
      }
      // For now, any authenticated user can view "Following" works
      // Real follow check will be added later
    }

    // Increment views only for non-authors
    if (!isAuthor) {
      await Work.findByIdAndUpdate(work._id, { $inc: { views: 1 } });
      work.views += 1; // Update local copy for response
    }

    res.json({ work });
  } catch (err) {
    next(err);
  }
});

// POST /works - Create work directly
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const workCount = await Work.countDocuments({ authorId: req.user._id });
    if (workCount >= MAX_WORKS_PER_USER) {
      return res.status(400).json({
        error: `Maximum ${MAX_WORKS_PER_USER} works allowed`,
      });
    }

    const result = createWorkSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors[0].message });
    }

    const work = new Work({
      ...result.data,
      authorId: req.user._id,
      authorUsername: req.user.username,
      publishedAt: new Date(),
    });

    await work.save();

    res.status(201).json({ message: "Work published", work });
  } catch (err) {
    next(err);
  }
});

// POST /works/publish/:draftId - Publish from draft
router.post("/publish/:draftId", requireAuth, async (req, res, next) => {
  try {
    const draft = await Draft.findById(req.params.draftId);
    if (!draft) {
      return res.status(404).json({ error: "Draft not found" });
    }
    if (draft.authorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Not authorized" });
    }

    // Check if already published from this draft
    let work = await Work.findOne({ sourceDraftId: draft._id });

    if (work) {
      // Update existing work
      work.title = draft.title;
      work.chapters = draft.chapters;
      work.tags = draft.tags;
      work.skin = draft.skin;
      work.privacy = draft.privacy;
      work.language = draft.language;
      work.genre = draft.genre;
      work.fandom = draft.fandom;
      work.coverImageUrl = draft.coverImageUrl;
      work.audioUrl = draft.audioUrl;
      work.imageUrls = draft.imageUrls;
    } else {
      // Check limit
      const workCount = await Work.countDocuments({ authorId: req.user._id });
      if (workCount >= MAX_WORKS_PER_USER) {
        return res.status(400).json({
          error: `Maximum ${MAX_WORKS_PER_USER} works allowed`,
        });
      }

      // Create new work
      work = new Work({
        authorId: req.user._id,
        authorUsername: req.user.username,
        sourceDraftId: draft._id,
        title: draft.title,
        chapters: draft.chapters,
        tags: draft.tags,
        skin: draft.skin,
        privacy: draft.privacy,
        language: draft.language,
        genre: draft.genre,
        fandom: draft.fandom,
        coverImageUrl: draft.coverImageUrl,
        audioUrl: draft.audioUrl,
        imageUrls: draft.imageUrls,
        publishedAt: new Date(),
      });
    }

    await work.save();

    // Delete the draft after successful publish
    await Draft.findByIdAndDelete(draft._id);

    res.status(201).json({ message: "Work published", work });
  } catch (err) {
    next(err);
  }
});

// PUT /works/:id - Update work
router.put("/:id", requireAuth, async (req, res, next) => {
  try {
    const work = await Work.findById(req.params.id);
    if (!work) {
      return res.status(404).json({ error: "Work not found" });
    }
    if (work.authorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const result = updateWorkSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors[0].message });
    }

    Object.assign(work, result.data);
    await work.save();

    res.json({ message: "Work updated", work });
  } catch (err) {
    next(err);
  }
});

// DELETE /works/:id - Delete work
router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const work = await Work.findById(req.params.id);
    if (!work) {
      return res.status(404).json({ error: "Work not found" });
    }
    if (work.authorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Not authorized" });
    }

    await Work.findByIdAndDelete(work._id);

    res.json({ message: "Work deleted" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
