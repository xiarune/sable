const express = require("express");
const { z } = require("zod");
const AudioTrack = require("../models/AudioTrack");
const { requireAuth, optionalAuth } = require("../middleware/auth");

const router = express.Router();

// Validation
const createAudioSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  audioUrl: z.string().url(),
  duration: z.string().optional(),
  durationSeconds: z.number().optional(),
  visibility: z.enum(["public", "private", "community"]).optional(),
  allowRemixes: z.boolean().optional(),
});

const updateAudioSchema = createAudioSchema.partial();

// GET /audio - List public audio tracks
router.get("/", optionalAuth, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, author } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = { visibility: "public" };
    if (author) query.ownerUsername = author.toLowerCase();

    const [tracks, total] = await Promise.all([
      AudioTrack.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      AudioTrack.countDocuments(query),
    ]);

    res.json({
      tracks,
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

// GET /audio/mine - List my audio tracks
router.get("/mine", requireAuth, async (req, res, next) => {
  try {
    const tracks = await AudioTrack.find({ ownerId: req.user._id })
      .sort({ createdAt: -1 });

    res.json({ tracks });
  } catch (err) {
    next(err);
  }
});

// GET /audio/:id - Get single track
router.get("/:id", optionalAuth, async (req, res, next) => {
  try {
    const track = await AudioTrack.findById(req.params.id);
    if (!track) {
      return res.status(404).json({ error: "Track not found" });
    }

    // Check visibility
    if (track.visibility !== "public") {
      if (!req.user || track.ownerId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: "This track is private" });
      }
    }

    res.json({ track });
  } catch (err) {
    next(err);
  }
});

// POST /audio - Create audio track
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const result = createAudioSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors[0].message });
    }

    const track = new AudioTrack({
      ...result.data,
      ownerId: req.user._id,
      ownerUsername: req.user.username,
    });

    await track.save();

    res.status(201).json({ message: "Track created", track });
  } catch (err) {
    next(err);
  }
});

// PUT /audio/:id - Update track
router.put("/:id", requireAuth, async (req, res, next) => {
  try {
    const track = await AudioTrack.findById(req.params.id);
    if (!track) {
      return res.status(404).json({ error: "Track not found" });
    }
    if (track.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const result = updateAudioSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors[0].message });
    }

    Object.assign(track, result.data);
    await track.save();

    res.json({ message: "Track updated", track });
  } catch (err) {
    next(err);
  }
});

// DELETE /audio/:id - Delete track
router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const track = await AudioTrack.findById(req.params.id);
    if (!track) {
      return res.status(404).json({ error: "Track not found" });
    }
    if (track.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Not authorized" });
    }

    await AudioTrack.findByIdAndDelete(track._id);

    res.json({ message: "Track deleted" });
  } catch (err) {
    next(err);
  }
});

// POST /audio/:id/play - Increment play count
router.post("/:id/play", async (req, res, next) => {
  try {
    await AudioTrack.findByIdAndUpdate(req.params.id, { $inc: { plays: 1 } });
    res.json({ message: "Play recorded" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
