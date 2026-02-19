const mongoose = require("mongoose");

/**
 * Impression Model
 * Tracks user impressions and interactions for recommendation feedback
 */
const impressionSchema = new mongoose.Schema(
  {
    // User who saw the item (null for logged-out)
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // The item that was shown
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    // Type of item
    itemType: {
      type: String,
      enum: ["work", "post", "user"],
      required: true,
    },

    // Surface where the item was shown
    surface: {
      type: String,
      enum: ["for_you", "trending", "new", "search", "feed", "discover", "profile"],
      required: true,
    },

    // Position in the list (0-indexed)
    position: {
      type: Number,
      default: 0,
    },

    // Session identifier for logged-out tracking
    sessionId: {
      type: String,
      default: null,
    },

    // Actions
    viewed: {
      type: Boolean,
      default: true,
    },

    clicked: {
      type: Boolean,
      default: false,
    },

    clickedAt: {
      type: Date,
      default: null,
    },

    // Time spent after clicking (in milliseconds)
    dwellTimeMs: {
      type: Number,
      default: null,
    },

    // Engagement actions
    liked: {
      type: Boolean,
      default: false,
    },

    bookmarked: {
      type: Boolean,
      default: false,
    },

    followed: {
      type: Boolean,
      default: false,
    },

    // Negative signals
    hidden: {
      type: Boolean,
      default: false,
    },

    reported: {
      type: Boolean,
      default: false,
    },

    // Algorithm metadata
    algorithmVersion: {
      type: String,
      default: "v1",
    },

    score: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
impressionSchema.index({ userId: 1, createdAt: -1 });
impressionSchema.index({ itemId: 1, itemType: 1 });
impressionSchema.index({ surface: 1, createdAt: -1 });
impressionSchema.index({ userId: 1, itemId: 1, itemType: 1 }); // For deduplication
impressionSchema.index({ sessionId: 1, createdAt: -1 }); // For logged-out tracking
impressionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 }); // TTL: 90 days

const Impression = mongoose.model("Impression", impressionSchema);

module.exports = Impression;
