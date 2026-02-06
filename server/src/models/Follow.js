const mongoose = require("mongoose");

const followSchema = new mongoose.Schema(
  {
    followerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    followeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure a user can only follow someone once
followSchema.index({ followerId: 1, followeeId: 1 }, { unique: true });
followSchema.index({ followerId: 1 });
followSchema.index({ followeeId: 1 });

const Follow = mongoose.model("Follow", followSchema);

module.exports = Follow;
