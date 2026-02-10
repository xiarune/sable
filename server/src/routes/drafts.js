const express = require("express");
const { z } = require("zod");
const Draft = require("../models/Draft");
const Work = require("../models/Work");
const Genre = require("../models/Genre");
const Fandom = require("../models/Fandom");
const Tag = require("../models/Tag");
const { requireAuth } = require("../middleware/auth");

// Helper to create slug from name
function createSlug(name) {
  return (name || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Update genre/fandom/tag indexes when publishing
async function updateTaxonomyIndexes(draft, isFirstPublish) {
  const updates = [];

  // Update genre index
  if (draft.genre && draft.genre.trim()) {
    const genreSlug = createSlug(draft.genre);
    if (genreSlug) {
      updates.push(
        Genre.findOneAndUpdate(
          { slug: genreSlug },
          {
            $setOnInsert: { slug: genreSlug, name: draft.genre.trim(), description: "" },
            $inc: { worksCount: isFirstPublish ? 1 : 0 },
          },
          { upsert: true, new: true }
        ).catch((err) => console.error("Genre update error:", err))
      );
    }
  }

  // Update fandom index
  if (draft.fandom && draft.fandom.trim() && draft.fandom !== "Original Work") {
    const fandomSlug = createSlug(draft.fandom);
    if (fandomSlug) {
      updates.push(
        Fandom.findOneAndUpdate(
          { slug: fandomSlug },
          {
            $setOnInsert: { slug: fandomSlug, name: draft.fandom.trim(), description: "" },
            $inc: { worksCount: isFirstPublish ? 1 : 0 },
          },
          { upsert: true, new: true }
        ).catch((err) => console.error("Fandom update error:", err))
      );
    }
  }

  // Update tag indexes
  if (Array.isArray(draft.tags) && draft.tags.length > 0) {
    for (const tagName of draft.tags) {
      const tagSlug = createSlug(tagName);
      if (tagSlug) {
        updates.push(
          Tag.findOneAndUpdate(
            { slug: tagSlug },
            {
              $setOnInsert: { slug: tagSlug, name: tagName },
              $inc: { usageCount: isFirstPublish ? 1 : 0 },
            },
            { upsert: true, new: true }
          )
        );
      }
    }
  }

  await Promise.all(updates);
}

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
  genre: z.string().max(100).optional(),
  fandom: z.string().max(200).optional(),
  coverImageUrl: z.string().optional(),
  audioUrl: z.string().optional(),
  imageUrls: z.array(z.string()).optional(),
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
      .select("title chapters tags skin privacy language genre fandom coverImageUrl updatedAt createdAt");

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
        genre: draft.genre,
        fandom: draft.fandom,
        coverImageUrl: draft.coverImageUrl,
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
    if (updates.genre !== undefined) draft.genre = updates.genre;
    if (updates.fandom !== undefined) draft.fandom = updates.fandom;
    if (updates.coverImageUrl !== undefined) draft.coverImageUrl = updates.coverImageUrl;
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

    // 2. Check if already published - prevent duplicate publishing
    const existingWork = await Work.findOne({ sourceDraftId: draft._id });
    if (existingWork) {
      return res.status(400).json({
        error: "This draft has already been published",
        workId: existingWork._id
      });
    }

    // 3. Create new Work
    const work = new Work({
      authorId: req.user._id,
      authorUsername: req.user.username,
      sourceDraftId: draft._id,
    });

    // 4. Copy all content fields from draft to work
    work.title = draft.title || "Untitled";
    work.chapters = (draft.chapters || []).map((ch) => ({
      id: ch.id,
      title: ch.title || "Untitled Chapter",
      body: ch.body || "",
      order: ch.order || 0,
    }));
    work.tags = Array.isArray(draft.tags) ? [...draft.tags] : [];
    work.skin = draft.skin || "Default";
    work.privacy = draft.privacy || "Public";
    work.language = draft.language || "English";
    work.genre = draft.genre || "";
    work.fandom = draft.fandom || "";
    work.coverImageUrl = draft.coverImageUrl || "";
    work.audioUrl = draft.audioUrl || "";
    work.imageUrls = Array.isArray(draft.imageUrls) ? [...draft.imageUrls] : [];
    work.publishedAt = new Date();

    // 5. Save (updatedAt is automatic, wordCount computed by pre-save hook)
    await work.save();

    // 6. Update taxonomy indexes (genres, fandoms, tags)
    await updateTaxonomyIndexes(draft, true);

    res.status(201).json({
      message: "Work published",
      work,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
