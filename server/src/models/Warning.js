const mongoose = require("mongoose");

const warningSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
    reason: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    severity: {
      type: String,
      enum: ["minor", "moderate", "severe"],
      default: "minor",
    },
    relatedReportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Report",
    },
    acknowledged: {
      type: Boolean,
      default: false,
    },
    acknowledgedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
warningSchema.index({ userId: 1, createdAt: -1 });
warningSchema.index({ issuedBy: 1 });
warningSchema.index({ severity: 1 });

const Warning = mongoose.model("Warning", warningSchema);

module.exports = Warning;
