const express = require("express");
const { z } = require("zod");
const CommunityPage = require("../models/CommunityPage");
const Follow = require("../models/Follow");
const { requireAuth, optionalAuth } = require("../middleware/auth");

const router = express.Router();

// Validation
const updateCommunitySchema = z.object({
  displayName: z.string().max(50).optional(),
  bio: z.string().max(500).optional(),
  link: z.string().max(200).optional(),
  bannerImageUrl: z.string().optional(),
  profileImageUrl: z.string().optional(),
  visibility: z.enum(["public", "private", "following"]).optional(),
  widgets: z
    .object({
      announcements: z.boolean().optional(),
      donations: z.boolean().optional(),
      recentWorks: z.boolean().optional(),
      chatroom: z.boolean().optional(),
    })
    .optional(),
});

const announcementSchema = z.object({
  text: z.string().min(1).max(500),
  pinned: z.boolean().optional(),
});

// GET /community/:handle - Get community page
router.get("/:handle", optionalAuth, async (req, res, next) => {
  try {
    const page = await CommunityPage.findOne({
      handle: req.params.handle.toLowerCase(),
    }).populate("userId", "username displayName avatarUrl stats");

    if (!page) {
      return res.status(404).json({ error: "Community page not found" });
    }

    const pageOwnerId = page.userId._id || page.userId;
    const isOwner = req.user && pageOwnerId.toString() === req.user._id.toString();

    // Check visibility
    if (page.visibility === "private") {
      if (!isOwner) {
        return res.status(403).json({ error: "This page is private" });
      }
    } else if (page.visibility === "following") {
      // Only owner or followers can see
      if (!isOwner) {
        if (!req.user) {
          return res.status(403).json({ error: "This page is only visible to followers" });
        }
        // Check if the requesting user follows the page owner
        const isFollowing = await Follow.findOne({
          followerId: req.user._id,
          followeeId: pageOwnerId,
        });
        if (!isFollowing) {
          return res.status(403).json({ error: "This page is only visible to followers" });
        }
      }
    }

    res.json({ page });
  } catch (err) {
    next(err);
  }
});

// GET /community - Get my community page
router.get("/", requireAuth, async (req, res, next) => {
  try {
    let page = await CommunityPage.findOne({ userId: req.user._id });

    if (!page) {
      // Create default page
      page = new CommunityPage({
        userId: req.user._id,
        handle: req.user.username,
        displayName: req.user.displayName || req.user.username,
      });
      await page.save();
    }

    res.json({ page });
  } catch (err) {
    next(err);
  }
});

// PUT /community - Update my community page
router.put("/", requireAuth, async (req, res, next) => {
  try {
    let page = await CommunityPage.findOne({ userId: req.user._id });

    if (!page) {
      page = new CommunityPage({
        userId: req.user._id,
        handle: req.user.username,
      });
    }

    const result = updateCommunitySchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors[0].message });
    }

    // Merge widgets
    if (result.data.widgets) {
      page.widgets = { ...page.widgets, ...result.data.widgets };
      delete result.data.widgets;
    }

    Object.assign(page, result.data);
    await page.save();

    res.json({ message: "Community page updated", page });
  } catch (err) {
    next(err);
  }
});

// POST /community/announcements - Add announcement
router.post("/announcements", requireAuth, async (req, res, next) => {
  try {
    const page = await CommunityPage.findOne({ userId: req.user._id });
    if (!page) {
      return res.status(404).json({ error: "Community page not found" });
    }

    const result = announcementSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors[0].message });
    }

    page.announcements.unshift(result.data);

    // Limit announcements
    if (page.announcements.length > 10) {
      page.announcements = page.announcements.slice(0, 10);
    }

    await page.save();

    res.status(201).json({ message: "Announcement added", announcements: page.announcements });
  } catch (err) {
    next(err);
  }
});

// DELETE /community/announcements/:index - Delete announcement
router.delete("/announcements/:index", requireAuth, async (req, res, next) => {
  try {
    const page = await CommunityPage.findOne({ userId: req.user._id });
    if (!page) {
      return res.status(404).json({ error: "Community page not found" });
    }

    const index = parseInt(req.params.index);
    if (index < 0 || index >= page.announcements.length) {
      return res.status(400).json({ error: "Invalid index" });
    }

    page.announcements.splice(index, 1);
    await page.save();

    res.json({ message: "Announcement deleted", announcements: page.announcements });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
