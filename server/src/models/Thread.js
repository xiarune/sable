const mongoose = require("mongoose");

// Conversation thread between users
const threadSchema = new mongoose.Schema(
  {
    participants: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    }],
    // Denormalized for quick display
    participantUsernames: [{ type: String }],

    // Last message preview
    lastMessage: { type: String, default: "" },
    lastMessageAt: { type: Date, default: Date.now },
    lastSenderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // Message request handling (from non-followers)
    isRequest: { type: Boolean, default: false },
    requestAcceptedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    requestAcceptedAt: { type: Date },

    // Per-user settings
    mutedBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }],

    // Unread count per participant (stored as map)
    unreadCounts: {
      type: Map,
      of: Number,
      default: {},
    },

    // Last seen timestamp per participant (for seen indicators)
    lastSeenAt: {
      type: Map,
      of: Date,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
threadSchema.index({ participants: 1 });
threadSchema.index({ lastMessageAt: -1 });

const Thread = mongoose.model("Thread", threadSchema);

module.exports = Thread;
