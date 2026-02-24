const express = require("express");
const { z } = require("zod");
const Genre = require("../models/Genre");
const Fandom = require("../models/Fandom");
const Tag = require("../models/Tag");
const Work = require("../models/Work");
const User = require("../models/User");
const Bookmark = require("../models/Bookmark");
const Follow = require("../models/Follow");
const { optionalAuth, requireAuth } = require("../middleware/auth");

// Helper to get IDs of users with private profiles that the viewer can't see
async function getPrivateAuthorFilter(viewerId) {
  // Find all users with private profiles
  const privateUsers = await User.find({
    "preferences.visibility": "private",
  }).select("_id");

  if (privateUsers.length === 0) {
    return null; // No private users, no filter needed
  }

  const privateUserIds = privateUsers.map((u) => u._id);

  if (!viewerId) {
    // Not logged in - exclude all private users' works
    return { authorId: { $nin: privateUserIds } };
  }

  // Get users the viewer follows
  const following = await Follow.find({ followerId: viewerId }).select("followeeId");
  const followingIds = following.map((f) => f.followeeId.toString());

  // Filter out private users that the viewer doesn't follow
  const excludeIds = privateUserIds.filter(
    (id) => !followingIds.includes(id.toString())
  );

  if (excludeIds.length === 0) {
    return null; // Viewer follows all private users, no filter needed
  }

  return { authorId: { $nin: excludeIds } };
}
const {
  getWorkRecommendations,
  getPostRecommendations,
} = require("../services/recommendation");
const {
  engagementQuality,
  freshnessScore,
  diversityRerank,
  FRESHNESS_HALF_LIVES,
} = require("../services/scoring");

const router = express.Router();

// Escape special regex characters
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Helper function to filter works by muted words
function filterWorksByMutedWords(works, mutedWords) {
  if (!mutedWords || mutedWords.length === 0) return works;

  const lowerMutedWords = mutedWords.map(w => w.toLowerCase());

  return works.filter(work => {
    const textToCheck = `${work.title || ""} ${work.description || ""} ${(work.tags || []).join(" ")} ${work.fandom || ""} ${work.genre || ""}`.toLowerCase();
    return !lowerMutedWords.some(word => textToCheck.includes(word));
  });
}

// Helper function to filter works by content filters
function filterWorksByContentFilters(works, contentFilters) {
  if (!contentFilters) return works;

  return works.filter(work => {
    // If user has filter OFF (false), hide content with that flag
    if (!contentFilters.mature && (work.isMature || work.isNSFW)) return false;
    if (!contentFilters.explicit && work.isExplicit) return false;
    if (!contentFilters.violence && work.hasViolence) return false;
    if (!contentFilters.selfHarm && work.hasSelfHarm) return false;
    if (!contentFilters.spoilers && work.isSpoiler) return false;
    return true;
  });
}

// === GENRES ===

// GET /discovery/genres - List all genres
router.get("/genres", async (req, res, next) => {
  try {
    const genres = await Genre.find().sort({ name: 1 });
    res.json({ genres });
  } catch (err) {
    next(err);
  }
});

// GET /discovery/genres/:slug - Get genre with works
router.get("/genres/:slug", optionalAuth, async (req, res, next) => {
  try {
    const genre = await Genre.findOne({ slug: req.params.slug });
    if (!genre) {
      return res.status(404).json({ error: "Genre not found" });
    }

    const { page = 1, limit = 20, sort = "popular" } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Case-insensitive genre matching
    const query = { genre: { $regex: new RegExp(`^${escapeRegex(genre.name)}$`, "i") }, privacy: "Public", status: "published" };

    // Filter out blocked users' works if user is logged in
    if (req.user && req.user.blockedUsers && req.user.blockedUsers.length > 0) {
      query.authorId = { $nin: req.user.blockedUsers };
    }

    // Filter out works from private profiles (unless viewer follows them)
    const privateFilter = await getPrivateAuthorFilter(req.user?._id);
    if (privateFilter) {
      if (query.authorId) {
        query.authorId.$nin = [...(query.authorId.$nin || []), ...(privateFilter.authorId.$nin || [])];
      } else {
        Object.assign(query, privateFilter);
      }
    }

    let sortOption = { publishedAt: -1 };
    if (sort === "popular") sortOption = { views: -1 };
    if (sort === "rating") sortOption = { likesCount: -1 };

    let [works, total] = await Promise.all([
      Work.find(query)
        .sort(sortOption)
        .skip(skip)
        .limit(parseInt(limit))
        .select("-chapters"),
      Work.countDocuments(query),
    ]);

    // Filter out works containing muted words
    if (req.user && req.user.mutedWords && req.user.mutedWords.length > 0) {
      works = filterWorksByMutedWords(works, req.user.mutedWords);
    }

    // Apply content filters
    if (req.user && req.user.contentFilters) {
      works = filterWorksByContentFilters(works, req.user.contentFilters);
    }

    res.json({
      genre,
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

// === FANDOMS ===

// GET /discovery/fandoms - List fandoms
router.get("/fandoms", async (req, res, next) => {
  try {
    const { category, search, page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {};
    if (category) query.category = category;
    if (search) query.name = { $regex: search, $options: "i" };

    const [fandoms, total] = await Promise.all([
      Fandom.find(query)
        .sort({ workCount: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Fandom.countDocuments(query),
    ]);

    res.json({
      fandoms,
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

// GET /discovery/fandoms/:slug - Get fandom with works
router.get("/fandoms/:slug", optionalAuth, async (req, res, next) => {
  try {
    const fandom = await Fandom.findOne({ slug: req.params.slug });
    if (!fandom) {
      return res.status(404).json({ error: "Fandom not found" });
    }

    const { page = 1, limit = 20, sort = "recent" } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Case-insensitive fandom matching
    const query = { fandom: { $regex: new RegExp(`^${escapeRegex(fandom.name)}$`, "i") }, privacy: "Public", status: "published" };

    // Filter out blocked users' works if user is logged in
    if (req.user && req.user.blockedUsers && req.user.blockedUsers.length > 0) {
      query.authorId = { $nin: req.user.blockedUsers };
    }

    // Filter out works from private profiles (unless viewer follows them)
    const privateFilter = await getPrivateAuthorFilter(req.user?._id);
    if (privateFilter) {
      if (query.authorId) {
        query.authorId.$nin = [...(query.authorId.$nin || []), ...(privateFilter.authorId.$nin || [])];
      } else {
        Object.assign(query, privateFilter);
      }
    }

    let sortOption = { publishedAt: -1 };
    if (sort === "popular") sortOption = { views: -1 };
    if (sort === "rating") sortOption = { likesCount: -1 };

    let [works, total] = await Promise.all([
      Work.find(query)
        .sort(sortOption)
        .skip(skip)
        .limit(parseInt(limit))
        .select("-chapters"),
      Work.countDocuments(query),
    ]);

    // Filter out works containing muted words
    if (req.user && req.user.mutedWords && req.user.mutedWords.length > 0) {
      works = filterWorksByMutedWords(works, req.user.mutedWords);
    }

    // Apply content filters
    if (req.user && req.user.contentFilters) {
      works = filterWorksByContentFilters(works, req.user.contentFilters);
    }

    res.json({
      fandom,
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

// === TAGS ===

// GET /discovery/tags - Search/list tags
router.get("/tags", async (req, res, next) => {
  try {
    const { search, category, page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {};
    if (search) query.name = { $regex: search, $options: "i" };
    if (category) query.category = category;

    const [tags, total] = await Promise.all([
      Tag.find(query)
        .sort({ usageCount: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Tag.countDocuments(query),
    ]);

    res.json({
      tags,
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

// GET /discovery/tags/:slug - Get tag with works
router.get("/tags/:slug", optionalAuth, async (req, res, next) => {
  try {
    const tag = await Tag.findOne({ slug: req.params.slug });
    if (!tag) {
      return res.status(404).json({ error: "Tag not found" });
    }

    const { page = 1, limit = 20, sort = "recent" } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Case-insensitive tag matching
    const query = {
      tags: { $regex: new RegExp(`^${escapeRegex(tag.name)}$`, "i") },
      privacy: "Public",
      status: "published",
    };

    // Filter out blocked users' works if user is logged in
    if (req.user && req.user.blockedUsers && req.user.blockedUsers.length > 0) {
      query.authorId = { $nin: req.user.blockedUsers };
    }

    // Filter out works from private profiles (unless viewer follows them)
    const privateFilter = await getPrivateAuthorFilter(req.user?._id);
    if (privateFilter) {
      if (query.authorId) {
        query.authorId.$nin = [...(query.authorId.$nin || []), ...(privateFilter.authorId.$nin || [])];
      } else {
        Object.assign(query, privateFilter);
      }
    }

    let sortOption = { publishedAt: -1 };
    if (sort === "popular") sortOption = { views: -1 };

    let [works, total] = await Promise.all([
      Work.find(query)
        .sort(sortOption)
        .skip(skip)
        .limit(parseInt(limit))
        .select("-chapters"),
      Work.countDocuments(query),
    ]);

    // Filter out works containing muted words
    if (req.user && req.user.mutedWords && req.user.mutedWords.length > 0) {
      works = filterWorksByMutedWords(works, req.user.mutedWords);
    }

    // Apply content filters
    if (req.user && req.user.contentFilters) {
      works = filterWorksByContentFilters(works, req.user.contentFilters);
    }

    res.json({
      tag,
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

// === SEARCH ===

// GET /discovery/search - Global search
router.get("/search", optionalAuth, async (req, res, next) => {
  try {
    const { q, type = "all", page = 1, limit = 20 } = req.query;

    if (!q || q.length < 2) {
      return res.status(400).json({ error: "Search query must be at least 2 characters" });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const searchRegex = { $regex: q, $options: "i" };

    const results = {};

    // Search works
    if (type === "all" || type === "works") {
      const workQuery = {
        $or: [
          { title: searchRegex },
          { description: searchRegex },
          { tags: searchRegex },
          { genre: searchRegex },
          { fandom: searchRegex },
        ],
        privacy: "Public",
        status: "published",
      };

      // Filter out blocked users' works if user is logged in
      if (req.user && req.user.blockedUsers && req.user.blockedUsers.length > 0) {
        workQuery.authorId = { $nin: req.user.blockedUsers };
      }

      // Filter out works from private profiles (unless viewer follows them)
      const privateFilter = await getPrivateAuthorFilter(req.user?._id);
      if (privateFilter) {
        if (workQuery.authorId) {
          workQuery.authorId.$nin = [...(workQuery.authorId.$nin || []), ...(privateFilter.authorId.$nin || [])];
        } else {
          Object.assign(workQuery, privateFilter);
        }
      }

      let [works, workCount] = await Promise.all([
        Work.find(workQuery)
          .sort({ views: -1 })
          .skip(type === "works" ? skip : 0)
          .limit(type === "works" ? parseInt(limit) : 5)
          .select("-chapters"),
        Work.countDocuments(workQuery),
      ]);

      // Filter out works containing muted words
      if (req.user && req.user.mutedWords && req.user.mutedWords.length > 0) {
        works = filterWorksByMutedWords(works, req.user.mutedWords);
      }

      // Apply content filters
      if (req.user && req.user.contentFilters) {
        works = filterWorksByContentFilters(works, req.user.contentFilters);
      }

      results.works = { items: works, total: workCount };
    }

    // Search users
    if (type === "all" || type === "users") {
      const userQuery = {
        $or: [
          { username: searchRegex },
          { displayName: searchRegex },
        ],
        "preferences.visibility": { $ne: "invisible" },
      };

      const [users, userCount] = await Promise.all([
        User.find(userQuery)
          .skip(type === "users" ? skip : 0)
          .limit(type === "users" ? parseInt(limit) : 5)
          .select("username displayName avatarUrl bio stats"),
        User.countDocuments(userQuery),
      ]);

      results.users = { items: users, total: userCount };
    }

    // Search fandoms
    if (type === "all" || type === "fandoms") {
      const fandomQuery = { name: searchRegex };

      const [fandoms, fandomCount] = await Promise.all([
        Fandom.find(fandomQuery)
          .sort({ workCount: -1 })
          .skip(type === "fandoms" ? skip : 0)
          .limit(type === "fandoms" ? parseInt(limit) : 5),
        Fandom.countDocuments(fandomQuery),
      ]);

      results.fandoms = { items: fandoms, total: fandomCount };
    }

    // Search tags
    if (type === "all" || type === "tags") {
      const tagQuery = { name: searchRegex };

      const [tags, tagCount] = await Promise.all([
        Tag.find(tagQuery)
          .sort({ usageCount: -1 })
          .skip(type === "tags" ? skip : 0)
          .limit(type === "tags" ? parseInt(limit) : 5),
        Tag.countDocuments(tagQuery),
      ]);

      results.tags = { items: tags, total: tagCount };
    }

    res.json({
      query: q,
      type,
      results,
      pagination:
        type !== "all"
          ? {
              page: parseInt(page),
              limit: parseInt(limit),
              total: results[type]?.total || 0,
              pages: Math.ceil((results[type]?.total || 0) / parseInt(limit)),
            }
          : null,
    });
  } catch (err) {
    next(err);
  }
});

// === TRENDING / FEATURED ===

// GET /discovery/trending - Get trending works with engagement-weighted scoring
router.get("/trending", optionalAuth, async (req, res, next) => {
  try {
    const { period = "week", limit = 20 } = req.query;

    // Calculate date threshold
    let dateThreshold = new Date();
    if (period === "day") dateThreshold.setDate(dateThreshold.getDate() - 1);
    else if (period === "week") dateThreshold.setDate(dateThreshold.getDate() - 7);
    else if (period === "month") dateThreshold.setMonth(dateThreshold.getMonth() - 1);

    // Build query excluding blocked users
    const query = {
      privacy: "Public",
      status: "published",
      publishedAt: { $gte: dateThreshold },
    };

    // Filter out blocked users' works if user is logged in
    if (req.user && req.user.blockedUsers && req.user.blockedUsers.length > 0) {
      query.authorId = { $nin: req.user.blockedUsers };
    }

    // Filter out works from private profiles (unless viewer follows them)
    const privateFilter = await getPrivateAuthorFilter(req.user?._id);
    if (privateFilter) {
      if (query.authorId) {
        query.authorId.$nin = [...(query.authorId.$nin || []), ...(privateFilter.authorId.$nin || [])];
      } else {
        Object.assign(query, privateFilter);
      }
    }

    // Get candidates
    const candidates = await Work.find(query)
      .limit(parseInt(limit) * 3) // Get more for scoring
      .select("-chapters")
      .lean();

    // Score each work using engagement quality + freshness
    const scoredWorks = candidates.map((work) => {
      const eqScore = engagementQuality(work, "work");
      const fScore = freshnessScore(work.publishedAt, FRESHNESS_HALF_LIVES.works);

      // Trending weights: 60% engagement, 40% freshness
      const score = 0.6 * eqScore + 0.4 * fScore;

      return { work, score };
    });

    // Sort by score descending
    scoredWorks.sort((a, b) => b.score - a.score);

    // Apply diversity re-ranking
    let diverseWorks = diversityRerank(
      scoredWorks.map((sw) => sw.work),
      { maxPerAuthor: 2, maxPerGenre: 5, limit: parseInt(limit) }
    );

    // Filter out works containing muted words
    if (req.user && req.user.mutedWords && req.user.mutedWords.length > 0) {
      diverseWorks = filterWorksByMutedWords(diverseWorks, req.user.mutedWords);
    }

    // Apply content filters
    if (req.user && req.user.contentFilters) {
      diverseWorks = filterWorksByContentFilters(diverseWorks, req.user.contentFilters);
    }

    res.json({ works: diverseWorks, period });
  } catch (err) {
    next(err);
  }
});

// GET /discovery/featured - Get featured/staff picks
router.get("/featured", optionalAuth, async (req, res, next) => {
  try {
    const query = {
      privacy: "Public",
      status: "published",
      featured: true,
    };

    // Filter out blocked users' works if user is logged in
    if (req.user && req.user.blockedUsers && req.user.blockedUsers.length > 0) {
      query.authorId = { $nin: req.user.blockedUsers };
    }

    // Filter out works from private profiles (unless viewer follows them)
    const privateFilter = await getPrivateAuthorFilter(req.user?._id);
    if (privateFilter) {
      if (query.authorId) {
        query.authorId.$nin = [...(query.authorId.$nin || []), ...(privateFilter.authorId.$nin || [])];
      } else {
        Object.assign(query, privateFilter);
      }
    }

    let works = await Work.find(query)
      .sort({ featuredAt: -1 })
      .limit(20)
      .select("-chapters");

    // Filter out works containing muted words
    if (req.user && req.user.mutedWords && req.user.mutedWords.length > 0) {
      works = filterWorksByMutedWords(works, req.user.mutedWords);
    }

    // Apply content filters
    if (req.user && req.user.contentFilters) {
      works = filterWorksByContentFilters(works, req.user.contentFilters);
    }

    res.json({ works });
  } catch (err) {
    next(err);
  }
});

// GET /discovery/new - Get newest works with optional quality filter
router.get("/new", optionalAuth, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, quality = "all" } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build query based on quality filter
    const query = { privacy: "Public", status: "published" };

    // Filter out blocked users' works if user is logged in
    if (req.user && req.user.blockedUsers && req.user.blockedUsers.length > 0) {
      query.authorId = { $nin: req.user.blockedUsers };
    }

    // Filter out works from private profiles (unless viewer follows them)
    const privateFilter = await getPrivateAuthorFilter(req.user?._id);
    if (privateFilter) {
      if (query.authorId) {
        query.authorId.$nin = [...(query.authorId.$nin || []), ...(privateFilter.authorId.$nin || [])];
      } else {
        Object.assign(query, privateFilter);
      }
    }

    // Quality filter: only show works with minimum engagement or quality score
    if (quality === "quality") {
      query.$or = [
        { qualityScore: { $gte: 0.5 } },
        { likesCount: { $gte: 1 } },
        { bookmarksCount: { $gte: 1 } },
      ];
    }

    let [works, total] = await Promise.all([
      Work.find(query)
        .sort({ publishedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select("-chapters"),
      Work.countDocuments(query),
    ]);

    // Filter out works containing muted words
    if (req.user && req.user.mutedWords && req.user.mutedWords.length > 0) {
      works = filterWorksByMutedWords(works, req.user.mutedWords);
    }

    // Apply content filters
    if (req.user && req.user.contentFilters) {
      works = filterWorksByContentFilters(works, req.user.contentFilters);
    }

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

// === FOR YOU (Personalized Recommendations) ===

// GET /discovery/for-you - Get personalized recommendations using hybrid ranker
router.get("/for-you", requireAuth, async (req, res, next) => {
  try {
    const { limit = 20 } = req.query;

    const result = await getWorkRecommendations(req.user, {
      limit: parseInt(limit),
    });

    let works = result.works;

    // Filter out works containing muted words
    if (req.user.mutedWords && req.user.mutedWords.length > 0) {
      works = filterWorksByMutedWords(works, req.user.mutedWords);
    }

    // Apply content filters
    if (req.user.contentFilters) {
      works = filterWorksByContentFilters(works, req.user.contentFilters);
    }

    res.json({
      works,
      personalized: result.personalized,
      mode: result.mode,
    });
  } catch (err) {
    next(err);
  }
});

// GET /discovery/logged-out - Non-personalized recommendations for logged-out users
router.get("/logged-out", async (req, res, next) => {
  try {
    const { limit = 20, period = "week" } = req.query;

    const result = await getWorkRecommendations(null, {
      limit: parseInt(limit),
      period,
    });

    res.json({
      works: result.works,
      personalized: false,
      mode: "logged_out",
    });
  } catch (err) {
    next(err);
  }
});

// === SYNC / ADMIN ===

// Helper to create slug from name
function slugify(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// POST /discovery/sync - Sync genres, fandoms, and tags from existing works
router.post("/sync", async (req, res, next) => {
  try {
    // Get all works (not just public/published for debugging)
    const allWorks = await Work.find({});

    // Filter to public, published works
    const works = allWorks.filter(w => {
      // Default status is "published" if not set
      const status = w.status || "published";
      const privacy = w.privacy || "Public";
      return privacy === "Public" && status === "published";
    });

    // Track unique genres, fandoms, and tags
    const genreCounts = {};
    const fandomCounts = {};
    const tagCounts = {};
    const genreList = [];
    const fandomList = [];

    for (const work of works) {
      if (work.genre && work.genre.trim()) {
        const genre = work.genre.trim();
        genreCounts[genre] = (genreCounts[genre] || 0) + 1;
        if (!genreList.includes(genre)) genreList.push(genre);
      }
      if (work.fandom && work.fandom.trim()) {
        const fandom = work.fandom.trim();
        fandomCounts[fandom] = (fandomCounts[fandom] || 0) + 1;
        if (!fandomList.includes(fandom)) fandomList.push(fandom);
      }
      if (work.tags && work.tags.length > 0) {
        for (const tag of work.tags) {
          if (tag && tag.trim()) {
            tagCounts[tag.trim()] = (tagCounts[tag.trim()] || 0) + 1;
          }
        }
      }
    }

    // Upsert genres
    for (const [name, count] of Object.entries(genreCounts)) {
      const slug = slugify(name);
      if (!slug) continue;
      await Genre.findOneAndUpdate(
        { slug },
        { $set: { slug, name, worksCount: count } },
        { upsert: true }
      );
    }

    // Upsert fandoms
    for (const [name, count] of Object.entries(fandomCounts)) {
      const slug = slugify(name);
      if (!slug) continue;
      await Fandom.findOneAndUpdate(
        { slug },
        { $set: { slug, name, worksCount: count } },
        { upsert: true }
      );
    }

    // Upsert tags
    for (const [name, count] of Object.entries(tagCounts)) {
      const slug = slugify(name);
      if (!slug) continue;
      await Tag.findOneAndUpdate(
        { slug },
        { $set: { slug, name, usageCount: count } },
        { upsert: true }
      );
    }

    res.json({
      message: "Sync complete",
      totalWorks: allWorks.length,
      publicPublishedWorks: works.length,
      genres: genreList,
      genreCount: Object.keys(genreCounts).length,
      fandoms: fandomList,
      fandomCount: Object.keys(fandomCounts).length,
      tagCount: Object.keys(tagCounts).length,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
