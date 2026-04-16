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

// Helper to sanitize user presence based on visibility settings
function sanitizePresence(user) {
  if (!user) return null;
  const u = user.toObject ? user.toObject() : { ...user };
  // If user has invisible visibility, always show them as offline
  if (u.preferences?.visibility === "invisible") {
    u.presence = { status: "offline", lastSeenAt: null, lastActiveAt: null };
  }
  // Don't expose visibility preference to other users
  delete u.preferences;
  return u;
}

// GET /messages/unread-count - Get total unread message count
router.get("/unread-count", async (req, res, next) => {
  try {
    // Count unread in regular threads (not requests to this user)
    const threads = await Thread.find({
      participants: req.user._id,
      $or: [
        { isRequest: { $ne: true } },
        { isRequest: true, requestRecipient: { $ne: req.user._id } },
      ],
    });

    let totalUnread = 0;
    threads.forEach((thread) => {
      const unread = thread.unreadCounts?.get(req.user._id.toString()) || 0;
      totalUnread += unread;
    });

    // Also count message requests where user IS the recipient
    const requestCount = await Thread.countDocuments({
      participants: req.user._id,
      isRequest: true,
      requestRecipient: req.user._id,
    });

    res.json({ count: totalUnread, requestCount, total: totalUnread + requestCount });
  } catch (err) {
    next(err);
  }
});

// GET /messages/threads - List accepted threads (not requests)
router.get("/threads", async (req, res, next) => {
  try {
    // Show threads where:
    // - isRequest is false, OR
    // - isRequest is true but current user is NOT the requestRecipient (they're the sender)
    const threads = await Thread.find({
      participants: req.user._id,
      $or: [
        { isRequest: { $ne: true } },
        { isRequest: true, requestRecipient: { $ne: req.user._id } },
      ],
    })
      .sort({ lastMessageAt: -1 })
      .limit(50);

    // Get participant info for each thread (including presence)
    const participantIds = [...new Set(threads.flatMap((t) => t.participants.map((p) => p.toString())))];
    const users = await User.find({ _id: { $in: participantIds } }).select("username displayName avatarUrl presence preferences.visibility");
    const userMap = {};
    users.forEach((u) => {
      userMap[u._id.toString()] = sanitizePresence(u);
    });

    const threadsWithUsers = threads.map((t) => {
      const thread = t.toObject();
      thread.participantDetails = t.participants.map((pId) => userMap[pId.toString()] || null);
      // Add flag if this is a pending request (sender is waiting for recipient to accept)
      if (t.isRequest && t.requestRecipient?.toString() !== req.user._id.toString()) {
        thread.isPendingRequest = true;
      }
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
    // Only show requests where current user IS the requestRecipient
    const threads = await Thread.find({
      participants: req.user._id,
      isRequest: true,
      requestRecipient: req.user._id,
    })
      .sort({ lastMessageAt: -1 })
      .limit(50);

    // Get participant info (including presence)
    const participantIds = [...new Set(threads.flatMap((t) => t.participants.map((p) => p.toString())))];
    const users = await User.find({ _id: { $in: participantIds } }).select("username displayName avatarUrl presence preferences.visibility");
    const userMap = {};
    users.forEach((u) => {
      userMap[u._id.toString()] = sanitizePresence(u);
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
    // Only the requestRecipient can accept the request
    const thread = await Thread.findOne({
      _id: req.params.threadId,
      participants: req.user._id,
      isRequest: true,
      requestRecipient: req.user._id,
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
    // Only the requestRecipient can decline the request
    const thread = await Thread.findOne({
      _id: req.params.threadId,
      participants: req.user._id,
      isRequest: true,
      requestRecipient: req.user._id,
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

// Helper function to check if two users are mutuals
async function areMutuals(userId1, userId2) {
  const [follow1, follow2] = await Promise.all([
    Follow.findOne({ followerId: userId1, followeeId: userId2 }),
    Follow.findOne({ followerId: userId2, followeeId: userId1 }),
  ]);
  return !!(follow1 && follow2);
}

// POST /messages/threads - Start new thread (DM or group)
router.post("/threads", async (req, res, next) => {
  try {
    const { recipientId, recipientIds, groupName } = req.body;

    // Support both single recipientId and array recipientIds
    let targetIds = recipientIds || (recipientId ? [recipientId] : []);

    if (targetIds.length === 0) {
      return res.status(400).json({ error: "At least one recipient required" });
    }

    // Filter out self
    targetIds = targetIds.filter(id => id !== req.user._id.toString());

    if (targetIds.length === 0) {
      return res.status(400).json({ error: "Cannot message yourself" });
    }

    const isGroup = targetIds.length > 1;

    // Validate all recipients exist
    const recipients = await User.find({ _id: { $in: targetIds } });
    if (recipients.length !== targetIds.length) {
      return res.status(404).json({ error: "One or more users not found" });
    }

    // For 1-on-1 DMs, check if thread already exists
    if (!isGroup) {
      const existingThread = await Thread.findOne({
        participants: { $all: [req.user._id, targetIds[0]], $size: 2 },
        isGroup: { $ne: true },
      });

      if (existingThread) {
        return res.status(200).json({ thread: existingThread, existing: true });
      }
    }

    // Check DM permissions for all recipients (skip for groups - they can leave if unwanted)
    if (!isGroup) {
      const recipient = recipients[0];
      const dmSetting = recipient.preferences?.dmSetting || "everyone";

      if (dmSetting === "none") {
        return res.status(403).json({ error: "This user has disabled direct messages" });
      }

      const mutuals = await areMutuals(req.user._id, targetIds[0]);

      if (dmSetting === "mutuals" && !mutuals) {
        return res.status(403).json({ error: "This user only accepts messages from mutuals" });
      }

      if (dmSetting === "community") {
        const senderFollowsRecipient = await Follow.findOne({
          followerId: req.user._id,
          followeeId: targetIds[0],
        });

        if (!mutuals && !senderFollowsRecipient) {
          return res.status(403).json({ error: "This user only accepts messages from their community" });
        }
      }
    }

    // For 1-on-1, check if it should be a request
    // DM is a request if the sender is NOT following the recipient
    let isRequest = false;
    let requestRecipient = null;
    if (!isGroup) {
      const senderFollowsRecipient = await Follow.findOne({
        followerId: req.user._id,
        followeeId: targetIds[0],
      });
      isRequest = !senderFollowsRecipient;
      // The recipient should see this as a request, not the sender
      if (isRequest) {
        requestRecipient = targetIds[0];
      }
    }

    // Create the thread
    const allParticipants = [req.user._id, ...targetIds];
    const allUsernames = [req.user.username, ...recipients.map(r => r.username)];

    const thread = new Thread({
      participants: allParticipants,
      participantUsernames: allUsernames,
      isRequest,
      requestRecipient,
      isGroup,
      groupName: isGroup ? (groupName || null) : null,
      groupCreatedBy: isGroup ? req.user._id : null,
    });
    await thread.save();

    res.status(201).json({ thread });
  } catch (err) {
    next(err);
  }
});

// PUT /messages/threads/:threadId - Update thread (group name)
router.put("/threads/:threadId", async (req, res, next) => {
  try {
    const { groupName } = req.body;

    const thread = await Thread.findOne({
      _id: req.params.threadId,
      participants: req.user._id,
    });

    if (!thread) {
      return res.status(404).json({ error: "Thread not found" });
    }

    if (!thread.isGroup) {
      return res.status(400).json({ error: "Cannot edit name of direct message" });
    }

    // Only group creator can edit name
    if (thread.groupCreatedBy?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Only the group creator can edit the name" });
    }

    thread.groupName = groupName || null;
    await thread.save();

    // Emit socket event
    const io = req.app.get("io");
    if (io) {
      thread.participants.forEach((pId) => {
        io.to(`user:${pId}`).emit("thread:updated", {
          threadId: thread._id,
          groupName: thread.groupName,
        });
      });
    }

    res.json({ thread });
  } catch (err) {
    next(err);
  }
});

// DELETE /messages/threads/:threadId/leave - Leave a group chat
router.delete("/threads/:threadId/leave", async (req, res, next) => {
  try {
    const thread = await Thread.findOne({
      _id: req.params.threadId,
      participants: req.user._id,
    });

    if (!thread) {
      return res.status(404).json({ error: "Thread not found" });
    }

    if (!thread.isGroup) {
      return res.status(400).json({ error: "Cannot leave a direct message. Use delete instead." });
    }

    // Remove user from participants
    thread.participants = thread.participants.filter(
      (pId) => pId.toString() !== req.user._id.toString()
    );
    thread.participantUsernames = thread.participantUsernames.filter(
      (username) => username !== req.user.username
    );

    // Remove user's unread count and lastSeenAt
    thread.unreadCounts.delete(req.user._id.toString());
    thread.lastSeenAt.delete(req.user._id.toString());

    // If less than 2 participants remain, delete the thread
    if (thread.participants.length < 2) {
      await Message.deleteMany({ threadId: thread._id });
      await Thread.deleteOne({ _id: thread._id });
      return res.json({ message: "Group deleted (no members remaining)" });
    }

    await thread.save();

    // Emit socket event to remaining members
    const io = req.app.get("io");
    if (io) {
      thread.participants.forEach((pId) => {
        io.to(`user:${pId}`).emit("thread:memberLeft", {
          threadId: thread._id,
          userId: req.user._id,
          username: req.user.username,
        });
      });
    }

    res.json({ message: "Left group successfully" });
  } catch (err) {
    next(err);
  }
});

// POST /messages/threads/:threadId/members - Add members to a group chat
router.post("/threads/:threadId/members", async (req, res, next) => {
  try {
    const { userIds } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: "userIds array is required" });
    }

    const thread = await Thread.findOne({
      _id: req.params.threadId,
      participants: req.user._id,
    });

    if (!thread) {
      return res.status(404).json({ error: "Thread not found" });
    }

    if (!thread.isGroup) {
      return res.status(400).json({ error: "Cannot add members to a direct message" });
    }

    // Get the users to add
    const usersToAdd = await User.find({
      _id: { $in: userIds },
    }).select("_id username displayName avatarUrl");

    if (usersToAdd.length === 0) {
      return res.status(400).json({ error: "No valid users found" });
    }

    // Filter out users already in the group
    const existingIds = thread.participants.map((p) => p.toString());
    const newUsers = usersToAdd.filter((u) => !existingIds.includes(u._id.toString()));

    if (newUsers.length === 0) {
      return res.status(400).json({ error: "All users are already in the group" });
    }

    // Add new participants
    newUsers.forEach((user) => {
      thread.participants.push(user._id);
      thread.participantUsernames.push(user.username);
      thread.unreadCounts.set(user._id.toString(), 0);
    });

    await thread.save();

    // Create a system message about new members
    const newUsernames = newUsers.map((u) => u.username).join(", ");
    const systemMessage = await Message.create({
      threadId: thread._id,
      senderId: req.user._id,
      senderUsername: req.user.username,
      text: `${req.user.username} added ${newUsernames} to the group`,
      isSystemMessage: true,
    });

    // Update thread's last message
    thread.lastMessageAt = systemMessage.createdAt;
    thread.lastMessageText = systemMessage.text;
    thread.lastSenderId = req.user._id;
    await thread.save();

    // Emit socket events
    const io = req.app.get("io");
    if (io) {
      // Notify existing members
      thread.participants.forEach((pId) => {
        io.to(`user:${pId}`).emit("thread:membersAdded", {
          threadId: thread._id,
          newMembers: newUsers.map((u) => ({
            _id: u._id,
            username: u.username,
            displayName: u.displayName,
            avatarUrl: u.avatarUrl,
          })),
          addedBy: req.user.username,
        });
      });
    }

    res.json({
      message: `Added ${newUsers.length} member(s) to the group`,
      thread,
      addedUsers: newUsers,
    });
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
    const users = await User.find({ _id: { $in: thread.participants } }).select("username displayName avatarUrl presence preferences.visibility");
    const participantDetails = thread.participants.map((pId) =>
      sanitizePresence(users.find((u) => u._id.toString() === pId.toString()))
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

// PUT /messages/:messageId - Edit a message
router.put("/:messageId", async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Message text required" });
    }

    const message = await Message.findById(req.params.messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Only sender can edit
    if (message.senderId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Only the sender can edit this message" });
    }

    // Cannot edit unsent messages
    if (message.isUnsent) {
      return res.status(400).json({ error: "Cannot edit an unsent message" });
    }

    // 1-hour time limit
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (message.createdAt < oneHourAgo) {
      return res.status(400).json({ error: "Messages can only be edited within 1 hour of sending" });
    }

    // Verify user is in the thread
    const thread = await Thread.findOne({
      _id: message.threadId,
      participants: req.user._id,
    });

    if (!thread) {
      return res.status(403).json({ error: "Not authorized" });
    }

    // Update the message
    message.text = text.trim();
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    // Emit socket event
    const io = req.app.get("io");
    if (io) {
      thread.participants.forEach((pId) => {
        io.to(`user:${pId}`).emit("message:edited", {
          messageId: message._id,
          threadId: thread._id,
          text: message.text,
          isEdited: true,
          editedAt: message.editedAt,
        });
      });
    }

    res.json({ message });
  } catch (err) {
    next(err);
  }
});

// DELETE /messages/:messageId - Unsend a message (soft delete)
router.delete("/:messageId", async (req, res, next) => {
  try {
    const message = await Message.findById(req.params.messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Only sender can unsend
    if (message.senderId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Only the sender can unsend this message" });
    }

    // Cannot unsend already unsent messages
    if (message.isUnsent) {
      return res.status(400).json({ error: "Message already unsent" });
    }

    // Verify user is in the thread
    const thread = await Thread.findOne({
      _id: message.threadId,
      participants: req.user._id,
    });

    if (!thread) {
      return res.status(403).json({ error: "Not authorized" });
    }

    // Soft delete: clear content but keep the message record
    message.text = "[Message unsent]";
    message.attachmentUrl = "";
    message.attachmentType = "";
    message.attachmentName = "";
    message.reactions = [];
    message.isUnsent = true;
    message.unsentAt = new Date();
    await message.save();

    // Emit socket event
    const io = req.app.get("io");
    if (io) {
      thread.participants.forEach((pId) => {
        io.to(`user:${pId}`).emit("message:unsent", {
          messageId: message._id,
          threadId: thread._id,
          isUnsent: true,
          unsentAt: message.unsentAt,
        });
      });
    }

    res.json({ message: "Message unsent" });
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

    const mutualsRaw = await User.find({ _id: { $in: mutualIds } })
      .select("username displayName avatarUrl presence preferences.visibility")
      .limit(20);

    const mutuals = mutualsRaw.map(sanitizePresence);

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

    const usersRaw = await User.find(filter)
      .select("username displayName avatarUrl presence preferences.visibility")
      .limit(20);

    const users = usersRaw.map(sanitizePresence);

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
