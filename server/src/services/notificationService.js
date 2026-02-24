const { emitToUser, emitToWork, emitToCommunity } = require("../config/socket");
const Notification = require("../models/Notification");
const logger = require("../utils/logger");

/**
 * Notification types (matches schema enum)
 */
const NOTIFICATION_TYPES = {
  COMMENT: "comment",
  LIKE: "like",
  FOLLOW: "follow",
  FOLLOW_REQUEST: "follow_request",
  MENTION: "mention",
  REPLY: "reply",
  DONATION: "donation",
  SYSTEM: "system",
  POST: "post",
};

/**
 * Parse @mentions from text and return array of usernames
 * @param {string} text - Text to parse for mentions
 * @returns {string[]} Array of mentioned usernames (lowercase)
 */
function parseMentions(text) {
  if (!text) return [];
  // Match @username where username is alphanumeric, underscore, or hyphen
  const mentionRegex = /@([a-zA-Z0-9_-]+)/g;
  const mentions = [];
  let match;
  while ((match = mentionRegex.exec(text)) !== null) {
    const username = match[1].toLowerCase();
    if (!mentions.includes(username)) {
      mentions.push(username);
    }
  }
  return mentions;
}

/**
 * Create and send a notification
 * @param {Object} options - Notification options
 */
async function sendNotification(options) {
  const {
    recipientId,
    type,
    title,
    body,
    actorId = null,
    actorUsername = null,
    workId = null,
    postId = null,
    commentId = null,
    followRequestId = null,
    silent = false,
  } = options;

  try {
    // Don't send notifications to yourself
    if (actorId && recipientId.toString() === actorId.toString()) {
      return null;
    }

    // Create notification in database
    const notification = new Notification({
      recipientId,
      type,
      title,
      body,
      actorId,
      actorUsername,
      workId,
      postId,
      commentId,
      followRequestId,
      read: false,
    });
    await notification.save();

    // Populate actor info if present
    if (actorId) {
      await notification.populate("actorId", "username displayName avatarUrl");
    }

    // Send real-time notification via Socket.IO
    if (!silent) {
      emitToUser(recipientId.toString(), "notification", {
        _id: notification._id,
        type,
        title,
        body,
        actor: notification.actorId ? {
          _id: notification.actorId._id,
          username: notification.actorId.username,
          displayName: notification.actorId.displayName,
          avatarUrl: notification.actorId.avatarUrl,
        } : null,
        workId,
        postId,
        commentId,
        followRequestId,
        createdAt: notification.createdAt,
      });
    }

    logger.info("Notification sent", {
      recipientId,
      type,
      notificationId: notification._id,
    });

    return notification;
  } catch (err) {
    logger.error("Failed to send notification", { error: err.message, recipientId, type });
    return null;
  }
}

/**
 * Send a new follower notification
 */
async function notifyNewFollower(recipientId, followerId) {
  const User = require("../models/User");
  const follower = await User.findById(followerId);

  if (!follower) return null;

  return sendNotification({
    recipientId,
    type: NOTIFICATION_TYPES.FOLLOW,
    title: "New Follower",
    body: `${follower.displayName || follower.username} started following you`,
    actorId: followerId,
    actorUsername: follower.username,
  });
}

/**
 * Send a follow request notification (for private accounts)
 */
async function notifyFollowRequest(recipientId, requesterId, followRequestId) {
  const User = require("../models/User");
  const requester = await User.findById(requesterId);

  if (!requester) return null;

  return sendNotification({
    recipientId,
    type: NOTIFICATION_TYPES.FOLLOW_REQUEST,
    title: "Follow Request",
    body: `${requester.displayName || requester.username} wants to follow you`,
    actorId: requesterId,
    actorUsername: requester.username,
    followRequestId,
  });
}

/**
 * Send a new comment notification
 */
async function notifyNewComment(workId, authorId, commenterId, commentPreview, commentId = null) {
  const User = require("../models/User");
  const Work = require("../models/Work");

  const [commenter, work] = await Promise.all([
    User.findById(commenterId),
    Work.findById(workId),
  ]);

  if (!commenter || !work) return null;

  // Notify work author
  const notification = await sendNotification({
    recipientId: authorId,
    type: NOTIFICATION_TYPES.COMMENT,
    title: "New Comment",
    body: `${commenter.displayName || commenter.username} commented on "${work.title}": ${commentPreview.slice(0, 80)}`,
    actorId: commenterId,
    actorUsername: commenter.username,
    workId,
    commentId,
  });

  // Emit to all users viewing this work
  emitToWork(workId.toString(), "new_comment", {
    workId,
    commentId,
    commenter: {
      _id: commenter._id,
      username: commenter.username,
      displayName: commenter.displayName,
      avatarUrl: commenter.avatarUrl,
    },
  });

  return notification;
}

/**
 * Send a comment reply notification
 */
async function notifyCommentReply(originalCommenterId, replierId, workId, replyPreview, commentId = null) {
  const User = require("../models/User");
  const Work = require("../models/Work");

  const [replier, work] = await Promise.all([
    User.findById(replierId),
    Work.findById(workId),
  ]);

  if (!replier || !work) return null;

  return sendNotification({
    recipientId: originalCommenterId,
    type: NOTIFICATION_TYPES.REPLY,
    title: "Reply to Your Comment",
    body: `${replier.displayName || replier.username} replied: ${replyPreview.slice(0, 80)}`,
    actorId: replierId,
    actorUsername: replier.username,
    workId,
    commentId,
  });
}

/**
 * Send a work liked notification
 */
async function notifyWorkLiked(workId, authorId, likerId) {
  const User = require("../models/User");
  const Work = require("../models/Work");

  const [liker, work] = await Promise.all([
    User.findById(likerId),
    Work.findById(workId),
  ]);

  if (!liker || !work) return null;

  return sendNotification({
    recipientId: authorId,
    type: NOTIFICATION_TYPES.LIKE,
    title: "New Like",
    body: `${liker.displayName || liker.username} liked "${work.title}"`,
    actorId: likerId,
    actorUsername: liker.username,
    workId,
  });
}

/**
 * Mark notifications as read
 */
async function markNotificationsRead(userId, notificationIds = null) {
  const query = { recipientId: userId, read: false };

  if (notificationIds && notificationIds.length > 0) {
    query._id = { $in: notificationIds };
  }

  const result = await Notification.updateMany(query, { read: true });

  // Emit update to user
  emitToUser(userId.toString(), "notifications:read", {
    count: result.modifiedCount,
    notificationIds,
  });

  return result.modifiedCount;
}

/**
 * Get unread notification count for a user
 */
async function getUnreadCount(userId) {
  return Notification.countDocuments({ recipientId: userId, read: false });
}

/**
 * Send mention notifications
 * @param {string} text - Text containing @mentions
 * @param {string} senderId - User who wrote the text
 * @param {string} contextType - "comment" or "post"
 * @param {Object} context - { workId?, postId?, commentId? }
 */
async function notifyMentions(text, senderId, contextType, context = {}) {
  try {
    const User = require("../models/User");
    const sender = await User.findById(senderId);
    if (!sender) return [];

    const mentionedUsernames = parseMentions(text);
    if (mentionedUsernames.length === 0) return [];

    // Find mentioned users (excluding the sender)
    const mentionedUsers = await User.find({
      username: { $in: mentionedUsernames },
      _id: { $ne: senderId },
    });

    const notifications = [];
    for (const user of mentionedUsers) {
      let body = `${sender.displayName || sender.username} mentioned you`;
      if (contextType === "comment") {
        body += " in a comment";
      } else if (contextType === "post") {
        body += " in a post";
      }

      const notification = await sendNotification({
        recipientId: user._id,
        type: NOTIFICATION_TYPES.MENTION,
        title: "You were mentioned",
        body,
        actorId: senderId,
        actorUsername: sender.username,
        workId: context.workId || null,
        postId: context.postId || null,
        commentId: context.commentId || null,
      });

      if (notification) {
        notifications.push(notification);
      }
    }

    return notifications;
  } catch (err) {
    logger.error("Failed to notify mentions", { error: err.message, senderId, contextType });
    return [];
  }
}

/**
 * Send a system notification (e.g., from Sable admins)
 * @param {string|string[]} recipientIds - User ID(s) to notify, or "all" for everyone
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 */
async function notifySystem(recipientIds, title, body) {
  try {
    const User = require("../models/User");

    let users;
    if (recipientIds === "all") {
      // Get all users
      users = await User.find({}, "_id");
    } else if (Array.isArray(recipientIds)) {
      users = recipientIds.map((id) => ({ _id: id }));
    } else {
      users = [{ _id: recipientIds }];
    }

    const notifications = [];
    for (const user of users) {
      const notification = await sendNotification({
        recipientId: user._id,
        type: NOTIFICATION_TYPES.SYSTEM,
        title,
        body,
        actorUsername: "Sable Support", // System notifications come from Sable Support
      });

      if (notification) {
        notifications.push(notification);
      }
    }

    return notifications;
  } catch (err) {
    logger.error("Failed to send system notification", { error: err.message });
    return [];
  }
}

/**
 * Notify followers about a new post in community
 * @param {string} authorId - Post author's ID
 * @param {string} postId - Post ID
 * @param {string} postTitle - Post title or preview
 * @param {string} postType - Type of post (work, discussion, etc.)
 */
async function notifyNewPost(authorId, postId, postTitle, postType = "post") {
  try {
    const User = require("../models/User");
    const Follow = require("../models/Follow");

    const author = await User.findById(authorId);
    if (!author) return [];

    // Get all followers of the author
    const follows = await Follow.find({ followeeId: authorId });

    const notifications = [];
    for (const follow of follows) {
      const typeLabel = postType === "work" ? "shared a work" :
                        postType === "discussion" ? "started a discussion" :
                        postType === "skin" ? "shared a skin" :
                        postType === "audio" ? "shared audio" : "posted";

      const notification = await sendNotification({
        recipientId: follow.followerId,
        type: NOTIFICATION_TYPES.POST,
        title: "New Post",
        body: `${author.displayName || author.username} ${typeLabel}: ${postTitle?.slice(0, 60) || "New content"}`,
        actorId: authorId,
        actorUsername: author.username,
        postId,
      });

      if (notification) {
        notifications.push(notification);
      }
    }

    return notifications;
  } catch (err) {
    logger.error("Failed to notify new post", { error: err.message, authorId, postId });
    return [];
  }
}

/**
 * Notify about a comment on a post (not work)
 */
async function notifyPostComment(postId, authorId, commenterId, commentPreview, commentId = null) {
  const User = require("../models/User");
  const Post = require("../models/Post");

  const [commenter, post] = await Promise.all([
    User.findById(commenterId),
    Post.findById(postId),
  ]);

  if (!commenter || !post) return null;

  // Don't notify yourself
  if (authorId.toString() === commenterId.toString()) return null;

  return sendNotification({
    recipientId: authorId,
    type: NOTIFICATION_TYPES.COMMENT,
    title: "New Comment",
    body: `${commenter.displayName || commenter.username} commented on your post: ${commentPreview.slice(0, 80)}`,
    actorId: commenterId,
    actorUsername: commenter.username,
    postId,
    commentId,
  });
}

/**
 * Notify a user about receiving a donation
 * @param {string} recipientId - User ID receiving the donation
 * @param {string} donorId - User ID who made the donation
 * @param {number} amount - Donation amount
 * @param {string} note - Optional note from donor
 */
async function notifyDonation(recipientId, donorId, amount, note = "") {
  const User = require("../models/User");
  const donor = await User.findById(donorId);

  if (!donor) return null;

  const donorName = donor.displayName || donor.username;
  const formattedAmount = `$${amount.toFixed(2)}`;

  let body = `${donorName} donated ${formattedAmount} to support you!`;
  if (note && note.trim()) {
    const truncatedNote = note.slice(0, 100) + (note.length > 100 ? "..." : "");
    body = `${donorName} donated ${formattedAmount}: "${truncatedNote}"`;
  }

  return sendNotification({
    recipientId,
    type: NOTIFICATION_TYPES.DONATION,
    title: "You received a donation!",
    body,
    actorId: donorId,
    actorUsername: donor.username,
  });
}

module.exports = {
  NOTIFICATION_TYPES,
  parseMentions,
  sendNotification,
  notifyNewFollower,
  notifyFollowRequest,
  notifyNewComment,
  notifyCommentReply,
  notifyWorkLiked,
  notifyMentions,
  notifySystem,
  notifyNewPost,
  notifyPostComment,
  notifyDonation,
  markNotificationsRead,
  getUnreadCount,
};
