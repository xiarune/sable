const express = require("express");
const { z } = require("zod");
const mongoose = require("mongoose");
const { requireAdminAuth } = require("../middleware/adminAuth");
const Admin = require("../models/Admin");
const User = require("../models/User");
const Report = require("../models/Report");
const Contact = require("../models/Contact");
const Warning = require("../models/Warning");
const Work = require("../models/Work");
const Post = require("../models/Post");
const Comment = require("../models/Comment");
const Genre = require("../models/Genre");
const Fandom = require("../models/Fandom");
const Tag = require("../models/Tag");
const { notifySystem } = require("../services/notificationService");

const router = express.Router();

// All routes require admin authentication
router.use(requireAdminAuth);

// ============================================
// ANALYTICS / OVERVIEW
// ============================================

/**
 * GET /admin/analytics/overview
 * Dashboard overview stats
 */
router.get("/analytics/overview", async (req, res, next) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers,
      newUsersToday,
      newUsersThisWeek,
      newUsersThisMonth,
      totalWorks,
      totalPosts,
      totalComments,
      pendingReports,
      newContacts,
      activeUsersToday,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: today } }),
      User.countDocuments({ createdAt: { $gte: thisWeek } }),
      User.countDocuments({ createdAt: { $gte: thisMonth } }),
      Work.countDocuments(),
      Post.countDocuments(),
      Comment.countDocuments(),
      Report.countDocuments({ status: "pending" }),
      Contact.countDocuments({ status: "new" }),
      User.countDocuments({ "presence.lastActiveAt": { $gte: today } }),
    ]);

    res.json({
      users: {
        total: totalUsers,
        newToday: newUsersToday,
        newThisWeek: newUsersThisWeek,
        newThisMonth: newUsersThisMonth,
        activeToday: activeUsersToday,
      },
      content: {
        works: totalWorks,
        posts: totalPosts,
        comments: totalComments,
      },
      moderation: {
        pendingReports,
        newContacts,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /admin/analytics/users
 * User growth over time
 */
router.get("/analytics/users", async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const growth = await User.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({ growth, days });
  } catch (err) {
    next(err);
  }
});

// ============================================
// REPORTS MANAGEMENT
// ============================================

/**
 * GET /admin/reports
 * List all reports with filtering
 */
router.get("/reports", async (req, res, next) => {
  try {
    const {
      status,
      targetType,
      page = 1,
      limit = 20,
    } = req.query;

    const query = {};
    if (status) query.status = status;
    if (targetType) query.targetType = targetType;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [reports, total] = await Promise.all([
      Report.find(query)
        .populate("reporterId", "username displayName avatarUrl")
        .populate("targetUserId", "username displayName avatarUrl")
        .populate("reviewedBy", "username displayName")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Report.countDocuments(query),
    ]);

    res.json({
      reports,
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

/**
 * GET /admin/reports/:id
 * Get report details with related content
 */
router.get("/reports/:id", async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate("reporterId", "username displayName avatarUrl email")
      .populate("targetUserId", "username displayName avatarUrl email")
      .populate("reviewedBy", "username displayName");

    if (!report) {
      return res.status(404).json({ error: "Report not found" });
    }

    // Get the reported content
    let content = null;
    if (report.targetType === "post") {
      content = await Post.findById(report.targetId);
    } else if (report.targetType === "comment") {
      content = await Comment.findById(report.targetId);
    } else if (report.targetType === "work") {
      content = await Work.findById(report.targetId).select("title authorUsername genre fandom");
    }

    res.json({ report, content });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /admin/reports/:id
 * Update report status/resolution
 */
router.put("/reports/:id", async (req, res, next) => {
  try {
    const { status, resolution } = req.body;

    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ error: "Report not found" });
    }

    if (status) report.status = status;
    if (resolution !== undefined) report.resolution = resolution;

    if (status === "reviewed" || status === "resolved" || status === "dismissed") {
      report.reviewedBy = req.admin._id;
      report.reviewedAt = new Date();
    }

    await report.save();

    res.json({ message: "Report updated", report });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /admin/reports/:id/content
 * Delete the reported content
 */
router.delete("/reports/:id/content", async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ error: "Report not found" });
    }

    // Delete the content based on type
    if (report.targetType === "post") {
      await Post.findByIdAndDelete(report.targetId);
    } else if (report.targetType === "comment") {
      await Comment.findByIdAndDelete(report.targetId);
    } else if (report.targetType === "work") {
      await Work.findByIdAndDelete(report.targetId);
    }

    // Update report
    report.status = "resolved";
    report.resolution = "Content deleted by admin";
    report.reviewedBy = req.admin._id;
    report.reviewedAt = new Date();
    await report.save();

    res.json({ message: "Content deleted and report resolved" });
  } catch (err) {
    next(err);
  }
});

// ============================================
// USER MANAGEMENT
// ============================================

/**
 * GET /admin/users
 * List users with search/filter
 */
router.get("/users", async (req, res, next) => {
  try {
    const {
      search,
      isBanned,
      page = 1,
      limit = 20,
    } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { username: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { displayName: { $regex: search, $options: "i" } },
      ];
    }

    if (isBanned !== undefined) {
      query.isBanned = isBanned === "true";
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [users, total] = await Promise.all([
      User.find(query)
        .select("username displayName email avatarUrl isBanned warningCount createdAt presence.lastActiveAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(query),
    ]);

    res.json({
      users,
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

/**
 * GET /admin/users/:id
 * Get user details with activity
 */
router.get("/users/:id", async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select("-passwordHash -twoFactor.secret -twoFactor.backupCodes -emailVerificationToken -passwordResetToken");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get user stats
    const [
      worksCount,
      postsCount,
      reportsAgainst,
      reportsByUser,
      warnings,
    ] = await Promise.all([
      Work.countDocuments({ authorId: user._id }),
      Post.countDocuments({ authorId: user._id }),
      Report.countDocuments({ targetUserId: user._id }),
      Report.countDocuments({ reporterId: user._id }),
      Warning.find({ userId: user._id }).populate("issuedBy", "username displayName").sort({ createdAt: -1 }),
    ]);

    res.json({
      user,
      activity: {
        worksCount,
        postsCount,
        reportsAgainst,
        reportsByUser,
      },
      warnings,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /admin/users/:id/ban
 * Ban or unban a user
 */
router.put("/users/:id/ban", async (req, res, next) => {
  try {
    const { ban, reason, expiresAt } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (ban) {
      user.isBanned = true;
      user.banReason = reason || "Violation of community guidelines";
      user.bannedAt = new Date();
      user.bannedBy = req.admin._id;
      user.banExpiresAt = expiresAt ? new Date(expiresAt) : null;
    } else {
      user.isBanned = false;
      user.banReason = undefined;
      user.bannedAt = undefined;
      user.bannedBy = undefined;
      user.banExpiresAt = undefined;
    }

    await user.save();

    res.json({
      message: ban ? "User banned" : "User unbanned",
      user: {
        _id: user._id,
        username: user.username,
        isBanned: user.isBanned,
        banReason: user.banReason,
        banExpiresAt: user.banExpiresAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /admin/users/:id/warning
 * Issue a warning to a user
 */
router.post("/users/:id/warning", async (req, res, next) => {
  try {
    const { reason, severity, relatedReportId } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const warning = new Warning({
      userId: user._id,
      issuedBy: req.admin._id,
      reason,
      severity: severity || "minor",
      relatedReportId: relatedReportId || undefined,
    });

    await warning.save();

    // Increment warning count
    user.warningCount = (user.warningCount || 0) + 1;
    await user.save();

    // Send notification to user
    await notifySystem(
      user._id,
      "Warning Issued",
      `You have received a warning: ${reason}`
    );

    res.status(201).json({
      message: "Warning issued",
      warning,
      warningCount: user.warningCount,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /admin/users/:id/reset-password
 * Force password reset for user
 */
router.put("/users/:id/reset-password", async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Generate a temporary password
    const tempPassword = Math.random().toString(36).slice(-10);
    await user.setPassword(tempPassword);
    await user.save();

    // In production, you would email this to the user
    // For now, return it (admin can communicate it to user)
    res.json({
      message: "Password reset successful",
      tempPassword, // Remove in production - send via email instead
    });
  } catch (err) {
    next(err);
  }
});

// ============================================
// CONTACT / SUPPORT TICKETS
// ============================================

/**
 * GET /admin/contacts
 * List contact submissions
 */
router.get("/contacts", async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [contacts, total] = await Promise.all([
      Contact.find(query)
        .populate("assignedTo", "username displayName")
        .populate("resolvedBy", "username displayName")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Contact.countDocuments(query),
    ]);

    res.json({
      contacts,
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

/**
 * GET /admin/contacts/:id
 * Get contact submission details
 */
router.get("/contacts/:id", async (req, res, next) => {
  try {
    const contact = await Contact.findById(req.params.id)
      .populate("assignedTo", "username displayName")
      .populate("resolvedBy", "username displayName");

    if (!contact) {
      return res.status(404).json({ error: "Contact submission not found" });
    }

    res.json({ contact });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /admin/contacts/:id
 * Update contact submission status/notes
 */
router.put("/contacts/:id", async (req, res, next) => {
  try {
    const { status, notes, assignedTo } = req.body;

    const contact = await Contact.findById(req.params.id);
    if (!contact) {
      return res.status(404).json({ error: "Contact submission not found" });
    }

    if (status) contact.status = status;
    if (notes !== undefined) contact.notes = notes;
    if (assignedTo !== undefined) contact.assignedTo = assignedTo || undefined;

    if (status === "resolved" || status === "closed") {
      contact.resolvedAt = new Date();
      contact.resolvedBy = req.admin._id;
    }

    await contact.save();

    res.json({ message: "Contact updated", contact });
  } catch (err) {
    next(err);
  }
});

// ============================================
// SYSTEM MANAGEMENT
// ============================================

/**
 * POST /admin/system/notification
 * Send system-wide notification
 */
router.post("/system/notification", async (req, res, next) => {
  try {
    const { title, body, recipientIds } = req.body;

    if (!title || !body) {
      return res.status(400).json({ error: "Title and body are required" });
    }

    // recipientIds can be "all", an array of user IDs, or a single user ID
    const target = recipientIds || "all";

    await notifySystem(target, title, body);

    res.json({ message: "Notification sent" });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /admin/taxonomies/genres
 * List all genres
 */
router.get("/taxonomies/genres", async (req, res, next) => {
  try {
    const genres = await Genre.find().sort({ worksCount: -1 });
    res.json({ genres });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /admin/taxonomies/genres/:id
 * Update a genre
 */
router.put("/taxonomies/genres/:id", async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const genre = await Genre.findByIdAndUpdate(
      req.params.id,
      { name, description },
      { new: true }
    );
    if (!genre) {
      return res.status(404).json({ error: "Genre not found" });
    }
    res.json({ genre });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /admin/taxonomies/genres/:id
 * Delete a genre
 */
router.delete("/taxonomies/genres/:id", async (req, res, next) => {
  try {
    const genre = await Genre.findByIdAndDelete(req.params.id);
    if (!genre) {
      return res.status(404).json({ error: "Genre not found" });
    }
    res.json({ message: "Genre deleted" });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /admin/taxonomies/fandoms
 * List all fandoms
 */
router.get("/taxonomies/fandoms", async (req, res, next) => {
  try {
    const fandoms = await Fandom.find().sort({ worksCount: -1 });
    res.json({ fandoms });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /admin/taxonomies/fandoms/:id
 * Update a fandom
 */
router.put("/taxonomies/fandoms/:id", async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const fandom = await Fandom.findByIdAndUpdate(
      req.params.id,
      { name, description },
      { new: true }
    );
    if (!fandom) {
      return res.status(404).json({ error: "Fandom not found" });
    }
    res.json({ fandom });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /admin/taxonomies/fandoms/:id
 * Delete a fandom
 */
router.delete("/taxonomies/fandoms/:id", async (req, res, next) => {
  try {
    const fandom = await Fandom.findByIdAndDelete(req.params.id);
    if (!fandom) {
      return res.status(404).json({ error: "Fandom not found" });
    }
    res.json({ message: "Fandom deleted" });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /admin/taxonomies/tags
 * List all tags
 */
router.get("/taxonomies/tags", async (req, res, next) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const query = {};
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [tags, total] = await Promise.all([
      Tag.find(query).sort({ usageCount: -1 }).skip(skip).limit(parseInt(limit)),
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

/**
 * DELETE /admin/taxonomies/tags/:id
 * Delete a tag
 */
router.delete("/taxonomies/tags/:id", async (req, res, next) => {
  try {
    const tag = await Tag.findByIdAndDelete(req.params.id);
    if (!tag) {
      return res.status(404).json({ error: "Tag not found" });
    }
    res.json({ message: "Tag deleted" });
  } catch (err) {
    next(err);
  }
});

// ============================================
// ADMIN MANAGEMENT
// ============================================

/**
 * GET /admin/admins
 * List all admins
 */
router.get("/admins", async (req, res, next) => {
  try {
    const admins = await Admin.find().sort({ createdAt: -1 });
    res.json({ admins });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /admin/admins
 * Create new admin account
 */
router.post("/admins", async (req, res, next) => {
  try {
    const { username, email, password, displayName } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: "Username, email, and password are required" });
    }

    // Check if already exists
    const existing = await Admin.findOne({
      $or: [{ username: username.toLowerCase() }, { email: email.toLowerCase() }],
    });
    if (existing) {
      return res.status(400).json({ error: "Admin with this username or email already exists" });
    }

    const admin = new Admin({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      displayName,
      createdBy: req.admin._id,
    });

    await admin.setPassword(password);
    await admin.save();

    res.status(201).json({
      message: "Admin created",
      admin: admin.toJSON(),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
