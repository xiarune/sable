const mongoose = require("mongoose");

const uploadSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["image", "audio"],
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for user uploads
uploadSchema.index({ ownerId: 1, type: 1 });

const Upload = mongoose.model("Upload", uploadSchema);

module.exports = Upload;
