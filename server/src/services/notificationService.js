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
  MENTION: "mention",
  REPLY: "reply",
  DONATION: "donation",
  SYSTEM: "system",
};

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

module.exports = {
  NOTIFICATION_TYPES,
  sendNotification,
  notifyNewFollower,
  notifyNewComment,
  notifyCommentReply,
  notifyWorkLiked,
  markNotificationsRead,
  getUnreadCount,
};
