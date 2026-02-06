const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    authorUsername: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["work", "discussion", "skin", "audio", "post"],
      default: "post",
    },
    title: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    caption: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    content: {
      type: String,
      maxlength: 5000,
    },
    tags: {
      type: [String],
      default: [],
    },

    // Reference to related content
    workId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Work",
      default: null,
    },

    // Metadata for different post types
    metadata: {
      language: String,
      words: String,
      views: String,
      replies: String,
      downloads: String,
      length: String,
      plays: String,
    },

    // Stats
    likesCount: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
    sharesCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

// Indexes
postSchema.index({ authorId: 1, createdAt: -1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ type: 1, createdAt: -1 });
postSchema.index({ tags: 1 });

const Post = mongoose.model("Post", postSchema);

module.exports = Post;
