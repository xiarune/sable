const mongoose = require("mongoose");

const audioTrackSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    ownerUsername: { type: String, required: true },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      default: "",
      maxlength: 1000,
    },
    duration: {
      type: String, // "MM:SS" format
      default: "0:00",
    },
    durationSeconds: {
      type: Number,
      default: 0,
    },

    // S3 URL
    audioUrl: {
      type: String,
      required: true,
    },

    // Settings
    visibility: {
      type: String,
      enum: ["public", "private", "community"],
      default: "public",
    },
    allowRemixes: { type: Boolean, default: true },

    // Stats
    plays: { type: Number, default: 0 },
    likesCount: { type: Number, default: 0 },
    bookmarksCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

// Indexes
audioTrackSchema.index({ ownerId: 1, createdAt: -1 });
audioTrackSchema.index({ visibility: 1, createdAt: -1 });

const AudioTrack = mongoose.model("AudioTrack", audioTrackSchema);

module.exports = AudioTrack;
