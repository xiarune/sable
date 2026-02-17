const express = require("express");
const Skin = require("../models/Skin");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// GET /skins - List my skins (requires auth)
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const { appliesTo } = req.query;

    const query = { userId: req.user._id };
    if (appliesTo) query.appliesTo = appliesTo;

    const skins = await Skin.find(query).sort({ createdAt: -1 });

    res.json({ skins });
  } catch (err) {
    next(err);
  }
});

// GET /skins/:id - Get a specific skin (public - for work viewing)
router.get("/:id", async (req, res, next) => {
  try {
    const skin = await Skin.findById(req.params.id);

    if (!skin) {
      return res.status(404).json({ error: "Skin not found" });
    }

    // Return the skin - it's being used to view a work
    // Only return necessary fields for rendering
    res.json({
      skin: {
        _id: skin._id,
        name: skin.name,
        css: skin.css,
        appliesTo: skin.appliesTo,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /skins - Create a new skin (requires auth)
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { name, appliesTo, css, isPublic } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Skin name is required" });
    }

    if (!css || !css.trim()) {
      return res.status(400).json({ error: "CSS is required" });
    }

    // Check for duplicate name
    const existing = await Skin.findOne({
      userId: req.user._id,
      name: name.trim(),
    });

    if (existing) {
      return res.status(400).json({ error: "You already have a skin with this name" });
    }

    const skin = await Skin.create({
      userId: req.user._id,
      name: name.trim(),
      appliesTo: appliesTo === "community" ? "community" : "work",
      css: css.trim(),
      isPublic: Boolean(isPublic),
    });

    res.status(201).json({ skin });
  } catch (err) {
    next(err);
  }
});

// PUT /skins/:id - Update a skin (requires auth)
router.put("/:id", requireAuth, async (req, res, next) => {
  try {
    const skin = await Skin.findById(req.params.id);

    if (!skin) {
      return res.status(404).json({ error: "Skin not found" });
    }

    if (skin.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "You can only edit your own skins" });
    }

    const { name, appliesTo, css, isPublic } = req.body;

    // Check for duplicate name (excluding current skin)
    if (name && name.trim() !== skin.name) {
      const existing = await Skin.findOne({
        userId: req.user._id,
        name: name.trim(),
        _id: { $ne: skin._id },
      });

      if (existing) {
        return res.status(400).json({ error: "You already have a skin with this name" });
      }
    }

    if (name) skin.name = name.trim();
    if (appliesTo) skin.appliesTo = appliesTo === "community" ? "community" : "work";
    if (css) skin.css = css.trim();
    if (typeof isPublic === "boolean") skin.isPublic = isPublic;

    await skin.save();

    res.json({ skin });
  } catch (err) {
    next(err);
  }
});

// DELETE /skins/:id - Delete a skin (requires auth)
router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const skin = await Skin.findById(req.params.id);

    if (!skin) {
      return res.status(404).json({ error: "Skin not found" });
    }

    if (skin.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "You can only delete your own skins" });
    }

    await skin.deleteOne();

    res.json({ message: "Skin deleted" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
