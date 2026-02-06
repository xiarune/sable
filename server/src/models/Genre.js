const mongoose = require("mongoose");

const genreSchema = new mongoose.Schema(
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
    description: {
      type: String,
      default: "",
    },
    worksCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

genreSchema.index({ slug: 1 });
genreSchema.index({ worksCount: -1 });

const Genre = mongoose.model("Genre", genreSchema);

module.exports = Genre;
