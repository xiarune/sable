const express = require("express");
const { z } = require("zod");
const Genre = require("../models/Genre");
const Fandom = require("../models/Fandom");
const Tag = require("../models/Tag");
const Work = require("../models/Work");
const User = require("../models/User");
const { optionalAuth } = require("../middleware/auth");

const router = express.Router();

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

    const query = { genre: genre.name, privacy: "Public", status: "published" };

    let sortOption = { publishedAt: -1 };
    if (sort === "popular") sortOption = { views: -1 };
    if (sort === "rating") sortOption = { likesCount: -1 };

    const [works, total] = await Promise.all([
      Work.find(query)
        .sort(sortOption)
        .skip(skip)
        .limit(parseInt(limit))
        .select("-chapters"),
      Work.countDocuments(query),
    ]);

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

    const query = { fandom: fandom.name, privacy: "Public", status: "published" };

    let sortOption = { publishedAt: -1 };
    if (sort === "popular") sortOption = { views: -1 };
    if (sort === "rating") sortOption = { likesCount: -1 };

    const [works, total] = await Promise.all([
      Work.find(query)
        .sort(sortOption)
        .skip(skip)
        .limit(parseInt(limit))
        .select("-chapters"),
      Work.countDocuments(query),
    ]);

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

    const query = {
      tags: tag.name,
      privacy: "Public",
      status: "published",
    };

    let sortOption = { publishedAt: -1 };
    if (sort === "popular") sortOption = { views: -1 };

    const [works, total] = await Promise.all([
      Work.find(query)
        .sort(sortOption)
        .skip(skip)
        .limit(parseInt(limit))
        .select("-chapters"),
      Work.countDocuments(query),
    ]);

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
          { "tags.custom": searchRegex },
        ],
        privacy: "Public",
        status: "published",
      };

      const [works, workCount] = await Promise.all([
        Work.find(workQuery)
          .sort({ views: -1 })
          .skip(type === "works" ? skip : 0)
          .limit(type === "works" ? parseInt(limit) : 5)
          .select("-chapters"),
        Work.countDocuments(workQuery),
      ]);

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

// GET /discovery/trending - Get trending works
router.get("/trending", async (req, res, next) => {
  try {
    const { period = "week", limit = 20 } = req.query;

    // Calculate date threshold
    let dateThreshold = new Date();
    if (period === "day") dateThreshold.setDate(dateThreshold.getDate() - 1);
    else if (period === "week") dateThreshold.setDate(dateThreshold.getDate() - 7);
    else if (period === "month") dateThreshold.setMonth(dateThreshold.getMonth() - 1);

    const works = await Work.find({
      privacy: "Public",
      status: "published",
      publishedAt: { $gte: dateThreshold },
    })
      .sort({ views: -1 })
      .limit(parseInt(limit))
      .select("-chapters");

    res.json({ works, period });
  } catch (err) {
    next(err);
  }
});

// GET /discovery/featured - Get featured/staff picks
router.get("/featured", async (req, res, next) => {
  try {
    const works = await Work.find({
      privacy: "Public",
      status: "published",
      featured: true,
    })
      .sort({ featuredAt: -1 })
      .limit(20)
      .select("-chapters");

    res.json({ works });
  } catch (err) {
    next(err);
  }
});

// GET /discovery/new - Get newest works
router.get("/new", async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [works, total] = await Promise.all([
      Work.find({ privacy: "Public", status: "published" })
        .sort({ publishedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select("-chapters"),
      Work.countDocuments({ privacy: "Public", status: "published" }),
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

module.exports = router;
