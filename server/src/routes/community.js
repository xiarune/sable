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
      const handle = req.user.username.toLowerCase();

      // Use findOneAndUpdate with upsert to handle race conditions
      // This atomically creates the page if it doesn't exist for this user
      try {
        page = await CommunityPage.findOneAndUpdate(
          { userId: req.user._id },
          {
            $setOnInsert: {
              handle,
              displayName: req.user.displayName || req.user.username,
            },
          },
          { upsert: true, new: true }
        );
      } catch (err) {
        // Handle duplicate key error on handle (orphaned page or race condition)
        if (err.code === 11000 && err.keyPattern?.handle) {
          const existingWithHandle = await CommunityPage.findOne({ handle });

          if (existingWithHandle) {
            // Check if this page belongs to a different user
            if (existingWithHandle.userId.toString() !== req.user._id.toString()) {
              // Check if the owner user still exists
              const User = require("../models/User");
              const ownerExists = await User.findById(existingWithHandle.userId);

              if (!ownerExists) {
                // Orphaned page - reassign it to this user
                existingWithHandle.userId = req.user._id;
                existingWithHandle.displayName = req.user.displayName || req.user.username;
                await existingWithHandle.save();
                return res.json({ page: existingWithHandle });
              }
              // Handle belongs to another active user
              return res.status(400).json({ error: "Username conflict. Please contact support." });
            }
            // Page was created by same user in a race condition - just return it
            return res.json({ page: existingWithHandle });
          }
        }
        throw err;
      }
    }

    res.json({ page });
  } catch (err) {
    next(err);
  }
});

// PUT /community - Update my community page
router.put("/", requireAuth, async (req, res, next) => {
  try {
    const result = updateCommunitySchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors[0].message });
    }

    let page = await CommunityPage.findOne({ userId: req.user._id });

    if (!page) {
      const handle = req.user.username.toLowerCase();

      // Use findOneAndUpdate with upsert to handle race conditions
      try {
        page = await CommunityPage.findOneAndUpdate(
          { userId: req.user._id },
          {
            $setOnInsert: {
              handle,
            },
          },
          { upsert: true, new: true }
        );
      } catch (err) {
        // Handle duplicate key error on handle (orphaned page or race condition)
        if (err.code === 11000 && err.keyPattern?.handle) {
          const existingWithHandle = await CommunityPage.findOne({ handle });

          if (existingWithHandle) {
            // Check if this page belongs to a different user
            if (existingWithHandle.userId.toString() !== req.user._id.toString()) {
              // Check if the owner user still exists
              const User = require("../models/User");
              const ownerExists = await User.findById(existingWithHandle.userId);

              if (!ownerExists) {
                // Orphaned page - reassign it to this user
                existingWithHandle.userId = req.user._id;
                page = existingWithHandle;
              } else {
                // Handle belongs to another active user
                return res.status(400).json({ error: "Username conflict. Please contact support." });
              }
            } else {
              // Page was created by same user in a race condition - use it
              page = existingWithHandle;
            }
          } else {
            // Page was deleted between error and findOne - throw to retry
            throw err;
          }
        } else {
          throw err;
        }
      }
    }

    // Safety check - page should be defined at this point
    if (!page) {
      return res.status(500).json({ error: "Failed to create or find community page" });
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
