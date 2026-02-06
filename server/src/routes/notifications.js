const express = require("express");
const Notification = require("../models/Notification");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// All routes require auth
router.use(requireAuth);

// GET /notifications - List my notifications
router.get("/", async (req, res, next) => {
  try {
    const { page = 1, limit = 20, unreadOnly } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = { recipientId: req.user._id };
    if (unreadOnly === "true") query.read = false;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Notification.countDocuments(query),
      Notification.countDocuments({ recipientId: req.user._id, read: false }),
    ]);

    res.json({
      notifications,
      unreadCount,
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

// PUT /notifications/:id/read - Mark as read
router.put("/:id/read", async (req, res, next) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      recipientId: req.user._id,
    });

    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    notification.read = true;
    await notification.save();

    res.json({ message: "Marked as read" });
  } catch (err) {
    next(err);
  }
});

// PUT /notifications/read-all - Mark all as read
router.put("/read-all", async (req, res, next) => {
  try {
    await Notification.updateMany(
      { recipientId: req.user._id, read: false },
      { read: true }
    );

    res.json({ message: "All marked as read" });
  } catch (err) {
    next(err);
  }
});

// DELETE /notifications/:id - Delete notification
router.delete("/:id", async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipientId: req.user._id,
    });

    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    res.json({ message: "Notification deleted" });
  } catch (err) {
    next(err);
  }
});

// DELETE /notifications - Clear all notifications
router.delete("/", async (req, res, next) => {
  try {
    await Notification.deleteMany({ recipientId: req.user._id });

    res.json({ message: "All notifications cleared" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
