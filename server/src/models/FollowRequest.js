const mongoose = require("mongoose");

const followRequestSchema = new mongoose.Schema(
  {
    requesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

// Ensure a user can only have one pending request to another user
followRequestSchema.index({ requesterId: 1, targetId: 1 }, { unique: true });
followRequestSchema.index({ targetId: 1, status: 1 });
followRequestSchema.index({ requesterId: 1 });

const FollowRequest = mongoose.model("FollowRequest", followRequestSchema);

module.exports = FollowRequest;
