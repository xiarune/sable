const mongoose = require("mongoose");

// Reaction sub-schema
const reactionSchema = new mongoose.Schema(
  {
    emoji: { type: String, required: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    username: { type: String, required: true },
  },
  { _id: false }
);

// Individual message
const messageSchema = new mongoose.Schema(
  {
    threadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Thread",
      required: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    senderUsername: { type: String, required: true },
    text: {
      type: String,
      required: true,
      maxlength: 5000,
    },
    // File attachment (S3 URL)
    attachmentUrl: { type: String, default: "" },
    attachmentType: { type: String, default: "" },
    attachmentName: { type: String, default: "" },

    readBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }],

    // Message reactions (thumbs up, heart, etc.)
    reactions: [reactionSchema],
  },
  {
    timestamps: true,
  }
);

messageSchema.index({ threadId: 1, createdAt: 1 });

const Message = mongoose.model("Message", messageSchema);

module.exports = Message;
