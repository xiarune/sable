const mongoose = require("mongoose");

const fandomSchema = new mongoose.Schema(
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

fandomSchema.index({ slug: 1 });
fandomSchema.index({ worksCount: -1 });

const Fandom = mongoose.model("Fandom", fandomSchema);

module.exports = Fandom;
