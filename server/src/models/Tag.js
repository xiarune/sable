const mongoose = require("mongoose");

const tagSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    usageCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

tagSchema.index({ slug: 1 });
tagSchema.index({ name: 1 });
tagSchema.index({ usageCount: -1 });

const Tag = mongoose.model("Tag", tagSchema);

module.exports = Tag;
