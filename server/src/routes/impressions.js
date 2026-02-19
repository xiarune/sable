const express = require("express");
const { z } = require("zod");
const Impression = require("../models/Impression");
const User = require("../models/User");
const { optionalAuth } = require("../middleware/auth");

const router = express.Router();

// Validation schemas
const createImpressionSchema = z.object({
  itemId: z.string(),
  itemType: z.enum(["work", "post", "user"]),
  surface: z.enum(["for_you", "trending", "new", "search", "feed", "discover", "profile"]),
  position: z.number().optional(),
  sessionId: z.string().optional(),
  algorithmVersion: z.string().optional(),
  score: z.number().optional(),
});

const createBatchImpressionSchema = z.object({
  impressions: z.array(
    z.object({
      itemId: z.string(),
      itemType: z.enum(["work", "post", "user"]),
      position: z.number().optional(),
    })
  ),
  surface: z.enum(["for_you", "trending", "new", "search", "feed", "discover", "profile"]),
  sessionId: z.string().optional(),
});

const updateImpressionSchema = z.object({
  dwellTimeMs: z.number().optional(),
  liked: z.boolean().optional(),
  bookmarked: z.boolean().optional(),
  followed: z.boolean().optional(),
  hidden: z.boolean().optional(),
  reported: z.boolean().optional(),
});

// POST /impressions - Log a single impression
router.post("/", optionalAuth, async (req, res, next) => {
  try {
    const result = createImpressionSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors[0].message });
    }

    const { itemId, itemType, surface, position, sessionId, algorithmVersion, score } = result.data;

    const impression = new Impression({
      userId: req.user?._id || null,
      itemId,
      itemType,
      surface,
      position: position || 0,
      sessionId: sessionId || null,
      algorithmVersion: algorithmVersion || "v1",
      score: score || null,
    });

    await impression.save();

    res.status(201).json({
      message: "Impression logged",
      impressionId: impression._id,
    });
  } catch (err) {
    next(err);
  }
});

// POST /impressions/batch - Log multiple impressions at once
router.post("/batch", optionalAuth, async (req, res, next) => {
  try {
    const result = createBatchImpressionSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors[0].message });
    }

    const { impressions, surface, sessionId } = result.data;
    const userId = req.user?._id || null;

    const impressionDocs = impressions.map((imp, index) => ({
      userId,
      itemId: imp.itemId,
      itemType: imp.itemType,
      surface,
      position: imp.position ?? index,
      sessionId: sessionId || null,
      algorithmVersion: "v1",
    }));

    await Impression.insertMany(impressionDocs);

    res.status(201).json({
      message: "Impressions logged",
      count: impressionDocs.length,
    });
  } catch (err) {
    next(err);
  }
});

// POST /impressions/:id/click - Log a click on an impression
router.post("/:id/click", optionalAuth, async (req, res, next) => {
  try {
    const impression = await Impression.findById(req.params.id);
    if (!impression) {
      return res.status(404).json({ error: "Impression not found" });
    }

    impression.clicked = true;
    impression.clickedAt = new Date();
    await impression.save();

    // Update user's recently seen works/authors if logged in
    if (req.user && impression.itemType === "work") {
      await updateUserRecommendationData(req.user._id, impression.itemId, "work");
    }

    res.json({ message: "Click logged" });
  } catch (err) {
    next(err);
  }
});

// POST /impressions/:id/engage - Log engagement on an impression
router.post("/:id/engage", optionalAuth, async (req, res, next) => {
  try {
    const result = updateImpressionSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors[0].message });
    }

    const impression = await Impression.findById(req.params.id);
    if (!impression) {
      return res.status(404).json({ error: "Impression not found" });
    }

    // Update engagement fields
    const { dwellTimeMs, liked, bookmarked, followed, hidden, reported } = result.data;

    if (dwellTimeMs !== undefined) impression.dwellTimeMs = dwellTimeMs;
    if (liked !== undefined) impression.liked = liked;
    if (bookmarked !== undefined) impression.bookmarked = bookmarked;
    if (followed !== undefined) impression.followed = followed;
    if (hidden !== undefined) impression.hidden = hidden;
    if (reported !== undefined) impression.reported = reported;

    await impression.save();

    // Update user's tag/author affinities on positive engagement
    if (req.user && (liked || bookmarked)) {
      await updateUserAffinities(req.user._id, impression.itemId, impression.itemType);
    }

    res.json({ message: "Engagement logged" });
  } catch (err) {
    next(err);
  }
});

// POST /impressions/click-by-item - Log a click by item (without impression ID)
router.post("/click-by-item", optionalAuth, async (req, res, next) => {
  try {
    const { itemId, itemType, surface } = req.body;

    if (!itemId || !itemType) {
      return res.status(400).json({ error: "itemId and itemType are required" });
    }

    // Find or create impression
    let impression = await Impression.findOne({
      userId: req.user?._id || null,
      itemId,
      itemType,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24 hours
    });

    if (!impression) {
      impression = new Impression({
        userId: req.user?._id || null,
        itemId,
        itemType,
        surface: surface || "profile",
      });
    }

    impression.clicked = true;
    impression.clickedAt = new Date();
    await impression.save();

    // Update user's recently seen works if logged in
    if (req.user && itemType === "work") {
      await updateUserRecommendationData(req.user._id, itemId, "work");
    }

    res.json({ message: "Click logged", impressionId: impression._id });
  } catch (err) {
    next(err);
  }
});

/**
 * Update user's recommendation data (recently seen works/authors)
 */
async function updateUserRecommendationData(userId, itemId, itemType) {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    // Initialize recommendationData if needed
    if (!user.recommendationData) {
      user.recommendationData = {
        recentlySeenWorks: [],
        recentlySeenAuthors: [],
        tagAffinities: [],
        authorAffinities: [],
      };
    }

    if (itemType === "work") {
      // Add to recently seen works (limit to 100)
      const recentWorks = user.recommendationData.recentlySeenWorks || [];
      const existingIndex = recentWorks.findIndex(
        (w) => w.workId?.toString() === itemId.toString()
      );

      if (existingIndex >= 0) {
        // Update seenAt
        recentWorks[existingIndex].seenAt = new Date();
      } else {
        // Add new entry
        recentWorks.unshift({ workId: itemId, seenAt: new Date() });
        // Limit to 100 entries
        if (recentWorks.length > 100) {
          recentWorks.pop();
        }
      }

      user.recommendationData.recentlySeenWorks = recentWorks;
      await user.save();
    }
  } catch (err) {
    console.error("Error updating recommendation data:", err);
  }
}

/**
 * Update user's tag and author affinities based on engagement
 */
async function updateUserAffinities(userId, itemId, itemType) {
  try {
    if (itemType !== "work") return;

    const Work = require("../models/Work");
    const work = await Work.findById(itemId);
    if (!work) return;

    const user = await User.findById(userId);
    if (!user) return;

    // Initialize recommendationData if needed
    if (!user.recommendationData) {
      user.recommendationData = {
        recentlySeenWorks: [],
        recentlySeenAuthors: [],
        tagAffinities: [],
        authorAffinities: [],
      };
    }

    // Update tag affinities
    const tagAffinities = user.recommendationData.tagAffinities || [];
    for (const tag of work.tags || []) {
      const existingIndex = tagAffinities.findIndex((t) => t.tag === tag);
      if (existingIndex >= 0) {
        // Increase weight (max 10)
        tagAffinities[existingIndex].weight = Math.min(
          10,
          tagAffinities[existingIndex].weight + 0.5
        );
      } else {
        tagAffinities.push({ tag, weight: 1.0 });
      }
    }
    // Limit to top 50 tags by weight
    tagAffinities.sort((a, b) => b.weight - a.weight);
    user.recommendationData.tagAffinities = tagAffinities.slice(0, 50);

    // Update author affinities
    const authorAffinities = user.recommendationData.authorAffinities || [];
    const authorId = work.authorId.toString();
    const existingAuthorIndex = authorAffinities.findIndex(
      (a) => a.authorId?.toString() === authorId
    );
    if (existingAuthorIndex >= 0) {
      authorAffinities[existingAuthorIndex].weight = Math.min(
        10,
        authorAffinities[existingAuthorIndex].weight + 0.5
      );
    } else {
      authorAffinities.push({ authorId: work.authorId, weight: 1.0 });
    }
    // Limit to top 50 authors by weight
    authorAffinities.sort((a, b) => b.weight - a.weight);
    user.recommendationData.authorAffinities = authorAffinities.slice(0, 50);

    user.recommendationData.computedAt = new Date();
    await user.save();
  } catch (err) {
    console.error("Error updating affinities:", err);
  }
}

module.exports = router;
