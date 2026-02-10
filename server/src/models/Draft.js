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

const draftSchema = new mongoose.Schema(
  {
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      default: "Untitled",
      trim: true,
      maxlength: 200,
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
      enum: ["Default", "Parchment"],
      default: "Default",
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
  },
  {
    timestamps: true,
  }
);

// Indexes
draftSchema.index({ authorId: 1, updatedAt: -1 });

const Draft = mongoose.model("Draft", draftSchema);

module.exports = Draft;
