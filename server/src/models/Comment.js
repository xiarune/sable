const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
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
    // Can be on a Work or a Post
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
    // For nested replies
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    likesCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

// Indexes
commentSchema.index({ workId: 1, createdAt: -1 });
commentSchema.index({ postId: 1, createdAt: -1 });
commentSchema.index({ authorId: 1 });
commentSchema.index({ parentId: 1 });

const Comment = mongoose.model("Comment", commentSchema);

module.exports = Comment;
