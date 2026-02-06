const mongoose = require("mongoose");

const tagSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
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

tagSchema.index({ name: 1 });
tagSchema.index({ usageCount: -1 });

const Tag = mongoose.model("Tag", tagSchema);

module.exports = Tag;
