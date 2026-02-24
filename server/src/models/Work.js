const mongoose = require("mongoose");

const chapterSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    title: { type: String, default: "Untitled Chapter" },
    body: { type: String, default: "" },
    order: { type: Number, required: true },
    audioUrl: { type: String, default: "" },
  },
  { _id: false }
);

const workSchema = new mongoose.Schema(
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
    sourceDraftId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Draft",
      default: null,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      default: "",
      maxlength: 2000,
    },
    chapters: {
      type: [chapterSchema],
      default: [],
    },
    tags: {
      type: [String],
      default: [],
    },
    skin: {
      type: String,
      default: "Default",
    },
    // Reference to a custom skin (if using custom)
    customSkinId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Skin",
      default: null,
    },
    privacy: {
      type: String,
      enum: ["Public", "Following", "Private"],
      default: "Public",
    },
    language: {
      type: String,
      enum: ["English", "Vietnamese", "Japanese", "French", "Spanish"],
      default: "English",
    },
    genre: { type: String, default: "" },
    fandom: { type: String, default: "" },

    // Media (S3 URLs)
    coverImageUrl: { type: String, default: "" },
    audioUrl: { type: String, default: "" },
    imageUrls: { type: [String], default: [] },

    // Stats
    wordCount: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    likesCount: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
    bookmarksCount: { type: Number, default: 0 },

    // Status
    status: {
      type: String,
      enum: ["published", "archived"],
      default: "published",
    },
    // Progress status for display
    progressStatus: {
      type: String,
      enum: ["ongoing", "completed", "hiatus", "abandoned"],
      default: "ongoing",
    },
    // Loves count (separate from likes)
    lovesCount: { type: Number, default: 0 },
    publishedAt: { type: Date, default: Date.now },

    // Quality scoring for recommendations
    qualityScore: { type: Number, default: 1.0, min: 0, max: 1 },

    // Content warnings/ratings
    isSpoiler: { type: Boolean, default: false },
    isNSFW: { type: Boolean, default: false },
    isMature: { type: Boolean, default: false },
    isExplicit: { type: Boolean, default: false },
    hasViolence: { type: Boolean, default: false },
    hasSelfHarm: { type: Boolean, default: false },

    // Content flagging
    flaggedAt: { type: Date, default: null },
    flagReason: { type: String, default: null },

    // Featured/editorial status
    featured: { type: Boolean, default: false },
    featuredAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

// Calculate word count before saving
workSchema.pre("save", function () {
  if (this.isModified("chapters")) {
    let totalWords = 0;
    this.chapters.forEach((chapter) => {
      if (chapter.body) {
        totalWords += chapter.body.trim().split(/\s+/).filter(Boolean).length;
      }
    });
    this.wordCount = totalWords;
  }
});

// Indexes
workSchema.index({ authorId: 1 });
workSchema.index({ sourceDraftId: 1 });
workSchema.index({ publishedAt: -1 });
workSchema.index({ privacy: 1, publishedAt: -1 });
workSchema.index({ tags: 1 });
workSchema.index({ genre: 1 });
workSchema.index({ fandom: 1 });
workSchema.index({ language: 1 });
workSchema.index(
  { title: "text", tags: "text", authorUsername: "text" },
  { weights: { title: 10, authorUsername: 5, tags: 3 } }
);

const Work = mongoose.model("Work", workSchema);

module.exports = Work;
