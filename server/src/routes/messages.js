const express = require("express");
const { z } = require("zod");
const Thread = require("../models/Thread");
const Message = require("../models/Message");
const User = require("../models/User");
const Follow = require("../models/Follow");
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

// GET /messages/threads - List accepted threads (not requests)
router.get("/threads", async (req, res, next) => {
  try {
    const threads = await Thread.find({
      participants: req.user._id,
      isRequest: { $ne: true },
    })
      .sort({ lastMessageAt: -1 })
      .limit(50);

    // Get participant info for each thread (including presence)
    const participantIds = [...new Set(threads.flatMap((t) => t.participants.map((p) => p.toString())))];
    const users = await User.find({ _id: { $in: participantIds } }).select("username displayName avatarUrl presence");
    const userMap = {};
    users.forEach((u) => {
      userMap[u._id.toString()] = u;
    });

    const threadsWithUsers = threads.map((t) => {
      const thread = t.toObject();
      thread.participantDetails = t.participants.map((pId) => userMap[pId.toString()] || null);
      return thread;
    });

    res.json({ threads: threadsWithUsers });
  } catch (err) {
    next(err);
  }
});

// GET /messages/requests - List message requests (from non-followers)
router.get("/requests", async (req, res, next) => {
  try {
    const threads = await Thread.find({
      participants: req.user._id,
      isRequest: true,
    })
      .sort({ lastMessageAt: -1 })
      .limit(50);

    // Get participant info (including presence)
    const participantIds = [...new Set(threads.flatMap((t) => t.participants.map((p) => p.toString())))];
    const users = await User.find({ _id: { $in: participantIds } }).select("username displayName avatarUrl presence");
    const userMap = {};
    users.forEach((u) => {
      userMap[u._id.toString()] = u;
    });

    const threadsWithUsers = threads.map((t) => {
      const thread = t.toObject();
      thread.participantDetails = t.participants.map((pId) => userMap[pId.toString()] || null);
      return thread;
    });

    res.json({ requests: threadsWithUsers });
  } catch (err) {
    next(err);
  }
});

// PUT /messages/requests/:threadId/accept - Accept a message request
router.put("/requests/:threadId/accept", async (req, res, next) => {
  try {
    const thread = await Thread.findOne({
      _id: req.params.threadId,
      participants: req.user._id,
      isRequest: true,
    });

    if (!thread) {
      return res.status(404).json({ error: "Request not found" });
    }

    thread.isRequest = false;
    thread.requestAcceptedBy = req.user._id;
    thread.requestAcceptedAt = new Date();
    await thread.save();

    res.json({ thread, message: "Request accepted" });
  } catch (err) {
    next(err);
  }
});

// DELETE /messages/requests/:threadId - Decline a message request
router.delete("/requests/:threadId", async (req, res, next) => {
  try {
    const thread = await Thread.findOne({
      _id: req.params.threadId,
      participants: req.user._id,
      isRequest: true,
    });

    if (!thread) {
      return res.status(404).json({ error: "Request not found" });
    }

    // Delete the thread and its messages
    await Message.deleteMany({ threadId: thread._id });
    await Thread.deleteOne({ _id: thread._id });

    res.json({ message: "Request declined" });
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

    if (thread) {
      return res.status(200).json({ thread, existing: true });
    }

    // Check if sender is followed by the recipient (to determine if it's a request)
    const isFollowedByRecipient = await Follow.findOne({
      followerId: recipientId,
      followeeId: req.user._id,
    });

    thread = new Thread({
      participants: [req.user._id, recipientId],
      participantUsernames: [req.user.username, recipient.username],
      isRequest: !isFollowedByRecipient, // Request if recipient doesn't follow sender
    });
    await thread.save();

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

    // Get participant details (including presence)
    const users = await User.find({ _id: { $in: thread.participants } }).select("username displayName avatarUrl presence");
    const participantDetails = thread.participants.map((pId) =>
      users.find((u) => u._id.toString() === pId.toString()) || null
    );

    res.json({
      thread: { ...thread.toObject(), participantDetails },
      messages,
    });
  } catch (err) {
    next(err);
  }
});

// PUT /messages/threads/:threadId/seen - Mark thread as seen (for seen indicators)
router.put("/threads/:threadId/seen", async (req, res, next) => {
  try {
    const thread = await Thread.findOne({
      _id: req.params.threadId,
      participants: req.user._id,
    });

    if (!thread) {
      return res.status(404).json({ error: "Thread not found" });
    }

    // Update last seen timestamp
    thread.lastSeenAt.set(req.user._id.toString(), new Date());
    thread.unreadCounts.set(req.user._id.toString(), 0);
    await thread.save();

    // Emit socket event for seen indicator
    const io = req.app.get("io");
    if (io) {
      thread.participants.forEach((pId) => {
        if (pId.toString() !== req.user._id.toString()) {
          io.to(`user:${pId}`).emit("message:seen", {
            threadId: thread._id,
            userId: req.user._id,
            username: req.user.username,
            seenAt: new Date(),
          });
        }
      });
    }

    res.json({ message: "Marked as seen" });
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

    // If thread is a request and current user is not the initiator, they can't send
    if (thread.isRequest && thread.lastSenderId?.toString() !== req.user._id.toString()) {
      // They're the recipient - need to accept first
      if (!thread.requestAcceptedBy) {
        return res.status(403).json({ error: "Accept the message request first" });
      }
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
      reactions: [],
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

    // Emit socket event for real-time updates
    const io = req.app.get("io");
    if (io) {
      thread.participants.forEach((pId) => {
        if (pId.toString() !== req.user._id.toString()) {
          io.to(`user:${pId}`).emit("new_message", {
            threadId: thread._id,
            message: message.toObject(),
          });
        }
      });
    }

    res.status(201).json({ message });
  } catch (err) {
    next(err);
  }
});

// POST /messages/:messageId/reactions - Add reaction
router.post("/:messageId/reactions", async (req, res, next) => {
  try {
    const { emoji } = req.body;
    if (!emoji) {
      return res.status(400).json({ error: "emoji required" });
    }

    const message = await Message.findById(req.params.messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Verify user is in the thread
    const thread = await Thread.findOne({
      _id: message.threadId,
      participants: req.user._id,
    });

    if (!thread) {
      return res.status(403).json({ error: "Not authorized" });
    }

    // Check if user already reacted with this emoji
    const existingIdx = message.reactions.findIndex(
      (r) => r.userId.toString() === req.user._id.toString() && r.emoji === emoji
    );

    if (existingIdx >= 0) {
      return res.status(400).json({ error: "Already reacted with this emoji" });
    }

    message.reactions.push({
      emoji,
      userId: req.user._id,
      username: req.user.username,
    });

    await message.save();

    // Emit socket event
    const io = req.app.get("io");
    if (io) {
      thread.participants.forEach((pId) => {
        io.to(`user:${pId}`).emit("message:reaction", {
          messageId: message._id,
          threadId: thread._id,
          reaction: { emoji, userId: req.user._id, username: req.user.username },
          action: "add",
        });
      });
    }

    res.json({ message });
  } catch (err) {
    next(err);
  }
});

// DELETE /messages/:messageId/reactions/:emoji - Remove reaction
router.delete("/:messageId/reactions/:emoji", async (req, res, next) => {
  try {
    const emoji = decodeURIComponent(req.params.emoji);

    const message = await Message.findById(req.params.messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Verify user is in the thread
    const thread = await Thread.findOne({
      _id: message.threadId,
      participants: req.user._id,
    });

    if (!thread) {
      return res.status(403).json({ error: "Not authorized" });
    }

    // Remove reaction
    message.reactions = message.reactions.filter(
      (r) => !(r.userId.toString() === req.user._id.toString() && r.emoji === emoji)
    );

    await message.save();

    // Emit socket event
    const io = req.app.get("io");
    if (io) {
      thread.participants.forEach((pId) => {
        io.to(`user:${pId}`).emit("message:reaction", {
          messageId: message._id,
          threadId: thread._id,
          reaction: { emoji, userId: req.user._id, username: req.user.username },
          action: "remove",
        });
      });
    }

    res.json({ message });
  } catch (err) {
    next(err);
  }
});

// GET /messages/files - Get all files shared in inbox
router.get("/files", async (req, res, next) => {
  try {
    // Get all threads user is in
    const threads = await Thread.find({ participants: req.user._id });
    const threadIds = threads.map((t) => t._id);

    // Find messages with attachments
    const messages = await Message.find({
      threadId: { $in: threadIds },
      attachmentUrl: { $ne: "" },
    })
      .sort({ createdAt: -1 })
      .limit(100);

    const files = messages.map((m) => ({
      id: m._id,
      name: m.attachmentName || "Untitled",
      url: m.attachmentUrl,
      type: m.attachmentType || "file",
      from: m.senderUsername,
      fromId: m.senderId,
      threadId: m.threadId,
      createdAt: m.createdAt,
    }));

    res.json({ files });
  } catch (err) {
    next(err);
  }
});

// GET /messages/mutuals - Get mutual follows for messaging suggestions
router.get("/mutuals", async (req, res, next) => {
  try {
    // Find users I follow
    const iFollow = await Follow.find({ followerId: req.user._id }).select("followeeId");
    const iFollowIds = iFollow.map((f) => f.followeeId.toString());

    // Find users who follow me
    const followMe = await Follow.find({ followeeId: req.user._id }).select("followerId");
    const followMeIds = followMe.map((f) => f.followerId.toString());

    // Mutuals are the intersection
    const mutualIds = iFollowIds.filter((id) => followMeIds.includes(id));

    if (mutualIds.length === 0) {
      return res.json({ mutuals: [] });
    }

    const mutuals = await User.find({ _id: { $in: mutualIds } })
      .select("username displayName avatarUrl presence")
      .limit(20);

    res.json({ mutuals });
  } catch (err) {
    next(err);
  }
});

// GET /messages/users - Search users for new message
router.get("/users", async (req, res, next) => {
  try {
    const query = (req.query.q || "").trim();

    let filter = { _id: { $ne: req.user._id } };

    if (query) {
      filter.$or = [
        { username: { $regex: query, $options: "i" } },
        { displayName: { $regex: query, $options: "i" } },
      ];
    }

    const users = await User.find(filter)
      .select("username displayName avatarUrl presence")
      .limit(20);

    res.json({ users });
  } catch (err) {
    next(err);
  }
});

// GET /messages/settings - Get inbox settings
router.get("/settings", async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("inboxSettings");

    res.json({
      settings: user?.inboxSettings || {
        readReceipts: true,
        showSeenIndicators: true,
      },
    });
  } catch (err) {
    next(err);
  }
});

// PUT /messages/settings - Update inbox settings
router.put("/settings", async (req, res, next) => {
  try {
    const { readReceipts, showSeenIndicators } = req.body;

    const updateFields = {};
    if (typeof readReceipts === "boolean") {
      updateFields["inboxSettings.readReceipts"] = readReceipts;
    }
    if (typeof showSeenIndicators === "boolean") {
      updateFields["inboxSettings.showSeenIndicators"] = showSeenIndicators;
    }

    await User.updateOne({ _id: req.user._id }, { $set: updateFields });

    res.json({ message: "Settings updated" });
  } catch (err) {
    next(err);
  }
});

// DELETE /messages/threads/:threadId - Delete thread
router.delete("/threads/:threadId", async (req, res, next) => {
  try {
    const thread = await Thread.findOne({
      _id: req.params.threadId,
      participants: req.user._id,
    });

    if (!thread) {
      return res.status(404).json({ error: "Thread not found" });
    }

    // Delete all messages in the thread
    await Message.deleteMany({ threadId: thread._id });

    // Delete the thread
    await Thread.deleteOne({ _id: thread._id });

    res.json({ message: "Chat deleted" });
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
