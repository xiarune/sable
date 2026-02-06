const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["comment", "like", "follow", "mention", "reply", "donation", "system"],
      required: true,
    },
    // Who triggered the notification
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    actorUsername: { type: String },

    // Related content
    workId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Work",
    },
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
    },
    commentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
    },

    // Display
    title: { type: String },
    body: { type: String },
    read: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

// Indexes
notificationSchema.index({ recipientId: 1, createdAt: -1 });
notificationSchema.index({ recipientId: 1, read: 1 });

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = Notification;
