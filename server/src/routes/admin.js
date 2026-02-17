const express = require("express");
const { z } = require("zod");
const { requireAdmin } = require("../middleware/auth");
const { notifySystem } = require("../services/notificationService");

const router = express.Router();

// All routes require admin privileges
router.use(requireAdmin);

// Validation
const systemNotificationSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(1000),
  recipientIds: z.union([
    z.literal("all"),
    z.array(z.string()),
  ]).optional().default("all"),
});

// POST /admin/notifications/system - Send system notification to users
router.post("/notifications/system", async (req, res, next) => {
  try {
    const result = systemNotificationSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors[0].message });
    }

    const { title, body, recipientIds } = result.data;

    const notifications = await notifySystem(recipientIds, title, body);

    res.status(201).json({
      message: "System notifications sent",
      count: notifications.length,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
