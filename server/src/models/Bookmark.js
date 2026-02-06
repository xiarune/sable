const mongoose = require("mongoose");

const bookmarkSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["work", "post", "audio"],
      required: true,
    },
    // References
    workId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Work",
      default: null,
    },
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      default: null,
    },
    audioId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AudioTrack",
      default: null,
    },
    // Denormalized for quick display
    title: { type: String },
    authorUsername: { type: String },
  },
  {
    timestamps: true,
  }
);

// Unique bookmarks
bookmarkSchema.index({ userId: 1, workId: 1 }, { unique: true, sparse: true });
bookmarkSchema.index({ userId: 1, postId: 1 }, { unique: true, sparse: true });
bookmarkSchema.index({ userId: 1, audioId: 1 }, { unique: true, sparse: true });
bookmarkSchema.index({ userId: 1, createdAt: -1 });

const Bookmark = mongoose.model("Bookmark", bookmarkSchema);

module.exports = Bookmark;
