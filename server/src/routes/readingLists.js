const express = require("express");
const ReadingList = require("../models/ReadingList");
const Work = require("../models/Work");
const { requireAuth, optionalAuth } = require("../middleware/auth");

const router = express.Router();

// GET /reading-lists - Get my reading lists
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const lists = await ReadingList.find({ userId: req.user._id })
      .sort({ updatedAt: -1 })
      .select("-works");

    res.json({ lists });
  } catch (err) {
    next(err);
  }
});

// GET /reading-lists/user/:username - Get user's public reading lists
router.get("/user/:username", optionalAuth, async (req, res, next) => {
  try {
    const User = require("../models/User");
    const user = await User.findOne({ username: req.params.username.toLowerCase() });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const query = { userId: user._id };

    // If not the owner, only show public lists
    if (!req.user || req.user._id.toString() !== user._id.toString()) {
      query.isPublic = true;
    }

    const lists = await ReadingList.find(query)
      .sort({ updatedAt: -1 })
      .select("-works");

    res.json({ lists, user: { username: user.username, displayName: user.displayName } });
  } catch (err) {
    next(err);
  }
});

// GET /reading-lists/:id - Get a specific reading list with works
router.get("/:id", optionalAuth, async (req, res, next) => {
  try {
    const list = await ReadingList.findById(req.params.id)
      .populate({
        path: "works.workId",
        select: "title authorUsername coverImageUrl tags genre fandom wordCount likesCount progressStatus",
      });

    if (!list) {
      return res.status(404).json({ error: "Reading list not found" });
    }

    // Check access
    if (!list.isPublic) {
      if (!req.user || req.user._id.toString() !== list.userId.toString()) {
        return res.status(403).json({ error: "This list is private" });
      }
    }

    res.json({ list });
  } catch (err) {
    next(err);
  }
});

// POST /reading-lists - Create a new reading list
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { name, description, isPublic, coverImageUrl } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Name is required" });
    }

    // Check for duplicate name
    const existing = await ReadingList.findOne({
      userId: req.user._id,
      name: name.trim(),
    });

    if (existing) {
      return res.status(400).json({ error: "You already have a list with this name" });
    }

    const list = await ReadingList.create({
      userId: req.user._id,
      name: name.trim(),
      description: description || "",
      isPublic: isPublic !== false,
      coverImageUrl: coverImageUrl || "",
    });

    res.status(201).json({ list });
  } catch (err) {
    next(err);
  }
});

// PUT /reading-lists/:id - Update a reading list
router.put("/:id", requireAuth, async (req, res, next) => {
  try {
    const list = await ReadingList.findById(req.params.id);

    if (!list) {
      return res.status(404).json({ error: "Reading list not found" });
    }

    if (list.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const { name, description, isPublic, coverImageUrl } = req.body;

    // Check for duplicate name
    if (name && name.trim() !== list.name) {
      const existing = await ReadingList.findOne({
        userId: req.user._id,
        name: name.trim(),
        _id: { $ne: list._id },
      });

      if (existing) {
        return res.status(400).json({ error: "You already have a list with this name" });
      }
    }

    if (name) list.name = name.trim();
    if (description !== undefined) list.description = description;
    if (typeof isPublic === "boolean") list.isPublic = isPublic;
    if (coverImageUrl !== undefined) list.coverImageUrl = coverImageUrl;

    await list.save();

    res.json({ list });
  } catch (err) {
    next(err);
  }
});

// DELETE /reading-lists/:id - Delete a reading list
router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const list = await ReadingList.findById(req.params.id);

    if (!list) {
      return res.status(404).json({ error: "Reading list not found" });
    }

    if (list.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Not authorized" });
    }

    await list.deleteOne();

    res.json({ message: "Reading list deleted" });
  } catch (err) {
    next(err);
  }
});

// POST /reading-lists/:id/works - Add a work to a reading list
router.post("/:id/works", requireAuth, async (req, res, next) => {
  try {
    const { workId, notes } = req.body;

    if (!workId) {
      return res.status(400).json({ error: "Work ID is required" });
    }

    const list = await ReadingList.findById(req.params.id);

    if (!list) {
      return res.status(404).json({ error: "Reading list not found" });
    }

    if (list.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Not authorized" });
    }

    // Check if work exists
    const work = await Work.findById(workId);
    if (!work) {
      return res.status(404).json({ error: "Work not found" });
    }

    // Check if already in list
    const existingIndex = list.works.findIndex(
      (w) => w.workId.toString() === workId
    );

    if (existingIndex !== -1) {
      return res.status(400).json({ error: "Work already in list" });
    }

    list.works.push({
      workId,
      notes: notes || "",
      addedAt: new Date(),
    });
    list.worksCount = list.works.length;

    await list.save();

    res.json({ message: "Work added to list", worksCount: list.worksCount });
  } catch (err) {
    next(err);
  }
});

// DELETE /reading-lists/:id/works/:workId - Remove a work from a reading list
router.delete("/:id/works/:workId", requireAuth, async (req, res, next) => {
  try {
    const list = await ReadingList.findById(req.params.id);

    if (!list) {
      return res.status(404).json({ error: "Reading list not found" });
    }

    if (list.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const workIndex = list.works.findIndex(
      (w) => w.workId.toString() === req.params.workId
    );

    if (workIndex === -1) {
      return res.status(404).json({ error: "Work not in list" });
    }

    list.works.splice(workIndex, 1);
    list.worksCount = list.works.length;

    await list.save();

    res.json({ message: "Work removed from list", worksCount: list.worksCount });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
