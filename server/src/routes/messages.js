const express = require("express");
const { z } = require("zod");
const Thread = require("../models/Thread");
const Message = require("../models/Message");
const User = require("../models/User");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// All routes require auth
router.use(requireAuth);

// Validation
const sendMessageSchema = z.object({
  text: z.string().min(1).max(5000),
  attachmentUrl: z.string().optional(),
  attachmentType: z.string().optional(),
  attachmentName: z.string().optional(),
});

// GET /messages/threads - List my threads
router.get("/threads", async (req, res, next) => {
  try {
    const threads = await Thread.find({ participants: req.user._id })
      .sort({ lastMessageAt: -1 })
      .limit(50);

    res.json({ threads });
  } catch (err) {
    next(err);
  }
});

// POST /messages/threads - Start new thread
router.post("/threads", async (req, res, next) => {
  try {
    const { recipientId } = req.body;

    if (!recipientId) {
      return res.status(400).json({ error: "recipientId required" });
    }

    if (recipientId === req.user._id.toString()) {
      return res.status(400).json({ error: "Cannot message yourself" });
    }

    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if thread already exists
    let thread = await Thread.findOne({
      participants: { $all: [req.user._id, recipientId] },
    });

    if (!thread) {
      thread = new Thread({
        participants: [req.user._id, recipientId],
        participantUsernames: [req.user.username, recipient.username],
      });
      await thread.save();
    }

    res.status(201).json({ thread });
  } catch (err) {
    next(err);
  }
});

// GET /messages/threads/:threadId - Get thread with messages
router.get("/threads/:threadId", async (req, res, next) => {
  try {
    const thread = await Thread.findOne({
      _id: req.params.threadId,
      participants: req.user._id,
    });

    if (!thread) {
      return res.status(404).json({ error: "Thread not found" });
    }

    const messages = await Message.find({ threadId: thread._id })
      .sort({ createdAt: 1 })
      .limit(100);

    // Mark messages as read
    await Message.updateMany(
      { threadId: thread._id, senderId: { $ne: req.user._id } },
      { $addToSet: { readBy: req.user._id } }
    );

    // Reset unread count
    thread.unreadCounts.set(req.user._id.toString(), 0);
    await thread.save();

    res.json({ thread, messages });
  } catch (err) {
    next(err);
  }
});

// POST /messages/threads/:threadId - Send message
router.post("/threads/:threadId", async (req, res, next) => {
  try {
    const thread = await Thread.findOne({
      _id: req.params.threadId,
      participants: req.user._id,
    });

    if (!thread) {
      return res.status(404).json({ error: "Thread not found" });
    }

    const result = sendMessageSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors[0].message });
    }

    const message = new Message({
      threadId: thread._id,
      senderId: req.user._id,
      senderUsername: req.user.username,
      ...result.data,
      readBy: [req.user._id],
    });

    await message.save();

    // Update thread
    thread.lastMessage = result.data.text.slice(0, 100);
    thread.lastMessageAt = new Date();
    thread.lastSenderId = req.user._id;

    // Increment unread for other participants
    thread.participants.forEach((pId) => {
      if (pId.toString() !== req.user._id.toString()) {
        const current = thread.unreadCounts.get(pId.toString()) || 0;
        thread.unreadCounts.set(pId.toString(), current + 1);
      }
    });

    await thread.save();

    res.status(201).json({ message });
  } catch (err) {
    next(err);
  }
});

// PUT /messages/threads/:threadId/mute - Mute thread
router.put("/threads/:threadId/mute", async (req, res, next) => {
  try {
    const thread = await Thread.findOne({
      _id: req.params.threadId,
      participants: req.user._id,
    });

    if (!thread) {
      return res.status(404).json({ error: "Thread not found" });
    }

    if (!thread.mutedBy.includes(req.user._id)) {
      thread.mutedBy.push(req.user._id);
      await thread.save();
    }

    res.json({ message: "Thread muted" });
  } catch (err) {
    next(err);
  }
});

// PUT /messages/threads/:threadId/unmute - Unmute thread
router.put("/threads/:threadId/unmute", async (req, res, next) => {
  try {
    const thread = await Thread.findOne({
      _id: req.params.threadId,
      participants: req.user._id,
    });

    if (!thread) {
      return res.status(404).json({ error: "Thread not found" });
    }

    thread.mutedBy = thread.mutedBy.filter(
      (id) => id.toString() !== req.user._id.toString()
    );
    await thread.save();

    res.json({ message: "Thread unmuted" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
