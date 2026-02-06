const express = require("express");
const { z } = require("zod");
const Draft = require("../models/Draft");
const Work = require("../models/Work");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// All draft routes require authentication
router.use(requireAuth);

// Validation constants (optimized for 500 MB free tier, ~50 users)
const MAX_DRAFTS_PER_USER = 5;
const MAX_CHAPTERS = 30;
const MAX_BODY_LENGTH = 25000; // ~5,000 words per chapter
const MAX_TAGS = 20;
const MAX_TAG_LENGTH = 30;
const MAX_TITLE_LENGTH = 200;

// Validation schemas
const chapterSchema = z.object({
  id: z.string().min(1),
  title: z.string().max(MAX_TITLE_LENGTH).default("Untitled Chapter"),
  body: z.string().max(MAX_BODY_LENGTH).default(""),
  order: z.number().int().min(0),
});

const createDraftSchema = z.object({
  title: z.string().max(MAX_TITLE_LENGTH).optional(),
});

const updateDraftSchema = z.object({
  title: z.string().max(MAX_TITLE_LENGTH).optional(),
  chapters: z
    .array(chapterSchema)
    .max(MAX_CHAPTERS, `Maximum ${MAX_CHAPTERS} chapters allowed`)
    .optional(),
  tags: z
    .array(z.string().max(MAX_TAG_LENGTH))
    .max(MAX_TAGS, `Maximum ${MAX_TAGS} tags allowed`)
    .optional(),
  skin: z.enum(["Default", "Emerald", "Ivory", "Midnight"]).optional(),
  privacy: z.enum(["Public", "Following", "Private"]).optional(),
  language: z.enum(["English", "Vietnamese", "Japanese", "French", "Spanish"]).optional(),
  audioUrl: z.string().url().optional().or(z.literal("")),
  imageUrls: z.array(z.string().url()).optional(),
});

// Helper: Check if user owns the draft
async function getDraftIfOwner(draftId, userId) {
  const draft = await Draft.findById(draftId);
  if (!draft) {
    return { error: "Draft not found", status: 404 };
  }
  if (draft.authorId.toString() !== userId.toString()) {
    return { error: "Not authorized to access this draft", status: 403 };
  }
  return { draft };
}

// GET /drafts - List my drafts
router.get("/", async (req, res, next) => {
  try {
    const drafts = await Draft.find({ authorId: req.user._id })
      .sort({ updatedAt: -1 })
      .select("title chapters tags skin privacy language updatedAt createdAt");

    // Return with chapter count and word count for list view
    const draftsWithMeta = drafts.map((draft) => {
      const wordCount = draft.chapters.reduce((total, ch) => {
        return total + (ch.body ? ch.body.trim().split(/\s+/).filter(Boolean).length : 0);
      }, 0);

      return {
        _id: draft._id,
        title: draft.title,
        chapterCount: draft.chapters.length,
        wordCount,
        tags: draft.tags,
        skin: draft.skin,
        privacy: draft.privacy,
        language: draft.language,
        updatedAt: draft.updatedAt,
        createdAt: draft.createdAt,
      };
    });

    res.json({
      drafts: draftsWithMeta,
      limits: {
        maxDrafts: MAX_DRAFTS_PER_USER,
        currentCount: drafts.length,
      }
    });
  } catch (err) {
    next(err);
  }
});

// POST /drafts - Create draft
router.post("/", async (req, res, next) => {
  try {
    // Check draft limit
    const draftCount = await Draft.countDocuments({ authorId: req.user._id });
    if (draftCount >= MAX_DRAFTS_PER_USER) {
      return res.status(400).json({
        error: `Maximum ${MAX_DRAFTS_PER_USER} drafts allowed. Please delete or publish existing drafts.`
      });
    }

    const result = createDraftSchema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.errors.map((e) => e.message);
      return res.status(400).json({ error: errors[0], errors });
    }

    const { title } = result.data;

    // Create draft with default chapter
    const draft = new Draft({
      authorId: req.user._id,
      title: title || "Untitled",
      chapters: [
        {
          id: `ch_${Date.now()}`,
          title: "Chapter 1",
          body: "",
          order: 0,
        },
      ],
    });

    await draft.save();

    res.status(201).json({
      message: "Draft created",
      draft,
    });
  } catch (err) {
    next(err);
  }
});

// GET /drafts/:id - Get one draft
router.get("/:id", async (req, res, next) => {
  try {
    const { draft, error, status } = await getDraftIfOwner(req.params.id, req.user._id);
    if (error) {
      return res.status(status).json({ error });
    }

    res.json({
      draft,
      limits: {
        maxChapters: MAX_CHAPTERS,
        maxBodyLength: MAX_BODY_LENGTH,
        maxTags: MAX_TAGS,
      }
    });
  } catch (err) {
    next(err);
  }
});

// PUT /drafts/:id - Update draft
router.put("/:id", async (req, res, next) => {
  try {
    const { draft, error, status } = await getDraftIfOwner(req.params.id, req.user._id);
    if (error) {
      return res.status(status).json({ error });
    }

    const result = updateDraftSchema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.errors.map((e) => e.message);
      return res.status(400).json({ error: errors[0], errors });
    }

    const updates = result.data;

    // Apply updates
    if (updates.title !== undefined) draft.title = updates.title;
    if (updates.chapters !== undefined) {
      // Sort chapters by order before saving
      draft.chapters = updates.chapters.sort((a, b) => a.order - b.order);
    }
    if (updates.tags !== undefined) draft.tags = updates.tags;
    if (updates.skin !== undefined) draft.skin = updates.skin;
    if (updates.privacy !== undefined) draft.privacy = updates.privacy;
    if (updates.language !== undefined) draft.language = updates.language;
    if (updates.audioUrl !== undefined) draft.audioUrl = updates.audioUrl;
    if (updates.imageUrls !== undefined) draft.imageUrls = updates.imageUrls;

    await draft.save();

    res.json({
      message: "Draft updated",
      draft,
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /drafts/:id - Delete draft
router.delete("/:id", async (req, res, next) => {
  try {
    const { draft, error, status } = await getDraftIfOwner(req.params.id, req.user._id);
    if (error) {
      return res.status(status).json({ error });
    }

    await Draft.findByIdAndDelete(draft._id);

    res.json({ message: "Draft deleted" });
  } catch (err) {
    next(err);
  }
});

// POST /drafts/:id/publish - Publish draft as Work
router.post("/:id/publish", async (req, res, next) => {
  try {
    // 1. Verify ownership
    const { draft, error, status } = await getDraftIfOwner(req.params.id, req.user._id);
    if (error) {
      return res.status(status).json({ error });
    }

    // 2. Find existing Work from this draft (upsert behavior)
    let work = await Work.findOne({ sourceDraftId: draft._id });
    const isFirstPublish = !work;

    if (!work) {
      // Create new Work
      work = new Work({
        authorId: req.user._id,
        authorUsername: req.user.username,
        sourceDraftId: draft._id,
      });
    }

    // 3. Copy all content fields from draft to work
    work.title = draft.title;
    work.chapters = draft.chapters.map((ch) => ({
      id: ch.id,
      title: ch.title,
      body: ch.body,
      order: ch.order,
    }));
    work.tags = [...draft.tags];
    work.skin = draft.skin;
    work.privacy = draft.privacy;
    work.language = draft.language;
    work.genre = draft.genre;
    work.fandom = draft.fandom;
    work.coverImageUrl = draft.coverImageUrl;
    work.audioUrl = draft.audioUrl;
    work.imageUrls = [...draft.imageUrls];

    // 4. Set publishedAt only on first publish
    if (isFirstPublish) {
      work.publishedAt = new Date();
    }

    // 5. Save (updatedAt is automatic, wordCount computed by pre-save hook)
    await work.save();

    res.status(isFirstPublish ? 201 : 200).json({
      message: isFirstPublish ? "Work published" : "Work updated",
      work,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
