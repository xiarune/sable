const mongoose = require("mongoose");

const likeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Type of reaction (like or love)
    type: {
      type: String,
      enum: ["like", "love"],
      default: "like",
    },
    // Can like a Work, Post, or Comment (no defaults - leave undefined for sparse index to work)
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
  },
  {
    timestamps: true,
  }
);

// Ensure unique likes - use partialFilterExpression for proper null handling
likeSchema.index(
  { userId: 1, workId: 1 },
  { unique: true, partialFilterExpression: { workId: { $exists: true } } }
);
likeSchema.index(
  { userId: 1, postId: 1 },
  { unique: true, partialFilterExpression: { postId: { $exists: true } } }
);
likeSchema.index(
  { userId: 1, commentId: 1 },
  { unique: true, partialFilterExpression: { commentId: { $exists: true } } }
);

const Like = mongoose.model("Like", likeSchema);

module.exports = Like;
