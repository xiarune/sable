const mongoose = require("mongoose");

const likeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Can like a Work, Post, or Comment
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
    commentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure unique likes
likeSchema.index({ userId: 1, workId: 1 }, { unique: true, sparse: true });
likeSchema.index({ userId: 1, postId: 1 }, { unique: true, sparse: true });
likeSchema.index({ userId: 1, commentId: 1 }, { unique: true, sparse: true });

const Like = mongoose.model("Like", likeSchema);

module.exports = Like;
