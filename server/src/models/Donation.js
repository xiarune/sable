const mongoose = require("mongoose");

const donationSchema = new mongoose.Schema(
  {
    fromUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    fromUsername: { type: String, required: true },

    toUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    toUsername: { type: String, required: true },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "USD",
    },
    note: {
      type: String,
      default: "",
      maxlength: 500,
    },

    // Payment info
    paymentProvider: {
      type: String,
      enum: ["stripe", "paypal", "other"],
      default: "stripe",
    },
    paymentId: { type: String },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
donationSchema.index({ fromUserId: 1, createdAt: -1 });
donationSchema.index({ toUserId: 1, createdAt: -1 });
donationSchema.index({ status: 1 });

const Donation = mongoose.model("Donation", donationSchema);

module.exports = Donation;
