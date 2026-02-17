const mongoose = require("mongoose");

const skinSchema = new mongoose.Schema(
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
    appliesTo: {
      type: String,
      enum: ["work", "community"],
      default: "work",
    },
    css: {
      type: String,
      required: true,
      maxlength: 50000, // Allow up to 50KB of CSS
    },
    // Whether this skin is publicly shareable
    isPublic: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for user's skins
skinSchema.index({ userId: 1, createdAt: -1 });
skinSchema.index({ userId: 1, name: 1 }, { unique: true });

const Skin = mongoose.model("Skin", skinSchema);

module.exports = Skin;
