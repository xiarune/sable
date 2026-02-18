const mongoose = require("mongoose");

const readingListSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      default: "",
      maxlength: 500,
    },
    coverImageUrl: {
      type: String,
      default: "",
    },
    // Works in this list
    works: [
      {
        workId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Work",
          required: true,
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
        notes: {
          type: String,
          maxlength: 500,
          default: "",
        },
      },
    ],
    // Visibility
    isPublic: {
      type: Boolean,
      default: true,
    },
    // Stats
    worksCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
readingListSchema.index({ userId: 1, createdAt: -1 });
readingListSchema.index({ userId: 1, name: 1 }, { unique: true });
readingListSchema.index({ isPublic: 1, updatedAt: -1 });

const ReadingList = mongoose.model("ReadingList", readingListSchema);

module.exports = ReadingList;
